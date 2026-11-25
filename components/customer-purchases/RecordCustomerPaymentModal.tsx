'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  CreditCard,
  Calendar,
  User,
  Receipt,
  FileText,
  Upload,
  CheckCircle2,
  DollarSign,
  Building2,
  Tag,
  Loader2,
  Printer,
  ExternalLink,
} from 'lucide-react';
import { CustomerPurchase, CustomerPayment, DEFAULT_PAYMENT_MODES } from '@/lib/customer-purchases/types';
import {
  fetchCategoryOptions,
  saveCategoryOption,
  recordCustomerPayment,
  uploadPurchaseImage,
  getNextReceiptNumber,
} from '@/lib/customer-purchases/purchase-services';
import { viewPaymentReceiptPdfInNewTab } from '@/lib/customer-purchases/purchase-invoice-pdf';

interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: CustomerPurchase | null;
  projectName?: string;
  userEmail?: string;
  onPaymentRecorded: (payment: CustomerPayment) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const RecordCustomerPaymentModal: React.FC<RecordCustomerPaymentModalProps> = ({
  isOpen,
  onClose,
  purchase,
  projectName = '',
  userEmail,
  onPaymentRecorded,
  showToast,
}) => {
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('Online / Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Dynamic payment modes
  const [paymentModes, setPaymentModes] = useState<string[]>([...DEFAULT_PAYMENT_MODES]);
  const [showAddModeInput, setShowAddModeInput] = useState<boolean>(false);
  const [newModeInput, setNewModeInput] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load custom payment modes
  useEffect(() => {
    if (isOpen) {
      loadPaymentModes();
      if (purchase) {
        // Suggest remaining balance if any
        const remaining = (purchase.total_amount || 0) - (purchase.totalCollected || 0);
        if (remaining > 0) {
          setAmountPaid(remaining.toString());
        } else {
          setAmountPaid('');
        }
      }
    }
  }, [isOpen, purchase]);

  const loadPaymentModes = async () => {
    try {
      const modes = await fetchCategoryOptions('customer_payment_modes', DEFAULT_PAYMENT_MODES);
      setPaymentModes(modes);
    } catch {
      setPaymentModes([...DEFAULT_PAYMENT_MODES]);
    }
  };

  const handleAddNewPaymentMode = async () => {
    const trimmed = newModeInput.trim();
    if (!trimmed) return;
    if (paymentModes.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
      setPaymentMode(trimmed);
      setShowAddModeInput(false);
      setNewModeInput('');
      return;
    }

    try {
      await saveCategoryOption('customer_payment_modes', trimmed);
      setPaymentModes(prev => [...prev, trimmed]);
      setPaymentMode(trimmed);
      setShowAddModeInput(false);
      setNewModeInput('');
      showToast?.(`Added "${trimmed}" to payment options!`, 'success');
    } catch (err) {
      console.error(err);
      setPaymentModes(prev => [...prev, trimmed]);
      setPaymentMode(trimmed);
      setShowAddModeInput(false);
      setNewModeInput('');
    }
  };

  if (!isOpen || !purchase) return null;

  const totalDeal = Math.round((Number(purchase.total_amount ?? 0)) * 100) / 100;
  const alreadyCollected = Math.round((Number(purchase.totalCollected ?? 0)) * 100) / 100;
  const currentBalance = Math.max(0, Math.round((totalDeal - alreadyCollected) * 100) / 100);
  const parsedAmount = Math.round((parseFloat(amountPaid.replace(/,/g, '')) || 0) * 100) / 100;
  const remainingAfterPayment = Math.max(0, Math.round((currentBalance - parsedAmount) * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedAmount <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptNo = await getNextReceiptNumber();
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const uploaded = await uploadPurchaseImage(receiptFile);
        receiptUrl = uploaded.url;
      }

      const newPayment = await recordCustomerPayment({
        purchase_id: purchase.id,
        project_id: purchase.project_id || null,
        receipt_voucher_no: receiptNo,
        amount_paid: parsedAmount,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        reference_no: referenceNo.trim() || null,
        received_by: receivedBy.trim() || userEmail || 'Site Office',
        notes: notes.trim() || null,
        receipt_url: receiptUrl,
        created_by_user_id: null,
      });

      onPaymentRecorded(newPayment);
      showToast?.(`Recorded payment ${receiptNo} for Rs. ${parsedAmount.toLocaleString('en-IN')}!`, 'success');

      // Auto prompt to open PDF barcode receipt
      const openPdf = confirm(`Payment of Rs. ${parsedAmount.toLocaleString('en-IN')} recorded successfully!\n\nWould you like to open & print the Barcode Payment Receipt Voucher now?`);
      if (openPdf) {
        viewPaymentReceiptPdfInNewTab(
          newPayment,
          purchase,
          projectName || purchase.project?.name || 'Site Office'
        );
      }

      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      alert(`Failed to record payment: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-[#653ef1] px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Record Inward Collection</h2>
              <p className="text-xs text-white/80">
                Customer: <strong className="font-semibold text-white">{purchase.customer_name}</strong> • Deal #{purchase.deal_number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Purchase Summary Strip */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-b border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Total Deal</span>
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Rs. {totalDeal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-emerald-200/70">
            <span className="text-[11px] text-emerald-600 block">Already Received</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-700">
              Rs. {alreadyCollected.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-amber-200/70">
            <span className="text-[11px] text-amber-600 block">Current Balance</span>
            <span className="text-xs sm:text-sm font-bold text-amber-700">
              Rs. {currentBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Amount Paid & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Received (Rs.) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">Rs.</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 2,00,00,000 or 50,000"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1]"
                />
              </div>
              {parsedAmount > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Remaining balance after this payment: <strong className={remainingAfterPayment === 0 ? 'text-emerald-600' : 'text-slate-800'}>Rs. {remainingAfterPayment.toLocaleString('en-IN')}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receipt / Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1]"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode with Dynamic Option */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddModeInput(v => !v)}
                className="text-[11px] font-bold text-[#653ef1] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Custom Mode</span>
              </button>
            </div>

            {showAddModeInput && (
              <div className="mb-2 p-2 bg-[#f6f3ff] rounded-xl border border-[#e0d6ff] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Demand Draft, Crypto, Wallets..."
                  value={newModeInput}
                  onChange={e => setNewModeInput(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#653ef1]"
                />
                <button
                  type="button"
                  onClick={handleAddNewPaymentMode}
                  className="px-3 py-1 bg-[#653ef1] hover:bg-[#522fd1] text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Save Mode
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModeInput(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {paymentModes.map(mode => {
                const isSelected = paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#653ef1] bg-[#f5f1fe] text-[#653ef1] font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference # / Cheque # / UTR & Received By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reference # / UTR / Cheque #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-98234812 / CHQ-10492"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received By (Collector Name)
              </label>
              <input
                type="text"
                placeholder="e.g. Mudassir (Site Manager)"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Voucher Notes / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 1st installment paid via NEFT, confirmed in ICICI current account."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1] resize-none"
            />
          </div>

          {/* Optional Bank Slip / Receipt Proof Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bank Screenshot / Deposit Slip Proof (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 rounded-xl hover:border-[#653ef1] bg-slate-50/50 cursor-pointer text-xs font-medium text-slate-600 transition-all">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>{receiptFile ? receiptFile.name : 'Upload Screenshot / Cheque Photo'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#653ef1] hover:from-emerald-700 hover:to-[#5532d1] text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording & Generating Slip...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Confirm Receipt & Print Voucher</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
