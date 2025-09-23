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
  profitShareAmount: number;
  netPayable: number;
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

      // Fetch machine reports for the date range
      const { data: reports, error } = await supabase
        .from('machine_reports')
        .select('*')
        .eq('machine_id', selectedMachine.id)
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date');

      if (error) throw error;

      if (!reports || reports.length === 0) {
        toast({
          title: "No reports found",
          description: "No machine reports found for the selected date range.",
          variant: "destructive",
        });
        setCalculationResult(null);
        return;
      }

      // Calculate totals
      const totalCoins = reports.reduce((sum, report) => sum + report.coin_count, 0);
      const totalPrizes = reports.reduce((sum, report) => sum + report.prize_count, 0);

      // Calculate amounts
      const totalIncome = totalCoins * selectedMachine.coin_price;
      const prizeCost = totalPrizes * selectedMachine.doll_price;
      const electricityCost = selectedMachine.electricity_cost;
      const vatAmount = totalIncome * (selectedMachine.vat_percentage / 100);
      const maintenanceCost = totalIncome * (selectedMachine.maintenance_percentage / 100);
      const profitShareAmount = totalIncome * (selectedMachine.profit_share_percentage / 100);

      const netPayable = totalIncome - (prizeCost + electricityCost + vatAmount + maintenanceCost + profitShareAmount);

      setCalculationResult({
        totalCoins,
        totalPrizes,
        totalIncome,
        prizeCost,
        electricityCost,
        vatAmount,
        maintenanceCost,
        profitShareAmount,
        netPayable,
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
          net_payable: calculationResult.netPayable,
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
                    <div>Electricity: {formatCurrencyBDT(selectedMachine.electricity_cost)}</div>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Coins:</span>
                    <span className="font-semibold">{calculationResult.totalCoins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Prizes:</span>
                    <span className="font-semibold">{calculationResult.totalPrizes}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-green-600">
                    <span>Total Income:</span>
                    <span className="font-semibold">{formatCurrencyBDT(calculationResult.totalIncome)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-red-600">Deductions:</h4>
                <div className="flex justify-between">
                  <span>Prize Cost:</span>
                  <span>- {formatCurrencyBDT(calculationResult.prizeCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Electricity Cost:</span>
                  <span>- {formatCurrencyBDT(calculationResult.electricityCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT Amount:</span>
                  <span>- {formatCurrencyBDT(calculationResult.vatAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Cost:</span>
                  <span>- {formatCurrencyBDT(calculationResult.maintenanceCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Share:</span>
                  <span>- {formatCurrencyBDT(calculationResult.profitShareAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Net Payable to Clowee:</span>
                <span className={calculationResult.netPayable >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrencyBDT(calculationResult.netPayable)}
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