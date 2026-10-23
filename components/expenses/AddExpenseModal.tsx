'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Paperclip,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { SiteExpense, ExpensePaymentMethod, ExpensePaymentStatus } from '@/lib/supabase/types';
import { ProfileVendor, fetchProfileVendors } from '@/lib/supabase/profile-services';
import {
  fetchDropdownCategory,
  addCustomCategory,
} from '@/lib/supabase/category-services';
import {
  createSiteExpense,
  updateSiteExpense,
  CreateExpensePayload,
  uploadExpenseBillToStorage,
} from '@/lib/supabase/expense-services';
import { fetchAllActiveSites } from '@/lib/supabase/site-storage';
import { ExpenseBillUploader } from './ExpenseBillUploader';
import { SearchableSelect, SearchableOption } from '@/components/common/SearchableSelect';

interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
  serial_no?: number;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  availableProjects?: ProjectOption[];
  expenseToEdit?: SiteExpense | null;
  onExpenseAdded?: (newExpense: SiteExpense) => void;
  onExpenseUpdated?: (updatedExpense: SiteExpense) => void;
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
  availableProjects = [],
  expenseToEdit,
  onExpenseAdded,
  onExpenseUpdated,
}) => {
  // Project / Site Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [projectsList, setProjectsList] = useState<ProjectOption[]>(availableProjects);

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

  // Bill / Receipt Attachment (all images including iOS HEIC/HEIF and PDF)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [existingReceiptFileName, setExistingReceiptFileName] = useState<string | null>(null);
  const [isRemovingReceipt, setIsRemovingReceipt] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Vendors & Categories on open
  useEffect(() => {
    if (!isOpen) return;

    fetchProfileVendors().then(setVendors);
    fetchDropdownCategory('expense_category', DEFAULT_EXPENSE_CATEGORIES).then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });

    if (availableProjects && availableProjects.length > 0) {
      setProjectsList(availableProjects);
    } else {
      fetchAllActiveSites().then((sites) => {
        if (sites && sites.length > 0) {
          setProjectsList(sites);
        }
      });
    }

    // Prefill form if editing, or reset form if adding new
    if (expenseToEdit) {
      setSelectedProjectId(expenseToEdit.project_id || projectId || '');
      setTitle(expenseToEdit.title || '');
      setAmount(expenseToEdit.amount ? String(expenseToEdit.amount) : '');
      setExpenseDate(expenseToEdit.expense_date || new Date().toISOString().split('T')[0]);
      setSelectedCategory(expenseToEdit.category || DEFAULT_EXPENSE_CATEGORIES[0]);
      setPaymentMethod(expenseToEdit.payment_method || 'cash');
      setPaymentStatus(expenseToEdit.payment_status || 'paid');
      setPaidBy(expenseToEdit.paid_by || 'Site Supervisor');
      setBillNumber(expenseToEdit.bill_number || '');
      setNotes(expenseToEdit.notes || '');
      setExistingReceiptUrl(expenseToEdit.receipt_url || null);
      setExistingReceiptFileName(expenseToEdit.receipt_file_name || null);
      setIsRemovingReceipt(false);
      if (expenseToEdit.vendor_id) {
        setSelectedVendorId(expenseToEdit.vendor_id);
        setIsCustomPayee(false);
        setCustomPayeeName('');
      } else {
        setSelectedVendorId('');
        setIsCustomPayee(true);
        setCustomPayeeName(expenseToEdit.vendor_name || '');
      }
    } else {
      setSelectedProjectId(projectId || '');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setAmount('');
      setSelectedCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
      setPaymentMethod('cash');
      setPaymentStatus('paid');
      setPaidBy('Site Supervisor');
      setSelectedVendorId('');
      setCustomPayeeName('');
      setIsCustomPayee(false);
      setBillNumber('');
      setNotes('');
      setExistingReceiptUrl(null);
      setExistingReceiptFileName(null);
      setIsRemovingReceipt(false);
    }
    setSelectedFile(null);
    setIsUploading(false);
    setErrorMessage(null);
  }, [isOpen, expenseToEdit?.id]);

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

  const projectOptions: SearchableOption[] = useMemo(() => {
    return projectsList.map((p) => ({
      value: p.id,
      label: p.name,
      subtitle: p.code ? `Code: ${p.code}` : undefined,
      badge: p.serial_no ? `#${p.serial_no}` : (p.code || undefined),
    }));
  }, [projectsList]);

  const payeeOptions: SearchableOption[] = useMemo(() => {
    return [
      {
        value: '',
        label: 'Direct Payment / General Site Expense',
        subtitle: 'Cashier / Supervisor Direct Expense',
      },
      ...vendors.map((v) => ({
        value: v.id,
        label: v.name,
        subtitle: [v.type, v.trade, v.phone].filter(Boolean).join(' • ') || undefined,
        badge: v.type ? (v.type.charAt(0).toUpperCase() + v.type.slice(1)) : undefined,
        badgeColor:
          v.type === 'contractor'
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            : 'bg-purple-50 text-purple-700 border border-purple-200',
      })),
      {
        value: '__custom__',
        label: '+ Other Payee / Local Shop / Cash Recipient...',
        isAction: true,
      },
    ];
  }, [vendors]);

  const handleVendorSelect = (val: string) => {
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

    let uploadedReceiptUrl: string | null = null;
    let uploadedReceiptFileName: string | null = null;

    if (selectedFile) {
      try {
        setIsUploading(true);
        const uploadRes = await uploadExpenseBillToStorage(selectedFile, 'expense_bills');
        uploadedReceiptUrl = uploadRes.publicUrl;
        uploadedReceiptFileName = uploadRes.fileName;
      } catch (uploadErr: any) {
        console.error('Failed to upload expense bill:', uploadErr);
        setErrorMessage(`Failed to upload attached bill: ${uploadErr?.message || 'Storage error'}`);
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (expenseToEdit) {
      const payload: Partial<CreateExpensePayload> = {
        project_id: selectedProjectId || projectId || null,
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

      if (uploadedReceiptUrl) {
        payload.receipt_url = uploadedReceiptUrl;
        payload.receipt_file_name = uploadedReceiptFileName;
      } else if (isRemovingReceipt) {
        payload.receipt_url = null;
        payload.receipt_file_name = null;
      }

      const res = await updateSiteExpense(expenseToEdit.id, payload);
      setIsSubmitting(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        onExpenseUpdated?.(res.data);
        onClose();
      }
    } else {
      const payload: CreateExpensePayload = {
        project_id: selectedProjectId || projectId || null,
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
        receipt_url: uploadedReceiptUrl,
        receipt_file_name: uploadedReceiptFileName,
        notes: notes.trim() || null,
      };

      const res = await createSiteExpense(payload);
      setIsSubmitting(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        onExpenseAdded?.(res.data);
        onClose();
      }
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
                  {expenseToEdit ? 'Edit Site Bill & Expense' : 'Record Site Bill & Expense'}
                </h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  expenseToEdit 
                    ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {expenseToEdit ? expenseToEdit.expense_code : 'New Slip'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {expenseToEdit 
                  ? 'Update details, vendor, amount, or attached bill for this entry' 
                  : 'Log daily site payments, lunch, petty cash, or vendor bills'}
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

          {/* Top Card: Construction Site Selection */}
          <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/70 space-y-1.5 shadow-2xs">
            <label className="block text-[11px] font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-900">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Site / Construction Project</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                Default: Current Site
              </span>
            </label>
            <SearchableSelect
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Select Construction Site..."
              searchPlaceholder="Search construction site..."
            />
            <p className="text-[10px] text-slate-500">
              This bill / expense will be attributed to the selected site. You can switch to another site if needed.
            </p>
          </div>

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

            <SearchableSelect
              options={payeeOptions}
              value={isCustomPayee ? '__custom__' : selectedVendorId}
              onChange={handleVendorSelect}
              placeholder="Select Payee / Vendor..."
              searchPlaceholder="Search vendor, contractor or recipient..."
            />

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

          {/* Section 5: Attached Physical Bill / Invoice Copy */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            {/* Show Currently Attached Bill (when editing) */}
            {existingReceiptUrl && !isRemovingReceipt && (
              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    <span>Currently Attached Bill Document</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Saved on Cloud
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-md border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate font-medium text-slate-800">
                      {existingReceiptFileName || 'Attached_Bill_Document'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={existingReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsRemovingReceipt(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Remove Bill</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  You can keep this bill, remove it, or upload a new file below to replace it.
                </p>
              </div>
            )}

            {/* If user clicked remove receipt, show notice with undo option */}
            {existingReceiptUrl && isRemovingReceipt && !selectedFile && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-800 font-medium text-[11px]">
                  ⚠️ Attached bill will be removed on saving.
                </span>
                <button
                  type="button"
                  onClick={() => setIsRemovingReceipt(false)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  Undo (Keep Bill)
                </button>
              </div>
            )}

            <ExpenseBillUploader
              file={selectedFile}
              onFileChange={(f) => {
                setSelectedFile(f);
                if (f) {
                  // User chose a new file to replace or add
                  setIsRemovingReceipt(false);
                }
              }}
              disabled={isSubmitting || isUploading}
              label={existingReceiptUrl && !isRemovingReceipt ? "Replace With New Bill / Receipt (Optional)" : "Attach Physical Bill / Cash Memo / Receipt Copy (Optional)"}
              hint="Supports all image formats (JPG, PNG, iOS HEIC/HEIF) or PDF (up to 25MB)"
            />
          </div>

          <div className="h-4" />
        </form>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting || isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{expenseToEdit ? 'Updating Expense...' : 'Uploading Bill & Saving...'}</span>
              </>
            ) : (
              <>
                {expenseToEdit ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{expenseToEdit ? 'Save Changes' : 'Save & Record Expense'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Also export as AddExpenseDrawer for semantic naming
export const AddExpenseDrawer = AddExpenseModal;
