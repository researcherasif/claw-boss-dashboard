import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
  location: string;
}

const MachineReport = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMachines, setFetchingMachines] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('id, name, location')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMachine) return;
    
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const reportDate = formData.get('report_date') as string;
      const coinCount = parseInt(formData.get('coin_count') as string);
      const prizeCount = parseInt(formData.get('prize_count') as string);

      // Check if report already exists for this machine and date
      const { data: existingReport } = await supabase
        .from('machine_reports')
        .select('id')
        .eq('machine_id', selectedMachine)
        .eq('report_date', reportDate)
        .single();

      if (existingReport) {
        // Update existing report
        const { error } = await supabase
          .from('machine_reports')
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
        // Insert new report
        const { error } = await supabase
          .from('machine_reports')
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

      // Reset form
      (e.target as HTMLFormElement).reset();
      setSelectedMachine('');
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

  const today = new Date().toISOString().split('T')[0];

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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Machine Report</h1>
        <p className="text-muted-foreground">
          Record daily coin and prize counts for your machines
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Machine Report</CardTitle>
          <CardDescription>
            Select a machine and enter today's coin count and prize count
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
                  defaultValue={today}
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
                  required
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Report Instructions:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Count all coins collected from the machine today</li>
                <li>• Count all prizes dispensed to customers today</li>
                <li>• If a report already exists for this date, it will be updated</li>
                <li>• Reports can only be entered for today or past dates</li>
              </ul>
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
    </div>
  );
};

export default MachineReport;