import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Loader2, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrencyBDT } from '@/lib/currency';

interface PayToCloweeRecord {
  id: string;
  machine_id: string;
  start_date: string;
  end_date: string;
  total_income: number;
  net_payable: number;
  created_at: string;
  machines: {
    name: string;
    location: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  notes: string;
  pay_to_clowee_id: string;
  created_at: string;
}

const Invoices = () => {
  const [payToCloweeRecords, setPayToCloweeRecords] = useState<PayToCloweeRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayToCloweeRecord | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pay to clowee records
      const { data: records, error: recordsError } = await supabase
        .from('pay_to_clowee')
        .select(`
          *,
          machines (name, location)
        `)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      // Fetch existing invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      setPayToCloweeRecords(records || []);
      setInvoices(invoicesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRecord) return;

    setGenerating(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const notes = formData.get('notes') as string;
      const invoiceNumber = generateInvoiceNumber();

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          pay_to_clowee_id: selectedRecord.id,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          notes: notes,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Invoice created successfully",
        description: `Invoice ${invoiceNumber} has been generated.`,
      });

      // Refresh data
      fetchData();
      setSelectedRecord(null);

      // Generate PDF
      await generatePDF(data, selectedRecord);

    } catch (error: any) {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async (invoice: Invoice, payRecord: PayToCloweeRecord) => {
    try {
      // Create a temporary div for the invoice content
      const invoiceContent = document.createElement('div');
      invoiceContent.style.width = '800px';
      invoiceContent.style.padding = '40px';
      invoiceContent.style.fontFamily = 'Arial, sans-serif';
      invoiceContent.style.backgroundColor = 'white';
      invoiceContent.style.position = 'absolute';
      invoiceContent.style.left = '-9999px';

      invoiceContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #8b5cf6; margin-bottom: 10px;">Clawee Business</h1>
          <p style="color: #666; margin: 0;">Claw Machine Management System</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h2 style="margin-bottom: 15px;">Invoice Details</h2>
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Machine:</strong> ${payRecord.machines.name}</p>
            <p><strong>Location:</strong> ${payRecord.machines.location}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin-bottom: 15px;">Period</h2>
            <p><strong>From:</strong> ${new Date(payRecord.start_date).toLocaleDateString()}</p>
            <p><strong>To:</strong> ${new Date(payRecord.end_date).toLocaleDateString()}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: left;">Description</th>
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db;">Total Income</td>
              <td style="padding: 12px; border: 1px solid #d1d5db; text-align: right;">${formatCurrencyBDT(payRecord.total_income)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #d1d5db;"><strong>Net Payable to Clowee</strong></td>
              <td style="padding: 12px; border: 1px solid #d1d5db; text-align: right; font-weight: bold;">${formatCurrencyBDT(payRecord.net_payable)}</td>
            </tr>
          </tbody>
        </table>

        ${invoice.notes ? `
          <div style="margin-bottom: 30px;">
            <h3>Notes:</h3>
            <p style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">${invoice.notes}</p>
          </div>
        ` : ''}

        <div style="margin-top: 60px; text-align: center;">
          <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto 10px;">
            <p style="margin-top: 10px;">Authorized Signature</p>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          <p>This invoice is generated automatically by Clawee Business Management System</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      `;

      document.body.appendChild(invoiceContent);

      // Convert to canvas and then PDF
      const canvas = await html2canvas(invoiceContent, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Remove temporary element
      document.body.removeChild(invoiceContent);

      // Download PDF
      pdf.save(`invoice-${invoice.invoice_number}.pdf`);

    } catch (error: any) {
      toast({
        title: "Error generating PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isRecordInvoiced = (recordId: string) => {
    return invoices.some(invoice => invoice.pay_to_clowee_id === recordId);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">
          Generate and manage invoices for machine payments
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>
              Select a payment record to generate an invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payToCloweeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{record.machines.name}</div>
                        <div className="text-sm text-muted-foreground">{record.machines.location}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(record.start_date).toLocaleDateString()} - 
                        {new Date(record.end_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrencyBDT(record.net_payable)}</TableCell>
                    <TableCell>
                      {isRecordInvoiced(record.id) ? (
                        <span className="text-sm text-muted-foreground">Invoiced</span>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Invoice</DialogTitle>
                              <DialogDescription>
                                Generate invoice for {record.machines.name} payment
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateInvoice} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                  id="notes"
                                  name="notes"
                                  placeholder="Add any additional notes for this invoice..."
                                  rows={3}
                                />
                              </div>
                              <Button type="submit" disabled={generating} className="w-full">
                                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Invoice & PDF
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {payToCloweeRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No payment records found. Create payment calculations first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Invoices</CardTitle>
            <CardDescription>
              List of all generated invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const payRecord = payToCloweeRecords.find(r => r.id === invoice.pay_to_clowee_id);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{invoice.invoice_number}</div>
                          {payRecord && (
                            <div className="text-sm text-muted-foreground">
                              {payRecord.machines.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => payRecord && generatePDF(invoice, payRecord)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No invoices generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Invoices;