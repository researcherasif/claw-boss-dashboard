import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AddMachine = () => {
  const [loading, setLoading] = useState(false);
  const [depositType, setDepositType] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      const ownerShare = parseFloat(formData.get('owner_profit_share_percentage') as string);
      const cloweeShare = parseFloat(formData.get('clowee_profit_share_percentage') as string);

      if (!Number.isFinite(ownerShare) || !Number.isFinite(cloweeShare)) {
        throw new Error('Please provide valid profit share percentages');
      }

      if (ownerShare + cloweeShare > 100.0) {
        throw new Error('Owner + Clowee profit share cannot exceed 100%');
      }

      // Detect if new share columns exist
      let supportsSplitShares = true;
      try {
        const test = await supabase
          .from('machines')
          .select('owner_profit_share_percentage, clowee_profit_share_percentage')
          .limit(1);
        if (test.error) supportsSplitShares = false;
      } catch {
        supportsSplitShares = false;
      }

      const baseData = {
        name: formData.get('name') as string,
        coin_price: parseFloat(formData.get('coin_price') as string),
        doll_price: parseFloat(formData.get('doll_price') as string),
        electricity_cost: parseFloat(formData.get('electricity_cost') as string),
        vat_percentage: parseFloat(formData.get('vat_percentage') as string),
        maintenance_percentage: parseFloat(formData.get('maintenance_percentage') as string),
        duration: formData.get('duration') as string,
        location: formData.get('location') as string,
        installation_date: formData.get('installation_date') as string,
        security_deposit_type: formData.get('security_deposit_type') as string,
        security_deposit_amount: depositType === 'cash' ? parseFloat(formData.get('security_deposit_amount') as string) : null,
        security_deposit_notes: depositType === 'cheque' 
          ? formData.get('security_deposit_cheque') as string
          : depositType === 'other'
          ? formData.get('security_deposit_other') as string
          : formData.get('security_deposit_notes') as string || null,
      } as any;

      const machineData = supportsSplitShares
        ? {
            ...baseData,
            owner_profit_share_percentage: ownerShare,
            clowee_profit_share_percentage: cloweeShare,
          }
        : {
            ...baseData,
            profit_share_percentage: cloweeShare,
          };

      const { error } = await supabase.from('machines').insert([machineData]);

      if (error) throw error;

      toast({
        title: "Machine added successfully",
        description: "The new machine has been registered in the system.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error adding machine",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Add New Machine</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Register a new claw machine in the system
        </p>
      </div>

      <Card className="modern-card card-hover neon-glow">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-semibold text-slate-100">Machine Details</CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Enter all the required information for the new claw machine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Claw Master Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Branch)</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g., Mall Branch A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coin_price">Coin Price (BDT)</Label>
                <Input
                  id="coin_price"
                  name="coin_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doll_price">Doll Price (BDT)</Label>
                <Input
                  id="doll_price"
                  name="doll_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electricity_cost">Electricity Cost (BDT)</Label>
                <Input
                  id="electricity_cost"
                  name="electricity_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_percentage">VAT Percentage (%)</Label>
                <Input
                  id="vat_percentage"
                  name="vat_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_profit_share_percentage">Restaurant Owner Profit Share (%)</Label>
                <Input
                  id="owner_profit_share_percentage"
                  name="owner_profit_share_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clowee_profit_share_percentage">Clowee Profit Share (%)</Label>
                <Input
                  id="clowee_profit_share_percentage"
                  name="clowee_profit_share_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="30.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_percentage">Maintenance Percentage (%)</Label>
                <Input
                  id="maintenance_percentage"
                  name="maintenance_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="5.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select name="duration" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="half_month">Half Month</SelectItem>
                    <SelectItem value="full_month">Full Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation_date">Installation Date</Label>
                <Input
                  id="installation_date"
                  name="installation_date"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="security_deposit_type">Security Deposit Type</Label>
                <Select name="security_deposit_type" value={depositType} onValueChange={setDepositType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deposit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {depositType === 'cheque' && (
                <div className="space-y-2">
                  <Label htmlFor="security_deposit_cheque">Cheque Details</Label>
                  <Input
                    id="security_deposit_cheque"
                    name="security_deposit_cheque"
                    type="text"
                    placeholder="Cheque number, bank name, etc."
                    required
                  />
                </div>
              )}

              {depositType === 'cash' && (
                <div className="space-y-2">
                  <Label htmlFor="security_deposit_amount">Cash Amount (BDT)</Label>
                  <Input
                    id="security_deposit_amount"
                    name="security_deposit_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10000.00"
                    required
                  />
                </div>
              )}

              {depositType === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="security_deposit_other">Other Details</Label>
                  <Input
                    id="security_deposit_other"
                    name="security_deposit_other"
                    type="text"
                    placeholder="Describe the deposit type"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_deposit_notes">Security Deposit Notes</Label>
              <Input
                id="security_deposit_notes"
                name="security_deposit_notes"
                type="text"
                placeholder="Additional notes about the security deposit"
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:scale-105">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Machine
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/')}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white py-3 rounded-lg transition-all duration-300"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMachine;