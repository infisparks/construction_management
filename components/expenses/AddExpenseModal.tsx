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
  Trash2,
  Wrench
} from 'lucide-react';
import { SiteExpense, ExpenseAttachment, ExpensePaymentMethod, ExpensePaymentStatus } from '@/lib/supabase/types';
import { ProfileVendor, fetchProfileVendors, createProfileVendor } from '@/lib/supabase/profile-services';
import {
  fetchDropdownCategory,
  addCustomCategory,
  deleteCustomCategory,
} from '@/lib/supabase/category-services';
import {
  createSiteExpense,
  updateSiteExpense,
  CreateExpensePayload,
  uploadExpenseBillToStorage,
  getExpenseAttachments,
} from '@/lib/supabase/expense-services';
import { fetchAllActiveSites } from '@/lib/supabase/site-storage';
import { ExpenseBillUploader } from './ExpenseBillUploader';
import { SearchableSelect, SearchableOption } from '@/components/common/SearchableSelect';
import { useAuth } from '@/lib/supabase/auth-context';

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
  const auth = useAuth();

  // Project / Site Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [projectsList, setProjectsList] = useState<ProjectOption[]>(availableProjects);

  // Vendors from Supabase profile_vendor
  const [vendors, setVendors] = useState<ProfileVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [customPayeeName, setCustomPayeeName] = useState('');
  const [customPayeeType, setCustomPayeeType] = useState<'vendor' | 'contractor'>('vendor');
  const [isCustomPayee, setIsCustomPayee] = useState(false);
  const [isSavingNewPayee, setIsSavingNewPayee] = useState(false);

  // Dynamic Categories from Supabase category table
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySuccessToast, setCategorySuccessToast] = useState<string | null>(null);

  // Category Deletion State
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<ExpensePaymentStatus>('paid');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [pendingAmountInput, setPendingAmountInput] = useState<string>('');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(todayStr);
  const [paymentRefNote, setPaymentRefNote] = useState<string>('');
  const [paidBy, setPaidBy] = useState('Site Supervisor');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Multiple Bill / Receipt Attachments (all images including iOS HEIC/HEIF and PDFs)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ExpenseAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: boolean; amount?: boolean }>({});

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
      const existingPaid =
        expenseToEdit.paid_amount != null
          ? Number(expenseToEdit.paid_amount)
          : expenseToEdit.payment_status === 'paid'
            ? Number(expenseToEdit.amount || 0)
            : 0;
      setPaidAmountInput(String(existingPaid));
      setPendingAmountInput(String(Math.max((Number(expenseToEdit.amount) || 0) - existingPaid, 0)));
      setFirstPaymentDate(expenseToEdit.first_payment_date || expenseToEdit.expense_date || new Date().toISOString().split('T')[0]);
      const firstNote = Array.isArray(expenseToEdit.payment_history) ? expenseToEdit.payment_history[0]?.note : '';
      setPaymentRefNote(firstNote && firstNote !== 'Full payment' && firstNote !== 'First partial payment' ? firstNote : '');
      setPaidBy(expenseToEdit.paid_by || 'Site Supervisor');
      setBillNumber(expenseToEdit.bill_number || '');
      setNotes(expenseToEdit.notes || '');
      setExistingAttachments(getExpenseAttachments(expenseToEdit));
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
      const defaultProj = (projectId && projectId !== 'all') ? projectId : (availableProjects[0]?.id || '');
      setSelectedProjectId(defaultProj);
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setAmount('');
      setSelectedCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
      setPaymentMethod('cash');
      setPaymentStatus('paid');
      setPaidAmountInput('');
      setPendingAmountInput('');
      setFirstPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentRefNote('');
      setPaidBy('Site Supervisor');
      setSelectedVendorId('');
      setCustomPayeeName('');
      setIsCustomPayee(false);
      setBillNumber('');
      setNotes('');
      setExistingAttachments([]);
    }
    setSelectedFiles([]);
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

  const projectOptions: SearchableOption[] = useMemo(() => {
    return projectsList.map((p) => ({
      value: p.id,
      label: p.name,
      subtitle: undefined,
      badge: undefined,
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
    ];
  }, [vendors]);

  const categoryOptions: SearchableOption[] = useMemo(() => {
    return [
      ...categories.map((c) => ({
        value: c,
        label: c,
      })),
      {
        value: '__add_new__',
        label: '+ Add Custom Category...',
        isAction: true,
      },
    ];
  }, [categories]);

  const handleCategorySelect = (val: string) => {
    if (val === '__add_new__') {
      setIsAddingCustomCategory(true);
    } else {
      setSelectedCategory(val);
    }
  };

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

  const handleSaveAndSelectNewPayee = async () => {
    const trimmed = customPayeeName.trim();
    if (!trimmed) return;
    setIsSavingNewPayee(true);
    try {
      const { data, error } = await createProfileVendor({
        name: trimmed,
        type: customPayeeType,
      });
      if (data) {
        setVendors((prev) => [data, ...prev]);
        setSelectedVendorId(data.id);
        setIsCustomPayee(false);
        setCustomPayeeName(data.name);
      }
    } catch (err) {
      console.error('Error saving payee profile:', err);
    } finally {
      setIsSavingNewPayee(false);
    }
  };

  const handleCreateCustomCategory = async (customLabel?: string) => {
    const trimmed = (typeof customLabel === 'string' ? customLabel : newCustomCategoryInput).trim();
    if (!trimmed) return;
    setIsSavingCategory(true);
    try {
      const res = await addCustomCategory('expense_category', trimmed, categories);
      if (res.success) {
        setCategories(res.categories);
        setSelectedCategory(trimmed);
        setNewCustomCategoryInput('');
        setIsAddingCustomCategory(false);
        setCategorySuccessToast(`Category "${trimmed}" saved and updated!`);
        setTimeout(() => setCategorySuccessToast(null), 3000);
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleOpenDeleteModal = (categoryName: string) => {
    if (!categoryName) return;
    setCategoryToDelete(categoryName);
    setDeleteConfirmInput('');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    if (deleteConfirmInput.trim().toLowerCase() !== 'confirm') return;

    setIsDeletingCategory(true);
    try {
      const res = await deleteCustomCategory('expense_category', categoryToDelete, categories);
      if (res.success) {
        setCategories(res.categories);
        if (selectedCategory.trim().toLowerCase() === categoryToDelete.trim().toLowerCase()) {
          setSelectedCategory(res.categories[0] || '');
        }
        setCategorySuccessToast(`Category "${categoryToDelete}" deleted successfully.`);
        setTimeout(() => setCategorySuccessToast(null), 3000);
        setCategoryToDelete(null);
        setDeleteConfirmInput('');
      }
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { title?: boolean; amount?: boolean } = {};
    if (!title.trim()) {
      errors.title = true;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage(
        errors.title && errors.amount
          ? 'Please enter both an expense title and a valid amount.'
          : errors.title
            ? 'Please enter an expense title / description.'
            : 'Please enter a valid amount greater than 0.'
      );
      return;
    }

    setFieldErrors({});
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
      // Auto register to profile_vendor with selected type if not already saved
      try {
        const { data } = await createProfileVendor({
          name: finalVendorName,
          type: customPayeeType,
        });
        if (data) {
          finalVendorId = data.id;
          finalVendorName = data.name;
          setVendors(prev => [data, ...prev]);
        }
      } catch (e) {
        console.warn('Auto register payee failed:', e);
      }
    }

    let newlyUploadedAttachments: ExpenseAttachment[] = [];

    if (selectedFiles.length > 0) {
      try {
        setIsUploading(true);
        const uploadResults = await Promise.all(
          selectedFiles.map((file) => uploadExpenseBillToStorage(file, 'expense_bills'))
        );
        newlyUploadedAttachments = uploadResults.map((res, idx) => ({
          url: res.publicUrl,
          name: res.fileName,
          type: selectedFiles[idx]?.type || undefined,
        }));
      } catch (uploadErr: any) {
        console.error('Failed to upload expense bills:', uploadErr);
        setErrorMessage(`Failed to upload attached bill: ${uploadErr?.message || 'Storage error'}`);
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const finalAttachments: ExpenseAttachment[] = [
      ...existingAttachments,
      ...newlyUploadedAttachments,
    ];
    const primaryAttachment = finalAttachments[0] || null;

    const finalProjectId = (selectedProjectId && selectedProjectId !== 'all')
      ? selectedProjectId
      : ((projectId && projectId !== 'all') ? projectId : (availableProjects[0]?.id || null));

    let resolvedStatus: ExpensePaymentStatus = paymentStatus;
    let resolvedPaidAmount = 0;
    let resolvedFirstDate: string | null = null;
    let resolvedSettlementDate: string | null = null;

    if (paymentStatus === 'paid') {
      resolvedPaidAmount = numAmount;
      resolvedFirstDate = expenseToEdit?.first_payment_date || expenseDate;
      resolvedSettlementDate = expenseToEdit?.settlement_date || expenseDate;
    } else if (paymentStatus === 'partial') {
      const parsedPaid = Math.min(Math.max(parseFloat(paidAmountInput) || 0, 0), numAmount);
      if (parsedPaid >= numAmount) {
        resolvedStatus = 'paid';
        resolvedPaidAmount = numAmount;
        resolvedFirstDate = expenseToEdit?.first_payment_date || firstPaymentDate || expenseDate;
        resolvedSettlementDate = expenseDate;
      } else if (parsedPaid <= 0) {
        resolvedStatus = 'pending';
        resolvedPaidAmount = 0;
      } else {
        resolvedStatus = 'partial';
        resolvedPaidAmount = parsedPaid;
        resolvedFirstDate = expenseToEdit?.first_payment_date || firstPaymentDate || expenseDate;
      }
    }

    const trimmedRef = paymentStatus !== 'pending' ? paymentRefNote.trim() : '';
    const baseNotes = notes.trim();
    const combinedNotes =
      trimmedRef && !baseNotes.includes(trimmedRef)
        ? baseNotes
          ? `${baseNotes} | Ref: ${trimmedRef}`
          : `Ref: ${trimmedRef}`
        : baseNotes || null;

    if (expenseToEdit) {
      const payload: Partial<CreateExpensePayload> = {
        project_id: finalProjectId,
        title: title.trim(),
        category: selectedCategory,
        amount: numAmount,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        payment_status: resolvedStatus,
        paid_amount: resolvedPaidAmount,
        first_payment_date: resolvedFirstDate,
        settlement_date: resolvedSettlementDate,
        vendor_id: finalVendorId,
        vendor_name: finalVendorName,
        paid_by: paidBy.trim() || null,
        bill_number: billNumber.trim() || null,
        receipt_url: primaryAttachment ? primaryAttachment.url : null,
        receipt_file_name: primaryAttachment ? primaryAttachment.name : null,
        attachments: finalAttachments,
        notes: combinedNotes,
      };

      const res = await updateSiteExpense(expenseToEdit.id, payload);
      setIsSubmitting(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        onExpenseUpdated?.(res.data);
        onClose();
      }
    } else {
      const initialHistory =
        resolvedPaidAmount > 0
          ? [
            {
              amount: resolvedPaidAmount,
              date: resolvedFirstDate || expenseDate,
              method: paymentMethod,
              note: trimmedRef || (resolvedStatus === 'partial' ? 'First partial payment' : 'Full payment'),
            },
          ]
          : [];

      const payload: CreateExpensePayload = {
        project_id: finalProjectId,
        title: title.trim(),
        category: selectedCategory,
        amount: numAmount,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        payment_status: resolvedStatus,
        paid_amount: resolvedPaidAmount,
        first_payment_date: resolvedFirstDate,
        settlement_date: resolvedSettlementDate,
        payment_history: initialHistory,
        vendor_id: finalVendorId,
        vendor_name: finalVendorName,
        paid_by: paidBy.trim() || null,
        bill_number: billNumber.trim() || null,
        receipt_url: primaryAttachment ? primaryAttachment.url : null,
        receipt_file_name: primaryAttachment ? primaryAttachment.name : null,
        attachments: finalAttachments,
        notes: combinedNotes,
        ...(auth.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
          ? { enterdby: auth.user.id }
          : { enterdby: 'a72d7229-1476-4f82-b105-7d38de4e2af3' }),
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

  if (!isOpen) return null;

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
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${expenseToEdit
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
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: false }));
                }}
                placeholder="e.g. Site Labour Lunch & Evening Tea"
                className={`w-full h-10 px-3 rounded-lg border bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-medium transition-colors ${fieldErrors.title
                  ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                  : 'border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600'
                  }`}
              />
              {fieldErrors.title && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">Please enter an expense title / description.</p>
              )}
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Total Bill Amount (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 select-none">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmount(val);
                      if (paymentStatus === 'partial') {
                        const tot = parseFloat(val) || 0;
                        const pd = parseFloat(paidAmountInput) || 0;
                        setPendingAmountInput(String(Math.max(tot - pd, 0)));
                      }
                      if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: false }));
                    }}
                    placeholder="0.00"
                    className={`w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-bold transition-colors ${fieldErrors.amount
                      ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600'
                      }`}
                  />
                </div>
                {fieldErrors.amount && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">Please enter an amount greater than 0.</p>
                )}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
                    className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{isAddingCustomCategory ? 'Cancel' : 'Add Category'}</span>
                  </button>
                </div>
              </div>

              {isAddingCustomCategory && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCustomCategoryInput}
                      onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                      placeholder="New category name"
                      autoFocus
                      className="flex-1 h-9 px-3 rounded-lg border border-purple-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
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
                      onClick={() => handleCreateCustomCategory()}
                      className="h-9 px-3.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                    >
                      {isSavingCategory ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : null}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}

              {categorySuccessToast && (
                <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{categorySuccessToast}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={handleCategorySelect}
                    placeholder="Search or select category..."
                    searchPlaceholder="Search categories..."
                    onDeleteOption={handleOpenDeleteModal}
                    onCreateOption={(newLabel) => handleCreateCustomCategory(newLabel)}
                  />
                </div>

                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteModal(selectedCategory)}
                    title={`Delete category "${selectedCategory}"`}
                    className="h-10 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
              value={selectedVendorId}
              onChange={(val) => {
                setIsCustomPayee(false);
                setCustomPayeeName('');
                setSelectedVendorId(val);
              }}
              placeholder="Select Payee / Vendor..."
              searchPlaceholder="Search vendor or contractor..."
            />
            <p className="text-[10px] text-slate-400">
              Select from existing Store vendors/contractors (new vendor profiles are created from Store).
            </p>
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
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    const next = e.target.value as ExpensePaymentStatus;
                    setPaymentStatus(next);
                    if (next === 'partial' && !paidAmountInput) {
                      setPaidAmountInput('');
                      setPendingAmountInput('');
                      setFirstPaymentDate(expenseDate);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium cursor-pointer"
                >
                  <option value="paid">Paid (Fully Cleared)</option>
                  <option value="partial">Partial Paid (Paid + Pending Split)</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>

              {paymentStatus !== 'pending' ? (
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
              ) : (
                <div className="flex items-center px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800">
                  Payment method &amp; reference will be recorded when payment is made.
                </div>
              )}
            </div>

            {paymentStatus !== 'pending' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {paymentMethod === 'upi'
                    ? 'UPI Number / Transaction Ref'
                    : paymentMethod === 'cheque'
                      ? 'Cheque Number & Bank Name'
                      : paymentMethod === 'bank_transfer'
                        ? 'Bank Name & UTR / Reference No.'
                        : 'Payment Note / Receipt Ref (Optional)'}
                </label>
                <input
                  type="text"
                  value={paymentRefNote}
                  onChange={(e) => setPaymentRefNote(e.target.value)}
                  placeholder={
                    paymentMethod === 'upi'
                      ? 'e.g. UPI Ref 432819... or 98xxx@ybl'
                      : paymentMethod === 'cheque'
                        ? 'e.g. Cheque #004512 - HDFC Bank'
                        : paymentMethod === 'bank_transfer'
                          ? 'e.g. SBI NEFT - UTR 123456...'
                          : 'e.g. Cash voucher #12 / paid by supervisor'
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>
            )}

            {paymentStatus === 'partial' && (
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Paid Now (Rs.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paidAmountInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaidAmountInput(val);
                        const pd = parseFloat(val) || 0;
                        const tot = parseFloat(amount) || 0;
                        if (tot > 0 && tot >= pd) {
                          setPendingAmountInput(String(Math.max(tot - pd, 0)));
                        } else {
                          const pend = parseFloat(pendingAmountInput) || 0;
                          setAmount(String(pd + pend));
                        }
                      }}
                      placeholder="e.g. 5000"
                      className="w-full h-9 px-3 rounded-lg border border-purple-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pending Balance (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pendingAmountInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPendingAmountInput(val);
                        const pend = parseFloat(val) || 0;
                        const pd = parseFloat(paidAmountInput) || 0;
                        setAmount(String(pd + pend));
                      }}
                      placeholder="e.g. 1000"
                      className="w-full h-9 px-3 rounded-lg border border-amber-300 bg-amber-50/70 text-xs text-amber-900 font-bold focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      First Payment Date
                    </label>
                    <input
                      type="date"
                      value={firstPaymentDate}
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-purple-200/60">
                  <span>
                    Total Bill: <strong className="text-slate-900">Rs. {(parseFloat(amount) || 0).toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Paid: <strong className="text-emerald-700">Rs. {(parseFloat(paidAmountInput) || 0).toLocaleString('en-IN')}</strong> + Pending:{' '}
                    <strong className="text-amber-700">Rs. {(parseFloat(pendingAmountInput) || 0).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>
            )}
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
            {/* Existing Saved Attachments (when editing) */}
            {existingAttachments.length > 0 && (
              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    <span>Saved Bill Attachments ({existingAttachments.length})</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Saved on Cloud
                  </span>
                </div>

                <div className="space-y-1.5">
                  {existingAttachments.map((att, idx) => (
                    <div key={att.url + idx} className="flex items-center justify-between gap-3 bg-white p-2 rounded-md border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800">
                          {att.name || `Attachment ${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setExistingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-file Uploader (Multiple Images or PDFs) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Attach Bills / Receipts (Multiple Images or PDFs Allowed)
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/30 transition-colors cursor-pointer text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.heic,.heif,.pdf,application/pdf"
                  disabled={isSubmitting || isUploading}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setSelectedFiles((prev) => [...prev, ...files]);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <Paperclip className="w-5 h-5 text-[#653ef1]" />
                <span className="text-xs font-bold text-slate-700">
                  Click to select one or multiple Images / PDFs
                </span>
                <span className="text-[10px] text-slate-400">
                  Supports JPG, PNG, iOS HEIC/HEIF, and PDF (up to 25MB each)
                </span>
              </label>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 bg-purple-50/50 border border-purple-200/80 px-3 py-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#653ef1] shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-[#653ef1]/25 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
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

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">Delete Category</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-900 break-words">&ldquo;{categoryToDelete}&rdquo;</span>? This will remove it from the list of available categories.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Type <span className="text-rose-600 font-bold tracking-wide">confirm</span> to proceed:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder='Type "confirm"'
                autoFocus
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmInput.trim().toLowerCase() === 'confirm') {
                    e.preventDefault();
                    handleConfirmDeleteCategory();
                  }
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryToDelete(null);
                  setDeleteConfirmInput('');
                }}
                disabled={isDeletingCategory}
                className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput.trim().toLowerCase() !== 'confirm' || isDeletingCategory}
                onClick={handleConfirmDeleteCategory}
                className="h-8 px-3.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isDeletingCategory ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as AddExpenseDrawer for semantic naming
export const AddExpenseDrawer = AddExpenseModal;
