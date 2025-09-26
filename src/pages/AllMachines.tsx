import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Trash2, Plus, Eye } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/currency';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TablePagination } from '@/components/TablePagination';

interface Machine {
  id: string;
  machine_number?: string;
  name: string;
  location: string;
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  vat_percentage: number;
  clowee_profit_share_percentage?: number;
  franchise_profit_share_percentage?: number;
  maintenance_percentage: number;
  duration: string;
  installation_date: string;
  security_deposit_type: string | null;
  security_deposit_amount: number | null;
  security_deposit_notes: string | null;

  is_active: boolean;
}

const AllMachines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [saving, setSaving] = useState(false);
  const [franchiseShare, setFranchiseShare] = useState(0);
  const [cloweeShare, setCloweeShare] = useState(0);
  const [viewingMachine, setViewingMachine] = useState<Machine | null>(null);
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFranchiseShareChange = (value: number) => {
    setFranchiseShare(value);
    setCloweeShare(100 - value);
  };

  const handleCloweeShareChange = (value: number) => {
    setCloweeShare(value);
    setFranchiseShare(100 - value);
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMachines(data || []);
    } catch (error: any) {
      toast({ title: 'Error loading machines', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (machine: Machine) => {
    setEditing(machine);
    setFranchiseShare(machine.franchise_profit_share_percentage || 0);
    setCloweeShare(machine.clowee_profit_share_percentage || 0);
  };
  const closeEdit = () => setEditing(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const updated = {
        machine_number: formData.get('machine_number') as string,
        name: formData.get('name') as string,
        location: formData.get('location') as string,
        coin_price: parseFloat(formData.get('coin_price') as string),
        doll_price: parseFloat(formData.get('doll_price') as string),
        electricity_cost: parseFloat(formData.get('electricity_cost') as string),
        vat_percentage: parseFloat(formData.get('vat_percentage') as string),
        franchise_profit_share_percentage: parseFloat(formData.get('franchise_profit_share_percentage') as string),
        clowee_profit_share_percentage: parseFloat(formData.get('clowee_profit_share_percentage') as string),

        maintenance_percentage: parseFloat(formData.get('maintenance_percentage') as string),
        duration: formData.get('duration') as string,
        installation_date: formData.get('installation_date') as string,
        security_deposit_type: formData.get('security_deposit_type') as string || null,
        security_deposit_amount: formData.get('security_deposit_amount') ? parseFloat(formData.get('security_deposit_amount') as string) : null,
        security_deposit_notes: formData.get('security_deposit_notes') as string || null,
      };
      const { error } = await supabase.from('machines').update(updated).eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Machine updated' });
      closeEdit();
      fetchMachines();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (machine: Machine, nextActive: boolean) => {
    try {
      const { error } = await supabase
        .from('machines')
        .update({ is_active: nextActive })
        .eq('id', machine.id);
      if (error) throw error;
      toast({ title: nextActive ? 'Machine activated' : 'Machine deactivated' });
      fetchMachines();
    } catch (error: any) {
      toast({ title: 'Status update failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingMachine) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('machines').delete().eq('id', deletingMachine.id);
      if (error) throw error;
      toast({ title: 'Machine deleted' });
      setDeletingMachine(null);
      fetchMachines();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">All Machines</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage, edit, and delete machines</p>
        </div>
        <Button onClick={() => navigate('/add-machine')} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Add Machine</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machines List</CardTitle>
          <CardDescription>List of all machines</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[50px]">Machine #</TableHead>
                <TableHead className="min-w-[80px]">Name</TableHead>
                <TableHead className="min-w-[100px]">Location</TableHead>
                <TableHead className="min-w-[80px]">Coin Price</TableHead>
                <TableHead className="min-w-[80px]">Doll Price</TableHead>
                {/* <TableHead className="min-w-[80px]">Electricity</TableHead> */}
                <TableHead className="min-w-[100px]">Duration</TableHead>
                <TableHead className="min-w-[80px]">Deposit</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.machine_number}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>{formatCurrencyBDT(m.coin_price)}</TableCell>
                  <TableCell>{formatCurrencyBDT(m.doll_price)}</TableCell>
                  {/* <TableCell>{formatCurrencyBDT(m.electricity_cost)}</TableCell> */}
                  <TableCell>{m.duration?.replace('_', ' ')}</TableCell>
                  <TableCell>{m.security_deposit_type || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={m.is_active} onCheckedChange={(val) => toggleActive(m, val)} />
                      <span className={m.is_active ? 'text-green-600' : 'text-red-600'}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setViewingMachine(m)} className="text-xs">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)} className="text-xs">
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingMachine(m)} className="text-xs">
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No machines found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {machines.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={Math.ceil(machines.length / pageSize)}
              pageSize={pageSize}
              totalItems={machines.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="machine_number">Machine Number</Label>
                  <Input id="machine_number" name="machine_number" defaultValue={editing.machine_number} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editing.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" defaultValue={editing.location} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coin_price">Coin Price (BDT)</Label>
                  <Input id="coin_price" name="coin_price" type="number" step="0.01" defaultValue={editing.coin_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doll_price">Doll Price (BDT)</Label>
                  <Input id="doll_price" name="doll_price" type="number" step="0.01" defaultValue={editing.doll_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electricity_cost">Electricity (BDT)</Label>
                  <Input id="electricity_cost" name="electricity_cost" type="number" step="0.01" defaultValue={editing.electricity_cost} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_percentage">VAT %</Label>
                  <Input id="vat_percentage" name="vat_percentage" type="number" step="0.01" defaultValue={editing.vat_percentage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="franchise_profit_share_percentage">Franchise Profit Share %</Label>
                  <Input 
                    id="franchise_profit_share_percentage" 
                    name="franchise_profit_share_percentage" 
                    type="number" 
                    step="0.01" 
                    value={franchiseShare}
                    onChange={(e) => handleFranchiseShareChange(parseFloat(e.target.value) || 0)}
                    required 
                    placeholder="Franchise %" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clowee_profit_share_percentage">Clowee Profit Share %</Label>
                  <Input 
                    id="clowee_profit_share_percentage" 
                    name="clowee_profit_share_percentage" 
                    type="number" 
                    step="0.01" 
                    value={cloweeShare}
                    onChange={(e) => handleCloweeShareChange(parseFloat(e.target.value) || 0)}
                    required 
                    placeholder="Clowee %" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance_percentage">Maintenance %</Label>
                  <Input id="maintenance_percentage" name="maintenance_percentage" type="number" step="0.01" defaultValue={editing.maintenance_percentage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Payment Duration</Label>
                  <select id="duration" name="duration" defaultValue={editing.duration} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="half_month">Half Month</option>
                    <option value="full_month">Full Month</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input id="installation_date" name="installation_date" type="date" defaultValue={editing.installation_date} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit_type">Security Deposit Type</Label>
                  <select id="security_deposit_type" name="security_deposit_type" defaultValue={editing.security_deposit_type || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="">Select type</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit_amount">Security Deposit Amount</Label>
                  <Input id="security_deposit_amount" name="security_deposit_amount" type="number" step="0.01" defaultValue={editing.security_deposit_amount || ''} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security_deposit_notes">Security Deposit Notes</Label>
                <Input id="security_deposit_notes" name="security_deposit_notes" type="text" defaultValue={editing.security_deposit_notes || ''} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4 sticky bottom-0 bg-background border-t mt-6">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={closeEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingMachine} onOpenChange={(open) => !open && setViewingMachine(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Machine Details</DialogTitle>
          </DialogHeader>
          {viewingMachine && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Machine Number</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.machine_number}</div>
                </div>
                <div className="space-y-2">
                  <Label>Machine Name</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.name}</div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.location}</div>
                </div>
                <div className="space-y-2">
                  <Label>Coin Price</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingMachine.coin_price)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Doll Price</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingMachine.doll_price)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Electricity Cost</Label>
                  <div className="p-2 bg-muted rounded">{formatCurrencyBDT(viewingMachine.electricity_cost)}</div>
                </div>
                <div className="space-y-2">
                  <Label>VAT Percentage</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.vat_percentage}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Franchise Profit Share</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.franchise_profit_share_percentage || 0}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Clowee Profit Share</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.clowee_profit_share_percentage || 0}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Percentage</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.maintenance_percentage}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Duration</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.duration?.replace('_', ' ')}</div>
                </div>
                <div className="space-y-2">
                  <Label>Installation Date</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.installation_date}</div>
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit Type</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.security_deposit_type || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit Amount</Label>
                  <div className="p-2 bg-muted rounded">{viewingMachine.security_deposit_amount ? formatCurrencyBDT(viewingMachine.security_deposit_amount) : 'N/A'}</div>
                </div>

              </div>
              <div className="space-y-2">
                <Label>Security Deposit Notes</Label>
                <div className="p-2 bg-muted rounded min-h-[60px]">{viewingMachine.security_deposit_notes || 'No notes'}</div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className={`p-2 rounded font-medium ${viewingMachine.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {viewingMachine.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingMachine(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingMachine}
        onOpenChange={(open) => !open && setDeletingMachine(null)}
        title="Delete Machine"
        description={`Are you sure you want to delete "${deletingMachine?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
};

export default AllMachines;