import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, History } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/currency';
import { addDollPrice, getDollPriceHistory, DollPriceHistory } from '@/lib/dollPricing';

interface DollPriceManagerProps {
  machineId: string;
  machineName: string;
}

const DollPriceManager = ({ machineId, machineName }: DollPriceManagerProps) => {
  const [priceHistory, setPriceHistory] = useState<DollPriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPriceHistory();
  }, [machineId]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const history = await getDollPriceHistory(machineId);
      setPriceHistory(history);
    } catch (error: any) {
      toast({
        title: "Error loading price history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const price = parseFloat(formData.get('price') as string);
      const effectiveDate = formData.get('effective_date') as string;

      await addDollPrice(machineId, price, effectiveDate, user.id);

      toast({
        title: "Price added successfully",
        description: `New doll price of ${formatCurrencyBDT(price)} effective from ${effectiveDate}`,
      });

      setDialogOpen(false);
      await fetchPriceHistory();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error adding price",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Doll Price History - {machineName}
            </CardTitle>
            <CardDescription>
              Manage dynamic doll pricing for this machine
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Price
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Doll Price</DialogTitle>
                <DialogDescription>
                  Set a new doll price effective from a specific date
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPrice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Doll Price (BDT)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="130.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective From</Label>
                  <Input
                    id="effective_date"
                    name="effective_date"
                    type="date"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? "Adding..." : "Add Price"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading price history...</div>
        ) : priceHistory.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No price history found. Add the first price entry.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective Date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Added On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.effective_date}</TableCell>
                  <TableCell>{formatCurrencyBDT(entry.price)}</TableCell>
                  <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DollPriceManager;