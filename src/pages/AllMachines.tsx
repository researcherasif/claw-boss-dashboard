import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';

interface Machine {
  id: string;
  franchise_id: string;
  name: string;
  machine_number: string;
  machine_id_esp: string;
  branch_location: string;
  installation_date: string;
  initial_coin_counter: number;
  initial_prize_counter: number;
  notes?: string;
  franchises: { name: string };
}

interface Franchise {
  id: string;
  name: string;
}

export function AllMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [machinesResponse, franchisesResponse] = await Promise.all([
          supabase.from('machines').select('*, franchises(name)'),
          supabase.from('franchises').select('id, name').eq('is_active', true)
        ]);

        if (machinesResponse.error) throw machinesResponse.error;
        if (franchisesResponse.error) throw franchisesResponse.error;

        setMachines(machinesResponse.data as Machine[]);
        setFranchises(franchisesResponse.data as Franchise[]);
      } catch (error: any) {
        toast.error(`Error loading data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const initialCoinCounter = parseInt(formData.get('initial_coin_counter') as string) || 0;
      const initialPrizeCounter = parseInt(formData.get('initial_prize_counter') as string) || 0;
      const installationDate = formData.get('installation_date') as string;
      
      // Insert machine first
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .insert({
          franchise_id: formData.get('franchise_id') as string,
          name: formData.get('name') as string,
          machine_number: formData.get('machine_number') as string,
          esp_id: formData.get('esp_id') as string,
          branch_location: formData.get('branch_location') as string,
          installation_date: installationDate,
          initial_coin_counter: initialCoinCounter,
          initial_prize_counter: initialPrizeCounter,
          notes: formData.get('notes') as string,
        })
        .select()
        .single();
      
      if (machineError) throw machineError;
      
      // Create initial counter report entry
      console.log('Creating initial report for machine:', machineData.id, 'with counters:', { initialCoinCounter, initialPrizeCounter });
      
      const { error: reportError } = await supabase
        .from('machine_counter_reports')
        .insert({
          machine_id: machineData.id,
          report_date: installationDate,
          coin_count: initialCoinCounter,
          prize_count: initialPrizeCounter,
          notes: 'Initial setup counters',
          created_by: user?.id || 'system'
        });
      
      if (reportError) {
        console.error('Failed to create initial report:', reportError);
        toast.error(`Machine added but initial report failed: ${reportError.message}`);
      } else {
        console.log('Initial report created successfully');
      }
      
      toast.success('Machine added successfully!');
      setAddDialogOpen(false);
      setSelectedFranchiseId('');
      
      // Refresh machines list
      const { data } = await supabase.from('machines').select('*, franchises(name)');
      setMachines(data as Machine[]);
    } catch (error: any) {
      toast.error(`Add failed: ${error.message}`);
    } finally {
      setAddSaving(false);
    }
  };

  const handleEditMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setEditSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const newInitialCoin = parseInt(formData.get('initial_coin_counter') as string) || 0;
      const newInitialPrize = parseInt(formData.get('initial_prize_counter') as string) || 0;
      const installationDate = formData.get('installation_date') as string;
      
      // Update machine
      const { error: machineError } = await supabase
        .from('machines')
        .update({
          name: formData.get('name') as string,
          machine_number: formData.get('machine_number') as string,
          esp_id: formData.get('esp_id') as string,
          branch_location: formData.get('branch_location') as string,
          installation_date: installationDate,
          initial_coin_counter: newInitialCoin,
          initial_prize_counter: newInitialPrize,
          notes: formData.get('notes') as string,
        })
        .eq('id', selectedMachine.id);
      
      if (machineError) throw machineError;
      
      // Only create/update report if we have initial counters
      if (newInitialCoin > 0 || newInitialPrize > 0) {
        console.log('Creating/updating initial report with counters:', { newInitialCoin, newInitialPrize });
        
        // Check for existing initial report
        const { data: existingInitialReport, error: fetchError } = await supabase
          .from('machine_counter_reports')
          .select('id')
          .eq('machine_id', selectedMachine.id)
          .order('report_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error fetching existing report:', fetchError);
        }
        
        if (existingInitialReport) {
          console.log('Updating existing initial report:', existingInitialReport.id);
          // Update existing initial report
          const { error: reportError } = await supabase
            .from('machine_counter_reports')
            .update({
              report_date: installationDate,
              coin_count: newInitialCoin,
              prize_count: newInitialPrize,
              notes: 'Initial setup counters (updated)',
            })
            .eq('id', existingInitialReport.id);
          
          if (reportError) {
            console.error('Failed to update initial report:', reportError);
            toast.error(`Failed to update initial report: ${reportError.message}`);
          } else {
            console.log('Initial report updated successfully');
          }
        } else {
          console.log('Creating new initial report');
          // Create new initial report if none exists
          const { error: reportError } = await supabase
            .from('machine_counter_reports')
            .insert({
              machine_id: selectedMachine.id,
              report_date: installationDate,
              coin_count: newInitialCoin,
              prize_count: newInitialPrize,
              notes: 'Initial setup counters',
              created_by: user?.id || 'system'
            });
          
          if (reportError) {
            console.error('Failed to create initial report:', reportError);
            toast.error(`Failed to create initial report: ${reportError.message}`);
          } else {
            console.log('Initial report created successfully');
          }
        }
      } else {
        console.log('No initial counters provided, skipping report creation');
      }
      
      toast.success('Machine updated successfully!');
      setEditDialogOpen(false);
      
      // Refresh machines list
      const { data } = await supabase.from('machines').select('*, franchises(name)');
      setMachines(data as Machine[]);
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Machines</CardTitle>
            <CardDescription>Manage your claw machines.</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Machine
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto" style={{ maxHeight: '600px' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine Name</TableHead>
                  <TableHead>Machine Number</TableHead>
                  <TableHead>Franchise</TableHead>
                  <TableHead>Branch Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (
                  machines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{m.machine_number}</TableCell>
                      <TableCell>{m.franchises.name}</TableCell>
                      <TableCell>{m.branch_location}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedMachine(m) || setViewDialogOpen(true)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedMachine(m) || setEditDialogOpen(true)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirm(`Delete machine "${m.name}"?`) && supabase.from('machines').delete().eq('id', m.id).then(() => setMachines(machines.filter(machine => machine.id !== m.id)))}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>



      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Machine Details</DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Name:</strong> {selectedMachine.name}</div>
                <div><strong>Number:</strong> {selectedMachine.machine_number}</div>
                <div><strong>ESP ID:</strong> {selectedMachine.machine_id_esp}</div>
                <div><strong>Location:</strong> {selectedMachine.branch_location}</div>
                <div><strong>Franchise:</strong> {selectedMachine.franchises.name}</div>
                <div><strong>Installation Date:</strong> {selectedMachine.installation_date}</div>
              </div>
              {selectedMachine.notes && (
                <div><strong>Notes:</strong> {selectedMachine.notes}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Machine</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMachine} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchise_id">Franchise*</Label>
                <Select name="franchise_id" value={selectedFranchiseId} onValueChange={setSelectedFranchiseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select franchise" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name*</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machine_number">Machine Number*</Label>
                <Input id="machine_number" name="machine_number" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esp_id">Machine ID (ESP ID)*</Label>
                <Input id="esp_id" name="esp_id" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_location">Branch Location*</Label>
                <Input id="branch_location" name="branch_location" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installation_date">Installation Date*</Label>
                <Input id="installation_date" name="installation_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_coin_counter">Initial Coin Counter</Label>
                <Input id="initial_coin_counter" name="initial_coin_counter" type="number" min="0" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_prize_counter">Initial Prize Counter</Label>
                <Input id="initial_prize_counter" name="initial_prize_counter" type="number" min="0" defaultValue="0" />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => {
                setAddDialogOpen(false);
                setSelectedFranchiseId('');
              }}>Cancel</Button>
              <Button type="submit" disabled={addSaving}>{addSaving ? 'Adding...' : 'Add Machine'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <form onSubmit={handleEditMachine} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Machine Name*</Label>
                  <Input id="name" name="name" defaultValue={selectedMachine.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machine_number">Machine Number*</Label>
                  <Input id="machine_number" name="machine_number" defaultValue={selectedMachine.machine_number} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="esp_id">Machine ID (ESP ID)*</Label>
                  <Input id="esp_id" name="esp_id" defaultValue={selectedMachine.machine_id_esp} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_location">Branch Location*</Label>
                  <Input id="branch_location" name="branch_location" defaultValue={selectedMachine.branch_location} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installation_date">Installation Date*</Label>
                  <Input id="installation_date" name="installation_date" type="date" defaultValue={selectedMachine.installation_date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_coin_counter">Initial Coin Counter</Label>
                  <Input id="initial_coin_counter" name="initial_coin_counter" type="number" min="0" defaultValue={selectedMachine.initial_coin_counter} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_prize_counter">Initial Prize Counter</Label>
                  <Input id="initial_prize_counter" name="initial_prize_counter" type="number" min="0" defaultValue={selectedMachine.initial_prize_counter} />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={selectedMachine.notes || ''} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AllMachines;