'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  Building2,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Clock,
  CreditCard,
  User,
  Paperclip,
  Edit2,
  RotateCcw,
  Calendar,
  X,
  Upload,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { DbProject } from '@/lib/supabase/types';
import {
  OperatingExpenseType,
  OperatingExpenseRow,
  OperatingPaymentMethod,
  OperatingExpenseAttachment,
  OperatingCustomField,
  fetchOperatingExpenses,
  fetchDeletedOperatingExpenses,
  createOperatingExpense,
  updateOperatingExpense,
  softDeleteOperatingExpense,
  restoreOperatingExpense,
  uploadOperatingAttachmentToStorage,
} from '@/lib/supabase/operating-expense-services';
import {
  fetchDropdownCategory,
  addCustomCategory,
  fetchCategoryFieldTemplates,
  saveCategoryFieldTemplate,
} from '@/lib/supabase/category-services';
import { formatMumbaiDate } from '@/lib/common/date-format';
import {
  DateFilterControl,
  DateFilterState,
  DEFAULT_DATE_FILTER,
  matchesDateFilter,
} from '@/components/common/DateFilterControl';

interface OperatingExpensesViewProps {
  expenseType?: OperatingExpenseType | 'all';
  projectId?: string;
  allProjects?: DbProject[];
  userEmail?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const PETTY_CASH_CATEGORIES = [
  'Site Refreshments & Tea',
  'Local Conveyance & Auto',
  'Hardware & Small Tools',
  'Courier & Stationery',
  'Labour Welfare / Misc',
  'Emergency Site Cash',
  'Other Petty Cash',
];

const OTHER_EXPENSE_CATEGORIES = [
  'Staff Salary',
  'Engineer / Supervisor Salary',
  'Office Rent',
  'Electricity & Internet',
  'Vehicle & Fuel',
  'Legal & Consultancy',
  'Marketing & Admin',
  'Other Operating Expense',
];

const PAYMENT_METHOD_LABELS: Record<OperatingPaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI / GPay',
  bank_transfer: 'Bank Transfer / NEFT',
  cheque: 'Cheque',
  card: 'Card',
};

function formatINR(val: number): string {
  return Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export const OperatingExpensesView: React.FC<OperatingExpensesViewProps> = ({
  expenseType = 'all',
  projectId = '',
  allProjects = [],
  userEmail,
  showToast,
}) => {
  const [selectedScope, setSelectedScope] = useState<OperatingExpenseType | 'all'>(expenseType);

  useEffect(() => {
    setSelectedScope(expenseType);
  }, [expenseType]);

  const isMix = selectedScope === 'all';
  const isPettyCash = selectedScope === 'petty_cash';
  const defaultCategories = useMemo(
    () =>
      selectedScope === 'all'
        ? Array.from(new Set([...PETTY_CASH_CATEGORIES, ...OTHER_EXPENSE_CATEGORIES]))
        : selectedScope === 'petty_cash'
          ? PETTY_CASH_CATEGORIES
          : OTHER_EXPENSE_CATEGORIES,
    [selectedScope]
  );
  const categoryKey =
    selectedScope === 'other_expense' ? 'other_expense_category' : 'petty_cash_category';

  const [pettyCategories, setPettyCategories] = useState<string[]>(PETTY_CASH_CATEGORIES);
  const [otherCategories, setOtherCategories] = useState<string[]>(OTHER_EXPENSE_CATEGORIES);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [categoryFieldTemplates, setCategoryFieldTemplates] = useState<Record<string, string[]>>({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [activeTab, setActiveTab] = useState<'register' | 'bin'>('register');
  const [rows, setRows] = useState<OperatingExpenseRow[]>([]);
  const [deletedRows, setDeletedRows] = useState<OperatingExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<OperatingExpenseRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OperatingExpenseRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const [formProjectId, setFormProjectId] = useState<string>(projectId || '');
  const [formExpenseType, setFormExpenseType] = useState<OperatingExpenseType>(
    expenseType === 'other_expense' ? 'other_expense' : 'petty_cash'
  );
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState(defaultCategories[0]);
  const [formCustomFields, setFormCustomFields] = useState<OperatingCustomField[]>([]);
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<OperatingPaymentMethod>(
    selectedScope === 'other_expense' ? 'bank_transfer' : 'cash'
  );
  const [formDate, setFormDate] = useState(todayStr);
  const [formReferenceNo, setFormReferenceNo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<OperatingExpenseAttachment[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [activeRes, deletedList] = await Promise.all([
      fetchOperatingExpenses(selectedScope, siteFilter === 'all' ? undefined : siteFilter),
      fetchDeletedOperatingExpenses(selectedScope),
    ]);
    setRows(activeRes.data);
    setDeletedRows(deletedList);
    if (activeRes.error) {
      setLoadError(activeRes.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedScope, siteFilter]);

  // Load dynamic categories & column templates from public.category
  useEffect(() => {
    setCategoryFilter('all');
    setSearchQuery('');
    Promise.all([
      fetchDropdownCategory('petty_cash_category', PETTY_CASH_CATEGORIES),
      fetchDropdownCategory('other_expense_category', OTHER_EXPENSE_CATEGORIES),
    ]).then(([pettyCats, otherCats]) => {
      const pList = pettyCats && pettyCats.length > 0 ? pettyCats : PETTY_CASH_CATEGORIES;
      const oList = otherCats && otherCats.length > 0 ? otherCats : OTHER_EXPENSE_CATEGORIES;
      setPettyCategories(pList);
      setOtherCategories(oList);
      if (selectedScope === 'petty_cash') {
        setCategories(pList);
      } else if (selectedScope === 'other_expense') {
        setCategories(oList);
      } else {
        setCategories(Array.from(new Set([...pList, ...oList])));
      }
    });
    fetchCategoryFieldTemplates().then(setCategoryFieldTemplates);
  }, [selectedScope]);

  const filteredRows = useMemo(() => {
    const source = activeTab === 'register' ? rows : deletedRows;
    return source.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!matchesDateFilter(r.expense_date, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const customHit = (r.custom_fields || []).some(
          (f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)
        );
        const hit =
          customHit ||
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.entry_code || '').toLowerCase().includes(q) ||
          (r.reference_no || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [activeTab, rows, deletedRows, categoryFilter, dateFilter, searchQuery]);

  // Always compute KPIs from active (non-deleted) rows only — never count is_deleted = true
  const activeFilteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.is_deleted) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!matchesDateFilter(r.expense_date, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const customHit = (r.custom_fields || []).some(
          (f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)
        );
        const hit =
          customHit ||
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.entry_code || '').toLowerCase().includes(q) ||
          (r.reference_no || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, dateFilter, searchQuery]);

  const kpis = useMemo(() => {
    let total = 0;
    let cashTotal = 0;
    let salaryTotal = 0;
    let monthTotal = 0;
    let pettyCashTotal = 0;
    let pettyCashCount = 0;
    let otherExpenseTotal = 0;
    let otherExpenseCount = 0;

    for (const r of activeFilteredRows) {
      const amt = Number(r.amount || 0);
      total += amt;
      if (r.expense_type === 'petty_cash') {
        pettyCashTotal += amt;
        pettyCashCount += 1;
      } else {
        otherExpenseTotal += amt;
        otherExpenseCount += 1;
      }
      if (r.payment_method === 'cash') {
        cashTotal += amt;
      }
      if (r.category.toLowerCase().includes('salary')) {
        salaryTotal += amt;
      }
      if (r.expense_date && r.expense_date.startsWith(currentMonthStr)) {
        monthTotal += amt;
      }
    }

    return {
      total,
      cashTotal,
      salaryTotal,
      monthTotal,
      pettyCashTotal,
      pettyCashCount,
      otherExpenseTotal,
      otherExpenseCount,
      count: activeFilteredRows.length,
    };
  }, [activeFilteredRows, currentMonthStr]);

  const buildFieldsForCategory = (
    cat: string,
    existingFields: OperatingCustomField[] = [],
    templatesMap: Record<string, string[]> = categoryFieldTemplates
  ): OperatingCustomField[] => {
    const templateCols = templatesMap[cat] || [];
    if (templateCols.length === 0) {
      return existingFields.length > 0 ? existingFields : [{ label: '', value: '' }];
    }
    const existingValueMap = new Map(
      existingFields.map((f) => [f.label.trim().toLowerCase(), f.value])
    );
    return templateCols.map((col) => ({
      label: col,
      value: existingValueMap.get(col.toLowerCase()) || '',
    }));
  };

  const handleCategoryChangeInForm = (nextCat: string) => {
    setFormCategory(nextCat);
    setFormCustomFields((prev) => buildFieldsForCategory(nextCat, prev));
  };

  const activeFormCategories =
    formExpenseType === 'petty_cash' ? pettyCategories : otherCategories;

  const handleAddNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const targetKey =
      formExpenseType === 'petty_cash' ? 'petty_cash_category' : 'other_expense_category';
    const currentList = formExpenseType === 'petty_cash' ? pettyCategories : otherCategories;
    const res = await addCustomCategory(targetKey, trimmed, currentList);
    if (res.success) {
      if (formExpenseType === 'petty_cash') {
        setPettyCategories(res.categories);
      } else {
        setOtherCategories(res.categories);
      }
      if (selectedScope === 'all') {
        setCategories(
          Array.from(
            new Set([
              ...(formExpenseType === 'petty_cash' ? res.categories : pettyCategories),
              ...(formExpenseType === 'other_expense' ? res.categories : otherCategories),
            ])
          )
        );
      } else {
        setCategories(res.categories);
      }
      setFormCategory(trimmed);
      setFormCustomFields((prev) => buildFieldsForCategory(trimmed, prev));
      setNewCategoryName('');
      setIsAddingCategory(false);
      showToast?.(`Category "${trimmed}" saved`, 'success');
    }
  };

  const openAddModal = (explicitType?: OperatingExpenseType) => {
    const targetType: OperatingExpenseType =
      explicitType || (selectedScope === 'other_expense' ? 'other_expense' : 'petty_cash');
    const initialCat =
      (targetType === 'petty_cash' ? pettyCategories[0] : otherCategories[0]) ||
      defaultCategories[0];
    setEditingRow(null);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormExpenseType(targetType);
    setFormProjectId(siteFilter !== 'all' ? siteFilter : projectId || allProjects[0]?.id || '');
    setFormTitle('');
    setFormCategory(initialCat);
    setFormCustomFields(buildFieldsForCategory(initialCat));
    setFormAmount('');
    setFormPaymentMethod(targetType === 'petty_cash' ? 'cash' : 'bank_transfer');
    setFormDate(todayStr);
    setFormReferenceNo('');
    setFormNotes('');
    setFormAttachments([]);
    setIsModalOpen(true);
  };

  const openEditModal = (row: OperatingExpenseRow) => {
    setEditingRow(row);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormExpenseType(row.expense_type);
    setFormProjectId(row.project_id || '');
    setFormTitle(row.title);
    setFormCategory(row.category);
    const savedFields = row.custom_fields && row.custom_fields.length > 0 ? row.custom_fields : [];
    setFormCustomFields(
      savedFields.length > 0 ? savedFields : buildFieldsForCategory(row.category)
    );
    setFormAmount(String(row.amount || ''));
    setFormPaymentMethod(row.payment_method);
    setFormDate(row.expense_date || todayStr);
    setFormReferenceNo(row.reference_no || '');
    setFormNotes(row.notes || '');
    setFormAttachments(row.attachments || []);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingFile(true);
    try {
      const uploaded: OperatingExpenseAttachment[] = [];
      for (const f of files) {
        const att = await uploadOperatingAttachmentToStorage(f, formExpenseType);
        uploaded.push(att);
      }
      setFormAttachments((prev) => [...prev, ...uploaded]);
      showToast?.(`${uploaded.length} receipt(s) compressed & attached`, 'success');
    } catch (err: any) {
      showToast?.(err?.message || 'Upload failed', 'error');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(formAmount);
    if (!formTitle.trim()) {
      showToast?.('Please enter a description / title', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast?.('Please enter a valid amount', 'error');
      return;
    }

    const cleanCustomFields = formCustomFields
      .filter((f) => f.label.trim() || f.value.trim())
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }));

    setIsSaving(true);
    const payload = {
      expense_type: formExpenseType,
      project_id: formProjectId || null,
      title: formTitle.trim(),
      category: formCategory,
      amount: numAmount,
      payment_method: formPaymentMethod,
      expense_date: formDate,
      reference_no: formReferenceNo.trim() || null,
      notes: formNotes.trim() || null,
      custom_fields: cleanCustomFields,
      attachments: formAttachments,
      created_by: userEmail || null,
    };

    const res = editingRow
      ? await updateOperatingExpense(editingRow.id, payload)
      : await createOperatingExpense(payload);

    // Save column names for this category in public.category so next time they auto-load
    const columnNames = cleanCustomFields.map((f) => f.label).filter(Boolean);
    if (columnNames.length > 0) {
      const updatedMap = await saveCategoryFieldTemplate(
        formCategory,
        columnNames,
        categoryFieldTemplates
      );
      setCategoryFieldTemplates(updatedMap);
    }

    setIsSaving(false);

    if (res.error || !res.data) {
      showToast?.(res.error || 'Failed to save entry', 'error');
      return;
    }

    showToast?.(
      editingRow ? 'Entry updated successfully' : 'Entry saved successfully',
      'success'
    );
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (row: OperatingExpenseRow) => {
    setDeleteTarget(row);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    const res = await softDeleteOperatingExpense(deleteTarget.id);
    setIsDeleting(false);
    if (res.ok) {
      showToast?.(`"${deleteTarget.title}" moved to Recycle Bin`, 'info');
      setDeleteTarget(null);
      setDeleteConfirmText('');
      loadData();
    } else {
      showToast?.(res.error || 'Failed to delete entry', 'error');
    }
  };

  const handleRestore = async (row: OperatingExpenseRow) => {
    const res = await restoreOperatingExpense(row.id);
    if (res.ok) {
      showToast?.(`"${row.title}" restored`, 'success');
      loadData();
    } else {
      showToast?.(res.error || 'Failed to restore entry', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Code',
      'Date',
      'Title',
      'Category',
      'Custom Details',
      'Site',
      'Amount',
      'Method',
      'Reference',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r) => {
        const detailsStr = (r.custom_fields || [])
          .map((f) => `${f.label}: ${f.value}`)
          .join(' | ');
        return [
          r.entry_code || '',
          r.expense_date,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          `"${(r.category || '').replace(/"/g, '""')}"`,
          `"${detailsStr.replace(/"/g, '""')}"`,
          `"${(r.project?.name || '—').replace(/"/g, '""')}"`,
          r.amount,
          r.payment_method,
          `"${(r.reference_no || '').replace(/"/g, '""')}"`,
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${expenseType}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F5F6F8] min-h-[calc(100vh-64px)] p-3 sm:p-5 space-y-4 pb-16">
      {/* 1. Header Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            {isPettyCash ? (
              <Wallet className="w-5 h-5 text-[#653ef1]" />
            ) : (
              <Briefcase className="w-5 h-5 text-[#653ef1]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#111827]">
                {isMix
                  ? 'Expenses (Petty Cash & Other)'
                  : isPettyCash
                    ? 'Petty Cash Register'
                    : 'Other Expenses & Salaries'}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-[#653ef1] border border-purple-200">
                {kpis.count} {kpis.count === 1 ? 'Entry' : 'Entries'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {isMix
                ? 'Combined view of daily site petty cash vouchers, staff salaries, rent, and operating expenses.'
                : isPettyCash
                  ? 'Track daily site petty cash vouchers, refreshments, conveyance, and small cash purchases.'
                  : 'Manage staff & engineer salaries, office rent, electricity, fuel, and general operating expenses.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="h-9 w-9 rounded-xl bg-white border border-[#E5E7EB] hover:border-purple-300 text-slate-600 hover:text-[#653ef1] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#653ef1]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3 rounded-xl bg-white border border-[#E5E7EB] hover:border-purple-300 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          {isMix ? (
            <>
              <button
                type="button"
                onClick={() => openAddModal('petty_cash')}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Petty Cash</span>
              </button>
              <button
                type="button"
                onClick={() => openAddModal('other_expense')}
                className="h-9 px-3.5 rounded-xl bg-[#653ef1] hover:bg-[#592be8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#592be8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isPettyCash ? 'Add Petty Cash' : 'Add Expense / Salary'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1B. Expense Module Sub-Tabs: All / Mix | Petty Cash | Other Expenses */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-2 shadow-2xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedScope('all')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedScope === 'all'
              ? 'bg-[#653ef1] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>All / Mix</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedScope('petty_cash')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedScope === 'petty_cash'
              ? 'bg-[#653ef1] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Petty Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedScope('other_expense')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedScope === 'other_expense'
              ? 'bg-[#653ef1] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Other Expenses</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {isMix
              ? 'Total Expenses (Paid)'
              : isPettyCash
                ? 'Total Petty Cash (Paid)'
                : 'Total Other Expenses (Paid)'}
          </span>
          <div className="text-xl font-bold text-[#111827] mt-1">₹{formatINR(kpis.total)}</div>
          <div className="text-[11px] text-[#6B7280] mt-1">{kpis.count} recorded entries</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {isMix ? 'Petty Cash Amount' : 'Cash Payments'}
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            ₹{formatINR(isMix ? kpis.pettyCashTotal : kpis.cashTotal)}
          </div>
          <div className="text-[11px] text-[#6B7280] mt-1">
            {isMix ? `${kpis.pettyCashCount} petty cash entries` : 'Paid in cash'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {isMix
              ? 'Other Expenses Amount'
              : selectedScope === 'other_expense'
                ? 'Salaries Disbursed'
                : 'This Month Spend'}
          </span>
          <div className="text-xl font-bold text-[#653ef1] mt-1">
            ₹{formatINR(
              isMix
                ? kpis.otherExpenseTotal
                : selectedScope === 'other_expense'
                  ? kpis.salaryTotal
                  : kpis.monthTotal
            )}
          </div>
          <div className="text-[11px] text-[#6B7280] mt-1">
            {isMix
              ? `${kpis.otherExpenseCount} other expense entries`
              : selectedScope === 'other_expense'
                ? 'Staff & Engineer Salaries'
                : `Month ${currentMonthStr}`}
          </div>
        </div>
      </div>

      {/* 3. Tabs + Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-[#653ef1] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Register ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'bin'
                  ? 'bg-white text-rose-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recycle Bin ({deletedRows.length})
            </button>
          </div>

          <DateFilterControl value={dateFilter} onChange={setDateFilter} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isPettyCash
                  ? 'Search voucher, title, receiver...'
                  : 'Search salary, staff name, title...'
              }
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
            />
          </div>

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] bg-white focus:outline-none focus:border-[#653ef1]"
          >
            <option value="all">All Sites</option>
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] bg-white focus:outline-none focus:border-[#653ef1]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Error Banner (if migration SQL not run yet or network error) */}
      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <div className="font-bold">Database Setup Required / Load Error</div>
              <div className="text-amber-700 mt-0.5 font-mono">{loadError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Content Table (Desktop) & Cards (Mobile) */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
          <div className="w-7 h-7 border-2 border-[#653ef1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#6B7280]">Loading entries...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#653ef1] flex items-center justify-center mx-auto">
            {isPettyCash ? <Wallet className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
          </div>
          <h3 className="text-sm font-bold text-[#111827]">
            {activeTab === 'bin'
              ? 'Recycle Bin is Empty'
              : isPettyCash
                ? 'No Petty Cash Entries Yet'
                : 'No Other Expenses / Salaries Yet'}
          </h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            {activeTab === 'bin'
              ? 'Deleted entries appear here safely for restoration.'
              : isPettyCash
                ? 'Click "Add Petty Cash" to log your first daily site cash voucher.'
                : 'Click "Add Expense / Salary" to log staff salaries, office rent, or utilities.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Code</th>
                    <th className="py-3 px-4">Title &amp; Category</th>
                    <th className="py-3 px-4">{isPettyCash ? 'Receiver / Site' : 'Staff / Payee'}</th>
                    <th className="py-3 px-4">Method &amp; Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#653ef1]" />
                          {formatMumbaiDate(row.expense_date)}
                        </div>
                        <div className="text-[11px] font-mono text-[#6B7280] mt-0.5">
                          {row.entry_code || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="text-sm font-semibold text-[#111827] truncate">
                          {row.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {isMix && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                row.expense_type === 'petty_cash'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {row.expense_type === 'petty_cash' ? 'Petty Cash' : 'Other Expense'}
                            </span>
                          )}
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-[#653ef1] border border-purple-100">
                            {row.category}
                          </span>
                          {row.attachments?.length > 0 && (
                            <a
                              href={row.attachments[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#653ef1] hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              {row.attachments.length}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[260px]">
                        {row.custom_fields && row.custom_fields.length > 0 ? (
                          <div className="space-y-0.5">
                            {row.custom_fields.slice(0, 3).map((cf, i) => (
                              <div key={i} className="text-xs text-[#111827] truncate">
                                <span className="font-semibold text-[#6B7280]">{cf.label}:</span>{' '}
                                <span className="font-medium">{cf.value || '—'}</span>
                              </div>
                            ))}
                            <div className="text-[11px] text-[#6B7280] truncate">
                              {row.project?.name || '—'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-[#6B7280]">
                            {row.project?.name || '—'}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-[#111827]">
                          {PAYMENT_METHOD_LABELS[row.payment_method] || row.payment_method}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-bold text-[#111827]">
                          ₹{formatINR(row.amount)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {activeTab === 'register' ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#653ef1] hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(row)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-3.5 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#111827] truncate">{row.title}</div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">
                      {formatMumbaiDate(row.expense_date)} • {row.entry_code || '—'}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#111827] shrink-0">
                    ₹{formatINR(row.amount)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {isMix && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        row.expense_type === 'petty_cash'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {row.expense_type === 'petty_cash' ? 'Petty Cash' : 'Other Expense'}
                    </span>
                  )}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-[#653ef1]">
                    {row.category}
                  </span>
                  {(row.custom_fields || []).slice(0, 2).map((cf, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {cf.label}: {cf.value}
                    </span>
                  ))}
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    PAID
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-[#6B7280] truncate">
                    {row.project?.name || '—'}
                  </span>
                  {activeTab === 'register' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="text-xs font-semibold text-[#653ef1] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="text-xs font-semibold text-rose-600 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(row)}
                      className="text-xs font-semibold text-emerald-600 cursor-pointer"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6. Add / Edit Modal (Mobile full-screen, Desktop centered) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl border border-[#E5E7EB] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  {editingRow
                    ? 'Edit Entry'
                    : formExpenseType === 'petty_cash'
                      ? 'Add Petty Cash Voucher'
                      : 'Add Other Expense / Salary'}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {formExpenseType === 'petty_cash'
                    ? 'Log daily site petty cash expenditure'
                    : 'Log staff salary, office rent, utilities, or admin expense'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Expense Head Selector: Petty Cash vs Other Expense */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Expense Head <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormExpenseType('petty_cash');
                      const nextCat = pettyCategories[0] || PETTY_CASH_CATEGORIES[0];
                      setFormCategory(nextCat);
                      setFormCustomFields(buildFieldsForCategory(nextCat));
                      setFormPaymentMethod('cash');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formExpenseType === 'petty_cash'
                        ? 'bg-[#653ef1] text-white border-[#653ef1] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Petty Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormExpenseType('other_expense');
                      const nextCat = otherCategories[0] || OTHER_EXPENSE_CATEGORIES[0];
                      setFormCategory(nextCat);
                      setFormCustomFields(buildFieldsForCategory(nextCat));
                      setFormPaymentMethod('bank_transfer');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formExpenseType === 'other_expense'
                        ? 'bg-[#653ef1] text-white border-[#653ef1] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Other Expense / Salary</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Title / Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={
                      isPettyCash
                        ? 'e.g. Site tea & snacks, Auto fare for cement'
                        : 'e.g. November Salary - Rahul Sharma, Office Rent'
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#111827]">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory((v) => !v)}
                      className="text-[11px] font-semibold text-[#653ef1] hover:underline cursor-pointer"
                    >
                      {isAddingCategory ? 'Cancel' : '+ New Category'}
                    </button>
                  </div>
                  {isAddingCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#653ef1]"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-3 py-2 rounded-lg bg-[#653ef1] text-white text-xs font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] bg-white focus:outline-none focus:border-[#653ef1]"
                    >
                      {activeFormCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Construction Site
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] bg-white focus:outline-none focus:border-[#653ef1]"
                  >
                    <option value="">Select Construction Site...</option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 2: Dynamic Custom Details (Column Name & Value JSONB — auto-remembered per category) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#111827]">
                      Custom Details (Saved per Category)
                    </span>
                    <p className="text-[11px] text-[#6B7280]">
                      Column names auto-load next time you pick &ldquo;{formCategory}&rdquo;.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormCustomFields((prev) => [...prev, { label: '', value: '' }])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-[#653ef1] hover:bg-purple-100 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formCustomFields.map((field, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormCustomFields((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, label: val } : item))
                          );
                        }}
                        placeholder="Column name (e.g. Employee Name)"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormCustomFields((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                          );
                        }}
                        placeholder="Enter value"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormCustomFields((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer justify-self-end"
                        title="Remove column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Amount & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) =>
                      setFormPaymentMethod(e.target.value as OperatingPaymentMethod)
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] bg-white focus:outline-none focus:border-[#653ef1]"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Voucher / UTR / Ref No
                  </label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="Optional reference number"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                  />
                </div>
              </div>

              {/* Notes & Compressed Receipt Upload */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional remarks..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Receipt / Voucher Attachment (Auto-Compressed)
                  </label>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-purple-300 bg-purple-50/60 hover:bg-purple-50 text-xs font-semibold text-[#653ef1] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Compressing & Uploading...' : 'Attach Image or PDF'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      disabled={isUploadingFile}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {formAttachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formAttachments.map((att, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700"
                        >
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-[#653ef1]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{att.name}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setFormAttachments((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingFile}
                  className="px-5 py-2 rounded-xl bg-[#653ef1] hover:bg-[#592be8] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingRow ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Type DELETE Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#E5E7EB] shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Confirm Delete</h3>
                  <p className="text-xs text-[#6B7280]">
                    This will move the entry to Recycle Bin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB] text-xs space-y-1">
              <div className="font-semibold text-[#111827] truncate">{deleteTarget.title}</div>
              <div className="text-[#6B7280]">
                Amount: <span className="font-bold text-[#111827]">₹{formatINR(deleteTarget.amount)}</span> • {formatMumbaiDate(deleteTarget.expense_date)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Type <span className="font-mono text-rose-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
