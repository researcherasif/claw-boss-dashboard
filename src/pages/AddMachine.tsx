import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

interface Franchise {
  id: string;
  franchise_name: string;
}

const AddMachine = () => {
  const [loading, setLoading] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    try {
      console.log('Fetching franchises...');
      const { data, error } = await supabase
        .from('franchises')
        .select('id, franchise_name')
        .eq('is_active', true);
      
      console.log('Franchise query result:', { data, error });
      
      if (error) throw error;
      
      setFranchises(data || []);
      console.log('Franchises set:', data);
      
      if (!data || data.length === 0) {
        toast.error('No active franchises found. Please add a franchise first.');
      } else {
        toast.success(`Found ${data.length} franchise(s)`);
      }
    } catch (error: any) {
      console.error('Error fetching franchises:', error);
      toast.error('Error fetching franchises: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      const machineData = {
        franchise_id: formData.get('franchise_id') as string,
        name: formData.get('name') as string,
        machine_number: formData.get('machine_number') as string,
        esp_id: formData.get('machine_id_esp') as string,
        branch_location: formData.get('branch_location') as string,
        installation_date: formData.get('installation_date') as string,
        notes: formData.get('notes') as string || null,
      };

      const { data: machine, error: machineError } = await supabase
        .from('machines')
        .insert([machineData])
        .select()
        .single();

      if (machineError) throw machineError;

      // Create initial counter report
      const counterData = {
        machine_id: machine.id,
        report_date: formData.get('installation_date') as string,
        coin_count: parseInt(formData.get('initial_coin_counter') as string),
        prize_count: parseInt(formData.get('initial_prize_counter') as string),
        notes: 'Initial setup counters',
      };

      const { error: counterError } = await supabase
        .from('machine_counter_reports')
        .insert([counterData]);

      if (counterError) throw counterError;

      toast.success('Machine added successfully');
      navigate('/');
    } catch (error: any) {
      toast.error('Error adding machine: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Add New Machine</h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">
          Register a new claw machine in the system
        </p>
      </div>

      <Card className="modern-card card-hover neon-glow">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-semibold">Machine Details</CardTitle>
          <CardDescription className="text-base">
            Enter all the required information for the new machine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchise_id">Franchise *</Label>
                <Select name="franchise_id" value={selectedFranchise} onValueChange={setSelectedFranchise} required>
                  <SelectTrigger>
                    <SelectValue placeholder={franchises.length === 0 ? "No franchises available" : "Select franchise"} />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.length === 0 ? (
                      <SelectItem value="" disabled>
                        No franchises found
                      </SelectItem>
                    ) : (
                      franchises.map((franchise) => (
                        <SelectItem key={franchise.id} value={franchise.id}>
                          {franchise.franchise_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {franchises.length === 0 && (
                  <p className="text-sm text-red-500">
                    No active franchises found. Please add a franchise first.
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Debug: Found {franchises.length} franchises
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Machine Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Claw Master Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine_number">Machine Number *</Label>
                <Input
                  id="machine_number"
                  name="machine_number"
                  type="text"
                  placeholder="e.g., CM001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine_id_esp">Machine ID (ESP ID) *</Label>
                <Input
                  id="machine_id_esp"
                  name="machine_id_esp"
                  type="text"
                  placeholder="e.g., ESP001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_location">Branch Location *</Label>
                <Input
                  id="branch_location"
                  name="branch_location"
                  type="text"
                  placeholder="e.g., Mall Branch A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation_date">Installation Date *</Label>
                <Input
                  id="installation_date"
                  name="installation_date"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_coin_counter">Initial Coin Counter *</Label>
                <Input
                  id="initial_coin_counter"
                  name="initial_coin_counter"
                  type="number"
                  min="0"
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_prize_counter">Initial Prize Counter *</Label>
                <Input
                  id="initial_prize_counter"
                  name="initial_prize_counter"
                  type="number"
                  min="0"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Optional notes about the machine..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Machine
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')} className="flex-1">
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