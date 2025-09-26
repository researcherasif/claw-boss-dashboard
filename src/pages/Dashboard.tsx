import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, DollarSign, TrendingUp, Zap, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyBDT } from '@/lib/currency';

interface Machine {
  id: string;
  name: string;
  branch_location: string;
  franchise_id: string;
}

interface MachineSummary {
  machine: Machine;
  totalIncome: number;
  totalProfit: number;
  totalPayable: number;
  reportCount: number;
}

const Dashboard = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineSummaries, setMachineSummaries] = useState<MachineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch machines with franchise data
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          *,
          franchises!inner(
            coin_price,
            doll_price,
            electricity_cost,
            vat_percentage,
            maintenance_percentage,
            clowee_profit_share_percentage
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (machinesError) throw machinesError;

      setMachines(machinesData || []);

      // Fetch all reports in a single query to avoid N+1 problem
      const { data: allReports, error: reportsError } = await supabase
        .from('machine_counter_reports')
        .select('machine_id, coin_count, prize_count, report_date');

      if (reportsError) throw reportsError;

      // Group reports by machine_id
      const reportsByMachine = (allReports || []).reduce((acc: any, report) => {
        if (!acc[report.machine_id]) {
          acc[report.machine_id] = [];
        }
        acc[report.machine_id].push(report);
        return acc;
      }, {});

      // Calculate summaries for each machine
      const summaries: MachineSummary[] = [];
      for (const machine of machinesData || []) {
        const reports = reportsByMachine[machine.id] || [];

        const totalCoins = reports.reduce((sum: number, report: any) => sum + (report.coin_count || 0), 0);
        const totalPrizes = reports.reduce((sum: number, report: any) => sum + (report.prize_count || 0), 0);
        
        const franchise = machine.franchises;
        const totalIncome = totalCoins * franchise.coin_price;
        const prizeCost = totalPrizes * franchise.doll_price;
        const vatAmount = totalIncome * (franchise.vat_percentage / 100);
        const maintenanceCost = totalIncome * (franchise.maintenance_percentage / 100);
        const profitShareAmount = totalIncome * (franchise.clowee_profit_share_percentage / 100);
        
        const totalPayable = totalIncome - (prizeCost + franchise.electricity_cost + vatAmount + maintenanceCost + profitShareAmount);
        const totalProfit = totalPayable; // Simplified profit calculation

        summaries.push({
          machine,
          totalIncome,
          totalProfit,
          totalPayable,
          reportCount: reports.length,
        });
      }

      setMachineSummaries(summaries);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalStats = {
    totalIncome: machineSummaries.reduce((sum, summary) => sum + summary.totalIncome, 0),
    totalProfit: machineSummaries.reduce((sum, summary) => sum + summary.totalProfit, 0),
    totalPayable: machineSummaries.reduce((sum, summary) => sum + summary.totalPayable, 0),
    activeMachines: machines.length,
  };

  // Sample chart data (in a real app, this would be based on historical data)
  const chartData = machineSummaries.map((summary, index) => ({
    name: summary.machine.name,
    profit: summary.totalProfit,
    income: summary.totalIncome,
    month: `Month ${index + 1}`,
  }));

  // Aggregate profit by location for distribution donut
  const profitByLocation: Record<string, number> = machineSummaries.reduce((acc, s) => {
    const loc = s.machine.branch_location || 'Unknown';
    acc[loc] = (acc[loc] || 0) + s.totalProfit;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(profitByLocation).map(([location, value]) => ({
    name: location,
    value,
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#FFBB28', '#FF8042', '#0088FE'];

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Overview of your claw machine business performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => navigate('/machine-report')} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" /> <span className="sm:inline">View Reports</span>
          </Button>
          <Button variant="secondary" onClick={() => navigate('/invoices')} className="w-full sm:w-auto">
            <Receipt className="h-4 w-4 mr-2" /> <span className="sm:inline">Generate Invoice</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBDT(totalStats.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              From all active machines
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBDT(totalStats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Net profit after expenses
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBDT(totalStats.totalPayable)}</div>
            <p className="text-xs text-muted-foreground">
              Amount due to Clowee
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Machines</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeMachines}</div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit Trends by Machine</CardTitle>
            <CardDescription>Monthly profit comparison across machines</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[350px]">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrencyBDT(Number(value)), '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Profit"
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Distribution</CardTitle>
            <CardDescription>Profit share by machine location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[350px]">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrencyBDT(Number(value)), 'Profit']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Machine List */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Overview</CardTitle>
          <CardDescription>Summary of all active machines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {machineSummaries.map((summary) => (
              <div key={summary.machine.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{summary.machine.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{summary.machine.branch_location}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-right">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Income</p>
                    <p className="font-semibold text-xs sm:text-sm">{formatCurrencyBDT(summary.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Profit</p>
                    <p className="font-semibold text-xs sm:text-sm">{formatCurrencyBDT(summary.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Payable</p>
                    <p className="font-semibold text-xs sm:text-sm">{formatCurrencyBDT(summary.totalPayable)}</p>
                  </div>
                </div>
              </div>
            ))}
            {machineSummaries.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                No machines found. Add your first machine to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;