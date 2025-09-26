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
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2 } from 'lucide-react';

// Mock API - replace with your actual API calls
const api = {
  getMachines: async () => {
    return [
        { id: '1', name: 'Claw 1', machineNumber: 'C-001', espId: 'ESP8266-1', branchLocation: 'Gulshan', franchiseName: 'Sample Franchise' }
    ];
  },
  getFranchises: async () => {
    return [
        { id: '1', name: 'Sample Franchise' },
        { id: '2', name: 'Another Franchise' }
    ];
  },
  createMachine: async (data: Partial<Machine>) => { console.log('create machine', data); return { id: '2', ...data }; },
};

interface Machine {
  id: string;
  franchiseId: string;
  name: string;
  machineNumber: string;
  espId: string;
  branchLocation: string;
  installationDate: string;
  initialCoinCounter: number;
  initialPrizeCounter: number;
  notes?: string;
}

interface Franchise {
    id: string;
    name: string;
}

export function AllMachines() {
  const [machines, setMachines] = useState<any[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [machinesData, franchisesData] = await Promise.all([
          api.getMachines(),
          api.getFranchises(),
        ]);
        setMachines(machinesData);
        setFranchises(franchisesData);
      } catch (error: any) {
        toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createMachine(newMachine);
      const franchise = franchises.find(f => f.id === created.franchiseId);
      setMachines([...machines, { ...created, franchiseName: franchise?.name }]);
      toast({ title: 'Machine Added' });
      setAddDialogOpen(false);
      setNewMachine({});
    } catch (error: any) {
      toast({ title: 'Error saving machine', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete machine "${name}"?`)) {
      try {
        setMachines(machines.filter(m => m.id !== id));
        toast({ title: 'Machine deleted successfully' });
      } catch (error: any) {
        toast({ title: 'Error deleting machine', description: error.message, variant: 'destructive' });
      }
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
                      <TableCell>{m.machineNumber}</TableCell>
                      <TableCell>{m.franchiseName}</TableCell>
                      <TableCell>{m.branchLocation}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => console.log('Edit machine:', m.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMachine(m.id, m.name)}
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

      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Machine</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="franchiseId">Franchise*</Label>
                <Select required onValueChange={(value) => setNewMachine({...newMachine, franchiseId: value})}>
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
                <Input id="machineNumber" required onChange={(e) => setNewMachine({...newMachine, machineNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="espId">Machine ID (ESP ID)*</Label>
                <Input id="espId" required onChange={(e) => setNewMachine({...newMachine, espId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchLocation">Branch Location*</Label>
                <Input id="branchLocation" required onChange={(e) => setNewMachine({...newMachine, branchLocation: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installationDate">Installation Date*</Label>
                <Input id="installationDate" type="date" required onChange={(e) => setNewMachine({...newMachine, installationDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialCoinCounter">Initial Coin Counter*</Label>
                <Input id="initialCoinCounter" type="number" required onChange={(e) => setNewMachine({...newMachine, initialCoinCounter: +e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialPrizeCounter">Initial Prize Counter*</Label>
                <Input id="initialPrizeCounter" type="number" required onChange={(e) => setNewMachine({...newMachine, initialPrizeCounter: +e.target.value})} />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" onChange={(e) => setNewMachine({...newMachine, notes: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Machine'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AllMachines;