import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, DollarSign, TrendingUp, Zap, Plus, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyBDT } from '@/lib/currency';

interface Machine {
  id: string;
  name: string;
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  location: string;
  is_active: boolean;
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
      // Fetch machines
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (machinesError) throw machinesError;

      setMachines(machinesData || []);

      // Calculate summaries for each machine
      const summaries: MachineSummary[] = [];
      for (const machine of machinesData || []) {
        const { data: reports } = await supabase
          .from('machine_reports')
          .select('*')
          .eq('machine_id', machine.id);

        const totalCoins = reports?.reduce((sum, report) => sum + report.coin_count, 0) || 0;
        const totalPrizes = reports?.reduce((sum, report) => sum + report.prize_count, 0) || 0;
        
        const totalIncome = totalCoins * machine.coin_price;
        const prizeCost = totalPrizes * machine.doll_price;
        const vatAmount = totalIncome * (machine.vat_percentage / 100);
        const maintenanceCost = totalIncome * (machine.maintenance_percentage / 100);
        const profitShareAmount = totalIncome * (machine.profit_share_percentage / 100);
        
        const totalPayable = totalIncome - (prizeCost + machine.electricity_cost + vatAmount + maintenanceCost + profitShareAmount);
        const totalProfit = totalPayable; // Simplified profit calculation

        summaries.push({
          machine,
          totalIncome,
          totalProfit,
          totalPayable,
          reportCount: reports?.length || 0,
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

  const pieChartData = machineSummaries.map((summary) => ({
    name: summary.machine.name,
    value: summary.totalProfit,
    location: summary.machine.location,
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your claw machine business performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/add-machine')}>
            <Plus className="h-4 w-4 mr-2" /> Add Machine
          </Button>
          <Button variant="outline" onClick={() => navigate('/machine-report')}>
            <FileText className="h-4 w-4 mr-2" /> View Reports
          </Button>
          <Button variant="secondary" onClick={() => navigate('/invoices')}>
            <Receipt className="h-4 w-4 mr-2" /> Generate Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
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
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit Trends by Machine</CardTitle>
            <CardDescription>Monthly profit comparison across machines</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrencyBDT(Number(value))}`}
                  outerRadius={80}
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
              <div key={summary.machine.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{summary.machine.name}</h3>
                  <p className="text-sm text-muted-foreground">{summary.machine.location}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-sm text-muted-foreground">Income</p>
                    <p className="font-semibold">{formatCurrencyBDT(summary.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-semibold">{formatCurrencyBDT(summary.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payable</p>
                    <p className="font-semibold">{formatCurrencyBDT(summary.totalPayable)}</p>
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