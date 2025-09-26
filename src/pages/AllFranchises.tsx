import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  franchise_profit_share: number;
  clowee_profit_share: number;
  payment_duration: string;
  is_active: boolean;
  created_at: string;
  agreement_copy_url?: string;
  trade_nid_attachments?: string[];
}

const AllFranchises = () => {
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);

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
        .from('franchise-documents')
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
    }
  };

  const viewFile = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('franchise-documents')
        .getPublicUrl(filePath);
      
      window.open(data.publicUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {franchises.map((franchise) => (
            <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{franchise.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/edit-franchise/${franchise.id}`)}
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
    </div>
  );
};

export default AllFranchises;