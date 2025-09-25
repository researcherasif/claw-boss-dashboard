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
import { Calculator, Loader2, FileText, History, Trash2, Printer, Download } from 'lucide-react';
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
  profit_share_percentage: number;
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

interface PaymentCalculation {
  id: string;
  entry_date: string;
  entry_time: string;
  machine_id: string;
  machine_name: string;
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
  pay_to_clowee: number;
  created_at: string;
}

const PayToClowee = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [paymentCalculations, setPaymentCalculations] = useState<PaymentCalculation[]>([]);
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
      fetchPaymentCalculations();
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

  const fetchPaymentCalculations = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('payment_calculations')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentCalculations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading calculation history",
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

      // Get the last entry before the start date
      const { data: lastBeforeStart, error: beforeError } = await supabase
        .from('machine_counter_reports')
        .select('coin_count, prize_count')
        .eq('machine_id', selectedMachine.id)
        .lt('report_date', startDate)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (beforeError) throw beforeError;

      // Calculate totals: Last entry in range - Last entry before start
      const lastInRangeCoins = lastInRange.coin_count || 0;
      const lastInRangePrizes = lastInRange.prize_count || 0;
      const lastBeforeCoins = lastBeforeStart?.coin_count || 0;
      const lastBeforePrizes = lastBeforeStart?.prize_count || 0;

      const totalCoins = Math.max(0, lastInRangeCoins - lastBeforeCoins);
      const totalPrizes = Math.max(0, lastInRangePrizes - lastBeforePrizes);

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
      const cloweePercent = settings.profit_share_percentage;
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

      // Get current date and time
      const now = new Date();
      const entryDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const entryTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      const { error } = await supabase
        .from('payment_calculations')
        .insert([{
          entry_date: entryDate,
          entry_time: entryTime,
          machine_id: selectedMachine.id,
          machine_name: selectedMachine.name,
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
          pay_to_clowee: calculationResult.payToClowee,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Calculation saved successfully",
        description: "The payment calculation has been saved to records.",
      });

      // Refresh the calculation history
      await fetchPaymentCalculations();

      // Keep the current calculation visible and show invoice actions below

    } catch (error: any) {
      toast({
        title: "Error saving calculation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Calculation deleted",
        description: "The payment calculation has been removed.",
      });

      // Refresh the calculation history
      await fetchPaymentCalculations();
    } catch (error: any) {
      toast({
        title: "Error deleting calculation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pay to Clowee</h1>
        <p className="text-muted-foreground">
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
                  <div className="font-medium">Today Coin</div>
                  <div className="text-right">{calculationResult.totalCoins}</div>
                  </div>
                <div className="grid grid-cols-2">
                  <div className="font-medium">Today Prize</div>
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

      {/* Inline Invoice Actions when a calculation exists */}
      {calculationResult && selectedMachine && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice
            </CardTitle>
            <CardDescription>
              Preview and generate invoice for {selectedMachine.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                name: selectedMachine.name,
                address: selectedMachine.location,
              }}
              invoiceNumber={`INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${selectedMachine.id.slice(0,5)}`}
              invoiceDate={new Date().toISOString().split('T')[0]}
              items={[{
                serial: 1,
                description: 'Pay to Clowee - Machine Settlement',
                period: (() => {
                  const form = document.querySelector('form') as HTMLFormElement | null;
                  const s = form ? (form.querySelector('#start_date') as HTMLInputElement)?.value : '';
                  const e = form ? (form.querySelector('#end_date') as HTMLInputElement)?.value : '';
                  return s && e ? `${s} to ${e}` : '';
                })(),
                total: calculationResult.payToClowee,
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
          </CardContent>
        </Card>
      )}

      {/* Payment Calculation History */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment Calculation History
          </CardTitle>
          <CardDescription>
            View and manage your saved payment calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading history...</span>
            </div>
          ) : paymentCalculations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment calculations found. Create your first calculation above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry Date</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Machine ID</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Total Coins</TableHead>
                    <TableHead>Total Prizes</TableHead>
                    <TableHead>Pay To Clowee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentCalculations.map((calculation) => (
                    <TableRow key={calculation.id}>
                      <TableCell>{calculation.entry_date}</TableCell>
                      <TableCell>{calculation.entry_time}</TableCell>
                      <TableCell className="font-medium">{calculation.machine_name}</TableCell>
                      <TableCell className="font-mono text-xs">{calculation.machine_id.slice(0, 8)}...</TableCell>
                      <TableCell>{calculation.start_date}</TableCell>
                      <TableCell>{calculation.end_date}</TableCell>
                      <TableCell className="text-center font-medium">{calculation.total_coins.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-medium">{calculation.total_prizes.toLocaleString()}</TableCell>
                      <TableCell className={calculation.pay_to_clowee >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {formatCurrencyBDT(calculation.pay_to_clowee)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCalculation(calculation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayToClowee;