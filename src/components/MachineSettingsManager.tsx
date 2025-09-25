import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Settings } from 'lucide-react';
import { formatCurrencyBDT } from '@/lib/currency';
import { addMachineSetting, getAllSettingsHistory, MachineSettingHistory } from '@/lib/machineSettings';

interface MachineSettingsManagerProps {
  machineId: string;
  machineName: string;
  onSettingAdded?: () => void;
}

const fieldLabels = {
  coin_price: 'Coin Price (BDT)',
  doll_price: 'Doll Price (BDT)',
  electricity_cost: 'Electricity Cost (BDT)',
  vat_percentage: 'VAT Percentage (%)',
  maintenance_percentage: 'Maintenance Percentage (%)',
  profit_share_percentage: 'Profit Share Percentage (%)',
  duration: 'Duration'
};

const MachineSettingsManager = ({ machineId, machineName, onSettingAdded }: MachineSettingsManagerProps) => {
  const [settingsHistory, setSettingsHistory] = useState<MachineSettingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSettingsHistory();
  }, [machineId]);

  const fetchSettingsHistory = async () => {
    setLoading(true);
    try {
      const history = await getAllSettingsHistory(machineId);
      setSettingsHistory(history);
    } catch (error: any) {
      toast({
        title: "Error loading settings history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedField) return;

    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const value = formData.get('value') as string;
      const effectiveDate = formData.get('effective_date') as string;

      await addMachineSetting(machineId, selectedField, value, effectiveDate, user.id);

      toast({
        title: "Setting added successfully",
        description: `New ${fieldLabels[selectedField as keyof typeof fieldLabels]} effective from ${effectiveDate}`,
      });

      setDialogOpen(false);
      setSelectedField('');
      await fetchSettingsHistory();
      onSettingAdded?.();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error adding setting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getFieldsByType = () => {
    const history = settingsHistory.reduce((acc, item) => {
      if (!acc[item.field_name]) acc[item.field_name] = [];
      acc[item.field_name].push(item);
      return acc;
    }, {} as Record<string, MachineSettingHistory[]>);
    return history;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Machine Settings History - {machineName}
            </CardTitle>
            <CardDescription>
              Manage all dynamic machine settings
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Setting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Setting</DialogTitle>
                <DialogDescription>
                  Set a new machine setting effective from a specific date
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSetting} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field">Setting Field</Label>
                  <Select value={selectedField} onValueChange={setSelectedField} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field to update" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fieldLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {selectedField ? fieldLabels[selectedField as keyof typeof fieldLabels] : 'Value'}
                  </Label>
                  {selectedField === 'duration' ? (
                    <Select name="value" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="half_month">Half Month</SelectItem>
                        <SelectItem value="full_month">Full Month</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="value"
                      name="value"
                      type={selectedField?.includes('percentage') || selectedField?.includes('price') || selectedField?.includes('cost') ? 'number' : 'text'}
                      step="0.01"
                      min="0"
                      placeholder={selectedField?.includes('percentage') ? '15.00' : '130.00'}
                      required
                    />
                  )}
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
                  <Button type="submit" disabled={saving || !selectedField} className="flex-1">
                    {saving ? "Adding..." : "Add Setting"}
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
          <div className="text-center py-4">Loading settings history...</div>
        ) : settingsHistory.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No settings history found. Add the first setting entry.
          </div>
        ) : (
          <Tabs defaultValue={Object.keys(getFieldsByType())[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.keys(getFieldsByType()).slice(0, 4).map((field) => (
                <TabsTrigger key={field} value={field}>
                  {fieldLabels[field as keyof typeof fieldLabels]?.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.keys(getFieldsByType()).slice(4).length > 0 && (
              <TabsList className="grid w-full grid-cols-3 mt-2">
                {Object.keys(getFieldsByType()).slice(4).map((field) => (
                  <TabsTrigger key={field} value={field}>
                    {fieldLabels[field as keyof typeof fieldLabels]?.split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
            {Object.entries(getFieldsByType()).map(([field, entries]) => (
              <TabsContent key={field} value={field}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.effective_date}</TableCell>
                        <TableCell>
                          {field.includes('price') || field.includes('cost') 
                            ? formatCurrencyBDT(parseFloat(entry.field_value))
                            : field.includes('percentage')
                            ? `${entry.field_value}%`
                            : entry.field_value}
                        </TableCell>
                        <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default MachineSettingsManager;