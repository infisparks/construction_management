'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  FileText, 
  X, 
  ArrowRight,
  ShieldCheck,
  Receipt,
  Building2,
  Calendar
} from 'lucide-react';
import { SubcontractorBill, ProjectInfo } from '@/lib/construction-planning/types';
import { 
  downloadSubcontractorBillPdf, 
  viewSubcontractorBillPdfInNewTab 
} from '@/lib/construction-planning/subcontractor-bill-pdf';

interface BillSuccessPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: SubcontractorBill | null;
  project?: Partial<ProjectInfo>;
  onViewBlobUrl: (bill: SubcontractorBill) => void;
  onCreateAnother?: () => void;
}

export const BillSuccessPdfModal: React.FC<BillSuccessPdfModalProps> = ({
  isOpen,
  onClose,
  bill,
  project,
  onViewBlobUrl,
  onCreateAnother,
}) => {
  if (!isOpen || !bill) return null;

  const handleDownload = () => {
    downloadSubcontractorBillPdf(bill, project);
  };

  const handleViewPdf = () => {
    // 1) Open Blob URL in a new browser tab directly
    viewSubcontractorBillPdfInNewTab(bill, project);
    // 2) Also notify parent to open the embedded Blob viewer modal
    onViewBlobUrl(bill);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md sm:max-w-lg h-full shadow-2xl border-l border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header / Success Banner */}
        <div className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white border-b border-purple-100 flex items-start justify-between relative">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">
                Bill Created Successfully
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Sub-Contractor Bill Saved
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ready for certified payment processing, audit, and contractor issuance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Card */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                <span>Bill Number</span>
              </div>
              <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {bill.billNumber}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Vendor / Subcontractor</span>
              </div>
              <span className="font-semibold text-slate-800">{bill.vendorName}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Bill Date</span>
              </div>
              <span className="text-slate-700 font-medium">{bill.billDate}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700">Net Payable Amount</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                Rs. {Number(bill.grandTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Critical user requirement: 2 Options (Download PDF or View PDF via Blob URL) */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Professional PDF Options
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: View PDF (opens in Blob URL) */}
              <button
                type="button"
                onClick={handleViewPdf}
                className="w-full py-3 px-4 rounded-xl border-2 border-purple-500 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-100/70 text-purple-700 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
              >
                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>View PDF (Blob URL)</span>
              </button>

              {/* Option 2: Download PDF directly */}
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Download PDF</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center pt-1">
              Click &quot;View PDF&quot; to open the blob URL in a new tab with an in-app previewer, or &quot;Download PDF&quot; to save directly.
            </p>
          </div>

          {/* Bottom Secondary Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            {onCreateAnother && (
              <button
                type="button"
                onClick={onCreateAnother}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                + Create Another Bill
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span>Done / View Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
