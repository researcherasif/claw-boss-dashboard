import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AddFranchise = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Handle file uploads
    let agreementCopyUrl = null;
    let tradeNidAttachments: string[] = [];

    // Upload agreement copy if provided
    const agreementFile = formData.get("agreement_copy") as File;
    if (agreementFile && agreementFile.size > 0) {
      console.log("Uploading agreement file:", agreementFile.name);
      try {
        const fileName = `agreements/${Date.now()}_${agreementFile.name}`;
        const { data, error } = await supabase.storage
          .from('franchise-documents')
          .upload(fileName, agreementFile);
        
        if (error) {
          console.error("Agreement upload error:", error);
        } else {
          agreementCopyUrl = data.path;
          console.log("Agreement uploaded successfully:", data.path);
        }
      } catch (uploadError: any) {
        console.error("Agreement upload failed:", uploadError);
      }
    }

    // Upload trade/NID attachments if provided
    const tradeNidFiles = formData.getAll("trade_nid_attachments") as File[];
    for (const file of tradeNidFiles) {
      if (file && file.size > 0) {
        console.log("Uploading trade/NID file:", file.name);
        try {
          const fileName = `trade-nid/${Date.now()}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('franchise-documents')
            .upload(fileName, file);
          
          if (error) {
            console.error("Trade/NID upload error:", error);
          } else {
            tradeNidAttachments.push(data.path);
            console.log("Trade/NID uploaded successfully:", data.path);
          }
        } catch (uploadError: any) {
          console.error("Trade/NID upload failed:", uploadError);
        }
      }
    }

    const franchiseData = {
      name: formData.get("franchise_name") as string,
      coin_price: parseFloat(formData.get("coin_price") as string),
      doll_price: parseFloat(formData.get("doll_price") as string),
      electricity_cost: parseFloat(formData.get("electricity_cost") as string),
      vat_percentage: parseFloat(formData.get("vat_percentage") as string) || 0,
      franchise_profit_share: parseFloat(formData.get("franchise_profit_share_percentage") as string),
      clowee_profit_share: parseFloat(formData.get("clowee_profit_share_percentage") as string),
      maintenance_percentage: parseFloat(formData.get("maintenance_percentage") as string) || 0,
      trade_license: formData.get("trade_license") as string,
      proprietor_nid: formData.get("proprietor_nid") as string,
      payment_duration: formData.get("payment_duration") as string,
      security_deposit_type: formData.get("security_deposit_type") as string,
      security_deposit_notes: formData.get("security_deposit_notes") as string,
      agreement_copy_url: agreementCopyUrl,
      trade_nid_attachments: tradeNidAttachments,
    };

    try {
      console.log("Saving franchise data:", franchiseData);
      
      const { data, error } = await supabase
        .from("franchises")
        .insert([franchiseData])
        .select();

      if (error) throw error;

      console.log("Franchise saved successfully:", data);
      toast.success("Franchise added successfully!");
      navigate("/all-franchises");
    } catch (error: any) {
      console.error("Error adding franchise:", error);
      toast.error(`Failed to add franchise: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Franchise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchise_name">Franchise Name</Label>
                <Input
                  id="franchise_name"
                  name="franchise_name"
                  type="text"
                  placeholder="e.g., Downtown Mall Franchise"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coin_price">Coin Price (BDT)</Label>
                <Input
                  id="coin_price"
                  name="coin_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doll_price">Doll Price (BDT)</Label>
                <Input
                  id="doll_price"
                  name="doll_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electricity_cost">Electricity Cost (BDT)</Label>
                <Input
                  id="electricity_cost"
                  name="electricity_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_percentage">VAT Percentage (%)</Label>
                <Input
                  id="vat_percentage"
                  name="vat_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="franchise_profit_share_percentage">Franchise Profit Share (%)</Label>
                <Input
                  id="franchise_profit_share_percentage"
                  name="franchise_profit_share_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="70.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clowee_profit_share_percentage">Clowee Profit Share (%)</Label>
                <Input
                  id="clowee_profit_share_percentage"
                  name="clowee_profit_share_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="30.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_percentage">Maintenance Percentage (%)</Label>
                <Input
                  id="maintenance_percentage"
                  name="maintenance_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="5.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade_license">Trade License</Label>
                <Input
                  id="trade_license"
                  name="trade_license"
                  type="text"
                  placeholder="Trade license number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proprietor_nid">Proprietor NID</Label>
                <Input
                  id="proprietor_nid"
                  name="proprietor_nid"
                  type="text"
                  placeholder="National ID number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_duration">Payment Duration</Label>
                <Select name="payment_duration" required>
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
                <Select name="security_deposit_type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select deposit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_deposit_notes">Security Deposit Notes</Label>
              <Input
                id="security_deposit_notes"
                name="security_deposit_notes"
                type="text"
                placeholder="Additional notes about the security deposit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreement_copy">Agreement Copy Attachment (Optional)</Label>
              <Input
                id="agreement_copy"
                name="agreement_copy"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade_nid_attachments">Trade License & NID Copies (Multiple files allowed)</Label>
              <Input
                id="trade_nid_attachments"
                name="trade_nid_attachments"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              <p className="text-xs text-muted-foreground">You can select multiple files for trade license and NID copies</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Franchise
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/all-franchises')}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddFranchise;