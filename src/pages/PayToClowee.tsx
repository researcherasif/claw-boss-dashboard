import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Loader2, FileText, History, Trash2, Printer, Download, Pencil, Eye } from 'lucide-react';

const formatDateRange = (startDate: string, endDate: string) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                   day === 2 || day === 22 ? 'nd' : 
                   day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${suffix} ${month} ${year}`;
  };
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrencyBDT } from '@/lib/currency';
import { getMachineSettingsForDate } from '@/lib/machineSettings';
import InvoiceGenerator from '@/components/invoices/InvoiceGenerator';

interface Machine {
  id: string;
  name: string;
  location: string;
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  vat_percentage: number;
  clowee_profit_share_percentage: number;
  franchise_profit_share_percentage: number;
  maintenance_percentage: number;
  duration: string;
}

interface CalculationResult {
  totalCoins: number;
  totalPrizes: number;
  totalIncome: number;
  prizeCost: number;
  electricityCost: number;
  vatAmount: number;
  maintenanceCost: number;
  profitShareAmount: number; // Clowee share of profit base
  totalAmount: number;
  payToClowee: number;
}

interface PayToCloweeRecord {
  id: string;
  machine_id: string;
  start_date: string;
  end_date: string;
  total_coins: number;
  total_prizes: number;
  total_income: number;
  prize_cost: number;
  electricity_cost: number;
  vat_amount: number;
  maintenance_cost: number;
  profit_share_amount: number;
  net_payable: number;
  created_at: string;
  machines: {
    name: string;
    location: string;
  };
}

const PayToClowee = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [payToCloweeRecords, setPayToCloweeRecords] = useState<PayToCloweeRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<PayToCloweeRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<PayToCloweeRecord | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<PayToCloweeRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPayToCloweeRecords();
    }
  }, [user]);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
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
    }
  };

  const fetchPayToCloweeRecords = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('pay_to_clowee')
        .select('*, machines(name, location)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayToCloweeRecords(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading records",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !user) return;

    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;

      // Get the last entry within the date range
      const { data: lastInRange, error: rangeError } = await supabase
        .from('machine_counter_reports')
        .select('coin_count, prize_count')
        .eq('machine_id', selectedMachine.id)
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rangeError) throw rangeError;

      if (!lastInRange) {
        toast({
          title: "No reports found",
          description: "No machine reports found for the selected date range.",
          variant: "destructive",
        });
        setCalculationResult(null);
        return;
      }

      // Get the initial setup entry (first entry for this machine)
      const { data: initialEntry, error: initialError } = await supabase
        .from('machine_counter_reports')
        .select('coin_count, prize_count')
        .eq('machine_id', selectedMachine.id)
        .order('report_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (initialError) throw initialError;

      // Calculate totals: Current reading - Initial setup reading
      const currentCoins = lastInRange.coin_count || 0;
      const currentPrizes = lastInRange.prize_count || 0;
      const initialCoins = initialEntry?.coin_count || 0;
      const initialPrizes = initialEntry?.prize_count || 0;

      const totalCoins = Math.max(0, currentCoins - initialCoins);
      const totalPrizes = Math.max(0, currentPrizes - initialPrizes);

      // Get machine settings for the end date (most recent settings in the period)
      const settings = await getMachineSettingsForDate(selectedMachine.id, endDate);
      
      // Calculate amounts using dynamic settings
      const totalIncome = totalCoins * settings.coin_price;
      const prizeCost = totalPrizes * settings.doll_price;
      const electricityCostFull = settings.electricity_cost;
      const vatAmount = totalIncome * (settings.vat_percentage / 100);
      const maintenanceCost = totalIncome * (settings.maintenance_percentage / 100);
      // Profit base = Total Income − (Prize Cost + VAT + Maintenance)
      const profitBase = totalIncome - (prizeCost + vatAmount + maintenanceCost);
      // Clowee share percent from dynamic settings
      const cloweePercent = settings.clowee_profit_share_percentage || 0;
      const profitShareAmount = profitBase * (cloweePercent / 100);

      // Total Amount after deductions (full electricity here)
      const totalAmount = totalIncome - (prizeCost + electricityCostFull + vatAmount + maintenanceCost);

      // Pay To Clowee = Clowee Share + Prize Cost − Electricity (full)
      const payToClowee = profitShareAmount + prizeCost - ( electricityCostFull / 2 );

      setCalculationResult({
        totalCoins,
        totalPrizes,
        totalIncome,
        prizeCost,
        electricityCost: electricityCostFull,
        vatAmount,
        maintenanceCost,
        profitShareAmount,
        totalAmount,
        payToClowee,
      });

    } catch (error: any) {
      toast({
        title: "Error calculating payment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalculation = async () => {
    if (!selectedMachine || !calculationResult || !user) return;

    setSaving(true);

    try {
      const formData = new FormData(document.querySelector('form') as HTMLFormElement);
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;

      const { error } = await supabase
        .from('pay_to_clowee')
        .insert([{
          machine_id: selectedMachine.id,
          start_date: startDate,
          end_date: endDate,
          total_coins: calculationResult.totalCoins,
          total_prizes: calculationResult.totalPrizes,
          total_income: calculationResult.totalIncome,
          prize_cost: calculationResult.prizeCost,
          electricity_cost: calculationResult.electricityCost,
          vat_amount: calculationResult.vatAmount,
          maintenance_cost: calculationResult.maintenanceCost,
          profit_share_amount: calculationResult.profitShareAmount,
          net_payable: calculationResult.payToClowee,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Payment record saved",
        description: "The payment calculation has been saved.",
      });

      await fetchPayToCloweeRecords();
      setCalculationResult(null);

    } catch (error: any) {
      toast({
        title: "Error saving record",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      const { error } = await supabase
        .from('pay_to_clowee')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Record deleted",
        description: "The payment record has been removed.",
      });

      await fetchPayToCloweeRecords();
    } catch (error: any) {
      toast({
        title: "Error deleting record",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const { error } = await supabase
        .from('pay_to_clowee')
        .update({
          start_date: formData.get('start_date') as string,
          end_date: formData.get('end_date') as string,
          total_coins: parseInt(formData.get('total_coins') as string),
          total_prizes: parseInt(formData.get('total_prizes') as string),
          net_payable: parseFloat(formData.get('net_payable') as string),
        })
        .eq('id', editingRecord.id);
      
      if (error) throw error;
      toast({ title: 'Record updated' });
      setEditingRecord(null);
      await fetchPayToCloweeRecords();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = (record: PayToCloweeRecord) => {
    const invoiceData = {
      company: {
        name: 'i3 Technologies',
        address: 'House #29, Flat #C2, 29, Katasur, Mohammadpur, Dhaka-1207',
        mobile: '+8801325-886868',
        email: 'support@i3technologies.com.bd',
        website: 'www.sohub.com.bd/clowee',
        logoUrl: '/i3-logo.png',
      },
      client: {
        name: record.machines.name,
        address: record.machines.location,
      },
      invoiceNumber: `PAY-${record.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: new Date(record.created_at).toISOString().split('T')[0],
      items: [{
        serial: 1,
        description: 'Pay to Clowee - Machine Settlement',
        period: formatDateRange(record.start_date, record.end_date),
        total: record.net_payable,
      }],
      banks: [{
        bankName: 'Midland Bank Limited',
        branch: 'Gulshan',
        accountName: 'i3 Technologies',
        accountNumber: '0011-1050008790',
      }],
      footerNotes: [
        'Payment due upon receipt.',
        'Please send deposit slip/screenshot after payment.',
      ],
      rightLogoUrl: '/clowee-logo.png'
    };

    // Create a temporary div to render the invoice
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Import and render InvoiceGenerator
    import('@/components/invoices/InvoiceGenerator').then(({ default: InvoiceGenerator }) => {
      const React = require('react');
      const ReactDOM = require('react-dom/client');
      
      const root = ReactDOM.createRoot(tempDiv);
      root.render(React.createElement(InvoiceGenerator, invoiceData));
      
      // Wait for render then trigger download
      setTimeout(() => {
        const invoiceElement = tempDiv.querySelector('.invoice-container');
        if (invoiceElement) {
          // Trigger the download from InvoiceGenerator
          const downloadBtn = invoiceElement.querySelector('[data-download-pdf]') as HTMLButtonElement;
          if (downloadBtn) {
            downloadBtn.click();
          }
        }
        document.body.removeChild(tempDiv);
      }, 100);
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pay to Clowee</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Calculate payment amounts for machine operations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Payment Calculator
            </CardTitle>
            <CardDescription>
              Select machine and date range to calculate payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCalculate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine">Select Machine</Label>
                <Select 
                  value={selectedMachine?.id || ''} 
                  onValueChange={(value) => {
                    const machine = machines.find(m => m.id === value);
                    setSelectedMachine(machine || null);
                  }}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                  />
                </div>
              </div>

              {selectedMachine && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">Machine Settings:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>All settings: Dynamic (varies by date)</div>
                    <div>Current values shown in calculations</div>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading || !selectedMachine} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Calculate Payment
              </Button>
            </form>
          </CardContent>
        </Card>

        {calculationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payment Breakdown
              </CardTitle>
              <CardDescription>
                Detailed calculation for {selectedMachine?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm">
                <div className="grid grid-cols-2">
                  <div className="font-medium">Sell Coin (Total - Initial)</div>
                  <div className="text-right">{calculationResult.totalCoins}</div>
                  </div>
                <div className="grid grid-cols-2">
                  <div className="font-medium">Prize Given (Total - Initial)</div>
                  <div className="text-right">{calculationResult.totalPrizes}</div>
                  </div>
                <div className="grid grid-cols-2">
                  <div className="font-medium">Sell Coin × Price</div>
                  <div className="text-right">{formatCurrencyBDT(calculationResult.totalIncome)}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Breakdown:</h4>
                <div className="flex justify-between">
                  <span>Prize Cost:</span>
                  <span>{formatCurrencyBDT(calculationResult.prizeCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Electricity Cost:</span>
                  <span>{formatCurrencyBDT(calculationResult.electricityCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT Amount:</span>
                  <span>{formatCurrencyBDT(calculationResult.vatAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Cost:</span>
                  <span>{formatCurrencyBDT(calculationResult.maintenanceCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clowee Profit Share:</span>
                  <span>{formatCurrencyBDT(calculationResult.profitShareAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Pay To Clowee:</span>
                <span className={calculationResult.payToClowee >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrencyBDT(calculationResult.payToClowee)}
                </span>
              </div>

              <Button onClick={handleSaveCalculation} disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Calculation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>



      {/* Pay to Clowee Records */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Pay to Clowee Records
          </CardTitle>
          <CardDescription>
            View and manage saved payment records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading records...</span>
            </div>
          ) : payToCloweeRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment records found. Create your first calculation above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Coins</TableHead>
                    <TableHead>Prizes</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payToCloweeRecords
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">{record.machines.name}</div>
                        <div className="text-sm text-muted-foreground">{record.machines.location}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDateRange(record.start_date, record.end_date)}</div>
                      </TableCell>
                      <TableCell className="text-center">{record.total_coins.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{record.total_prizes.toLocaleString()}</TableCell>
                      <TableCell className={record.net_payable >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {formatCurrencyBDT(record.net_payable)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setViewingRecord(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setViewingInvoice(record)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDownloadPDF(record)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteRecord(record.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payToCloweeRecords.length > pageSize && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, payToCloweeRecords.length)} of {payToCloweeRecords.length} records
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(payToCloweeRecords.length / pageSize), p + 1))}
                      disabled={currentPage >= Math.ceil(payToCloweeRecords.length / pageSize)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Record</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input name="start_date" type="date" defaultValue={editingRecord.start_date} required />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input name="end_date" type="date" defaultValue={editingRecord.end_date} required />
                </div>
                <div>
                  <Label>Total Coins</Label>
                  <Input name="total_coins" type="number" defaultValue={editingRecord.total_coins} required />
                </div>
                <div>
                  <Label>Total Prizes</Label>
                  <Input name="total_prizes" type="number" defaultValue={editingRecord.total_prizes} required />
                </div>
                <div className="col-span-2">
                  <Label>Net Payable</Label>
                  <Input name="net_payable" type="number" step="0.01" defaultValue={editingRecord.net_payable} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Record Details</DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Machine</Label>
                  <div className="p-2 bg-muted rounded">{viewingRecord.machines.name}</div>
                </div>
                <div>
                  <Label>Location</Label>
                  <div className="p-2 bg-muted rounded">{viewingRecord.machines.location}</div>
                </div>
                <div>
                  <Label>Period</Label>
                  <div className="p-2 bg-muted rounded">{formatDateRange(viewingRecord.start_date, viewingRecord.end_date)}</div>
                </div>
                <div>
                  <Label>Total Income</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.total_income)}</div>
                </div>
                <div>
                  <Label>Prize Cost</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.prize_cost)}</div>
                </div>
                <div>
                  <Label>Electricity Cost</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.electricity_cost)}</div>
                </div>
                <div>
                  <Label>VAT Amount</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.vat_amount)}</div>
                </div>
                <div>
                  <Label>Maintenance Cost</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.maintenance_cost)}</div>
                </div>
                <div>
                  <Label>Profit Share</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingRecord.profit_share_amount)}</div>
                </div>
                <div>
                  <Label className="font-bold">Net Payable</Label>
                  <div className={`p-2 rounded font-bold ${viewingRecord.net_payable >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {formatCurrencyBDT(viewingRecord.net_payable)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleDownloadPDF(viewingRecord)} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={() => setViewingRecord(null)} className="flex-1">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice View Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div>
              <InvoiceGenerator
                company={{
                  name: 'i3 Technologies',
                  address: 'House #29, Flat #C2, 29, Katasur, Mohammadpur, Dhaka-1207',
                  mobile: '+8801325-886868',
                  email: 'support@i3technologies.com.bd',
                  website: 'www.sohub.com.bd/clowee',
                  logoUrl: '/i3-logo.png',
                }}
                client={{
                  name: viewingInvoice.machines.name,
                  address: viewingInvoice.machines.location,
                }}
                invoiceNumber={`PAY-${viewingInvoice.id.slice(0, 8).toUpperCase()}`}
                invoiceDate={new Date(viewingInvoice.created_at).toISOString().split('T')[0]}
                items={[{
                  serial: 1,
                  description: 'Pay to Clowee - Machine Settlement',
                  period: formatDateRange(viewingInvoice.start_date, viewingInvoice.end_date),
                  total: viewingInvoice.net_payable,
                }]}
                banks={[{
                  bankName: 'Midland Bank Limited',
                  branch: 'Gulshan',
                  accountName: 'i3 Technologies',
                  accountNumber: '0011-1050008790',
                }]}
                footerNotes={[
                  'Payment due upon receipt.',
                  'Please send deposit slip/screenshot after payment.',
                ]}
                rightLogoUrl={'/clowee-logo.png'}
              />
              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleDownloadPDF(viewingInvoice)} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setViewingInvoice(null)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayToClowee;