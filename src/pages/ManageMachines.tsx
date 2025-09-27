import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrencyBDT } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import MachineSettingsManager from '@/components/MachineSettingsManager';
import { MachineSettingHistory } from '@/lib/machineSettings';

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
  installation_date: string;
  is_active: boolean;
}

const ManageMachines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [recentChanges, setRecentChanges] = useState<(MachineSettingHistory & { machine_name: string })[]>([]);
  const [editingChange, setEditingChange] = useState<(MachineSettingHistory & { machine_name: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fieldLabels = {
    coin_price: 'Coin Price',
    doll_price: 'Doll Price',
    electricity_cost: 'Electricity Cost',
    vat_percentage: 'VAT %',
    maintenance_percentage: 'Maintenance %',
    clowee_profit_share_percentage: 'Clowee Profit Share %',
    franchise_profit_share_percentage: 'Franchise Profit Share %',
    duration: 'Duration'
  };

  useEffect(() => {
    fetchMachines();
    fetchRecentChanges();
  }, []);

  const fetchMachines = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentChanges = async () => {
    try {
      // First get settings history
      const { data: historyData, error: historyError } = await supabase
        .from('machine_settings_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      // Then get machines data
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id, name');

      if (machinesError) throw machinesError;

      // Merge the data
      const formattedData = (historyData || []).map(item => {
        const machine = machinesData?.find(m => m.id === item.machine_id);
        return {
          ...item,
          machine_name: machine?.name || 'Unknown Machine'
        };
      });
      
      setRecentChanges(formattedData);
    } catch (error: any) {
      toast({
        title: "Error loading recent changes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Manage Machines</h1>
        <p className="text-muted-foreground">
          Manage machine settings and doll pricing history
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Select Machine
            </CardTitle>
            <CardDescription>
              Choose a machine to manage its doll pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="machine">Machine</Label>
              <Select 
                value={selectedMachine?.id || ''} 
                onValueChange={(value) => {
                  const machine = machines.find(m => m.id === value);
                  setSelectedMachine(machine || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a machine to manage" />
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
          </CardContent>
        </Card>

        {selectedMachine && (
          <MachineSettingsManager 
            machineId={selectedMachine.id} 
            machineName={selectedMachine.name}
            onSettingAdded={fetchRecentChanges}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Changes
            </CardTitle>
            <CardDescription>
              Last 20 setting changes across all machines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentChanges.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent changes found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium">{change.machine_name}</TableCell>
                      <TableCell>{fieldLabels[change.field_name as keyof typeof fieldLabels] || change.field_name}</TableCell>
                      <TableCell>
                        {change.field_name.includes('price') || change.field_name.includes('cost') 
                          ? formatCurrencyBDT(parseFloat(change.field_value))
                          : change.field_name.includes('percentage')
                          ? `${change.field_value}%`
                          : change.field_value}
                      </TableCell>
                      <TableCell>{change.effective_date}</TableCell>
                      <TableCell>{formatDate(change.created_at)}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingChange(change)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (confirm('Delete this change?')) {
                              await supabase.from('machine_settings_history').delete().eq('id', change.id);
                              toast({ title: "Setting deleted" });
                              fetchRecentChanges();
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingChange} onOpenChange={(open) => !open && setEditingChange(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Setting Change</DialogTitle>
              <DialogDescription>
                Modify the setting value and effective date
              </DialogDescription>
            </DialogHeader>
            {editingChange && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                const formData = new FormData(e.target as HTMLFormElement);
                const fieldValue = formData.get('field_value') as string;
                const effectiveDate = formData.get('effective_date') as string;
                
                await supabase
                  .from('machine_settings_history')
                  .update({ field_value: fieldValue, effective_date: effectiveDate })
                  .eq('id', editingChange.id);
                
                toast({ title: "Setting updated" });
                setEditingChange(null);
                setSaving(false);
                fetchRecentChanges();
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Machine</Label>
                  <Input value={editingChange.machine_name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Input value={fieldLabels[editingChange.field_name as keyof typeof fieldLabels]} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_value">Value</Label>
                  <Input
                    id="field_value"
                    name="field_value"
                    type={editingChange.field_name.includes('percentage') || editingChange.field_name.includes('price') || editingChange.field_name.includes('cost') ? 'number' : 'text'}
                    step="0.01"
                    defaultValue={editingChange.field_value}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    name="effective_date"
                    type="date"
                    defaultValue={editingChange.effective_date}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingChange(null)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageMachines;