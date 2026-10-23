'use client';

import React, { useState } from 'react';
import { X, Building2, Plus, Sparkles, User, Phone, MapPin, Receipt, Calendar, Wrench } from 'lucide-react';
import { ContractorWorkOrder, WORK_TRADE_CATEGORIES } from '@/lib/contractor-work-orders/types';
import { generateWorkOrderNumber } from '@/lib/contractor-work-orders/work-order-services';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  existingCount: number;
  onSave: (order: Omit<ContractorWorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'extraAmount' | 'totalRevisedAmount' | 'totalPaid' | 'balanceRemaining'>) => Promise<void>;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  projectName,
  projectId,
  existingCount,
  onSave,
  showToast,
}) => {
  const [workOrderNumber, setWorkOrderNumber] = useState(() => generateWorkOrderNumber(existingCount));
  const [title, setTitle] = useState('');
  const [tradeCategory, setTradeCategory] = useState<string>('Plastering Work');
  const [scopeDescription, setScopeDescription] = useState('');
  
  // Vendor details
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [vendorBankUpi, setVendorBankUpi] = useState('');

  // Dates & Amount
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast?.('Please enter work title (e.g. Plastering Work)', 'error');
      return;
    }
    if (!vendorName.trim()) {
      showToast?.('Please enter contractor / vendor name', 'error');
      return;
    }
    const amountNum = parseFloat(initialAmount) || 0;
    if (amountNum <= 0) {
      showToast?.('Please enter a valid initial contract amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        projectId,
        workOrderNumber,
        title: title.trim(),
        tradeCategory,
        scopeDescription: scopeDescription.trim() || undefined,
        vendorName: vendorName.trim(),
        vendorPhone: vendorPhone.trim() || undefined,
        vendorAddress: vendorAddress.trim() || undefined,
        vendorGstin: vendorGstin.trim() || undefined,
        vendorPan: vendorPan.trim() || undefined,
        vendorBankUpi: vendorBankUpi.trim() || undefined,
        startDate,
        expectedCompletionDate: expectedCompletionDate || undefined,
        status: 'in_progress',
        initialAmount: amountNum,
        notes: notes.trim() || undefined,
      });
      showToast?.('Work order registered successfully!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      showToast?.(err?.message || 'Failed to create work order', 'error');
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
        className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">New Contractor Work Order</h2>
              <p className="text-xs text-slate-500">
                Site: <span className="font-semibold text-purple-700">{projectName}</span> • Agreement & Payout Contract
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Work Order Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              1. Work Scope & Trade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Order # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={workOrderNumber}
                  onChange={(e) => setWorkOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono font-medium"
                  placeholder="e.g. WO-2026-001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trade / Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={tradeCategory}
                  onChange={(e) => setTradeCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white"
                >
                  {WORK_TRADE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. Internal & External Plastering Work"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope & Measurement Details (Area / Specs)
                </label>
                <textarea
                  rows={2}
                  value={scopeDescription}
                  onChange={(e) => setScopeDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. Plaster work 1000 area, 1:4 cement mortar with neeru finish"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contractor / Vendor Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              2. Contractor / Vendor Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contractor / Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. Ramesh Plastering Contractors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank / UPI Details (For Payouts)
                </label>
                <input
                  type="text"
                  value={vendorBankUpi}
                  onChange={(e) => setVendorBankUpi(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. UPI: ramesh@okhdfcbank / A/C: 1234..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PAN / GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={vendorPan}
                  onChange={(e) => setVendorPan(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 uppercase"
                  placeholder="e.g. ABCDE1234F"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Contract Amount & Dates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              3. Commercial Agreed Amount & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Agreed Total (Rs.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-purple-300 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-bold text-purple-900 bg-purple-50/40"
                    placeholder="e.g. 100000"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Base amount. Extra work additions can be added anytime later with history.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Completion Date
                </label>
                <input
                  type="date"
                  value={expectedCompletionDate}
                  onChange={(e) => setExpectedCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>
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
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Work Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
