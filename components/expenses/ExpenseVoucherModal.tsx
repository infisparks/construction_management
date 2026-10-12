'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Receipt,
  Printer,
  FileText
} from 'lucide-react';
import { SiteExpense } from '@/lib/supabase/types';
import {
  getSingleExpenseVoucherBlobUrl,
  downloadSingleExpenseVoucherPdf,
} from '@/lib/expenses/expense-statement-pdf';

interface ExpenseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: SiteExpense | null;
  projectName?: string;
}

export const ExpenseVoucherModal: React.FC<ExpenseVoucherModalProps> = ({
  isOpen,
  onClose,
  expense,
  projectName = 'Noori Crest Tower',
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && expense) {
      try {
        const { blobUrl: url } = getSingleExpenseVoucherBlobUrl(expense, projectName);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to generate expense voucher PDF blob:', err);
      }
    } else {
      setBlobUrl(null);
    }
  }, [isOpen, expense, projectName]);

  if (!isOpen || !expense) return null;

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <Receipt className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Expense Payment Voucher Slip
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                  {expense.expense_code}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {expense.title} • {expense.expense_date} • {expense.vendor_name || 'Direct Site Cash'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="h-8 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Open full bill voucher in a new tab via Blob URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab (Blob URL)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-1"
              title="Close Voucher Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={`Expense Voucher - ${expense.expense_code}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <FileText className="w-8 h-8 animate-pulse text-purple-400" />
              <span className="text-xs font-medium">Generating PDF Blob URL...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
