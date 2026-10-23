'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Building2,
  DollarSign,
  Download,
  Printer,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Sparkles,
  CreditCard,
  User,
  Coffee,
  Fuel,
  Wrench,
  Truck,
  ExternalLink,
  ChevronDown,
  Paperclip,
  Edit2,
  ArchiveRestore,
  RotateCcw
} from 'lucide-react';
import { SiteExpense, ExpensePaymentMethod, ExpensePaymentStatus } from '@/lib/supabase/types';
import { ExpenseBillViewerModal } from './ExpenseBillViewerModal';
import { ProjectInfo } from '@/lib/construction-planning/types';
import {
  fetchSiteExpenses,
  fetchDeletedSiteExpenses,
  deleteSiteExpense,
  restoreSiteExpense,
  calculateExpenseSummary,
  ExpenseSummaryStats
} from '@/lib/supabase/expense-services';
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';
import {
  formatINR,
  viewSiteExpensesPdfInNewTab,
  getSiteExpensesPdfBlobUrl,
  downloadSiteExpensesPdf,
  downloadSingleExpenseVoucherPdf,
  viewSingleExpenseVoucherInNewTab
} from '@/lib/expenses/expense-statement-pdf';
import { AddExpenseModal } from './AddExpenseModal';
import { ExpenseVoucherModal } from './ExpenseVoucherModal';

interface SiteExpensesViewProps {
  project?: ProjectInfo;
  projectId?: string;
  userEmail?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  externalActionTrigger?: { action: string; timestamp: number } | null;
}

export const SiteExpensesView: React.FC<SiteExpensesViewProps> = ({
  project,
  projectId = 'f0e510da-9530-468f-bb09-59920070d55e',
  userEmail,
  showToast,
  externalActionTrigger,
}) => {
  const [expenses, setExpenses] = useState<SiteExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Voucher Slip Modal State
  const [viewingExpense, setViewingExpense] = useState<SiteExpense | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Attached Bill / Receipt Viewer Modal State
  const [billViewerState, setBillViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    fileName?: string | null;
    voucherNumber?: string;
  }>({
    isOpen: false,
    fileUrl: null,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // View Mode: 'active' vs 'bin'
  const [viewMode, setViewMode] = useState<'active' | 'bin'>('active');
  const [deletedExpenses, setDeletedExpenses] = useState<SiteExpense[]>([]);
  const [isLoadingBin, setIsLoadingBin] = useState(false);

  // Edit Expense State
  const [expenseToEdit, setExpenseToEdit] = useState<SiteExpense | null>(null);

  // Confirm Delete Modal State
  const [expenseToDelete, setExpenseToDelete] = useState<SiteExpense | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load expenses from Supabase
  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSiteExpenses(projectId);
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load soft-deleted expenses from Supabase (Recycle Bin)
  const loadDeletedExpenses = async () => {
    setIsLoadingBin(true);
    try {
      const data = await fetchDeletedSiteExpenses(projectId);
      setDeletedExpenses(data);
    } catch (err) {
      console.error('Failed to load deleted expenses:', err);
    } finally {
      setIsLoadingBin(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    loadDeletedExpenses();
  }, [projectId]);

  // Handle confirmed deletion (Soft Delete -> is_deleted = true in Supabase)
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    const ok = await deleteSiteExpense(expenseToDelete.id);
    setIsDeleting(false);
    if (ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      showToast?.(`Expense "${expenseToDelete.title}" moved to Recycle Bin`, 'info');
      await Promise.all([loadExpenses(), loadDeletedExpenses()]);
    } else {
      showToast?.('Failed to delete expense', 'error');
    }
  };

  // Handle restore from Recycle Bin -> is_deleted = false in Supabase
  const handleRestoreExpense = async (exp: SiteExpense) => {
    const ok = await restoreSiteExpense(exp.id);
    if (ok) {
      showToast?.(`Expense "${exp.title}" restored to Active Expenses!`, 'success');
      await Promise.all([loadExpenses(), loadDeletedExpenses()]);
    } else {
      showToast?.('Failed to restore expense', 'error');
    }
  };

  // KPI Calculations
  const stats: ExpenseSummaryStats = useMemo(() => {
    return calculateExpenseSummary(expenses);
  }, [expenses]);

  // Unique Categories from loaded expenses
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => e.category && set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesCode = exp.expense_code.toLowerCase().includes(q);
        const matchesVendor = exp.vendor_name ? exp.vendor_name.toLowerCase().includes(q) : false;
        const matchesNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
        const matchesPaidBy = exp.paid_by ? exp.paid_by.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesCode && !matchesVendor && !matchesNotes && !matchesPaidBy) {
          return false;
        }
      }

      // 2. Date Filter (Range or Exact Particular Date)
      if (!matchesDateFilter(exp.expense_date, dateFilter)) {
        return false;
      }

      // 3. Category Filter
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) {
        return false;
      }

      // 4. Payment Method Filter
      if (paymentMethodFilter !== 'all' && exp.payment_method !== paymentMethodFilter) {
        return false;
      }

      // 5. Payment Status Filter
      if (statusFilter !== 'all' && exp.payment_status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, dateFilter, categoryFilter, paymentMethodFilter, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = [
      'Expense Code',
      'Date',
      'Title',
      'Category',
      'Amount',
      'Payment Method',
      'Payment Status',
      'Paid To / Vendor',
      'Paid By',
      'Bill Number',
      'Notes',
      'Receipt File Name',
      'Receipt URL',
    ];

    const rows = filteredExpenses.map(e => [
      `"${e.expense_code}"`,
      `"${e.expense_date}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.payment_method}"`,
      `"${e.payment_status}"`,
      `"${(e.vendor_name || '').replace(/"/g, '""')}"`,
      `"${(e.paid_by || '').replace(/"/g, '""')}"`,
      `"${(e.bill_number || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${(e.receipt_file_name || '').replace(/"/g, '""')}"`,
      `"${(e.receipt_url || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Site_Expenses_Report_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Preview PDF in Blob URL
  const handlePreviewPdf = () => {
    const isAct = isDateFilterActive(dateFilter);
    const label = !isAct
      ? 'Complete Expenses Statement'
      : dateFilter.mode === 'exact'
      ? `Expenses on ${dateFilter.exactDate}`
      : `Expenses from ${dateFilter.startDate || 'Start'} to ${dateFilter.endDate || 'End'}`;

    viewSiteExpensesPdfInNewTab(
      filteredExpenses,
      project?.name || 'Noori Crest Tower',
      label
    );
  };

  // Respond to sidebar actions / external triggers
  useEffect(() => {
    if (!externalActionTrigger) return;
    const { action } = externalActionTrigger;
    if (action === 'add_expense') {
      setIsAddModalOpen(true);
    } else if (action === 'filter_today') {
      setDateFilter({ mode: 'exact', exactDate: todayStr, startDate: '', endDate: '' });
    } else if (action === 'filter_pending') {
      setStatusFilter('pending');
    } else if (action === 'filter_petty_cash') {
      setPaymentMethodFilter('petty_cash');
    } else if (action === 'filter_all') {
      setDateFilter(DEFAULT_DATE_FILTER);
      setStatusFilter('all');
      setCategoryFilter('all');
      setPaymentMethodFilter('all');
      setSearchQuery('');
    } else if (action === 'preview_pdf') {
      handlePreviewPdf();
    } else if (action === 'download_pdf' || action === 'open_statement_blob') {
      viewSiteExpensesPdfInNewTab(filteredExpenses, project?.name || 'Noori Crest Tower', 'Expenses Statement');
    } else if (action === 'export_csv') {
      handleExportCSV();
    } else if (action.startsWith('category:')) {
      const cat = action.replace('category:', '');
      setCategoryFilter(cat);
    }
  }, [externalActionTrigger]);

  return (
    <div className="w-full space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
            <Receipt className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Site Bills & Petty Cash Expenses
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Quick logging and daily breakdown for lunch, petty cash, diesel & site vendor payments
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Refresh Sync */}
          <button
            type="button"
            onClick={loadExpenses}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-400'}`} />
            <span>Sync</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          {/* Preview PDF */}
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="h-8 px-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Preview all expenses in Blob URL PDF statement"
          >
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>Preview PDF</span>
          </button>

          {/* Open Statement in Blob URL (New Tab) */}
          <button
            type="button"
            onClick={() => viewSiteExpensesPdfInNewTab(filteredExpenses, project?.name || 'Noori Crest Tower', 'Expenses Statement')}
            className="h-8 px-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Open full expense report in Blob URL tab (No download)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
            <span>Open Blob URL</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Add Expense (Primary Purple) */}
          <button
            type="button"
            onClick={() => {
              setExpenseToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="h-8 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* 1.5 View Mode Switcher: Active Site Bills vs Recycle Bin */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-1 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'active'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Active Site Bills ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('bin');
              loadDeletedExpenses();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'bin'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin ({deletedExpenses.length})</span>
          </button>
        </div>

        {viewMode === 'bin' && (
          <button
            type="button"
            onClick={loadDeletedExpenses}
            className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingBin ? 'animate-spin' : ''}`} />
            <span>Refresh Bin</span>
          </button>
        )}
      </div>

      {viewMode === 'active' ? (
        <>
          {/* 2. Top Summary KPI Cards (Highlights Today's Expenses) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Today's Expenses (Crucial user requirement) */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-2xs relative overflow-hidden bg-gradient-to-br from-purple-50/50 via-white to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
              Today's Expenses
            </span>
            <span className="text-[10px] font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
              Today: {todayStr}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-950">
              {formatINR(stats.todayTotal)}
            </span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
              {stats.todayCount} Bills Today
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats.todayCount === 0 ? 'No expenses logged today yet' : 'Lunch, petty cash & daily site burn'}
          </span>
        </div>

        {/* Card 2: This Month's Total */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              This Month's Total
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Month to Date
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatINR(stats.monthTotal)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.monthCount} Bills
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Accumulated for current calendar month
          </span>
        </div>

        {/* Card 3: All-Time Expenditure */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              All-Time Site Bills
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Audited
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatINR(stats.allTimeTotal)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.allTimeCount} Entries
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Paid: {formatINR(stats.paidTotal)} • Pending: {formatINR(stats.pendingTotal)}
          </span>
        </div>

        {/* Card 4: Quick Today Filter Shortcut */}
        <div 
          onClick={() => {
            if (dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr) {
              setDateFilter(DEFAULT_DATE_FILTER);
            } else {
              setDateFilter({ mode: 'exact', exactDate: todayStr, startDate: '', endDate: '' });
            }
          }}
          className={`rounded-xl border p-4 shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
            dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr
              ? 'border-purple-500 bg-purple-600 text-white'
              : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'text-purple-100' : 'text-slate-500'}`}>
              Filter Quick Mode
            </span>
            <Calendar className={`w-4 h-4 ${dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold block">
              {dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'Showing Today Only' : 'Show Only Today'}
            </span>
            <span className={`text-[11px] block mt-0.5 ${dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'text-purple-100' : 'text-slate-500'}`}>
              Click to isolate today's receipts & lunch
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description, vendor, code, payee, or notes..."
            className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 bg-slate-50/50"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Universal Date Filter: Start & End Date (Range) + Particular Custom Date */}
          <DateFilterControl
            value={dateFilter}
            onChange={setDateFilter}
            label="Filter Date"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600 font-medium cursor-pointer"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600 font-medium cursor-pointer"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI / GPay</option>
            <option value="petty_cash">Petty Cash Box</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="reimbursable">Reimbursement</option>
          </select>

          {/* Clear Filters (if any active) */}
          {(searchQuery || isDateFilterActive(dateFilter) || categoryFilter !== 'all' || paymentMethodFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFilter(DEFAULT_DATE_FILTER);
                setCategoryFilter('all');
                setPaymentMethodFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-purple-700 hover:underline px-2 py-1 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">S.No</th>
                <th className="px-4 py-3">Expense Code & Date</th>
                <th className="px-4 py-3">Expense Title & Purpose</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Paid To / Vendor</th>
                <th className="px-4 py-3 text-center">Mode</th>
                <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                      <span className="font-medium text-xs">Loading site expenses from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <span className="font-semibold text-slate-700">No expenses found</span>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {expenses.length === 0
                          ? 'No expense bills have been recorded yet. Click "+ Add Expense" to record daily lunch, fuel, or petty cash.'
                          : 'No expenses match the selected filter criteria.'}
                      </p>
                      {expenses.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          + Record First Expense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, index) => {
                  const isToday = exp.expense_date === todayStr;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* S.No */}
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* Code & Date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingExpense(exp);
                              setIsVoucherModalOpen(true);
                            }}
                            className="font-mono font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition-colors cursor-pointer"
                            title="Click to view & download bill voucher"
                          >
                            {exp.expense_code}
                          </button>
                          {isToday && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200">
                              Today
                            </span>
                          )}
                          {exp.receipt_url && (
                            <button
                              type="button"
                              onClick={() => setBillViewerState({
                                isOpen: true,
                                fileUrl: exp.receipt_url || null,
                                fileName: exp.receipt_file_name || 'Bill-Receipt',
                                voucherNumber: exp.expense_code,
                              })}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition-colors cursor-pointer"
                              title={`View uploaded bill copy (${exp.receipt_file_name || 'Receipt'}) - Supports iOS photos & PDF`}
                            >
                              <Paperclip className="w-3 h-3 text-purple-600" />
                              <span>Bill Copy</span>
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{exp.expense_date}</span>
                        </div>
                      </td>

                      {/* Title & Notes */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">
                          {exp.title}
                        </span>
                        {exp.notes && (
                          <div className="flex items-start gap-1 mt-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80 max-w-md">
                            <span className="font-bold text-purple-600 uppercase text-[9px] shrink-0 mt-0.5">Note:</span>
                            <span className="line-clamp-2">{exp.notes}</span>
                          </div>
                        )}
                        {exp.paid_by && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Paid by: {exp.paid_by}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {exp.category}
                        </span>
                      </td>

                      {/* Paid To / Vendor */}
                      <td className="px-4 py-3">
                        {exp.vendor_id ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <div>
                              <span className="font-medium text-purple-900 block truncate max-w-[180px]">
                                {exp.vendor_name || 'Vendor Profile'}
                              </span>
                              <span className="text-[10px] text-purple-600 font-mono">
                                Registered Vendor
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-700 font-medium truncate max-w-[180px]">
                              {exp.vendor_name || 'Direct Site Cash'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                          {exp.payment_method}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatINR(exp.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {exp.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Paid
                          </span>
                        ) : exp.payment_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            Reimbursable
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Uploaded Bill Copy (supports iOS HEIC, PDF, images) */}
                          {exp.receipt_url && (
                            <button
                              type="button"
                              onClick={() => setBillViewerState({
                                isOpen: true,
                                fileUrl: exp.receipt_url || null,
                                fileName: exp.receipt_file_name || 'Bill-Receipt',
                                voucherNumber: exp.expense_code,
                              })}
                              className="p-1.5 rounded-md hover:bg-purple-100 text-purple-700 bg-purple-50 border border-purple-200 transition-colors cursor-pointer"
                              title={`View attached bill copy (${exp.receipt_file_name || 'Document'})`}
                            >
                              <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                          )}

                          {/* Preview Voucher Slip */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingExpense(exp);
                              setIsVoucherModalOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-purple-50 text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                            title="View & Preview Bill Voucher Slip"
                          >
                            <Receipt className="w-3.5 h-3.5 text-purple-600" />
                          </button>

                          {/* Open Bill directly in Blob URL tab (No download) */}
                          <button
                            type="button"
                            onClick={() => viewSingleExpenseVoucherInNewTab(exp, project?.name || 'Noori Crest Tower')}
                            className="p-1.5 rounded-md hover:bg-purple-50 text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                            title="Open Bill Voucher directly in Blob URL tab (No file download)"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                          </button>

                          {/* Edit Expense Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpenseToEdit(exp);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-purple-50 text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                            title="Edit expense details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                          </button>

                          {/* Delete Expense (Moves to Recycle Bin via Confirmation Modal) */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpenseToDelete(exp);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Move expense to Recycle Bin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase tracking-wider text-slate-500">
                    Filtered Total:
                  </td>
                  <td className="px-4 py-3 text-right text-purple-900 text-sm">
                    {formatINR(filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-left text-slate-400 font-normal">
                    ({filteredExpenses.length} records)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </>
      ) : (
        /* Recycle Bin View (Soft-deleted expenses) */
        <div className="space-y-3">
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-rose-900 text-sm">Recycle Bin ({deletedExpenses.length} Deleted Expenses)</span>
                <p className="text-xs text-rose-700">
                  Expenses deleted here are safely retained with <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">is_deleted = true</code> in Supabase. Your live data is never lost. You can restore them anytime back to active expenses.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDeletedExpenses}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBin ? 'animate-spin' : ''}`} />
              <span>Refresh Bin</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Expense Code & Date</th>
                    <th className="px-4 py-3">Title & Purpose</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Paid To / Vendor</th>
                    <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBin ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <p className="font-semibold text-slate-600">Loading deleted expenses from Recycle Bin...</p>
                      </td>
                    </tr>
                  ) : deletedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">Recycle Bin is empty</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No expenses currently deleted.</p>
                      </td>
                    </tr>
                  ) : (
                    deletedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-900 block">{exp.expense_code}</span>
                          <span className="text-[11px] text-slate-400">{exp.expense_date}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{exp.title}</span>
                          {exp.paid_by && <span className="text-[10px] text-slate-400">Paid by: {exp.paid_by}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {exp.vendor_name || 'Direct Site Cash'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatINR(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deleted (In Bin)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestoreExpense(exp)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Restore expense back to active statement"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            <span>Restore Expense</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setExpenseToEdit(null);
        }}
        projectId={projectId}
        expenseToEdit={expenseToEdit}
        onExpenseAdded={(newExp) => {
          setExpenses(prev => [newExp, ...prev]);
          showToast?.(`Expense "${newExp.title}" recorded successfully!`, 'success');
        }}
        onExpenseUpdated={(updatedExp) => {
          setExpenses(prev => prev.map(e => e.id === updatedExp.id ? updatedExp : e));
          showToast?.(`Expense "${updatedExp.title}" updated successfully!`, 'success');
        }}
      />

      {/* Confirm Delete Modal (Requires typing 'DELETE') */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Move Expense to Recycle Bin"
        itemName={expenseToDelete ? `${expenseToDelete.expense_code} - ${expenseToDelete.title} (${formatINR(expenseToDelete.amount)})` : ''}
        warningMessage="This expense will be moved to the Recycle Bin with is_deleted = true in Supabase. Your live data is safely preserved and you can restore it anytime."
        requireKeyword="DELETE"
        isLoading={isDeleting}
      />

      {/* Expense Bill Voucher Modal (Blob URL Preview & Download) */}
      <ExpenseVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        expense={viewingExpense}
        projectName={project?.name || 'Noori Crest Tower'}
      />

      {/* Uploaded Bill / Document Viewer Modal (supports iOS HEIC, PDF, images) */}
      <ExpenseBillViewerModal
        isOpen={billViewerState.isOpen}
        onClose={() => setBillViewerState(prev => ({ ...prev, isOpen: false }))}
        fileUrl={billViewerState.fileUrl}
        fileName={billViewerState.fileName}
        voucherNumber={billViewerState.voucherNumber}
      />
    </div>
  );
};
