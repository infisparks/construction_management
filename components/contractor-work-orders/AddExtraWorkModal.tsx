'use client';

import React, { useState } from 'react';
import { X, TrendingUp, Sparkles, AlertCircle, Calendar, PlusCircle, Check } from 'lucide-react';
import { ContractorWorkOrder } from '@/lib/contractor-work-orders/types';
import { formatINR } from '@/lib/contractor-work-orders/work-order-invoice-pdf';

interface AddExtraWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: ContractorWorkOrder;
  onSaveRevision: (workOrderId: string, data: {
    additionalAmount: number;
    reason: string;
    notes?: string;
    revisionDate?: string;
  }) => Promise<void>;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const AddExtraWorkModal: React.FC<AddExtraWorkModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSaveRevision,
  showToast,
}) => {
  const [extraAmount, setExtraAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [revisionDate, setRevisionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentTotal = workOrder.totalRevisedAmount;
  const extraNum = parseFloat(extraAmount) || 0;
  const newTotal = currentTotal + extraNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (extraNum <= 0) {
      showToast?.('Please enter a valid extra amount to add', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast?.('Please enter reason or scope note (e.g. Plaster work 1000 area)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveRevision(workOrder.id, {
        additionalAmount: extraNum,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        revisionDate,
      });
      showToast?.(`Added Rs. ${extraNum.toLocaleString('en-IN')} extra work variation!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to add extra work revision:', err);
      showToast?.(err?.message || 'Failed to add revision', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-amber-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Extra Work / Variation Order</h2>
              <p className="text-xs text-slate-500">
                WO: <span className="font-mono font-semibold text-purple-700">{workOrder.workOrderNumber}</span> • {workOrder.vendorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Work Summary Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between items-center text-slate-600">
              <span>Work Title:</span>
              <strong className="text-slate-900">{workOrder.title}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Trade:</span>
              <span className="font-medium text-slate-700">{workOrder.tradeCategory}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Initial Base Deal:</span>
              <span className="font-semibold text-slate-700">{formatINR(workOrder.initialAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Current Agreed Total:</span>
              <strong className="text-purple-700">{formatINR(workOrder.totalRevisedAmount)}</strong>
            </div>
          </div>

          {/* Extra Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Extra Amount to Increase (Rs.) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border-2 border-amber-300 rounded-lg focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold text-amber-900 bg-amber-50/30"
                placeholder="e.g. 20000"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              This will increase the total payable amount from {formatINR(currentTotal)} to {formatINR(newTotal)}.
            </p>
          </div>

          {/* Reason / Scope Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Why / Reason for Extra Work <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium"
              placeholder="e.g. Plaster work 1000 area extra requested by client"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Measurement / Variation Note
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              placeholder="e.g. Approved site measurement sheet dated 23-Oct. Extra area on 3rd floor ceiling."
            />
          </div>

          {/* Revision Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amendment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={revisionDate}
              onChange={(e) => setRevisionDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
          </div>

          {/* Live Calculation Preview Banner */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Revised Total Deal</span>
              <span className="text-slate-600">
                {formatINR(currentTotal)} + <strong className="text-amber-700">{formatINR(extraNum)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-purple-900 block">{formatINR(newTotal)}</span>
              <span className="text-[10px] text-slate-500">Remaining to Pay: {formatINR(newTotal - workOrder.totalPaid)}</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Confirm & Add Extra</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
