import React, { useRef } from 'react';
import InvoicePreview, { InvoicePreviewProps } from './InvoicePreview';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type InvoiceGeneratorProps = InvoicePreviewProps & {
  onDownload?: (blob: Blob) => void;
};

const A4_WIDTH_PX = 794; // ~96dpi

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const node = containerRef.current;
    if (!node) return;

    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit image to width, keep aspect ratio
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2;
    const y = 20; // small top margin

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    const blob = pdf.output('blob');
    if (props.onDownload) props.onDownload(blob);
    pdf.save(`invoice_${props.invoiceNumber}.pdf`);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" onClick={handlePrint}>Print</Button>
        <Button onClick={handleDownloadPdf}>Download PDF</Button>
      </div>
      <div ref={containerRef} style={{ width: A4_WIDTH_PX }} className="mx-auto">
        <InvoicePreview {...props} />
      </div>
    </div>
  );
};

export default InvoiceGenerator;


