import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Trash2, Eye } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TablePagination } from '@/components/TablePagination';

interface Machine {
  id: string;
  name: string;
  location: string;
  coin_price?: number;
  doll_price?: number;
}

interface MachineReport {
  id: string;
  machine_id: string;
  report_date: string;
  coin_count: number;
  prize_count: number;
  created_at: string;
  machines: {
    name: string;
    location: string;
  };
}

const MachineReport = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [reports, setReports] = useState<MachineReport[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [todayCoinCount, setTodayCoinCount] = useState<number | ''>('');
  const [todayPrizeCount, setTodayPrizeCount] = useState<number | ''>('');
  const [prevCoinCount, setPrevCoinCount] = useState<number | null>(null);
  const [prevPrizeCount, setPrevPrizeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMachines, setFetchingMachines] = useState(true);
  const [editingReport, setEditingReport] = useState<MachineReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingReport, setDeletingReport] = useState<MachineReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMachines();
    fetchReports();
  }, []);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('id, name, location, coin_price, doll_price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMachines(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading machines",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetchingMachines(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_counter_reports')
        .select(`
          *,
          machines!inner(name, location)
        `)
        .order('report_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPreviousReport = useCallback(async (machineId: string, beforeDate: string) => {
    try {
      if (!machineId || !beforeDate) return;
      const { data, error } = await supabase
        .from('machine_counter_reports')
        .select('coin_count, prize_count, report_date')
        .eq('machine_id', machineId)
        .lt('report_date', beforeDate)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return;
      setPrevCoinCount(data?.coin_count ?? null);
      setPrevPrizeCount(data?.prize_count ?? null);
    } catch {
      setPrevCoinCount(null);
      setPrevPrizeCount(null);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMachine) return;
    
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const reportDate = formData.get('report_date') as string;
      const coinCountStr = formData.get('coin_count') as string;
      const prizeCountStr = formData.get('prize_count') as string;
      
      const coinCount = parseInt(coinCountStr);
      const prizeCount = parseInt(prizeCountStr);
      
      if (Number.isNaN(coinCount) || Number.isNaN(prizeCount)) {
        toast({
          title: "Invalid input",
          description: "Please enter valid numbers for coin and prize counts.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: existingReport } = await supabase
        .from('machine_counter_reports')
        .select('id')
        .eq('machine_id', selectedMachine)
        .eq('report_date', reportDate)
        .single();

      if (existingReport) {
        const { error } = await supabase
          .from('machine_counter_reports')
          .update({
            coin_count: coinCount,
            prize_count: prizeCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReport.id);

        if (error) throw error;

        toast({
          title: "Report updated successfully",
          description: "The existing report has been updated with new data.",
        });
      } else {
        const { error } = await supabase
          .from('machine_counter_reports')
          .insert([{
            machine_id: selectedMachine,
            report_date: reportDate,
            coin_count: coinCount,
            prize_count: prizeCount,
            created_by: user.id,
          }]);

        if (error) throw error;

        toast({
          title: "Report submitted successfully",
          description: "Daily machine report has been recorded.",
        });
      }

      fetchReports();
      (e.target as HTMLFormElement).reset();
      setSelectedMachine('');
      setSelectedDate(today);
      setTodayCoinCount('');
      setTodayPrizeCount('');
      setPrevCoinCount(null);
      setPrevPrizeCount(null);
    } catch (error: any) {
      toast({
        title: "Error submitting report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  useEffect(() => {
    setSelectedDate(today);
  }, [today]);

  useEffect(() => {
    if (selectedMachine && selectedDate) {
      fetchPreviousReport(selectedMachine, selectedDate);
    } else {
      setPrevCoinCount(null);
      setPrevPrizeCount(null);
    }
  }, [selectedMachine, selectedDate, fetchPreviousReport]);

  const handleEditReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const { error } = await supabase
        .from('machine_counter_reports')
        .update({
          report_date: formData.get('report_date') as string,
          coin_count: parseInt(formData.get('coin_count') as string),
          prize_count: parseInt(formData.get('prize_count') as string),
        })
        .eq('id', editingReport.id);
      
      if (error) throw error;
      toast({ title: 'Report updated successfully' });
      setEditingReport(null);
      fetchReports();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('machine_counter_reports').delete().eq('id', deletingReport.id);
      if (error) throw error;
      toast({ title: 'Report deleted successfully' });
      setDeletingReport(null);
      fetchReports();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (fetchingMachines) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Machine Counter Report</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Record daily coin and prize counts from machine mechanical counters
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Machine Counter Report</CardTitle>
            <CardDescription>
              Select a machine and enter coin count and prize count from mechanical counters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="machine">Select Machine</Label>
                <Select 
                  value={selectedMachine} 
                  onValueChange={setSelectedMachine}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} - {machine.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {machines.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active machines found. Please add a machine first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report_date">Report Date</Label>
                  <Input
                    id="report_date"
                    name="report_date"
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={today}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coin_count">Today's Coin Count</Label>
                  <Input
                    id="coin_count"
                    name="coin_count"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={todayCoinCount as number | undefined}
                    onChange={(e) => setTodayCoinCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_count">Today's Prize Count</Label>
                  <Input
                    id="prize_count"
                    name="prize_count"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={todayPrizeCount as number | undefined}
                    onChange={(e) => setTodayPrizeCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Computed using previous values</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="flex justify-between"><span>Previous Coin Count:</span><span className="font-semibold">{prevCoinCount ?? '-'}</span></div>
                    <div className="flex justify-between"><span>Previous Prize Count:</span><span className="font-semibold">{prevPrizeCount ?? '-'}</span></div>
                  </div>
                  <CalculationDisplay 
                    machines={machines}
                    selectedMachine={selectedMachine}
                    todayCoinCount={todayCoinCount}
                    todayPrizeCount={todayPrizeCount}
                    prevCoinCount={prevCoinCount}
                    prevPrizeCount={prevPrizeCount}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Previous values are fetched automatically based on the selected date and machine.</p>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !selectedMachine || machines.length === 0} 
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>View, edit, and delete existing reports</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Prizes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{formatDate(report.report_date)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{report.machines.name}</div>
                      <div className="text-xs text-muted-foreground">{report.machines.location}</div>
                    </TableCell>
                    <TableCell>{report.coin_count}</TableCell>
                    <TableCell>{report.prize_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingReport(report)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeletingReport(report)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {reports.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={Math.ceil(reports.length / pageSize)}
                pageSize={pageSize}
                totalItems={reports.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <form onSubmit={handleEditReport} className="space-y-4">
              <div className="space-y-2">
                <Label>Machine</Label>
                <Input value={`${editingReport.machines.name} - ${editingReport.machines.location}`} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_date">Date</Label>
                <Input id="report_date" name="report_date" type="date" defaultValue={editingReport.report_date} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coin_count">Coin Count</Label>
                <Input id="coin_count" name="coin_count" type="number" min="0" defaultValue={editingReport.coin_count} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prize_count">Prize Count</Label>
                <Input id="prize_count" name="prize_count" type="number" min="0" defaultValue={editingReport.prize_count} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingReport(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingReport}
        onOpenChange={(open) => !open && setDeletingReport(null)}
        title="Delete Report"
        description={`Are you sure you want to delete the report for "${deletingReport?.machines.name}" on ${deletingReport ? formatDate(deletingReport.report_date) : ''}? This action cannot be undone.`}
        onConfirm={handleDeleteReport}
        loading={deleting}
      />
    </div>
  );
};

// Extracted calculation component for better readability
const CalculationDisplay = ({ 
  machines, 
  selectedMachine, 
  todayCoinCount, 
  todayPrizeCount, 
  prevCoinCount, 
  prevPrizeCount 
}: {
  machines: Machine[];
  selectedMachine: string;
  todayCoinCount: number | '';
  todayPrizeCount: number | '';
  prevCoinCount: number | null;
  prevPrizeCount: number | null;
}) => {
  const machine = machines.find(m => m.id === selectedMachine);
  const coinPrice = machine?.coin_price ?? 0;
  const todayCoins = typeof todayCoinCount === 'number' ? todayCoinCount : 0;
  const todayPrizes = typeof todayPrizeCount === 'number' ? todayPrizeCount : 0;
  const sellCoins = prevCoinCount != null ? Math.max(0, todayCoins - prevCoinCount) : 0;
  const sellPrizes = prevPrizeCount != null ? Math.max(0, todayPrizes - prevPrizeCount) : 0;
  const income = sellCoins * coinPrice;

  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>Sell Coins (today - previous):</span>
        <span className="font-semibold">{sellCoins}</span>
      </div>
      <div className="flex justify-between">
        <span>Sell Income:</span>
        <span className="font-semibold">{formatCurrencyBDT(income)}</span>
      </div>
      <div className="flex justify-between">
        <span>Sell Prizes (today - previous):</span>
        <span className="font-semibold">{sellPrizes}</span>
      </div>
    </div>
  );
};

export default MachineReport;