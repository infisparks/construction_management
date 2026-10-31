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
  RotateCcw,
  Box,
  FileText
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
  activeCommercialTab?: 'expenses' | 'subcontractor-bills' | 'contractor-work-orders';
  onSelectCommercialTab?: (tab: 'expenses' | 'subcontractor-bills' | 'contractor-work-orders') => void;
}

export const SiteExpensesView: React.FC<SiteExpensesViewProps> = ({
  project,
  projectId = 'f0e510da-9530-468f-bb09-59920070d55e',
  userEmail,
  showToast,
  externalActionTrigger,
  activeCommercialTab = 'expenses',
  onSelectCommercialTab,
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
    <div className="w-full space-y-2.5 sm:space-y-3 animate-in fade-in duration-150">
      {/* 1. Executive Top Header (Matching Reference Image with Transparent 3D Bill Cube & Finance Illustration) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-300 relative group">
        
        {/* Soft Ambient Backdrop Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 via-white to-indigo-50/20 pointer-events-none" />

        {/* Delicate Fluid Aurora Wave Ribbon (Matching Reference Design) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-35"
          preserveAspectRatio="none"
          viewBox="0 0 1200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 140 C 200 160, 320 60, 550 80 C 780 100, 920 20, 1250 50"
            stroke="url(#auroraGradientExp1)"
            strokeWidth="36"
            strokeLinecap="round"
            className="filter blur-[16px]"
          />
          <path
            d="M-30 110 C 240 130, 380 40, 620 60 C 860 80, 1020 10, 1260 30"
            stroke="url(#auroraGradientExp2)"
            strokeWidth="18"
            strokeLinecap="round"
            className="filter blur-[8px]"
          />
          <defs>
            <linearGradient id="auroraGradientExp1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#ec4899" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="auroraGradientExp2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Top Hero Section: Logo, Title, 3D Finance Illustration & Project Commercial Badge */}
        <div className="relative px-4 sm:px-5 py-2.5 sm:py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          {/* Left: 3D Transparent Floating Receipt Icon & Title Block */}
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0 z-10">
            <img
              src="/bill/3D Receipt with Rupee Badge.png"
              alt="Commercial Bills & Expenses"
              className="w-13 h-13 sm:w-15 sm:h-15 object-contain shrink-0 animate-float-slow select-none pointer-events-none drop-shadow-[0_6px_16px_rgba(101,62,241,0.3)]"
            />
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Commercial
              </span>
              <h1 className="text-2xl sm:text-[25px] font-extrabold text-[#6338eb] tracking-tight leading-none mt-0.5">
                Bills & Expenses
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs sm:max-w-sm leading-snug">
                Manage site bills, petty cash, work orders & all commercial expenses in one place.
              </p>
            </div>
          </div>

          {/* Center: 3D Billing Finance Icon Set (Enlarged to fill space beautifully) */}
          <div className="hidden lg:flex items-end justify-center relative flex-1 max-w-xl xl:max-w-2xl mx-auto px-3 pointer-events-none select-none z-10">
            {/* Luminous Glow Behind Center Graphic */}
            <div className="absolute inset-x-8 bottom-1 h-20 bg-gradient-to-r from-purple-400/20 via-pink-400/15 to-cyan-400/20 rounded-full blur-2xl" />
            
            <img
              src="/bill/3D Purple Billing Finance Icon Set.png"
              alt="Commercial Billing & Finance Suite"
              className="w-full max-w-[560px] h-28 sm:h-32 xl:h-36 object-contain relative z-10 drop-shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>

          {/* Right: Project Commercial Card Badge */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-[#f8f6ff] to-[#f0ecff] border border-[#ddd4ff] shadow-xs shrink-0 z-10">
            <div className="w-8 h-8 rounded-xl bg-[#6338eb]/10 border border-[#6338eb]/20 flex items-center justify-center">
              <Box className="w-4.5 h-4.5 text-[#6338eb]" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Project Commercial
              </span>
              <span className="text-xs sm:text-sm font-black text-[#6338eb] tracking-tight block">
                {project?.name ? project.name.toUpperCase() : 'SITE OFFICE'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Strip / Ribbon (Tabs on Left, Action Buttons on Right) */}
        <div className="px-4 sm:px-5 py-2 border-t border-slate-100 bg-gradient-to-r from-slate-50/90 via-purple-50/15 to-slate-50/90 flex flex-wrap items-center justify-between gap-2 relative z-10">
          
          {/* Left: Commercial Navigation Tabs */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Tab 1: Site Daily Bills & Expenses */}
            <button
              type="button"
              onClick={() => onSelectCommercialTab?.('expenses')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeCommercialTab === 'expenses'
                  ? 'bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-[#6338eb]" />
              <span>Site Daily Bills & Expenses</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#6338eb] font-semibold border border-[#ddd4ff]">
                Daily Burn & Petty Cash
              </span>
            </button>

            {/* Tab 2: Work Orders & Khata */}
            <button
              type="button"
              onClick={() => onSelectCommercialTab?.('contractor-work-orders')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeCommercialTab === 'contractor-work-orders'
                  ? 'bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Work Orders & Khata</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                Extra Work & Payouts
              </span>
            </button>
          </div>

          {/* Right: Action Buttons Group */}
          <div className="flex items-center gap-2 relative">
            {/* Sync */}
            <button
              type="button"
              onClick={loadExpenses}
              className="h-8 px-3 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-slate-300"
              title="Refresh from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
              <span>Sync</span>
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-3 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-slate-300"
              title="Export CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {/* Preview PDF */}
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="h-8 px-3.5 rounded-full border border-[#e3d8ff] bg-[#f4f0ff] hover:bg-[#ebe3ff] text-[#6338eb] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Preview all expenses in Blob URL PDF statement"
            >
              <Printer className="w-3.5 h-3.5 text-[#6338eb]" />
              <span>Preview PDF</span>
            </button>

            {/* Open Blob URL */}
            <button
              type="button"
              onClick={() => viewSiteExpensesPdfInNewTab(filteredExpenses, project?.name || 'Noori Crest Tower', 'Expenses Statement')}
              className="h-8 px-3.5 rounded-full border border-[#e3d8ff] bg-[#f4f0ff] hover:bg-[#ebe3ff] text-[#6338eb] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Open full expense report in Blob URL tab (No download)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#6338eb]" />
              <span>Open Blob URL</span>
            </button>

            {/* + Add Expense Button with Continuous Shine Beam & Purple Glow */}
            <button
              type="button"
              onClick={() => {
                setExpenseToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="shine-container shine-infinite h-8 px-5 rounded-full bg-gradient-to-r from-[#7b46f8] via-[#6338eb] to-[#5a24ea] hover:from-[#8855fa] hover:to-[#501fe0] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(99,56,235,0.4)] hover:shadow-[0_6px_22px_rgba(99,56,235,0.55)] cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.4]" />
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 View Mode Switcher: Active Site Bills vs Recycle Bin */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode('active')}
          className={`h-8.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            viewMode === 'active'
              ? 'bg-[#6338eb] text-white shadow-sm shadow-[#6338eb]/30'
              : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
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
          className={`h-8.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            viewMode === 'bin'
              ? 'bg-[#e11d48] text-white shadow-sm shadow-[#e11d48]/30'
              : 'bg-white hover:bg-rose-50 border border-[#fed2d8] text-[#e11d48]'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Recycle Bin ({deletedExpenses.length})</span>
        </button>

        {viewMode === 'bin' && (
          <button
            type="button"
            onClick={loadDeletedExpenses}
            className="h-8.5 px-3 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 transition-all ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBin ? 'animate-spin' : ''}`} />
            <span>Refresh Bin</span>
          </button>
        )}
      </div>

      {viewMode === 'active' ? (
        <>
          {/* 2. Top Summary KPI Cards (4 Cards Identical to Timeline Style: Left 3D Icon, Number + Badge, Wave Corner) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Card 1: Today's Expenses */}
            <div className="rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] bg-gradient-to-br from-[#faf7ff] via-[#f3eeff] to-[#ebe0ff] border-[#ddd3fe] hover:border-purple-300 hover:shadow-md hover:-translate-y-1">
              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/bill/Glossy Purple Rupee Receipt Icon.png"
                    alt="Today's Expenses"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                    Today's Expenses
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {formatINR(stats.todayTotal)}
                    </span>
                    <span className="text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap bg-purple-100 text-[#6e46f2] border border-purple-200/90 font-mono">
                      Today: {todayStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Subtext */}
              <div className="mt-2 pt-1 relative z-10">
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate">
                  {stats.todayCount === 0 ? 'No expenses logged today yet' : `${stats.todayCount} Bills Today`}
                </p>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill="#c4b5fd" />
                </svg>
              </div>
            </div>

            {/* Card 2: This Month's Total */}
            <div className="rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] bg-gradient-to-br from-[#f2f8ff] via-[#e8f2ff] to-[#d9ebfe] border-[#bedbfe] hover:border-blue-300 hover:shadow-md hover:-translate-y-1">
              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/bill/Glossy Gold Rupee Coin Stacks.png"
                    alt="This Month's Total"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                    This Month's Total
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {formatINR(stats.monthTotal)}
                    </span>
                    <span className="text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200/90">
                      Month to Date
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Subtext */}
              <div className="mt-2 pt-1 relative z-10">
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate">
                  Accumulated for current calendar month
                </p>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill="#93c5fd" />
                </svg>
              </div>
            </div>

            {/* Card 3: All-Time Site Bills */}
            <div className="rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] bg-gradient-to-br from-[#f0fdf5] via-[#e6f9ee] to-[#d2f7e2] border-[#baf2cf] hover:border-emerald-300 hover:shadow-md hover:-translate-y-1">
              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/bill/Receipt with Green Checkmark.png"
                    alt="All-Time Site Bills"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                    All-Time Site Bills
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {formatINR(stats.allTimeTotal)}
                    </span>
                    <span className="text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-200/90">
                      Audited
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Subtext */}
              <div className="mt-2 pt-1 relative z-10">
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate">
                  Paid: {formatINR(stats.paidTotal)} • Pending: {formatINR(stats.pendingTotal)}
                </p>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill="#86efac" />
                </svg>
              </div>
            </div>

            {/* Card 4: Filter Quick Mode */}
            <div 
              onClick={() => {
                if (dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr) {
                  setDateFilter(DEFAULT_DATE_FILTER);
                } else {
                  setDateFilter({ mode: 'exact', exactDate: todayStr, startDate: '', endDate: '' });
                }
              }}
              className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] bg-gradient-to-br from-[#fffdf5] via-[#fff5ea] to-[#ffe5d0] border-[#fed7aa] hover:border-amber-300 hover:shadow-md cursor-pointer hover:-translate-y-1 ${
                dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'border-amber-600 ring-2 ring-amber-500/30 shadow-md' : ''
              }`}
            >
              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/bill/Glossy Calendar Checkmark Icon.png"
                    alt="Filter Quick Mode"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                    Filter Quick Mode
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                      {dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'Showing Today' : 'Show Today Only'}
                    </span>
                    <span className={`text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap ${
                      dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                        : 'bg-amber-100/70 text-amber-800 border border-amber-200'
                    }`}>
                      {dateFilter.mode === 'exact' && dateFilter.exactDate === todayStr ? 'Active' : 'Quick Filter'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Subtext */}
              <div className="mt-2 pt-1 relative z-10">
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate">
                  Click to isolate today's receipts & lunch
                </p>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill="#fdba74" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3. Filter & Search Toolbar (Modern Pill Inputs & Selects) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6338eb] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expense description, vendor, code, payee, or notes..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#6338eb] focus:ring-1 focus:ring-[#6338eb]/20 bg-slate-50/50"
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
                className="h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-[#6338eb] font-medium cursor-pointer"
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
                className="h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-[#6338eb] font-medium cursor-pointer"
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
                className="h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-[#6338eb] font-medium cursor-pointer"
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
                  className="text-xs text-[#6338eb] hover:underline px-2 py-1 font-semibold cursor-pointer"
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
                          className="mt-2 px-3 py-1.5 rounded-lg bg-[#653ef1] hover:bg-[#592be8] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
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
                            className="font-mono font-bold text-[#653ef1] bg-[#653ef1]/10 hover:bg-[#653ef1]/20 px-1.5 py-0.5 rounded border border-[#653ef1]/30 transition-colors cursor-pointer"
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
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#653ef1] bg-[#653ef1]/10 hover:bg-[#653ef1]/20 px-1.5 py-0.5 rounded border border-[#653ef1]/30 transition-colors cursor-pointer"
                              title={`View uploaded bill copy (${exp.receipt_file_name || 'Receipt'}) - Supports iOS photos & PDF`}
                            >
                              <Paperclip className="w-3 h-3 text-[#653ef1]" />
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
                        <div className="flex items-center justify-end gap-1.5">
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
                              className="w-7 h-7 rounded-xl bg-[#f0ecff] hover:bg-[#e4ddff] text-[#6338eb] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                              title={`View attached bill copy (${exp.receipt_file_name || 'Document'})`}
                            >
                              <Paperclip className="w-3.5 h-3.5 text-[#6338eb]" />
                            </button>
                          )}

                          {/* Preview Voucher Slip */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingExpense(exp);
                              setIsVoucherModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-xl bg-[#f0ecff] hover:bg-[#e4ddff] text-[#6338eb] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                            title="View & Preview Bill Voucher Slip"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#6338eb]" />
                          </button>

                          {/* Open Bill directly in Blob URL tab (No download) */}
                          <button
                            type="button"
                            onClick={() => viewSingleExpenseVoucherInNewTab(exp, project?.name || 'Noori Crest Tower')}
                            className="w-7 h-7 rounded-xl bg-[#f0ecff] hover:bg-[#e4ddff] text-[#6338eb] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                            title="Open Bill Voucher directly in Blob URL tab (No file download)"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#6338eb]" />
                          </button>

                          {/* Edit Expense Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpenseToEdit(exp);
                              setIsAddModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-xl bg-[#f0ecff] hover:bg-[#e4ddff] text-[#6338eb] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                            title="Edit expense details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#6338eb]" />
                          </button>

                          {/* Delete Expense (Moves to Recycle Bin via Confirmation Modal) */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpenseToDelete(exp);
                              setIsDeleteModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-xl bg-[#fff0f2] hover:bg-[#ffe2e6] text-[#e11d48] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
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
              <tfoot className="bg-slate-50/70 border-t border-slate-200 text-xs text-slate-900">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase tracking-wider text-slate-500 font-bold text-[11px]">
                    FILTERED TOTAL:
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-4 py-1.5 rounded-xl bg-[#6338eb] text-white text-xs font-black shadow-xs font-numeric">
                      {formatINR(filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
                    </span>
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-left text-slate-400 font-medium">
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
