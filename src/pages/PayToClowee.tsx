import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Loader2, FileText } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/currency';

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

const PayToClowee = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMachines();
  }, []);

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

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !user) return;

    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;

      // Use cumulative counter logic: (latest on/before end) - (latest before start)
      const { data: endReading, error: endErr } = await supabase
        .from('machine_reports')
        .select('coin_count, prize_count')
        .eq('machine_id', selectedMachine.id)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (endErr) throw endErr;

      const { data: startPrevReading, error: startPrevErr } = await supabase
        .from('machine_reports')
        .select('coin_count, prize_count')
        .eq('machine_id', selectedMachine.id)
        .lt('report_date', startDate)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (startPrevErr) throw startPrevErr;

      const endCoins = endReading?.coin_count ?? 0;
      const endPrizes = endReading?.prize_count ?? 0;
      const startPrevCoins = startPrevReading?.coin_count ?? 0;
      const startPrevPrizes = startPrevReading?.prize_count ?? 0;

      const totalCoins = Math.max(0, endCoins - startPrevCoins);
      const totalPrizes = Math.max(0, endPrizes - startPrevPrizes);

      // Calculate amounts
      const totalIncome = totalCoins * selectedMachine.coin_price;
      const prizeCost = totalPrizes * selectedMachine.doll_price;
      const electricityCostFull = selectedMachine.electricity_cost;
      const vatAmount = totalIncome * (selectedMachine.vat_percentage / 100);
      const maintenanceCost = totalIncome * (selectedMachine.maintenance_percentage / 100);
      // Profit base = Total Income − (Prize Cost + VAT + Maintenance)
      const profitBase = totalIncome - (prizeCost + vatAmount + maintenanceCost);
      // Clowee share percent (default 50 if not set explicitly)
      const cloweePercent = Number.isFinite(selectedMachine.profit_share_percentage)
        ? selectedMachine.profit_share_percentage
        : 50;
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
        title: "Calculation saved successfully",
        description: "The payment calculation has been saved to records.",
      });

      // Reset form and calculation
      setCalculationResult(null);
      setSelectedMachine(null);
      (document.querySelector('form') as HTMLFormElement).reset();

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
                    <div>Coin Price: {formatCurrencyBDT(selectedMachine.coin_price)}</div>
                    <div>Doll Price: {formatCurrencyBDT(selectedMachine.doll_price)}</div>
                <div>Electricity (50%): {formatCurrencyBDT(selectedMachine.electricity_cost / 2)}</div>
                    <div>VAT: {selectedMachine.vat_percentage}%</div>
                    <div>Profit Share: {selectedMachine.profit_share_percentage}%</div>
                    <div>Maintenance: {selectedMachine.maintenance_percentage}%</div>
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
                  <span>Clowee Profit Share ({selectedMachine?.profit_share_percentage}%):</span>
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
    </div>
  );
};

export default PayToClowee;