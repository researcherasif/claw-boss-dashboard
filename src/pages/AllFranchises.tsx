import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, Download, Eye, FileText, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Franchise {
  id: string;
  name: string;
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  vat_percentage?: number;
  franchise_profit_share: number;
  clowee_profit_share: number;
  maintenance_percentage?: number;
  trade_license?: string;
  proprietor_nid?: string;
  payment_duration: string;
  security_deposit_type?: string;
  security_deposit_notes?: string;
  is_active: boolean;
  created_at: string;
  agreement_copy_url?: string;
  trade_nid_attachments?: string[];
}

const AllFranchises = () => {
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [saving, setSaving] = useState(false);
  const [editPaymentDuration, setEditPaymentDuration] = useState('');
  const [editSecurityDepositType, setEditSecurityDepositType] = useState('');

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    try {
      const { data, error } = await supabase
        .from("franchises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error("Error fetching franchises:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const viewFile = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      window.open(data.publicUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    }
  };

  const deleteFranchise = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete franchise "${name}"?`)) {
      try {
        const { error } = await supabase
          .from('franchises')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        setFranchises(franchises.filter(f => f.id !== id));
        toast.success('Franchise deleted successfully!');
      } catch (error) {
        console.error('Error deleting franchise:', error);
        toast.error('Failed to delete franchise');
      }
    }
  };

  const handleEditFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFranchise) return;
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Handle file uploads with fallback
      const agreementFile = formData.get('agreement_copy') as File;
      const tradeNidFiles = formData.getAll('trade_nid_attachments') as File[];
      
      let agreementUrl = editingFranchise.agreement_copy_url;
      let tradeNidUrls = editingFranchise.trade_nid_attachments || [];
      let uploadWarnings: string[] = [];
      
      // Upload agreement copy if provided
      if (agreementFile && agreementFile.size > 0) {
        try {
          const agreementPath = `${editingFranchise.id}/agreement_${Date.now()}.${agreementFile.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(agreementPath, agreementFile);
          
          if (uploadError) {
            console.error('Agreement upload error:', uploadError);
            uploadWarnings.push('Agreement file upload failed - storage not configured');
          } else {
            agreementUrl = agreementPath;
          }
        } catch (error) {
          console.error('Agreement upload failed:', error);
          uploadWarnings.push('Agreement file upload failed');
        }
      }
      
      // Upload trade/NID files if provided
      if (tradeNidFiles.length > 0 && tradeNidFiles[0].size > 0) {
        try {
          const uploadPromises = tradeNidFiles.map(async (file, index) => {
            if (file.size > 0) {
              const filePath = `${editingFranchise.id}/trade_nid_${Date.now()}_${index}.${file.name.split('.').pop()}`;
              const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);
              
              if (uploadError) {
                console.error('Trade/NID upload error:', uploadError);
                return null;
              }
              return filePath;
            }
            return null;
          });
          
          const uploadedPaths = await Promise.all(uploadPromises);
          const validPaths = uploadedPaths.filter(path => path !== null);
          if (validPaths.length > 0) {
            tradeNidUrls = [...tradeNidUrls, ...validPaths];
          } else if (tradeNidFiles.some(f => f.size > 0)) {
            uploadWarnings.push('Trade/NID files upload failed - storage not configured');
          }
        } catch (error) {
          console.error('Trade/NID upload failed:', error);
          uploadWarnings.push('Trade/NID files upload failed');
        }
      }
      
      const { error } = await supabase
        .from('franchises')
        .update({
          name: formData.get('name') as string,
          coin_price: parseFloat(formData.get('coin_price') as string),
          doll_price: parseFloat(formData.get('doll_price') as string),
          electricity_cost: parseFloat(formData.get('electricity_cost') as string),
          vat_percentage: parseFloat(formData.get('vat_percentage') as string) || 0,
          franchise_profit_share: parseFloat(formData.get('franchise_profit_share') as string),
          clowee_profit_share: parseFloat(formData.get('clowee_profit_share') as string),
          maintenance_percentage: parseFloat(formData.get('maintenance_percentage') as string) || 0,
          trade_license: formData.get('trade_license') as string,
          proprietor_nid: formData.get('proprietor_nid') as string,
          payment_duration: formData.get('payment_duration') as string,
          security_deposit_type: formData.get('security_deposit_type') as string,
          security_deposit_notes: formData.get('security_deposit_notes') as string,
          agreement_copy_url: agreementUrl,
          trade_nid_attachments: tradeNidUrls,
        })
        .eq('id', editingFranchise.id);
      
      if (error) throw error;
      
      if (uploadWarnings.length > 0) {
        toast.success(`Franchise updated successfully! Note: ${uploadWarnings.join(', ')}`);
      } else {
        toast.success('Franchise updated successfully!');
      }
      
      setEditingFranchise(null);
      setEditPaymentDuration('');
      setEditSecurityDepositType('');
      fetchFranchises();
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading franchises...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Franchises</h1>
        <Button onClick={() => navigate("/add-franchise")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Franchise
        </Button>
      </div>

      {franchises.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No franchises found. Add your first franchise to get started.</p>
            <Button onClick={() => navigate("/add-franchise")} className="mt-4">
              Add Franchise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {franchises.map((franchise) => (
            <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{franchise.name}</CardTitle>
                  <div className="flex items-center gap-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingFranchise(franchise);
                        setEditPaymentDuration(franchise.payment_duration);
                        setEditSecurityDepositType(franchise.security_deposit_type || '');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFranchise(franchise.id, franchise.name)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Badge variant={franchise.is_active ? "default" : "secondary"}>
                      {franchise.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Coin Price:</span>
                    <p>৳{franchise.coin_price}</p>
                  </div>
                  <div>
                    <span className="font-medium">Doll Price:</span>
                    <p>৳{franchise.doll_price}</p>
                  </div>
                  <div>
                    <span className="font-medium">Electricity:</span>
                    <p>৳{franchise.electricity_cost}</p>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{franchise.payment_duration.replace("_", " ")}</p>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Franchise Share:</span>
                    <span className="font-medium">{franchise.franchise_profit_share}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Clowee Share:</span>
                    <span className="font-medium">{franchise.clowee_profit_share}%</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created: {new Date(franchise.created_at).toLocaleDateString()}
                </div>

                {/* Attachments Section - Always visible for testing */}
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Attachments:</p>
                  {franchise.agreement_copy_url || (franchise.trade_nid_attachments && franchise.trade_nid_attachments.length > 0) ? (
                    <div className="space-y-2">
                      {franchise.agreement_copy_url && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Agreement Copy</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewFile(franchise.agreement_copy_url!)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(franchise.agreement_copy_url!, 'agreement.pdf')}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {franchise.trade_nid_attachments && franchise.trade_nid_attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Trade/NID Doc {index + 1}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewFile(attachment)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(attachment, `trade-nid-${index + 1}.pdf`)}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No attachments uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFranchise} onOpenChange={(open) => !open && setEditingFranchise(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Franchise</DialogTitle>
          </DialogHeader>
          {editingFranchise && (
            <form onSubmit={handleEditFranchise} className="space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Franchise Name</Label>
                  <Input id="name" name="name" defaultValue={editingFranchise.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coin_price">Coin Price (৳)</Label>
                  <Input id="coin_price" name="coin_price" type="number" step="0.01" defaultValue={editingFranchise.coin_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doll_price">Doll Price (৳)</Label>
                  <Input id="doll_price" name="doll_price" type="number" step="0.01" defaultValue={editingFranchise.doll_price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electricity_cost">Electricity Cost (৳)</Label>
                  <Input id="electricity_cost" name="electricity_cost" type="number" step="0.01" defaultValue={editingFranchise.electricity_cost} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_percentage">VAT Percentage (%)</Label>
                  <Input id="vat_percentage" name="vat_percentage" type="number" step="0.01" defaultValue={editingFranchise.vat_percentage || 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="franchise_profit_share">Franchise Share (%)</Label>
                  <Input id="franchise_profit_share" name="franchise_profit_share" type="number" step="0.01" defaultValue={editingFranchise.franchise_profit_share} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clowee_profit_share">Clowee Share (%)</Label>
                  <Input id="clowee_profit_share" name="clowee_profit_share" type="number" step="0.01" defaultValue={editingFranchise.clowee_profit_share} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance_percentage">Maintenance (%)</Label>
                  <Input id="maintenance_percentage" name="maintenance_percentage" type="number" step="0.01" defaultValue={editingFranchise.maintenance_percentage || 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_license">Trade License</Label>
                  <Input id="trade_license" name="trade_license" defaultValue={editingFranchise.trade_license || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proprietor_nid">Proprietor NID</Label>
                  <Input id="proprietor_nid" name="proprietor_nid" defaultValue={editingFranchise.proprietor_nid || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_duration">Payment Duration</Label>
                  <Select name="payment_duration" value={editPaymentDuration} onValueChange={setEditPaymentDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="half_month">Half Month</SelectItem>
                      <SelectItem value="full_month">Full Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit_type">Security Deposit Type</Label>
                  <Select name="security_deposit_type" value={editSecurityDepositType} onValueChange={setEditSecurityDepositType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="security_deposit_notes">Security Deposit Notes</Label>
                  <Input id="security_deposit_notes" name="security_deposit_notes" defaultValue={editingFranchise.security_deposit_notes || ''} />
                </div>
                
                {/* File Upload Section */}
                <div className="space-y-4 col-span-1 md:col-span-2 border-t pt-4">
                  <h3 className="font-medium text-sm">Upload Attachments</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="agreement_copy">Agreement Copy (PDF)</Label>
                    <Input id="agreement_copy" name="agreement_copy" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                    {editingFranchise.agreement_copy_url && (
                      <p className="text-xs text-muted-foreground">Current: Agreement copy uploaded</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trade_nid_attachments">Trade License / NID Documents</Label>
                    <Input id="trade_nid_attachments" name="trade_nid_attachments" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple />
                    {editingFranchise.trade_nid_attachments && editingFranchise.trade_nid_attachments.length > 0 && (
                      <p className="text-xs text-muted-foreground">Current: {editingFranchise.trade_nid_attachments.length} document(s) uploaded</p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => {
                  setEditingFranchise(null);
                  setEditPaymentDuration('');
                  setEditSecurityDepositType('');
                }}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Uploading & Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllFranchises;