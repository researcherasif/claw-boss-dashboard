import { useEffect, useState } from 'react';
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
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
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
  owner_profit_share_percentage: number;
  clowee_profit_share_percentage: number;
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
  const { toast } = useToast();

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

  const openEdit = (machine: Machine) => setEditing(machine);
  const closeEdit = () => setEditing(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const ownerShare = parseFloat(formData.get('owner_profit_share_percentage') as string);
      const cloweeShare = parseFloat(formData.get('clowee_profit_share_percentage') as string);

      // Detect if split share columns exist; fallback to legacy profit_share_percentage
      let supportsSplitShares = true;
      try {
        const t = await supabase
          .from('machines')
          .select('owner_profit_share_percentage, clowee_profit_share_percentage')
          .limit(1);
        if (t.error) supportsSplitShares = false;
      } catch {
        supportsSplitShares = false;
      }

      const baseUpdate: any = {
        name: formData.get('name') as string,
        location: formData.get('location') as string,
        coin_price: parseFloat(formData.get('coin_price') as string),
        doll_price: parseFloat(formData.get('doll_price') as string),
        electricity_cost: parseFloat(formData.get('electricity_cost') as string),
        vat_percentage: parseFloat(formData.get('vat_percentage') as string),
        maintenance_percentage: parseFloat(formData.get('maintenance_percentage') as string),
        duration: formData.get('duration') as string,
        installation_date: formData.get('installation_date') as string,
        security_deposit_type: formData.get('security_deposit_type') as string,
        security_deposit_amount: formData.get('security_deposit_amount') ? parseFloat(formData.get('security_deposit_amount') as string) : null,
        security_deposit_notes: formData.get('security_deposit_notes') as string || null,
      };

      const updated = supportsSplitShares
        ? { ...baseUpdate, owner_profit_share_percentage: ownerShare, clowee_profit_share_percentage: cloweeShare }
        : { ...baseUpdate, profit_share_percentage: cloweeShare };

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

  const handleDelete = async (machine: Machine) => {
    if (!confirm(`Delete machine "${machine.name}"?`)) return;
    try {
      const { error } = await supabase.from('machines').delete().eq('id', machine.id);
      if (error) throw error;
      toast({ title: 'Machine deleted' });
      fetchMachines();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Machines</h1>
          <p className="text-muted-foreground">Manage, edit, and delete machines</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machines List</CardTitle>
          <CardDescription>List of all machines</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Coin Price</TableHead>
                <TableHead>Doll Price</TableHead>
                <TableHead>Electricity</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Deposit Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>{formatCurrencyBDT(m.coin_price)}</TableCell>
                  <TableCell>{formatCurrencyBDT(m.doll_price)}</TableCell>
                  <TableCell>{formatCurrencyBDT(m.electricity_cost)}</TableCell>
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
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(m)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No machines found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="profit_share_percentage">Profit Share %</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      id="owner_profit_share_percentage" 
                      name="owner_profit_share_percentage" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editing.owner_profit_share_percentage || 0} 
                      required 
                      placeholder="Owner %" 
                    />
                    <Input 
                      id="clowee_profit_share_percentage" 
                      name="clowee_profit_share_percentage" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editing.clowee_profit_share_percentage || editing.profit_share_percentage || 0} 
                      required 
                      placeholder="Clowee %" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance_percentage">Maintenance %</Label>
                  <Input id="maintenance_percentage" name="maintenance_percentage" type="number" step="0.01" defaultValue={editing.maintenance_percentage} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
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
              <div className="flex gap-2">
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
    </div>
  );
};

export default AllMachines;


