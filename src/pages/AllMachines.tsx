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
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Edit, Trash2 } from 'lucide-react';

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
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({});
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [machinesResponse, franchisesResponse] = await Promise.all([
          supabase.from('machines').select('*, franchises(name)'),
          supabase.from('franchises').select('id, name'),
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        const { data, error } = await supabase.from('machines').insert([newMachine]).select('*, franchises(name)').single();
      if (error) throw error;
      
      setMachines([...machines, data as Machine]);
      toast.success('Machine Added');
      setAddDialogOpen(false);
      setNewMachine({});
    } catch (error: any) {
      toast.error(`Error saving machine: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setEditSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const { error } = await supabase
        .from('machines')
        .update({
          franchise_id: formData.get('franchise_id') as string,
          name: formData.get('name') as string,
          machine_number: formData.get('machine_number') as string,
          esp_id: formData.get('esp_id') as string,
          branch_location: formData.get('branch_location') as string,
          installation_date: formData.get('installation_date') as string,
          notes: formData.get('notes') as string,
        })
        .eq('id', selectedMachine.id);
      
      if (error) throw error;
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
          <Button onClick={() => setAddDialogOpen(true)}>Add Machine</Button>
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

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) setNewMachine({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Machine</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="franchiseId">Franchise*</Label>
                <Select required value={newMachine.franchise_id || ''} onValueChange={(value) => setNewMachine({...newMachine, franchise_id: value})}>
                  <SelectTrigger><SelectValue placeholder="Select a franchise" /></SelectTrigger>
                  <SelectContent>
                    {franchises.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name*</Label>
                <Input id="name" required onChange={(e) => setNewMachine({...newMachine, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machineNumber">Machine Number*</Label>
                <Input id="machineNumber" required onChange={(e) => setNewMachine({...newMachine, machine_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="espId">Machine ID (ESP ID)*</Label>
                <Input id="espId" required onChange={(e) => setNewMachine({...newMachine, esp_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchLocation">Branch Location*</Label>
                <Input id="branchLocation" required onChange={(e) => setNewMachine({...newMachine, branch_location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installationDate">Installation Date*</Label>
                <Input id="installationDate" type="date" required onChange={(e) => setNewMachine({...newMachine, installation_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialCoinCounter">Initial Coin Counter*</Label>
                <Input id="initialCoinCounter" type="number" required onChange={(e) => setNewMachine({...newMachine, initial_coin_counter: +e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialPrizeCounter">Initial Prize Counter*</Label>
                <Input id="initialPrizeCounter" type="number" required onChange={(e) => setNewMachine({...newMachine, initial_prize_counter: +e.target.value})} />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" onChange={(e) => setNewMachine({...newMachine, notes: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => {
                setAddDialogOpen(false);
                setNewMachine({});
              }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Machine'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>.
      </Dialog>

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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <form onSubmit={handleEditMachine} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="franchise_id">Franchise*</Label>
                  <Select name="franchise_id" defaultValue={selectedMachine.franchise_id} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {franchises.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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