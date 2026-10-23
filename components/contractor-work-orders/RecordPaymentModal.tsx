'use client';

import React, { useState } from 'react';
import { X, HandCoins, Check, Calendar, Receipt, ShieldCheck } from 'lucide-react';
import { ContractorWorkOrder, WorkOrderPaymentMode } from '@/lib/contractor-work-orders/types';
import { formatINR } from '@/lib/contractor-work-orders/work-order-invoice-pdf';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: ContractorWorkOrder;
  onSavePayment: (workOrderId: string, data: {
    amountPaid: number;
    paymentDate?: string;
    paymentMode: WorkOrderPaymentMode;
    paidTo: string;
    referenceNumber?: string;
    paidBy?: string;
    notes?: string;
  }) => Promise<void>;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSavePayment,
  showToast,
}) => {
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<WorkOrderPaymentMode>('cash');
  const [paidTo, setPaidTo] = useState(workOrder.vendorName);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paidBy, setPaidBy] = useState('Site Supervisor / Accounts');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const remaining = Math.max(0, workOrder.balanceRemaining);
  const paidNum = parseFloat(amountPaid) || 0;
  const newBalance = Math.max(0, workOrder.totalRevisedAmount - (workOrder.totalPaid + paidNum));

  const handlePayFull = () => {
    setAmountPaid(remaining.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidNum <= 0) {
      showToast?.('Please enter a valid payment amount', 'error');
      return;
    }
    if (!paidTo.trim()) {
      showToast?.('Please specify to whom payment was given', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSavePayment(workOrder.id, {
        amountPaid: paidNum,
        paymentDate,
        paymentMode,
        paidTo: paidTo.trim(),
        referenceNumber: referenceNumber.trim() || undefined,
        paidBy: paidBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast?.(`Recorded payment of Rs. ${paidNum.toLocaleString('en-IN')} to ${paidTo}!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      showToast?.(err?.message || 'Failed to record payment', 'error');
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
        <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Contractor Payout</h2>
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
          {/* Commercial State Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Agreed Contract</span>
              <strong className="text-slate-900 text-sm">{formatINR(workOrder.totalRevisedAmount)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Already Given / Paid</span>
              <strong className="text-emerald-700 text-sm">{formatINR(workOrder.totalPaid)}</strong>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold">Outstanding Balance:</span>
                <span className="ml-1.5 font-extrabold text-amber-700 text-sm">{formatINR(remaining)}</span>
              </div>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors cursor-pointer"
                >
                  Pay Full Balance
                </button>
              )}
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Given / Disbursed (Rs.) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border-2 border-emerald-300 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-emerald-900 bg-emerald-50/30"
                placeholder="e.g. 25000"
                autoFocus
              />
            </div>
          </div>

          {/* Payment Date & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as WorkOrderPaymentMode)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white"
              >
                <option value="cash">Cash in Hand</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>
          </div>

          {/* Paid To & Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paid To (Receiver Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                placeholder="Receiver name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cheque / UTR / Txn Reference
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                placeholder="e.g. UTR-9872132 or Cheque #1029"
              />
            </div>
          </div>

          {/* Notes / Reason for Payment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Milestone / Note (Why & for what given)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              placeholder="e.g. Part payment after 1st floor plaster completion verified by engineer"
            />
          </div>

          {/* Real-time Result Preview */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">New Total Paid</span>
              <span className="text-slate-600">
                {formatINR(workOrder.totalPaid)} + <strong className="text-emerald-700">{formatINR(paidNum)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-emerald-900 block">{formatINR(workOrder.totalPaid + paidNum)}</span>
              <span className="text-[10px] text-slate-500">Remaining Balance: {formatINR(newBalance)}</span>
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
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Release Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
