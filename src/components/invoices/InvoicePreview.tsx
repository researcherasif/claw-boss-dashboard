import React from 'react';
import { formatCurrencyBDT } from '@/lib/currency';

type CompanyInfo = {
  name: string;
  address: string;
  mobile?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

type ClientInfo = {
  name: string;
  address?: string;
  mobile?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

type BankInfo = {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
};

type InvoiceItem = {
  serial: number;
  description: string;
  period: string; // e.g., 01st_15th_Sep_2025
  total: number;
};

export type InvoicePreviewProps = {
  company: CompanyInfo;
  client: ClientInfo;
  invoiceNumber: string;
  invoiceDate: string; // ISO or formatted
  items: InvoiceItem[];
  banks: BankInfo[];
  footerNotes?: string[];
  rightLogoUrl?: string; // Clowee logo
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  company,
  client,
  invoiceNumber,
  invoiceDate,
  items,
  banks,
  footerNotes = [],
  rightLogoUrl,
}) => {
  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div id="invoice-root" className="bg-white text-black w-full max-w-3xl mx-auto border rounded-md shadow-sm print:shadow-none print:border-0">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-10 w-auto" />
          ) : (
            <div className="h-10 w-10 bg-gray-200 rounded" />
          )}
          <div className="min-w-0">
            <div className="text-xl font-semibold truncate">{company.name}</div>
            <div className="text-xs text-gray-600 leading-snug">
              <div>{company.address}</div>
              {company.mobile && <div>Mobile: {company.mobile}</div>}
              {company.email && <div>Email: {company.email}</div>}
              {company.website && <div>Website: {company.website}</div>}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {rightLogoUrl ? (
            <img src={rightLogoUrl} alt="Clowee" className="h-10 w-auto" />
          ) : (
            <div className="h-10 w-10 bg-gray-200 rounded" />
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-2">Bill To</div>
          <div className="text-sm">
            <div className="font-medium">{client.name}</div>
            {client.address && <div>{client.address}</div>}
            {client.mobile && <div>Mobile: {client.mobile}</div>}
            {client.email && <div>Email: {client.email}</div>}
            {client.website && <div>Website: {client.website}</div>}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-sm">
            <div><span className="font-semibold">Invoice No:</span> {invoiceNumber}</div>
            <div><span className="font-semibold">Invoice Date:</span> {invoiceDate}</div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-6">
        <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 w-14">SL</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Duration Period</th>
              <th className="text-right p-3 w-40">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.serial} className="border-t">
                <td className="p-3 align-top">{item.serial}</td>
                <td className="p-3 align-top">{item.description}</td>
                <td className="p-3 align-top">{item.period}</td>
                <td className="p-3 align-top text-right font-medium">{formatCurrencyBDT(item.total)}</td>
              </tr>
            ))}
            {/* Summary Row */}
            <tr className="border-t bg-gray-50">
              <td className="p-3" colSpan={3}><span className="font-semibold">Total Amount (Excluding VAT & Tax)</span></td>
              <td className="p-3 text-right font-bold">{formatCurrencyBDT(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Banks & Notes */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-2">Bank Details</div>
          <div className="space-y-3 text-sm">
            {banks.map((b, idx) => (
              <div key={idx} className="border rounded p-3">
                <div><span className="font-medium">Bank:</span> {b.bankName}</div>
                <div><span className="font-medium">Branch:</span> {b.branch}</div>
                <div><span className="font-medium">Account Name:</span> {b.accountName}</div>
                <div><span className="font-medium">Account No:</span> {b.accountNumber}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Notes</div>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {footerNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-[10px] text-gray-500">
        This is a system generated document. For queries contact support.
      </div>
    </div>
  );
};

export default InvoicePreview;


