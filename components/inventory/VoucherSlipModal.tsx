'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  Clock,
  Truck,
  HardHat,
  Package,
  Layers,
  MapPin,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Paperclip,
  MessageCircle
} from 'lucide-react';
import { InventoryTransaction } from '@/lib/inventory/inventory-types';
import {
  getInventoryVoucherPdfBlobUrl,
  downloadInventoryVoucherPdf,
  viewInventoryVoucherPdfInNewTab,
  getCleanItemCode
} from '@/lib/inventory/inventory-voucher-pdf';

interface VoucherSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: InventoryTransaction | null;
  projectName?: string;
  defaultViewMode?: 'slip' | 'pdf';
  onShareWhatsApp?: (tx: InventoryTransaction) => void;
}

export const VoucherSlipModal: React.FC<VoucherSlipModalProps> = ({
  isOpen,
  onClose,
  transaction,
  projectName = 'Noori Crest Tower',
  defaultViewMode = 'pdf',
  onShareWhatsApp,
}) => {
  const [viewMode, setViewMode] = useState<'slip' | 'pdf'>(defaultViewMode);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setViewMode(defaultViewMode || 'pdf');
    }
  }, [isOpen, defaultViewMode, transaction]);

  useEffect(() => {
    if (isOpen && transaction) {
      try {
        const { blobUrl: url } = getInventoryVoucherPdfBlobUrl(transaction, projectName);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to generate PDF blob:', err);
      }
    } else {
      setBlobUrl(null);
    }
  }, [isOpen, transaction, projectName]);

  if (!isOpen || !transaction) return null;

  const isCheckIn = transaction.type === 'check_in';
  const isReturn = transaction.type === 'return';
  const isDamage = transaction.type === 'damage';
  const isInward = isCheckIn;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadInventoryVoucherPdf(transaction, projectName);
  };

  const handleOpenBlobUrl = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else {
      viewInventoryVoucherPdfInNewTab(transaction, projectName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Digital Voucher Bill</span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
              {transaction.voucherNumber}
            </span>

            {/* View Mode Switcher */}
            <div className="ml-2 flex items-center p-0.5 rounded-lg bg-slate-200/70 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('slip')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'slip' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Voucher Slip
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'pdf' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official PDF
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {transaction.fileUrl && (
              <a
                href={transaction.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`View attached bill file: ${transaction.fileName || 'Document'}`}
              >
                <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                <span>Attached Bill</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleOpenBlobUrl}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open real PDF Blob URL in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Blob URL PDF</span>
            </button>

            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(transaction)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Send this voucher PDF directly on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Send WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Mode vs Slip Mode */}
        {viewMode === 'pdf' ? (
          <div className="flex-1 bg-slate-100 min-h-[560px] flex flex-col">
            {blobUrl ? (
              <iframe
                src={blobUrl}
                title="Voucher PDF Document"
                className="w-full flex-1 border-0 min-h-[560px]"
              />
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Generating PDF document...
              </div>
            )}
          </div>
        ) : (
          /* Printable Slip Body */
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
            {/* Top Executive Accent Bar */}
            <div className={`h-1.5 w-full rounded-full ${
              isCheckIn
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : isReturn
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : isDamage
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : 'bg-gradient-to-r from-[#653ef1] to-indigo-600'
            }`} />

            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#653ef1] block mb-1">
                  Armee Enterprises • Store & Logistics
                </span>
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg">
                  <Building2 className="w-5 h-5 text-[#653ef1]" />
                  <span>{projectName}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Site Gate Office #1 • Plot 48/A, Commercial Business Hub, Mumbai
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                  isCheckIn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isReturn
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : isDamage
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-purple-50 text-[#653ef1] border-purple-200'
                }`}>
                  {isCheckIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  <span>
                    {isCheckIn && 'GOODS RECEIPT NOTE (GRN)'}
                    {transaction.type === 'check_out' && 'MATERIAL ISSUE NOTE (MIN)'}
                    {isReturn && 'VENDOR RETURN VOUCHER (RET)'}
                    {isDamage && 'DAMAGE / SCRAP VOUCHER (DMG)'}
                  </span>
                </span>
                <div className="mt-2.5 text-sm font-mono font-extrabold text-slate-900">
                  {transaction.voucherNumber}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 sm:justify-end">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{transaction.date}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{transaction.time}</span>
                </div>
              </div>
            </div>

            {/* Two-Column Party & Store Audit Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#653ef1] block border-b border-slate-100 pb-1.5">
                  {isCheckIn || isReturn ? 'Supplier & Delivery Details' : 'Issued To & Site Location'}
                </span>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{isCheckIn || isReturn ? 'Supplier:' : 'Subcontractor:'}</span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {isCheckIn || isReturn ? transaction.supplierName || 'Site Supplier' : transaction.subcontractorName || 'Site Labour Agency'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{isCheckIn ? 'Challan / Inv #:' : 'Receiving Person:'}</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {isCheckIn ? transaction.challanNumber || 'N/A' : transaction.foremanName || 'Authorized Foreman'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{isCheckIn ? 'Vehicle #:' : 'Floor / Zone:'}</span>
                  <span className="font-semibold text-slate-800 font-mono text-right">
                    {isCheckIn ? transaction.vehicleNumber || 'N/A' : transaction.floorZone || 'Central Site Yard'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#653ef1] block border-b border-slate-100 pb-1.5">
                  Store & Audit Metadata
                </span>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-bold text-slate-900 text-right">{transaction.category}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Storekeeper:</span>
                  <span className="font-semibold text-slate-800 text-right">{transaction.receivedOrIssuedBy || 'Site Storekeeper'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">WBS / Audit:</span>
                  <span className="font-semibold text-slate-800 text-right font-mono">{transaction.wbsTaskCode || 'SITE-GEN'} • VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Main Item & Valuation Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className={`text-white font-bold ${
                  isCheckIn
                    ? 'bg-emerald-600'
                    : isReturn
                    ? 'bg-amber-600'
                    : isDamage
                    ? 'bg-rose-600'
                    : 'bg-[#653ef1]'
                }`}>
                  <tr>
                    <th className="px-4 py-3">Item Description & Code</th>
                    <th className="px-4 py-3 text-right">Unit Rate</th>
                    <th className="px-4 py-3 text-right">Movement Qty</th>
                    <th className="px-4 py-3 text-right">Store Balance</th>
                    <th className="px-4 py-3 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{transaction.materialName}</div>
                      <div className="text-[11px] text-purple-700 font-semibold font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Code: {getCleanItemCode(transaction.materialCode, transaction.materialId, 1)}</span>
                        {transaction.brand && (
                          <span className="text-slate-600 font-sans font-medium">• Brand: <strong className="text-purple-700">{transaction.brand}</strong></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {transaction.unitRate ? `Rs. ${transaction.unitRate.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-extrabold text-sm tabular-nums ${
                      isCheckIn 
                        ? 'text-emerald-700' 
                        : isReturn 
                        ? 'text-amber-800' 
                        : isDamage 
                        ? 'text-rose-700' 
                        : 'text-[#653ef1]'
                    }`}>
                      {isCheckIn ? '+' : '-'}{transaction.quantity} {transaction.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                      <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {transaction.runningStockBalance} {transaction.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold font-mono text-slate-900 tabular-nums">
                      {transaction.totalAmount ? `Rs. ${transaction.totalAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Specific Transaction Notes */}
            <div className="space-y-2 text-xs">
              {transaction.returnReason && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold block mb-0.5">Reason for Return to Vendor:</span>
                  {transaction.returnReason}
                </div>
              )}
              {transaction.damageReason && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                  <span className="font-bold block mb-0.5">Reason for Damage / Scrap Write-Off:</span>
                  {transaction.damageReason}
                </div>
              )}
              {transaction.purpose && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Work Purpose:</span>
                  {transaction.purpose}
                </div>
              )}
              {transaction.notes && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Storekeeper Remarks:</span>
                  {transaction.notes}
                </div>
              )}

              {/* Physical Bill Copy Verification Attachment */}
              {transaction.fileUrl && (
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-purple-900 block">
                        Attached Physical Bill / Proof
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono truncate block">
                        {transaction.fileName || 'Verified Document Attachment'}
                      </span>
                    </div>
                  </div>

                  <a
                    href={transaction.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Bill</span>
                  </a>
                </div>
              )}
            </div>

            {/* Signatures & Authorizations Footer */}
            {(() => {
              const engName = (transaction.engineerName || transaction.authorizedBy || '').trim();
              const hasEngineer = Boolean(engName);
              return (
                <div className={`pt-8 border-t border-slate-200 grid ${hasEngineer ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center`}>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      {transaction.receivedOrIssuedBy || 'Site Storekeeper'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Storekeeper
                    </span>
                  </div>

                  <div className="border-t border-slate-300 pt-2">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      {isCheckIn 
                        ? transaction.driverName || 'Authorized Driver' 
                        : transaction.foremanName || 'Receiving Supervisor'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      {isCheckIn ? 'Driver / Transporter' : 'Receiving Subcontractor'}
                    </span>
                  </div>

                  {hasEngineer && (
                    <div className="border-t border-slate-300 pt-2">
                      <span className="text-[11px] font-bold text-slate-800 block">
                        {engName}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Project Engineer / PM
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
