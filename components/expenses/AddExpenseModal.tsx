'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Tag,
  Check
} from 'lucide-react';
import { SiteExpense, ExpensePaymentMethod, ExpensePaymentStatus } from '@/lib/supabase/types';
import { ProfileVendor, fetchProfileVendors } from '@/lib/supabase/profile-services';
import {
  fetchDropdownCategory,
  addCustomCategory,
} from '@/lib/supabase/category-services';
import { createSiteExpense, CreateExpensePayload } from '@/lib/supabase/expense-services';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onExpenseAdded: (newExpense: SiteExpense) => void;
}

const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Food & Site Refreshments',
  'Petty Cash & Consumables',
  'Fuel & Generator Diesel',
  'Equipment & Machinery Rental',
  'Subcontractor & Labour Wages',
  'Logistics, Freight & Transport',
  'Site Repairs & Maintenance',
  'Utilities & Office Admin',
  'Material Vendor Bill Payment',
  'Miscellaneous Expense',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onExpenseAdded,
}) => {
  // Vendors from Supabase profile_vendor
  const [vendors, setVendors] = useState<ProfileVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [customPayeeName, setCustomPayeeName] = useState('');
  const [isCustomPayee, setIsCustomPayee] = useState(false);

  // Dynamic Categories from Supabase category table
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<ExpensePaymentStatus>('paid');
  const [paidBy, setPaidBy] = useState('Site Supervisor');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Vendors & Categories on open
  useEffect(() => {
    if (isOpen) {
      fetchProfileVendors().then(setVendors);
      fetchDropdownCategory('expense_category', DEFAULT_EXPENSE_CATEGORIES).then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      });
      // Reset form
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setAmount('');
      setSelectedVendorId('');
      setCustomPayeeName('');
      setIsCustomPayee(false);
      setBillNumber('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomPayee(true);
      setSelectedVendorId('');
    } else {
      setIsCustomPayee(false);
      setSelectedVendorId(val);
      const matched = vendors.find(v => v.id === val);
      if (matched) {
        setCustomPayeeName(matched.name);
      } else {
        setCustomPayeeName('');
      }
    }
  };

  const handleCreateCustomCategory = async () => {
    const trimmed = newCustomCategoryInput.trim();
    if (!trimmed) return;
    setIsSavingCategory(true);
    try {
      const res = await addCustomCategory('expense_category', trimmed, categories);
      if (res.success) {
        setCategories(res.categories);
        setSelectedCategory(trimmed);
        setNewCustomCategoryInput('');
        setIsAddingCustomCategory(false);
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter an expense title.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let finalVendorName: string | null = null;
    let finalVendorId: string | null = null;

    if (isCustomPayee) {
      finalVendorName = customPayeeName.trim() || 'Direct Expense / Petty Cash';
      finalVendorId = null;
    } else if (selectedVendorId) {
      finalVendorId = selectedVendorId;
      const matched = vendors.find(v => v.id === selectedVendorId);
      finalVendorName = matched ? matched.name : null;
    } else if (customPayeeName.trim()) {
      finalVendorName = customPayeeName.trim();
    }

    const payload: CreateExpensePayload = {
      project_id: projectId || null,
      title: title.trim(),
      category: selectedCategory,
      amount: numAmount,
      expense_date: expenseDate,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      vendor_id: finalVendorId,
      vendor_name: finalVendorName,
      paid_by: paidBy.trim() || null,
      bill_number: billNumber.trim() || null,
      notes: notes.trim() || null,
    };

    const res = await createSiteExpense(payload);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      onExpenseAdded(res.data);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
              <Receipt className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Record Site Bill & Expense
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  New Slip
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Log daily site payments, lunch, petty cash, or vendor bills
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Expense Information */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5 shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>1. Basic Expense Information</span>
            </div>

            {/* Title / Description */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Expense Title / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Site Labour Lunch & Evening Tea"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium"
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Amount (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 select-none">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Expense Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
                  className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>{isAddingCustomCategory ? 'Cancel' : '+ Category'}</span>
                </button>
              </div>

              {isAddingCustomCategory && (
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    value={newCustomCategoryInput}
                    onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                    placeholder="New category name"
                    autoFocus
                    className="flex-1 h-9 px-3 rounded-lg border border-purple-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCustomCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSavingCategory || !newCustomCategoryInput.trim()}
                    onClick={handleCreateCustomCategory}
                    className="h-9 px-3 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              )}

              <select
                value={selectedCategory}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsAddingCustomCategory(true);
                  } else {
                    setSelectedCategory(e.target.value);
                  }
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__add_new__" className="font-bold text-purple-700 bg-purple-50">
                  + Add Custom Category...
                </option>
              </select>
            </div>

            {/* Notes / Remarks / Purpose */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Notes / Remarks / Justification</span>
                </label>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                  Any Note Allowed
                </span>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any note, remarks, site details, lunch count, diesel litres, or justification..."
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none font-medium leading-relaxed"
              />
              {/* Quick Note Helper Chips */}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick add:</span>
                {[
                  'Site Lunch & Tea',
                  'DG Generator Diesel',
                  'Petty Cash Expense',
                  'Emergency Purchase',
                  'Labour Overtime Advance',
                  'Freight / Delivery'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      if (!notes) {
                        setNotes(chip);
                      } else if (!notes.includes(chip)) {
                        setNotes(`${notes} • ${chip}`);
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer font-medium"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Payee / Vendor Information */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>2. Payee / Vendor Information</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                (picks from Supabase vendors)
              </span>
            </div>

            <select
              value={isCustomPayee ? '__custom__' : selectedVendorId}
              onChange={handleVendorChange}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium cursor-pointer"
            >
              <option value="">-- Direct Payment / General Site Expense --</option>
              <optgroup label="Registered Vendors & Contractors (Supabase)">
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </optgroup>
              <option value="__custom__" className="font-bold text-purple-700 bg-purple-50">
                + Other Payee / Local Shop / Cash Recipient...
              </option>
            </select>

            {isCustomPayee && (
              <div className="animate-in fade-in duration-150 pt-1">
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Recipient / Local Vendor / Tea Stall Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customPayeeName}
                  onChange={(e) => setCustomPayeeName(e.target.value)}
                  placeholder="e.g. Site Canteen, Hardware Store, Driver Auto"
                  autoFocus
                  className="w-full h-10 px-3 rounded-lg border border-purple-300 bg-purple-50/20 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 font-medium"
                />
              </div>
            )}
          </div>

          {/* Section 3: Payment & Accounting Mode */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>3. Payment & Accounting Mode</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium cursor-pointer"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="petty_cash">Petty Cash Box</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as ExpensePaymentStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium cursor-pointer"
                >
                  <option value="paid">Paid (Fully Cleared)</option>
                  <option value="pending">Pending Payment</option>
                  <option value="reimbursable">Reimbursement Needed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Audit Trail & Invoicing Reference */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>4. Audit Trail & Voucher Reference</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Paid / Recorded By
                </label>
                <input
                  type="text"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  placeholder="e.g. Site Supervisor, Store Keeper"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Invoice / Bill / Slip # (Optional)
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. INV-8821 or Cash Memo #"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="h-4" />
        </form>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Save & Record Expense</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Also export as AddExpenseDrawer for semantic naming
export const AddExpenseDrawer = AddExpenseModal;
