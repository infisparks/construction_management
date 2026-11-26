'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Receipt,
  Package,
  FolderKanban,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  IndianRupee,
  Layers,
  ArrowDownLeft,
  ShieldAlert,
  FileText,
  Users,
  Download,
} from 'lucide-react';
import {
  fetchDirectorDashboardData,
  DirectorDashboardData,
} from '@/lib/supabase/dashboard-services';
import {
  fetchSiteExpensesSummaryRpc,
  ExpenseSummaryStats,
} from '@/lib/supabase/expense-services';
import { downloadDirectorDashboardPdf } from '@/lib/common/dashboard-pdf-report';
import { ViewMode } from '@/lib/construction-planning/types';
import { formatMumbaiDate } from '@/lib/common/date-format';

interface DirectorDashboardViewProps {
  activeProjectId?: string;
  userEmail?: string;
  userRole?: string;
  onNavigateView: (view: ViewMode) => void;
  onSelectSiteInWorkspace?: (projectId: string) => void;
}

type PeriodFilter = 'all' | 'this_month' | 'last_30' | 'last_7' | 'today';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'All Time',
  this_month: 'This Month',
  last_30: 'Last 30 Days',
  last_7: 'Last 7 Days',
  today: 'Today',
};

const DONUT_COLORS = [
  '#653ef1',
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#64748b',
];

function formatINR(amount: number): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

function formatCompactINR(amount: number): string {
  const num = Number(amount) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${Math.round(num)}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function matchesPeriod(dateStr: string | null | undefined, period: PeriodFilter, todayStr: string): boolean {
  if (period === 'all') return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (period === 'today') return d === todayStr;
  if (period === 'this_month') return d.slice(0, 7) === todayStr.slice(0, 7);

  const target = new Date(`${d}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const diffDays = (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
  if (period === 'last_7') return diffDays >= 0 && diffDays <= 7;
  if (period === 'last_30') return diffDays >= 0 && diffDays <= 30;
  return true;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = ({
  onNavigateView,
  onSelectSiteInWorkspace,
  userEmail,
  userRole,
}) => {
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Default to 'all' sites for Director consolidated view
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const loadData = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await fetchDirectorDashboardData();
      setData(res);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const todayStr = useMemo(() => getTodayIST(), []);

  // Server-side Postgres RPC summary for fast 20k+ row calculations
  const [rpcPeriodStats, setRpcPeriodStats] = useState<ExpenseSummaryStats | null>(null);
  const [rpcSiteTodayMonthStats, setRpcSiteTodayMonthStats] = useState<ExpenseSummaryStats | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRpcTotals() {
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (period === 'today') {
        startDate = todayStr;
        endDate = todayStr;
      } else if (period === 'this_month') {
        startDate = `${todayStr.slice(0, 7)}-01`;
        endDate = todayStr;
      } else if (period === 'last_7' || period === 'last_30') {
        const d = new Date(`${todayStr}T00:00:00`);
        d.setDate(d.getDate() - (period === 'last_7' ? 7 : 30));
        startDate = d.toISOString().split('T')[0];
        endDate = todayStr;
      }

      const [periodRes, siteAllTimeRes] = await Promise.all([
        fetchSiteExpensesSummaryRpc({
          projectId: selectedSiteId,
          startDate,
          endDate,
        }),
        period === 'all'
          ? Promise.resolve(null)
          : fetchSiteExpensesSummaryRpc({ projectId: selectedSiteId }),
      ]);

      if (!active) return;
      if (periodRes) {
        setRpcPeriodStats(periodRes);
        setRpcSiteTodayMonthStats(siteAllTimeRes ?? periodRes);
      }
    }
    loadRpcTotals();
    return () => {
      active = false;
    };
  }, [selectedSiteId, period, todayStr, data?.fetchedAt]);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    (data?.projects || []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [data?.projects]);

  const selectedSiteName = useMemo(() => {
    if (selectedSiteId === 'all') return 'All Construction Sites';
    return projectMap.get(selectedSiteId) || 'Selected Site';
  }, [selectedSiteId, projectMap]);

  // Filtered datasets based on selectedSiteId + period
  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    return data.expenses.filter((e) => {
      if (selectedSiteId !== 'all' && e.project_id !== selectedSiteId) return false;
      if (!matchesPeriod(e.expense_date, period, todayStr)) return false;
      return true;
    });
  }, [data, selectedSiteId, period, todayStr]);

  const filteredDocuments = useMemo(() => {
    if (!data) return [];
    return data.documents.filter((d) => {
      if (selectedSiteId !== 'all' && d.project_id !== selectedSiteId) return false;
      if (!matchesPeriod(d.created_at, period, todayStr)) return false;
      return true;
    });
  }, [data, selectedSiteId, period, todayStr]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((t) => {
      if (selectedSiteId !== 'all' && t.project_id !== selectedSiteId) return false;
      return true;
    });
  }, [data, selectedSiteId]);

  const filteredInventoryTx = useMemo(() => {
    if (!data) return [];
    return data.inventoryTx.filter((tx) => matchesPeriod(tx.transaction_date, period, todayStr));
  }, [data, period, todayStr]);

  // 1. Bills & Expenses Summary (includes Today & This Month based on expense_date)
  const expenseStats = useMemo(() => {
    const currentMonthPrefix = todayStr.slice(0, 7);
    let total = 0;
    let paid = 0;
    let pending = 0;
    let reimbursable = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let reimbursableCount = 0;
    let maxBill = 0;

    for (const e of filteredExpenses) {
      const amt = Number(e.amount) || 0;
      total += amt;
      if (amt > maxBill) maxBill = amt;

      const effectivePaid =
        e.paid_amount != null && !Number.isNaN(Number(e.paid_amount))
          ? Math.min(Math.max(Number(e.paid_amount), 0), amt)
          : e.payment_status === 'paid'
          ? amt
          : 0;
      const effectivePending = Math.max(amt - effectivePaid, 0);

      if (effectivePending <= 0 && amt > 0) {
        paid += amt;
        paidCount += 1;
      } else if (e.payment_status === 'reimbursable') {
        reimbursable += effectivePending;
        paid += effectivePaid;
        reimbursableCount += 1;
      } else {
        paid += effectivePaid;
        pending += effectivePending;
        pendingCount += 1;
      }
    }

    // Today & This Month calculated on site-filtered expenses by expense_date
    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    const siteExpenses = (data?.expenses || []).filter((e) =>
      selectedSiteId === 'all' ? true : e.project_id === selectedSiteId
    );
    for (const e of siteExpenses) {
      const amt = Number(e.amount) || 0;
      if (e.expense_date === todayStr) {
        todayTotal += amt;
        todayCount += 1;
      }
      if (e.expense_date && e.expense_date.startsWith(currentMonthPrefix)) {
        monthTotal += amt;
        monthCount += 1;
      }
    }

    const finalTotal = rpcPeriodStats ? rpcPeriodStats.allTimeTotal : total;
    const finalPaid = rpcPeriodStats ? rpcPeriodStats.paidTotal : paid;
    const finalUnpaid = rpcPeriodStats ? rpcPeriodStats.pendingTotal : pending + reimbursable;
    const finalCount = rpcPeriodStats ? rpcPeriodStats.allTimeCount : filteredExpenses.length;
    const finalTodayTotal = rpcSiteTodayMonthStats ? rpcSiteTodayMonthStats.todayTotal : todayTotal;
    const finalTodayCount = rpcSiteTodayMonthStats ? rpcSiteTodayMonthStats.todayCount : todayCount;
    const finalMonthTotal = rpcSiteTodayMonthStats ? rpcSiteTodayMonthStats.monthTotal : monthTotal;
    const finalMonthCount = rpcSiteTodayMonthStats ? rpcSiteTodayMonthStats.monthCount : monthCount;

    const paidPct = finalTotal > 0 ? Math.round((finalPaid / finalTotal) * 100) : 0;
    const avgBill = finalCount > 0 ? finalTotal / finalCount : 0;
    return {
      total: finalTotal,
      paid: finalPaid,
      pending,
      reimbursable,
      paidCount,
      pendingCount,
      reimbursableCount,
      unpaidTotal: finalUnpaid,
      todayTotal: finalTodayTotal,
      todayCount: finalTodayCount,
      monthTotal: finalMonthTotal,
      monthCount: finalMonthCount,
      avgBill,
      maxBill,
      count: finalCount,
      paidPct,
    };
  }, [filteredExpenses, data?.expenses, selectedSiteId, todayStr, rpcPeriodStats, rpcSiteTodayMonthStats]);

  // 2. Store & Inventory Summary (Central Store)
  const storeStats = useMemo(() => {
    const products = data?.products || [];
    let totalStockUnits = 0;
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalStockUnits += p.current_stock;
      if (p.current_stock <= 0) {
        outOfStockCount += 1;
      } else if (p.minimum_alert_stock > 0 && p.current_stock <= p.minimum_alert_stock) {
        lowStockCount += 1;
      } else {
        healthyCount += 1;
      }
    }

    let inCount = 0;
    let outCount = 0;
    let defectReturnCount = 0;
    for (const tx of filteredInventoryTx) {
      const t = tx.type.toLowerCase();
      if (t === 'in' || t === 'check_in') inCount += 1;
      else if (t === 'out' || t === 'check_out') outCount += 1;
      else defectReturnCount += 1;
    }

    const lowStockItems = products
      .filter((p) => p.current_stock <= 0 || (p.minimum_alert_stock > 0 && p.current_stock <= p.minimum_alert_stock))
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 6);

    return {
      totalProducts: products.length,
      totalStockUnits: Math.round(totalStockUnits * 100) / 100,
      healthyCount,
      lowStockCount,
      outOfStockCount,
      alertCount: lowStockCount + outOfStockCount,
      inCount,
      outCount,
      defectReturnCount,
      lowStockItems,
    };
  }, [data?.products, filteredInventoryTx]);

  // 3. Documents Summary
  const docStats = useMemo(() => {
    let totalSize = 0;
    let approved = 0;
    let pending = 0;
    const byCategory = new Map<string, number>();

    for (const d of filteredDocuments) {
      totalSize += d.file_size || 0;
      const st = (d.status || '').toLowerCase();
      if (st === 'approved') approved += 1;
      else pending += 1;

      const cat = d.category || 'Uncategorized';
      byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    }

    return {
      total: filteredDocuments.length,
      approved,
      pending,
      totalSizeLabel: formatBytes(totalSize),
      topCategories: Array.from(byCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [filteredDocuments]);

  // 4. Schedule / Tasks Summary
  const scheduleStats = useMemo(() => {
    const leafTasks = filteredTasks.filter((t) => t.plan_type !== 'summary');
    const pool = leafTasks.length > 0 ? leafTasks : filteredTasks;

    let completed = 0;
    let inProgress = 0;
    let delayed = 0;
    let critical = 0;
    let progressSum = 0;

    for (const t of pool) {
      progressSum += t.plan_progress || 0;
      const st = (t.plan_status || '').toLowerCase();
      if (st === 'completed') completed += 1;
      else if (st === 'in_progress') inProgress += 1;
      else if (st === 'delayed' || t.variance_days > 0) delayed += 1;
      if (t.is_critical) critical += 1;
    }

    const avgProgress = pool.length > 0 ? Math.round(progressSum / pool.length) : 0;

    const attentionTasks = pool
      .filter((t) => t.plan_status === 'delayed' || t.variance_days > 0 || (t.is_critical && t.plan_status !== 'completed'))
      .sort((a, b) => (b.variance_days || 0) - (a.variance_days || 0))
      .slice(0, 5);

    return {
      totalTasks: pool.length,
      completed,
      inProgress,
      delayed,
      critical,
      avgProgress,
      attentionTasks,
    };
  }, [filteredTasks]);

  // 5. Monthly Expense Trend (Last 6 months ending on latest/current month)
  const monthlyTrend = useMemo(() => {
    const baseDate = new Date(`${todayStr}T00:00:00`);
    const months: { key: string; label: string; paid: number; pending: number; total: number; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      months.push({ key, label, paid: 0, pending: 0, total: 0, count: 0 });
    }

    const monthMap = new Map(months.map((m) => [m.key, m]));
    // Use site-filtered expenses (ignoring narrow period filter if period is today/last_7 so the 6-month trend stays informative)
    const source = (data?.expenses || []).filter((e) =>
      selectedSiteId === 'all' ? true : e.project_id === selectedSiteId
    );

    for (const e of source) {
      if (!e.expense_date) continue;
      const key = e.expense_date.slice(0, 7);
      const bucket = monthMap.get(key);
      if (!bucket) continue;
      const amt = Number(e.amount) || 0;
      bucket.total += amt;
      bucket.count += 1;
      if (e.payment_status === 'paid') bucket.paid += amt;
      else bucket.pending += amt;
    }

    const maxVal = Math.max(...months.map((m) => m.total), 1);
    return { months, maxVal };
  }, [data?.expenses, selectedSiteId, todayStr]);

  // 6. Payment Mode & Cashflow Breakdown
  const cashflowBreakdown = useMemo(() => {
    const modeMap = new Map<string, { amount: number; count: number }>();

    for (const e of filteredExpenses) {
      const amt = Number(e.amount) || 0;
      const mode = e.payment_method || 'cash';
      const cur = modeMap.get(mode) || { amount: 0, count: 0 };
      cur.amount += amt;
      cur.count += 1;
      modeMap.set(mode, cur);
    }

    const totalAmt = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) || 1;
    const modes = Array.from(modeMap.entries())
      .map(([mode, val], idx) => ({
        mode,
        amount: val.amount,
        count: val.count,
        pct: Math.round((val.amount / totalAmt) * 100),
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    return { modes };
  }, [filteredExpenses]);

  // 7. Site-wise Comparison (All Sites)
  const siteComparison = useMemo(() => {
    if (!data) return [];
    return data.projects.map((p) => {
      const siteExp = data.expenses.filter(
        (e) => e.project_id === p.id && matchesPeriod(e.expense_date, period, todayStr)
      );
      const billTotal = siteExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const billPending = siteExp
        .filter((e) => e.payment_status !== 'paid')
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const docCount = data.documents.filter(
        (d) => d.project_id === p.id && matchesPeriod(d.created_at, period, todayStr)
      ).length;

      const siteTasks = data.tasks.filter((t) => t.project_id === p.id && t.plan_type !== 'summary');
      const taskProgress =
        siteTasks.length > 0
          ? Math.round(siteTasks.reduce((s, t) => s + (t.plan_progress || 0), 0) / siteTasks.length)
          : 0;

      return {
        id: p.id,
        name: p.name,
        code: p.code || `SITE-${p.serial_no}`,
        billTotal,
        billPending,
        billCount: siteExp.length,
        docCount,
        taskProgress,
        taskCount: siteTasks.length,
      };
    });
  }, [data, period, todayStr]);

  const maxSiteBill = useMemo(
    () => Math.max(...siteComparison.map((s) => s.billTotal), 1),
    [siteComparison]
  );

  // 8. Top Vendors & Pending Bills
  const topVendors = useMemo(() => {
    const map = new Map<string, { name: string; total: number; pending: number; count: number }>();
    for (const e of filteredExpenses) {
      const vName = e.vendor_name?.trim();
      if (!vName) continue;
      const cur = map.get(vName) || { name: vName, total: 0, pending: 0, count: 0 };
      const amt = Number(e.amount) || 0;
      cur.total += amt;
      cur.count += 1;
      if (e.payment_status !== 'paid') cur.pending += amt;
      map.set(vName, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredExpenses]);

  const pendingBills = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.payment_status !== 'paid')
      .slice(0, 6);
  }, [filteredExpenses]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-72 bg-white rounded-2xl border border-slate-200" />
          <div className="h-72 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  // Store health bar percentages
  const storeTotalForDonut = Math.max(storeStats.totalProducts, 1);
  const healthyPct = (storeStats.healthyCount / storeTotalForDonut) * 100;
  const lowPct = (storeStats.lowStockCount / storeTotalForDonut) * 100;
  const outPct = (storeStats.outOfStockCount / storeTotalForDonut) * 100;

  return (
    <div className="w-full space-y-4">
      {/* 1. Executive Header + Site & Period Controls */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Director Executive Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#653ef1] border border-purple-200">
              {selectedSiteId === 'all' ? 'All Sites Consolidated' : selectedSiteName}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time financial, store inventory, document vault & schedule intelligence
            {userRole ? ` • Signed in as ${userRole}` : ''}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Dropdown (Default: All Sites) */}
          <div className="relative flex items-center">
            <Building2 className="w-3.5 h-3.5 text-[#653ef1] absolute left-3 pointer-events-none" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              aria-label="Filter dashboard by site"
              className="h-9 pl-8 pr-7 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-hidden focus:border-[#653ef1] cursor-pointer"
            >
              <option value="all">All Construction Sites ({data?.projects.length || 0})</option>
              {(data?.projects || []).map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Dropdown */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 pointer-events-none" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              aria-label="Filter dashboard by date period"
              className="h-9 pl-8 pr-7 rounded-xl border border-[#E5E7EB] bg-white text-xs font-medium text-[#111827] focus:outline-hidden focus:border-[#653ef1] cursor-pointer"
            >
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
                <option key={key} value={key}>
                  {PERIOD_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50 text-xs font-semibold text-[#111827] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#653ef1] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Download Letterhead Report PDF */}
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={async () => {
              setIsDownloadingPdf(true);
              try {
                await downloadDirectorDashboardPdf({
                  siteName: selectedSiteName,
                  periodLabel: PERIOD_LABELS[period],
                  generatedBy: userEmail || userRole,
                  expenseStats,
                  storeStats,
                  docStats,
                  monthlyTrend: monthlyTrend.months,
                  paymentModes: cashflowBreakdown.modes,
                  siteComparison:
                    selectedSiteId === 'all'
                      ? siteComparison
                      : siteComparison.filter((s) => s.id === selectedSiteId),
                  topVendors,
                  pendingBills: pendingBills.map((b) => {
                    const amt = Number(b.amount) || 0;
                    const effPaid =
                      b.payment_status === 'paid'
                        ? amt
                        : b.payment_status === 'partial' && b.paid_amount != null
                        ? Math.min(Math.max(Number(b.paid_amount), 0), amt)
                        : 0;
                    return {
                      expense_code: b.expense_code,
                      expense_date: b.expense_date,
                      title: b.title,
                      vendor_name: b.vendor_name,
                      payment_status: b.payment_status,
                      amount: amt,
                      dueAmount: Math.max(amt - effPaid, 0),
                    };
                  }),
                });
              } finally {
                setIsDownloadingPdf(false);
              }
            }}
            className="h-9 px-3.5 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Open full Director Report PDF in Blob URL tab (Download from browser if needed)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingPdf ? 'Generating...' : 'View Report PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards (Bills Total, Today, This Month, Store, Docs, Progress) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* KPI 1: Total Bills & Expenses */}
        <div
          onClick={() => onNavigateView('expenses')}
          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#653ef1]/50 p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Total Bills & Expenses
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                ₹{formatINR(expenseStats.total)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-[#653ef1] transition-colors">
              <Receipt className="w-5 h-5 text-[#653ef1] group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-600">
                Paid: {formatCompactINR(expenseStats.paid)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-amber-600">
                Pending: {formatCompactINR(expenseStats.unpaidTotal)}
              </span>
            </div>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#653ef1]">
              {expenseStats.count} bills
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Today's Bill Expense */}
        <div
          onClick={() => onNavigateView('expenses')}
          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#653ef1]/50 p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Today&apos;s Bill Expense
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                ₹{formatINR(expenseStats.todayTotal)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-[#653ef1] transition-colors">
              <IndianRupee className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280] font-medium">
              Date: {formatMumbaiDate(todayStr)}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#653ef1]">
              {expenseStats.todayCount} {expenseStats.todayCount === 1 ? 'bill' : 'bills'} today
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 3: This Month's Bill Expense */}
        <div
          onClick={() => onNavigateView('expenses')}
          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#653ef1]/50 p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                This Month&apos;s Bill Expense
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                ₹{formatINR(expenseStats.monthTotal)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-[#653ef1] transition-colors">
              <Calendar className="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280] font-medium">
              {new Date(`${todayStr}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#653ef1]">
              {expenseStats.monthCount} {expenseStats.monthCount === 1 ? 'bill' : 'bills'}
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Total Store & Inventory */}
        <div
          onClick={() => onNavigateView('materials')}
          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#653ef1]/50 p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Store Inventory (Central)
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                {storeStats.totalProducts} <span className="text-sm font-semibold text-[#6B7280]">Items</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-[#653ef1] transition-colors">
              <Package className="w-5 h-5 text-[#653ef1] group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Stock: {storeStats.totalStockUnits.toLocaleString('en-IN')} units
              </span>
              {storeStats.alertCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-rose-600">
                    {storeStats.alertCount} alerts
                  </span>
                </>
              )}
            </div>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#653ef1]">
              Store
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 3: Total Documents */}
        <div
          onClick={() => onNavigateView('files-archive')}
          className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#653ef1]/50 p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Total Documents
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                {docStats.total} <span className="text-sm font-semibold text-[#6B7280]">Files</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 group-hover:bg-[#653ef1] transition-colors">
              <FolderKanban className="w-5 h-5 text-sky-600 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-600">
                Approved: {docStats.approved}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-[#6B7280]">
                {docStats.totalSizeLabel}
              </span>
            </div>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#653ef1]">
              Vault
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Graphs Row 1: Monthly Expense Trend + Expense Category & Mode Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Monthly Bills & Expenses Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Monthly Bills & Expenses Trend
              </h2>
              <p className="text-xs text-[#6B7280]">
                Last 6 months based on Expense Date (Paid vs Pending)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#653ef1]" />
                Paid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                Pending
              </span>
            </div>
          </div>

          {/* SVG / Flex Bar Chart */}
          <div className="relative h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100">
            {monthlyTrend.months.map((m, idx) => {
              const totalHeightPct = Math.max((m.total / monthlyTrend.maxVal) * 100, m.total > 0 ? 6 : 0);
              const paidRatio = m.total > 0 ? (m.paid / m.total) * 100 : 0;
              const pendingRatio = m.total > 0 ? (m.pending / m.total) * 100 : 0;
              const isHovered = hoveredMonthIdx === idx;

              return (
                <div
                  key={m.key}
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                  className="flex-1 h-full flex flex-col items-center justify-end group relative cursor-pointer"
                >
                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-2 z-20 px-2.5 py-1.5 rounded-lg bg-[#111827] text-white text-[10px] whitespace-nowrap shadow-lg pointer-events-none">
                      <div className="font-bold">{m.label}: ₹{formatINR(m.total)}</div>
                      <div className="text-emerald-300">Paid: ₹{formatINR(m.paid)}</div>
                      <div className="text-amber-300">Pending: ₹{formatINR(m.pending)}</div>
                      <div className="text-slate-300">{m.count} bills</div>
                    </div>
                  )}

                  {/* Top Value Label */}
                  <span className="text-[10px] font-semibold text-[#6B7280] mb-1 truncate max-w-full">
                    {m.total > 0 ? formatCompactINR(m.total) : '—'}
                  </span>

                  {/* Stacked Bar */}
                  <div
                    className="w-full max-w-[44px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 bg-slate-100"
                    style={{ height: `${totalHeightPct}%`, minHeight: m.total > 0 ? '8px' : '4px' }}
                  >
                    {m.pending > 0 && (
                      <div
                        className="w-full bg-amber-400 transition-all"
                        style={{ height: `${pendingRatio}%` }}
                      />
                    )}
                    {m.paid > 0 && (
                      <div
                        className="w-full bg-[#653ef1] group-hover:bg-[#542be3] transition-all"
                        style={{ height: `${paidRatio}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4 pt-2">
            {monthlyTrend.months.map((m) => (
              <div key={m.key} className="flex-1 text-center text-[11px] font-medium text-[#6B7280]">
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Settlement & Mode Cashflow (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Payment Settlement & Mode Split
              </h2>
              <p className="text-xs text-[#6B7280]">
                Cashflow status & payment channels ({PERIOD_LABELS[period]})
              </p>
            </div>
            <span className="text-xs font-bold text-[#653ef1] bg-purple-50 px-2 py-0.5 rounded-md">
              {expenseStats.paidPct}% Paid
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-xs text-[#6B7280]">
              <IndianRupee className="w-7 h-7 text-slate-300 mb-1.5" />
              No expense records in this filter.
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {/* Paid vs Pending vs Reimbursable Stacked Bar */}
              <div className="space-y-2">
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  {expenseStats.paid > 0 && (
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(expenseStats.paid / Math.max(expenseStats.total, 1)) * 100}%` }}
                      title={`Paid: ₹${formatINR(expenseStats.paid)}`}
                    />
                  )}
                  {expenseStats.pending > 0 && (
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(expenseStats.pending / Math.max(expenseStats.total, 1)) * 100}%` }}
                      title={`Pending: ₹${formatINR(expenseStats.pending)}`}
                    />
                  )}
                  {expenseStats.reimbursable > 0 && (
                    <div
                      className="bg-[#653ef1] h-full"
                      style={{ width: `${(expenseStats.reimbursable / Math.max(expenseStats.total, 1)) * 100}%` }}
                      title={`Reimbursable: ₹${formatINR(expenseStats.reimbursable)}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                    <div className="text-[10px] font-semibold text-emerald-700">Paid ({expenseStats.paidCount})</div>
                    <div className="text-xs font-bold text-emerald-950 mt-0.5">{formatCompactINR(expenseStats.paid)}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/70">
                    <div className="text-[10px] font-semibold text-amber-700">Pending ({expenseStats.pendingCount})</div>
                    <div className="text-xs font-bold text-amber-950 mt-0.5">{formatCompactINR(expenseStats.pending)}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200/70">
                    <div className="text-[10px] font-semibold text-[#653ef1]">Reimb. ({expenseStats.reimbursableCount})</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{formatCompactINR(expenseStats.reimbursable)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Modes Horizontal Bars */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  By Payment Mode
                </div>
                {cashflowBreakdown.modes.map((m) => (
                  <div key={m.mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#111827] font-medium capitalize">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                        <span>{m.mode.replace('_', ' ')}</span>
                        <span className="text-[11px] text-[#6B7280]">({m.count})</span>
                      </span>
                      <span className="font-semibold text-[#111827]">
                        ₹{formatINR(m.amount)} ({m.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avg & Highest Bill Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>
              Avg Bill: <strong className="text-[#111827]">₹{formatINR(expenseStats.avgBill)}</strong>
            </span>
            <span>
              Highest Bill: <strong className="text-[#111827]">₹{formatINR(expenseStats.maxBill)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Graphs Row 2: Site-wise Comparison + Store Health & Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Site-wise Bills, Docs & Progress Comparison (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                {selectedSiteId === 'all'
                  ? 'Site-wise Spend, Documents & Progress'
                  : `${selectedSiteName} — Module Snapshot`}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {selectedSiteId === 'all'
                  ? 'Click any site row to filter the entire dashboard to that site'
                  : 'Overview of bills, documents & schedule tasks for this site'}
              </p>
            </div>
            {selectedSiteId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedSiteId('all')}
                className="text-xs font-semibold text-[#653ef1] hover:underline cursor-pointer"
              >
                Show All Sites
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(selectedSiteId === 'all'
              ? siteComparison
              : siteComparison.filter((s) => s.id === selectedSiteId)
            ).map((site) => {
              const barPct = Math.max((site.billTotal / maxSiteBill) * 100, site.billTotal > 0 ? 4 : 0);
              return (
                <div
                  key={site.id}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    onSelectSiteInWorkspace?.(site.id);
                  }}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-[#653ef1]/40 hover:bg-purple-50/20 transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#653ef1] flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111827] truncate">{site.name}</div>
                        <div className="text-[11px] text-[#6B7280]">
                          {site.billCount} bills • {site.docCount} docs • {site.taskCount} tasks
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs font-bold text-[#111827]">₹{formatINR(site.billTotal)}</div>
                        {site.billPending > 0 && (
                          <div className="text-[10px] font-semibold text-amber-600">
                            Pending: {formatCompactINR(site.billPending)}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {site.taskProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Spend Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#653ef1] to-indigo-400 rounded-full transition-all duration-300"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {siteComparison.length === 0 && (
              <p className="text-xs text-[#6B7280] py-6 text-center">No active sites found.</p>
            )}
          </div>
        </div>

        {/* Store Inventory Health & Movement (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Store Health & Stock Movement
              </h2>
              <p className="text-xs text-[#6B7280]">
                Catalog stock status & inward/outward activity
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateView('materials')}
              className="text-xs font-semibold text-[#653ef1] hover:underline cursor-pointer"
            >
              Open Store
            </button>
          </div>

          {/* Health Stacked Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#111827]">Catalog Stock Readiness</span>
              <span className="text-[#6B7280]">{storeStats.totalProducts} SKUs</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${healthyPct}%` }}
                title={`Healthy: ${storeStats.healthyCount}`}
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: `${lowPct}%` }}
                title={`Low Stock: ${storeStats.lowStockCount}`}
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: `${outPct}%` }}
                title={`Depleted: ${storeStats.outOfStockCount}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                In Stock ({storeStats.healthyCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Low ({storeStats.lowStockCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Depleted ({storeStats.outOfStockCount})
              </span>
            </div>
          </div>

          {/* Movement Counters */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center">
              <div className="text-[10px] font-semibold uppercase text-emerald-700 flex items-center justify-center gap-1">
                <ArrowDownLeft className="w-3 h-3" /> Inward
              </div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">{storeStats.inCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/70 text-center">
              <div className="text-[10px] font-semibold uppercase text-[#653ef1] flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Outward
              </div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{storeStats.outCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-center">
              <div className="text-[10px] font-semibold uppercase text-amber-700 flex items-center justify-center gap-1">
                <Layers className="w-3 h-3" /> Ret/Dmg
              </div>
              <div className="text-lg font-bold text-amber-900 mt-0.5">{storeStats.defectReturnCount}</div>
            </div>
          </div>

          {/* Document Categories Mini-Summary */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-[#111827] mb-2">
              <span>Document Vault Breakdown</span>
              <span className="text-[#6B7280] font-normal">{docStats.total} files</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {docStats.topCategories.length > 0 ? (
                docStats.topCategories.map(([cat, count]) => (
                  <span
                    key={cat}
                    className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700"
                  >
                    {cat}: <strong className="text-[#111827]">{count}</strong>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#6B7280]">No documents in current filter.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Director Action Tables (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Vendors by Spend */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#653ef1]" />
              <h3 className="text-sm font-semibold text-[#111827]">Top Vendors by Spend</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateView('expenses')}
              className="text-xs font-semibold text-[#653ef1] hover:underline cursor-pointer"
            >
              View Bills
            </button>
          </div>

          {topVendors.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-6 text-center">No vendor expenses recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topVendors.map((v, idx) => (
                <div key={v.name} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-[#653ef1] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111827] truncate">{v.name}</div>
                      <div className="text-[11px] text-[#6B7280]">{v.count} bills</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#111827]">₹{formatINR(v.total)}</div>
                    {v.pending > 0 && (
                      <div className="text-[10px] font-semibold text-amber-600">
                        Due: ₹{formatINR(v.pending)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending / Unpaid Bills */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-[#111827]">Pending & Reimbursable Bills</h3>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              ₹{formatINR(expenseStats.unpaidTotal)} Due
            </span>
          </div>

          {pendingBills.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-700 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              All filtered bills are settled!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingBills.map((bill) => (
                <div key={bill.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#111827] truncate">{bill.title}</div>
                    <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[#653ef1]">{bill.expense_code}</span>
                      <span>•</span>
                      <span>{formatMumbaiDate(bill.expense_date)}</span>
                      {bill.vendor_name && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{bill.vendor_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#111827]">₹{formatINR(bill.amount)}</div>
                    <span className="text-[10px] font-semibold uppercase text-amber-700">
                      {bill.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock & Depleted Material Alerts & Schedule Risks & Recent Documents hidden per user request */}
      </div>
    </div>
  );
};
