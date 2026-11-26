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
  ArrowDownLeft,
  FileText,
  MoreVertical
} from 'lucide-react';
import { SiteExpense, ExpensePaymentMethod, ExpensePaymentStatus, DbProject } from '@/lib/supabase/types';
import { fetchAllActiveSites } from '@/lib/supabase/site-storage';
import { ExpenseBillViewerModal } from './ExpenseBillViewerModal';
import { ProjectInfo } from '@/lib/construction-planning/types';
import { formatMumbaiDate } from '@/lib/common/date-format';
import {
  fetchSiteExpenses,
  fetchDeletedSiteExpenses,
  deleteSiteExpense,
  restoreSiteExpense,
  calculateExpenseSummary,
  fetchSiteExpensesSummaryRpc,
  getExpenseAttachments,
  getExpensePaymentBreakdown,
  recordExpensePayment,
  ExpenseSummaryStats
} from '@/lib/supabase/expense-services';
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal';
import { ScrollableTableContainer } from '@/components/common/ScrollableTableContainer';
import { SearchableSelect } from '@/components/common/SearchableSelect';
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
  allProjects?: DbProject[];
  userEmail?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  externalActionTrigger?: { action: string; timestamp: number } | null;
  activeCommercialTab?: 'expenses' | 'subcontractor-bills' | 'contractor-work-orders' | 'customer-purchases';
  onSelectCommercialTab?: (tab: 'expenses' | 'subcontractor-bills' | 'contractor-work-orders' | 'customer-purchases') => void;
}

export const SiteExpensesView: React.FC<SiteExpensesViewProps> = ({
  project,
  projectId = '',
  allProjects = [],
  userEmail,
  showToast,
  externalActionTrigger,
  activeCommercialTab = 'expenses',
  onSelectCommercialTab,
}) => {
  const [expenses, setExpenses] = useState<SiteExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Available Projects & Site Filter (Default: 'all' to show all construction sites & buildings)
  const [availableProjects, setAvailableProjects] = useState<DbProject[]>(allProjects || []);
  const [siteFilter, setSiteFilter] = useState<string>('all');

  useEffect(() => {
    if (allProjects && allProjects.length > 0) {
      setAvailableProjects(allProjects);
    } else {
      fetchAllActiveSites(false).then((sites) => {
        if (sites && sites.length > 0) {
          setAvailableProjects(sites);
        }
      });
    }
  }, [allProjects]);

  // Voucher Slip Modal State
  const [viewingExpense, setViewingExpense] = useState<SiteExpense | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Attached Bill / Receipt Viewer Modal State
  const [billViewerState, setBillViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    fileName?: string | null;
    attachments?: { url: string; name?: string | null; type?: string }[];
    voucherNumber?: string;
  }>({
    isOpen: false,
    fileUrl: null,
  });

  // Filters (default to Last 30 Days so initial load doesn't download all historical records)
  const getLast30DaysDateFilter = (): DateFilterState => {
    const endStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const d = new Date(`${endStr}T00:00:00`);
    d.setDate(d.getDate() - 30);
    const startStr = d.toISOString().split('T')[0];
    return { mode: 'range', exactDate: '', startDate: startStr, endDate: endStr };
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(() => getLast30DaysDateFilter());
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // View Mode: 'active' vs 'bin'
  const [viewMode, setViewMode] = useState<'active' | 'bin'>('active');
  const [deletedExpenses, setDeletedExpenses] = useState<SiteExpense[]>([]);
  const [isLoadingBin, setIsLoadingBin] = useState(false);

  // Edit Expense State
  const [expenseToEdit, setExpenseToEdit] = useState<SiteExpense | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openActionMenuId) return;
    const handleDocClick = () => setOpenActionMenuId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [openActionMenuId]);

  // Confirm Delete Modal State
  const [expenseToDelete, setExpenseToDelete] = useState<SiteExpense | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settle / Record Balance Payment Modal State
  const [settleExpense, setSettleExpense] = useState<SiteExpense | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleMethod, setSettleMethod] = useState<ExpensePaymentMethod>('cash');
  const [settleNote, setSettleNote] = useState<string>('');
  const [isSettling, setIsSettling] = useState<boolean>(false);

  const handleOpenSettleModal = (exp: SiteExpense) => {
    const { pending } = getExpensePaymentBreakdown(exp);
    setSettleExpense(exp);
    setSettleAmountInput(pending > 0 ? String(pending) : '');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleMethod(exp.payment_method || 'cash');
    setSettleNote('');
  };

  const handleConfirmSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleExpense) return;
    const payAmt = parseFloat(settleAmountInput);
    if (isNaN(payAmt) || payAmt <= 0) {
      showToast?.('Please enter a valid payment amount greater than 0.', 'error');
      return;
    }

    setIsSettling(true);
    try {
      const res = await recordExpensePayment(
        settleExpense,
        payAmt,
        settleDate,
        settleMethod,
        settleNote
      );
      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setExpenses(prev => prev.map(item => item.id === res.data!.id ? res.data! : item));
        const { pending } = getExpensePaymentBreakdown(res.data);
        showToast?.(
          pending <= 0
            ? `Bill ${res.data.expense_code} marked as Fully Paid! Original date preserved.`
            : `Recorded ₹${payAmt.toLocaleString('en-IN')} payment on ${res.data.expense_code}. Remaining: ₹${pending.toLocaleString('en-IN')}`,
          'success'
        );
        setSettleExpense(null);
      }
    } finally {
      setIsSettling(false);
    }
  };

  // Load expenses from Supabase (server-side filtered by site & active date range)
  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const target = siteFilter === 'all' ? 'all' : (siteFilter || projectId || 'all');
      const startDate =
        dateFilter.mode === 'exact'
          ? dateFilter.exactDate || null
          : dateFilter.mode === 'range'
          ? dateFilter.startDate || null
          : null;
      const endDate =
        dateFilter.mode === 'exact'
          ? dateFilter.exactDate || null
          : dateFilter.mode === 'range'
          ? dateFilter.endDate || null
          : null;
      const data = await fetchSiteExpenses(target, { startDate, endDate });
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
      const target = siteFilter === 'all' ? 'all' : (siteFilter || projectId || 'all');
      const data = await fetchDeletedSiteExpenses(target);
      setDeletedExpenses(data);
    } catch (err) {
      console.error('Failed to load deleted expenses:', err);
    } finally {
      setIsLoadingBin(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [projectId, siteFilter, dateFilter]);

  useEffect(() => {
    loadDeletedExpenses();
  }, [projectId, siteFilter]);

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

  // Unique Vendors from loaded expenses
  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      const v = e.vendor_name?.trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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

      // 1b. Site / Building Filter
      if (siteFilter !== 'all' && exp.project_id && exp.project_id !== siteFilter) {
        return false;
      }

      // 2. Date Filter (Range or Exact Particular Date)
      if (!matchesDateFilter(exp.expense_date, dateFilter)) {
        return false;
      }

      // 3. Vendor Filter
      if (vendorFilter !== 'all' && (exp.vendor_name?.trim() || '') !== vendorFilter) {
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
    }).sort((a, b) => {
      const dateA = new Date(a.expense_date || 0).getTime();
      const dateB = new Date(b.expense_date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.serial_no || 0) - (a.serial_no || 0);
    });
  }, [expenses, searchQuery, siteFilter, dateFilter, vendorFilter, paymentMethodFilter, statusFilter]);

  // KPI Calculations (powered by Postgres RPC get_site_expenses_summary, with instant local fallback)
  const localStats: ExpenseSummaryStats = useMemo(() => {
    return calculateExpenseSummary(filteredExpenses);
  }, [filteredExpenses]);

  const [rpcStats, setRpcStats] = useState<ExpenseSummaryStats | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const startDate =
        dateFilter.mode === 'exact'
          ? dateFilter.exactDate || null
          : dateFilter.mode === 'range'
          ? dateFilter.startDate || null
          : null;
      const endDate =
        dateFilter.mode === 'exact'
          ? dateFilter.exactDate || null
          : dateFilter.mode === 'range'
          ? dateFilter.endDate || null
          : null;

      const res = await fetchSiteExpensesSummaryRpc({
        projectId: siteFilter,
        startDate,
        endDate,
        vendorName: vendorFilter,
        paymentMethod: paymentMethodFilter,
        paymentStatus: statusFilter,
        search: searchQuery,
      });

      if (active && res) {
        setRpcStats(res);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [siteFilter, dateFilter, vendorFilter, paymentMethodFilter, statusFilter, searchQuery, expenses]);

  const stats: ExpenseSummaryStats = rpcStats ?? localStats;

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
      setVendorFilter('all');
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
      setSearchQuery(cat);
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
                {project?.name ? project.name.toUpperCase() : 'SELECTED SITE'}
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
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCommercialTab === 'expenses'
                  ? 'bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-[#6338eb]" />
              <span>Daily Bills & Expenses</span>
            </button>

            {/* Tab 2: Work Orders (Hidden per user request) */}
            {/* <button
              type="button"
              onClick={() => onSelectCommercialTab?.('contractor-work-orders')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCommercialTab === 'contractor-work-orders'
                  ? 'bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Work Orders</span>
            </button> */}

            {/* Tab 3: Customer Purchases & Inflow */}
            <button
              type="button"
              onClick={() => onSelectCommercialTab?.('customer-purchases')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCommercialTab === 'customer-purchases'
                  ? 'bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Purchases & Inflow</span>
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
          <span>
            Active Site Bills (
            {filteredExpenses.length !== expenses.length
              ? `${filteredExpenses.length} of ${expenses.length}`
              : expenses.length}
            )
          </span>
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

              {/* Bottom Row: Paid & Due Breakdown */}
              <div className="mt-2 pt-1.5 relative z-10 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                    Paid: {formatINR(stats.todayPaid)}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 border border-amber-200">
                    Due: {formatINR(stats.todayDue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 font-semibold">
                  {stats.todayCount} {stats.todayCount === 1 ? 'Bill' : 'Bills'}
                </span>
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
                    {isDateFilterActive(dateFilter) ? 'Filtered Date Total' : "This Month's Total"}
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {formatINR(isDateFilterActive(dateFilter) ? stats.allTimeTotal : stats.monthTotal)}
                    </span>
                    <span className="text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200/90">
                      {isDateFilterActive(dateFilter)
                        ? dateFilter.mode === 'exact'
                          ? 'Selected Date'
                          : 'Selected Range'
                        : 'Month to Date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Paid & Due Breakdown */}
              <div className="mt-2 pt-1.5 relative z-10 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                    Paid: {formatINR(isDateFilterActive(dateFilter) ? stats.paidTotal : stats.monthPaid)}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 border border-amber-200">
                    Due: {formatINR(isDateFilterActive(dateFilter) ? stats.pendingTotal : stats.monthDue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 font-semibold">
                  {isDateFilterActive(dateFilter) ? stats.allTimeCount : stats.monthCount} Bills
                </span>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill="#93c5fd" />
                </svg>
              </div>
            </div>

            {/* Card 3: Total Pending / Due Bills */}
            <div
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
              className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] bg-gradient-to-br from-[#f0fdf5] via-[#e6f9ee] to-[#d2f7e2] border-[#baf2cf] hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 cursor-pointer ${
                statusFilter === 'pending' ? 'ring-2 ring-emerald-500/40 border-emerald-500' : ''
              }`}
              title="Click to filter pending/due bills"
            >
              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/bill/Receipt with Green Checkmark.png"
                    alt="Total Due Bills"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                    Total Due / Pending
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {formatINR(stats.pendingTotal)}
                    </span>
                    <span className={`text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap ${
                      stats.pendingTotal > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200/90'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200/90'
                    }`}>
                      {stats.pendingTotal > 0 ? 'Due Balance' : 'All Cleared'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Subtext */}
              <div className="mt-2 pt-1.5 relative z-10">
                <p className="text-[11px] sm:text-xs text-slate-700 font-semibold leading-tight truncate">
                  Paid: {formatINR(stats.paidTotal)} • Total: {formatINR(stats.allTimeTotal)}
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
              {/* Site / Building Selector Filter */}
              <div className="flex items-center gap-1.5 px-3 h-9 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <Building2 className="w-4 h-4 text-[#6338eb] shrink-0" />
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">🏢 All Construction Sites (All Bills)</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Universal Date Filter: Start & End Date (Range) + Particular Custom Date */}
              <DateFilterControl
                value={dateFilter}
                onChange={setDateFilter}
                label="Filter Date"
              />

              {/* Vendor Filter (Searchable) */}
              <div className="min-w-[200px] sm:w-[230px]">
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Vendors' },
                    ...availableVendors.map(vendor => ({ value: vendor, label: vendor })),
                  ]}
                  value={vendorFilter}
                  onChange={setVendorFilter}
                  placeholder="All Vendors"
                  searchPlaceholder="Search vendor..."
                  triggerClassName="h-9 rounded-xl border-slate-200 text-xs font-medium py-0"
                />
              </div>

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
                <option value="partial">Partial Paid</option>
                <option value="pending">Pending</option>
              </select>

              {/* Clear Filters (if any active) */}
              {(searchQuery || siteFilter !== 'all' || isDateFilterActive(dateFilter) || vendorFilter !== 'all' || paymentMethodFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSiteFilter('all');
                    setDateFilter(getLast30DaysDateFilter());
                    setVendorFilter('all');
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
        <ScrollableTableContainer>
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 text-center">S.No</th>
                <th className="px-3.5 py-2.5">Site / Building</th>
                <th className="px-3.5 py-2.5">Expense Date</th>
                <th className="px-3.5 py-2.5">Expense Title & Purpose</th>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">Paid To / Vendor</th>
                <th className="px-3.5 py-2.5 text-center">Mode</th>
                <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Amount (Rs.)</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                      <span className="font-medium text-xs">Loading site expenses from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
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

                      {/* Site / Building Tag */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const proj = availableProjects.find((p) => p.id === exp.project_id);
                          return (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-[#653ef1] border border-purple-200/80 shadow-2xs">
                              <Building2 className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                              <span>{proj ? proj.name : (exp.project_id ? (project?.name || 'Site') : 'General / Unassigned')}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Expense Date */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5" title="Expense Date">
                            <Calendar className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                            <span>{formatMumbaiDate(exp.expense_date)}</span>
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200">
                              Today
                            </span>
                          )}
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
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {exp.paid_by && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              Paid by: {exp.paid_by}
                            </span>
                          )}
                          {(exp.created_by_email || exp.enterdby) && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {exp.paid_by ? '• ' : ''}Entered by: {exp.created_by_email || (exp.enterdby === 'a72d7229-1476-4f82-b105-7d38de4e2af3' ? 'admin@gmail.com' : exp.enterdby)}
                            </span>
                          )}
                        </div>
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
                        {exp.payment_status === 'pending' ? (
                          <span className="text-[11px] text-slate-400 font-medium">—</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                            {exp.payment_method}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {(() => {
                          const { paid, pending, isPartial } = getExpensePaymentBreakdown(exp);
                          return (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-slate-900 text-sm whitespace-nowrap inline-block">
                                {formatINR(exp.amount)}
                              </span>
                              {isPartial && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] font-semibold">
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Paid: {formatINR(paid)}
                                  </span>
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    Due: {formatINR(pending)}
                                  </span>
                                </div>
                              )}
                              {exp.first_payment_date && exp.settlement_date && exp.first_payment_date !== exp.settlement_date && (
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  1st: {formatMumbaiDate(exp.first_payment_date)} • Paid: {formatMumbaiDate(exp.settlement_date)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const { isPartial, isFullyPaid } = getExpensePaymentBreakdown(exp);
                          if (isPartial || exp.payment_status === 'partial') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#653ef1] border border-purple-200">
                                <Clock className="w-3 h-3 text-[#653ef1]" />
                                Partial Paid
                              </span>
                            );
                          }
                          if (isFullyPaid || exp.payment_status === 'paid') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Paid
                              </span>
                            );
                          }
                          if (exp.payment_status === 'pending') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Reimbursable
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions (3-dots Menu) */}
                      <td className="px-4 py-3 text-right relative">
                        {(() => {
                          const atts = getExpenseAttachments(exp);
                          const hasDue = getExpensePaymentBreakdown(exp).pending > 0;
                          const isMenuOpen = openActionMenuId === exp.id;
                          return (
                            <div
                              className="inline-flex items-center justify-end relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(isMenuOpen ? null : exp.id)}
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
                                  isMenuOpen
                                    ? 'bg-[#653ef1] text-white border-[#653ef1]'
                                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                                title="Actions"
                                aria-label="Row actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                                {atts.length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#653ef1] text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white">
                                    {atts.length}
                                  </span>
                                )}
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-9 z-40 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-left animate-in fade-in duration-100">
                                  {hasDue && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        handleOpenSettleModal(exp);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Pay Due Balance</span>
                                    </button>
                                  )}

                                  {atts.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setBillViewerState({
                                          isOpen: true,
                                          fileUrl: atts[0].url,
                                          fileName: atts[0].name || 'Bill-Receipt',
                                          attachments: atts,
                                          voucherNumber: exp.expense_code,
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] flex items-center gap-2.5 cursor-pointer"
                                    >
                                      <Paperclip className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                                      <span>View Attachments ({atts.length})</span>
                                    </button>
                                  )}

                                  {/* Voucher options hidden for now per user request */}
                                  {/* <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setViewingExpense(exp);
                                      setIsVoucherModalOpen(true);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                                    <span>Preview Voucher Slip</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      viewSingleExpenseVoucherInNewTab(exp, project?.name || 'Noori Crest Tower');
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                                    <span>Open Voucher in Tab</span>
                                  </button> */}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setExpenseToEdit(exp);
                                      setIsAddModalOpen(true);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                                    <span>Edit Bill</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setExpenseToDelete(exp);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Move to Recycle Bin</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
        </ScrollableTableContainer>
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
                    <th className="px-4 py-3">Site / Building</th>
                    <th className="px-4 py-3">Expense Date</th>
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
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <p className="font-semibold text-slate-600">Loading deleted expenses from Recycle Bin...</p>
                      </td>
                    </tr>
                  ) : deletedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">Recycle Bin is empty</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No expenses currently deleted.</p>
                      </td>
                    </tr>
                  ) : (
                    deletedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const proj = availableProjects.find((p) => p.id === exp.project_id);
                            return (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-[#653ef1] border border-purple-200/80 shadow-2xs">
                                <Building2 className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
                                <span>{proj ? proj.name : (exp.project_id ? (project?.name || 'Site') : 'General / Unassigned')}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatMumbaiDate(exp.expense_date)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{exp.title}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {exp.paid_by && <span className="text-[10px] text-slate-400 font-normal">Paid by: {exp.paid_by}</span>}
                            {(exp.created_by_email || exp.enterdby) && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                {exp.paid_by ? '• ' : ''}Entered by: {exp.created_by_email || (exp.enterdby === 'a72d7229-1476-4f82-b105-7d38de4e2af3' ? 'admin@gmail.com' : exp.enterdby)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {exp.vendor_name || 'Direct Site Cash'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          <span className="whitespace-nowrap inline-block">
                            {formatINR(exp.amount)}
                          </span>
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
        projectId={siteFilter !== 'all' ? siteFilter : (projectId || availableProjects[0]?.id || '')}
        availableProjects={availableProjects}
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

      {/* Record Balance / Settle Partial Payment Modal */}
      {settleExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Balance Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {settleExpense.expense_code} • {settleExpense.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettleExpense(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleConfirmSettlePayment} className="p-5 space-y-4">
              {(() => {
                const { total, paid, pending } = getExpensePaymentBreakdown(settleExpense);
                return (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Bill</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{formatINR(total)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-700 uppercase">Paid</div>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">{formatINR(paid)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-amber-700 uppercase">Pending</div>
                      <div className="text-xs font-bold text-amber-700 mt-0.5">{formatINR(pending)}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="text-[11px] text-slate-500 bg-purple-50/60 border border-purple-200/70 rounded-lg px-3 py-2">
                First Payment / Bill Date:{' '}
                <strong className="text-slate-800">
                  {formatMumbaiDate(settleExpense.first_payment_date || settleExpense.expense_date)}
                </strong>{' '}
                (will be preserved)
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Amount Paying Now (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSettleAmountInput(String(getExpensePaymentBreakdown(settleExpense).pending))}
                    className="text-[11px] font-semibold text-[#653ef1] hover:underline cursor-pointer"
                  >
                    Full Pending ({formatINR(getExpensePaymentBreakdown(settleExpense).pending)})
                  </button>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={getExpensePaymentBreakdown(settleExpense).pending}
                  value={settleAmountInput}
                  onChange={(e) => setSettleAmountInput(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as ExpensePaymentMethod)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-[#653ef1]"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="petty_cash">Petty Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {settleMethod === 'upi'
                    ? 'UPI Number / Transaction Ref'
                    : settleMethod === 'cheque'
                    ? 'Cheque Number & Bank Name'
                    : settleMethod === 'bank_transfer'
                    ? 'Bank Name & UTR / Reference No.'
                    : 'Payment Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder={
                    settleMethod === 'upi'
                      ? 'e.g. UPI Ref 432819... or 98xxx@ybl'
                      : settleMethod === 'cheque'
                      ? 'e.g. Cheque #004512 - HDFC Bank'
                      : settleMethod === 'bank_transfer'
                      ? 'e.g. SBI NEFT - UTR 123456...'
                      : 'e.g. Final balance cleared in cash'
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettleExpense(null)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isSettling ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploaded Bill / Document Viewer Modal (supports iOS HEIC, PDF, images) */}
      <ExpenseBillViewerModal
        isOpen={billViewerState.isOpen}
        onClose={() => setBillViewerState(prev => ({ ...prev, isOpen: false }))}
        fileUrl={billViewerState.fileUrl}
        fileName={billViewerState.fileName}
        attachments={billViewerState.attachments}
        voucherNumber={billViewerState.voucherNumber}
      />
    </div>
  );
};
