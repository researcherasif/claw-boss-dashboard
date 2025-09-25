import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, Trash2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrencyBDT } from '@/lib/currency';

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
    coin_price: number;
    doll_price: number;
    electricity_cost: number;
    vat_percentage: number;
    maintenance_percentage: number;
    owner_profit_share_percentage?: number;
    clowee_profit_share_percentage?: number;
  };
}

interface ChangeLog {
  id: string;
  machine_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  machines: { name: string; location: string };
}

const AllReports = () => {
  const [reports, setReports] = useState<MachineReport[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<MachineReport | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Try extended machines select (with owner/clowee fields); fallback to legacy if columns missing
      let reportData: any[] | null = null;
      let reportError: any = null;
      let resp = await supabase
        .from('machine_reports')
        .select(`*, machines (name, location, coin_price, doll_price, electricity_cost, vat_percentage, maintenance_percentage, owner_profit_share_percentage, clowee_profit_share_percentage)`)
        .order('report_date', { ascending: false });
      reportData = resp.data as any[] | null;
      reportError = resp.error;
      if (reportError) {
        // Fallback without the new columns
        const fallback = await supabase
          .from('machine_reports')
          .select(`*, machines (name, location, coin_price, doll_price, electricity_cost, vat_percentage, maintenance_percentage)`)
          .order('report_date', { ascending: false });
        reportData = fallback.data as any[] | null;
        reportError = fallback.error;
      }
      if (reportError) throw reportError;
      setReports((reportData || []) as unknown as MachineReport[]);

      // Change logs may not exist yet; on error just show none
      try {
        const { data: logData, error: logError } = await supabase
          .from('machine_change_logs')
          .select(`*, machines (name, location)`)
          .order('created_at', { ascending: false });
        if (!logError) {
          setLogs((logData || []) as unknown as ChangeLog[]);
        } else {
          setLogs([]);
        }
      } catch {
        setLogs([]);
      }
    } catch (error: any) {
      toast({ title: 'Error loading reports/logs', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEditReport = (r: MachineReport) => setEditingReport(r);
  const closeEditReport = () => setEditingReport(null);

  const updateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const report_date = formData.get('report_date') as string;
      const coin_count = parseInt(formData.get('coin_count') as string);
      const prize_count = parseInt(formData.get('prize_count') as string);
      const coin_price = parseFloat((formData.get('coin_price') as string) || String(editingReport.machines.coin_price));
      const doll_price = parseFloat((formData.get('doll_price') as string) || String(editingReport.machines.doll_price));
      const electricity_cost = parseFloat((formData.get('electricity_cost') as string) || String(editingReport.machines.electricity_cost));
      const vat_percentage = parseFloat((formData.get('vat_percentage') as string) || String(editingReport.machines.vat_percentage));
      const maintenance_percentage = parseFloat((formData.get('maintenance_percentage') as string) || String(editingReport.machines.maintenance_percentage));
      const profit_share = parseFloat((formData.get('profit_share_percentage') as string) || String((editingReport.machines as any).clowee_profit_share_percentage ?? (editingReport.machines as any).profit_share_percentage ?? 0));

      const { error } = await supabase
        .from('machine_reports')
        .update({ report_date, coin_count, prize_count })
        .eq('id', editingReport.id);
      if (error) throw error;

      // Determine if split shares exist
      let supportsSplitShares = true;
      try {
        const t = await supabase.from('machines').select('owner_profit_share_percentage, clowee_profit_share_percentage').limit(1);
        if (t.error) supportsSplitShares = false;
      } catch { supportsSplitShares = false; }

      // Build machine update payload
      const machineUpdate: any = {
        coin_price,
        doll_price,
        electricity_cost,
        vat_percentage,
        maintenance_percentage,
      };
      if (supportsSplitShares) {
        machineUpdate.clowee_profit_share_percentage = profit_share;
      } else {
        machineUpdate.profit_share_percentage = profit_share;
      }

      // Change logs compare
      const prev = editingReport.machines as any;
      const changes: Array<{ field: string; old_value: string; new_value: string }> = [];
      const record = (field: string, oldVal: any, newVal: any) => {
        if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
          changes.push({ field, old_value: String(oldVal), new_value: String(newVal) });
        }
      };
      record('coin_price', prev.coin_price, coin_price);
      record('doll_price', prev.doll_price, doll_price);
      record('electricity_cost', prev.electricity_cost, electricity_cost);
      record('vat_percentage', prev.vat_percentage, vat_percentage);
      record('maintenance_percentage', prev.maintenance_percentage, maintenance_percentage);
      if (supportsSplitShares) {
        record('clowee_profit_share_percentage', prev.clowee_profit_share_percentage, profit_share);
      } else {
        record('profit_share_percentage', prev.profit_share_percentage, profit_share);
      }

      // Try updating with split share first, then fall back to legacy if column doesn't exist
      let mErr: any = null;
      let attemptSplit = { ...machineUpdate };
      let attemptLegacy = { ...machineUpdate };
      if (supportsSplitShares) {
        attemptLegacy.profit_share_percentage = profit_share;
      } else {
        attemptSplit.clowee_profit_share_percentage = profit_share;
      }

      // Prefer split update first
      let res = await supabase.from('machines').update(attemptSplit).eq('id', editingReport.machine_id);
      mErr = res.error;
      if (mErr) {
        // Retry with legacy field
        const res2 = await supabase.from('machines').update(attemptLegacy).eq('id', editingReport.machine_id);
        mErr = res2.error;
      }
      if (mErr) throw mErr;

      if (changes.length > 0) {
        try {
          await supabase.from('machine_change_logs').insert(
            changes.map((c) => ({ machine_id: editingReport.machine_id, field: c.field, old_value: c.old_value, new_value: c.new_value }))
          );
        } catch {}
      }

      toast({ title: 'Report updated' });
      closeEditReport();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async (r: MachineReport) => {
    if (!confirm('Delete this report?')) return;
    try {
      const { error } = await supabase.from('machine_reports').delete().eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Report deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const deleteLog = async (log: ChangeLog) => {
    if (!confirm('Delete this change log entry?')) return;
    try {
      const { error } = await supabase.from('machine_change_logs').delete().eq('id', log.id);
      if (error) throw error;
      toast({ title: 'Log deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const printReportPDF = async (r: MachineReport) => {
    try {
      const el = document.createElement('div');
      el.style.width = '800px';
      el.style.padding = '32px';
      el.style.backgroundColor = 'white';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      const settings = r.machines;

      const totalIncome = r.coin_count * settings.coin_price;
      const prizeCost = r.prize_count * settings.doll_price;
      // Electricity cost is divided by 2 per requirement
      const electricityCost = (settings.electricity_cost || 0) / 2;
      const vatAmount = totalIncome * (settings.vat_percentage / 100);
      const maintenanceCost = totalIncome * (settings.maintenance_percentage / 100);
      const ownerSharePct = settings.owner_profit_share_percentage || 0;
      const cloweeSharePct = settings.clowee_profit_share_percentage || 0;
      const cloweeShareAmount = totalIncome * (cloweeSharePct / 100);
      const ownerShareAmount = totalIncome * (ownerSharePct / 100);
      // Payment rule tweak: Net Payable to Clowee = Net Payable + Prize Cost
      const baseNetPayable = totalIncome - (prizeCost + electricityCost + vatAmount + maintenanceCost + cloweeShareAmount + ownerShareAmount);
      const netPayable = baseNetPayable + prizeCost;

      el.innerHTML = `
        <div style="text-align:center; margin-bottom:24px;">
          <h2 style="margin:0;">Daily Report</h2>
          <div style="color:#666">${new Date(r.report_date).toLocaleDateString()}</div>
        </div>
        <div style="margin-bottom:16px;">
          <strong>Machine:</strong> ${settings.name || ''} (${settings.location || ''})
        </div>
        <table style="width:100%; border-collapse: collapse;">
          <tbody>
            <tr><td>Coins</td><td style="text-align:right;">${r.coin_count}</td></tr>
            <tr><td>Prizes</td><td style="text-align:right;">${r.prize_count}</td></tr>
            <tr><td>Total Income</td><td style="text-align:right;">${formatCurrencyBDT(totalIncome)}</td></tr>
            <tr><td>Prize Cost</td><td style="text-align:right;">${formatCurrencyBDT(prizeCost)}</td></tr>
            <tr><td>Electricity (50%)</td><td style="text-align:right;">${formatCurrencyBDT(electricityCost)}</td></tr>
            <tr><td>VAT</td><td style="text-align:right;">${formatCurrencyBDT(vatAmount)}</td></tr>
            <tr><td>Maintenance</td><td style="text-align:right;">${formatCurrencyBDT(maintenanceCost)}</td></tr>
            <tr><td>Owner Profit Share (${ownerSharePct}%)</td><td style="text-align:right;">${formatCurrencyBDT(ownerShareAmount)}</td></tr>
            <tr><td>Clowee Profit Share (${cloweeSharePct}%)</td><td style="text-align:right;">${formatCurrencyBDT(cloweeShareAmount)}</td></tr>
            <tr><td><strong>Net Payable</strong></td><td style="text-align:right;"><strong>${formatCurrencyBDT(netPayable)}</strong></td></tr>
          </tbody>
        </table>
      `;
      document.body.appendChild(el);
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      document.body.removeChild(el);
      pdf.save(`report-${r.id}.pdf`);
    } catch (error: any) {
      toast({ title: 'PDF error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">Daily reports and machine change logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Reports</CardTitle>
          <CardDescription>All entries from Machine Report</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Coins</TableHead>
                <TableHead>Prizes</TableHead>
                <TableHead>Coin Price</TableHead>
                <TableHead>Doll Price</TableHead>
                <TableHead>Electricity</TableHead>
                <TableHead>VAT %</TableHead>
                <TableHead>Profit Share %</TableHead>
                <TableHead>Maintenance %</TableHead>
                <TableHead>Total Income</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const settings = r.machines;
                const income = r.coin_count * settings.coin_price;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.report_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-semibold">{settings.name}</div>
                      <div className="text-sm text-muted-foreground">{settings.location}</div>
                    </TableCell>
                    <TableCell>{r.coin_count}</TableCell>
                    <TableCell>{r.prize_count}</TableCell>
                    <TableCell>{formatCurrencyBDT(settings.coin_price)}</TableCell>
                    <TableCell>{formatCurrencyBDT(settings.doll_price)}</TableCell>
                    <TableCell>{formatCurrencyBDT(settings.electricity_cost)}</TableCell>
                    <TableCell>{settings.vat_percentage}%</TableCell>
                    <TableCell>{(settings as any).clowee_profit_share_percentage ?? (settings as any).profit_share_percentage ?? 0}%</TableCell>
                    <TableCell>{settings.maintenance_percentage}%</TableCell>
                    <TableCell>{formatCurrencyBDT(income)}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEditReport(r)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => printReportPDF(r)}>
                        <FileDown className="h-4 w-4 mr-1" /> Print
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteReport(r)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No reports found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Machine Change Logs</CardTitle>
          <CardDescription>Configuration edits history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{log.machines?.name}</div>
                    <div className="text-sm text-muted-foreground">{log.machines?.location}</div>
                  </TableCell>
                  <TableCell className="capitalize">{(log.field || '').split('_').join(' ')}</TableCell>
                  <TableCell>{log.old_value ?? '-'}</TableCell>
                  <TableCell>{log.new_value ?? '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => deleteLog(log)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No change logs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingReport} onOpenChange={(open) => !open && closeEditReport()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <form onSubmit={updateReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report_date">Date</Label>
                  <Input id="report_date" name="report_date" type="date" defaultValue={editingReport.report_date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coin_count">Coins</Label>
                  <Input id="coin_count" name="coin_count" type="number" min="0" defaultValue={editingReport.coin_count} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prize_count">Prizes</Label>
                  <Input id="prize_count" name="prize_count" type="number" min="0" defaultValue={editingReport.prize_count} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coin_price">Coin Price (BDT)</Label>
                  <Input id="coin_price" name="coin_price" type="number" step="0.01" defaultValue={editingReport.machines.coin_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doll_price">Doll Price (BDT)</Label>
                  <Input id="doll_price" name="doll_price" type="number" step="0.01" defaultValue={editingReport.machines.doll_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electricity_cost">Electricity (BDT)</Label>
                  <Input id="electricity_cost" name="electricity_cost" type="number" step="0.01" defaultValue={editingReport.machines.electricity_cost} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_percentage">VAT %</Label>
                  <Input id="vat_percentage" name="vat_percentage" type="number" step="0.01" defaultValue={editingReport.machines.vat_percentage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profit_share_percentage">Profit Share %</Label>
                  <Input id="profit_share_percentage" name="profit_share_percentage" type="number" step="0.01" defaultValue={(editingReport.machines.clowee_profit_share_percentage ?? (editingReport.machines as any).profit_share_percentage ?? 0)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance_percentage">Maintenance %</Label>
                  <Input id="maintenance_percentage" name="maintenance_percentage" type="number" step="0.01" defaultValue={editingReport.machines.maintenance_percentage} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={closeEditReport}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllReports;


