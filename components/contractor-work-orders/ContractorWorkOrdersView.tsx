'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Building2,
  TrendingUp,
  HandCoins,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  Barcode as BarcodeIcon,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { ContractorWorkOrder, WorkDateFilterPreset, WORK_TRADE_CATEGORIES } from '@/lib/contractor-work-orders/types';
import {
  fetchProjectWorkOrders,
  createWorkOrder,
  addExtraWorkRevision,
  recordWorkOrderPayment,
  deleteWorkOrder,
} from '@/lib/contractor-work-orders/work-order-services';
import { formatINR, downloadWorkOrderPdf, viewWorkOrderPdfInNewTab } from '@/lib/contractor-work-orders/work-order-invoice-pdf';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import { AddExtraWorkModal } from './AddExtraWorkModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { WorkOrderDetailDrawer } from './WorkOrderDetailDrawer';
import { resolveActiveSite } from '@/lib/supabase/site-storage';
import { ProjectInfo } from '@/lib/construction-planning/types';

interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
}

interface ContractorWorkOrdersViewProps {
  project?: ProjectInfo;
  projectId?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const ContractorWorkOrdersView: React.FC<ContractorWorkOrdersViewProps> = ({
  project: initialProject,
  projectId: initialProjectId,
  showToast,
}) => {
  // Active Project State (Default to currently selected site/project)
  const [activeProject, setActiveProject] = useState<ProjectOption | null>(initialProject || null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const effectiveProjectId = activeProject?.id || initialProjectId || 'f0e510da-9530-468f-bb09-59920070d55e';
  const effectiveProjectName = activeProject?.name || initialProject?.name || 'Noori Crest Tower';
  const effectiveProjectCode = activeProject?.code || initialProject?.code || 'NC-2026';

  // Work Orders State
  const [workOrders, setWorkOrders] = useState<ContractorWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<WorkDateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderForExtra, setSelectedOrderForExtra] = useState<ContractorWorkOrder | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<ContractorWorkOrder | null>(null);
  const [drawerOrder, setDrawerOrder] = useState<ContractorWorkOrder | null>(null);

  // Load project context if not passed
  useEffect(() => {
    async function loadSites() {
      try {
        const { activeProject: site, allProjects } = await resolveActiveSite();
        if (site && !initialProject) {
          setActiveProject(site);
        }
        if (allProjects && allProjects.length > 0) {
          setAvailableProjects(allProjects);
        }
      } catch (err) {
        console.warn('Could not resolve active site:', err);
      }
    }
    loadSites();
  }, [initialProject]);

  // Load Work Orders from Supabase / Local storage
  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await fetchProjectWorkOrders(effectiveProjectId);
      setWorkOrders(orders);
    } catch (err) {
      console.error('Error fetching work orders:', err);
      showToast?.('Failed to load work orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveProjectId) {
      loadOrders();
    }
  }, [effectiveProjectId]);

  // Handle Switch Project
  const handleSwitchProject = (newId: string) => {
    const found = availableProjects.find((p) => p.id === newId);
    if (found) {
      setActiveProject(found);
    }
  };

  // Helper date calculators (initialized in useEffect to ensure stable SSR prerender)
  const [todayStr, setTodayStr] = useState('');
  const [yesterdayStr, setYesterdayStr] = useState('');
  const [weekStartStr, setWeekStartStr] = useState('');
  const [monthStartStr, setMonthStartStr] = useState('');

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setTodayStr(today);

    const y = new Date();
    y.setDate(y.getDate() - 1);
    setYesterdayStr(y.toISOString().split('T')[0]);

    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    setWeekStartStr(mon.toISOString().split('T')[0]);

    setMonthStartStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  }, []);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      // 1. Text Search (title, vendorName, workOrderNumber, scopeDescription, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = order.title.toLowerCase().includes(q);
        const matchVendor = order.vendorName.toLowerCase().includes(q);
        const matchNo = order.workOrderNumber.toLowerCase().includes(q);
        const matchScope = (order.scopeDescription || '').toLowerCase().includes(q);
        const matchPhone = (order.vendorPhone || '').toLowerCase().includes(q);
        if (!matchTitle && !matchVendor && !matchNo && !matchScope && !matchPhone) {
          return false;
        }
      }

      // 2. Trade Category Filter
      if (tradeFilter !== 'all' && order.tradeCategory !== tradeFilter) {
        return false;
      }

      // 3. Payment Status Filter
      if (statusFilter === 'paid') {
        if (order.balanceRemaining > 0) return false;
      } else if (statusFilter === 'partial') {
        if (order.totalPaid === 0 || order.balanceRemaining <= 0) return false;
      } else if (statusFilter === 'unpaid') {
        if (order.totalPaid > 0) return false;
      }

      // 4. Date Filter (matches start_date OR revisions date OR payments date)
      if (datePreset === 'today') {
        const hasActionToday =
          order.startDate === todayStr ||
          order.revisions?.some((r) => r.revisionDate === todayStr) ||
          order.payments?.some((p) => p.paymentDate === todayStr);
        if (!hasActionToday) return false;
      } else if (datePreset === 'yesterday') {
        const hasActionYesterday =
          order.startDate === yesterdayStr ||
          order.revisions?.some((r) => r.revisionDate === yesterdayStr) ||
          order.payments?.some((p) => p.paymentDate === yesterdayStr);
        if (!hasActionYesterday) return false;
      } else if (datePreset === 'this_week') {
        const inWeek =
          order.startDate >= weekStartStr ||
          order.revisions?.some((r) => r.revisionDate >= weekStartStr) ||
          order.payments?.some((p) => p.paymentDate >= weekStartStr);
        if (!inWeek) return false;
      } else if (datePreset === 'this_month') {
        const inMonth =
          order.startDate >= monthStartStr ||
          order.revisions?.some((r) => r.revisionDate >= monthStartStr) ||
          order.payments?.some((p) => p.paymentDate >= monthStartStr);
        if (!inMonth) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate && customEndDate) {
          const inRange =
            (order.startDate >= customStartDate && order.startDate <= customEndDate) ||
            order.revisions?.some((r) => r.revisionDate >= customStartDate && r.revisionDate <= customEndDate) ||
            order.payments?.some((p) => p.paymentDate >= customStartDate && p.paymentDate <= customEndDate);
          if (!inRange) return false;
        }
      }

      return true;
    });
  }, [workOrders, searchQuery, tradeFilter, statusFilter, datePreset, customStartDate, customEndDate, todayStr, yesterdayStr, weekStartStr, monthStartStr]);

  // Overall and Today/Yesterday KPI Calculations
  const stats = useMemo(() => {
    let totalInitial = 0;
    let totalExtra = 0;
    let totalRevised = 0;
    let totalPaidAll = 0;
    let totalRemaining = 0;

    let paidToday = 0;
    let paidYesterday = 0;

    workOrders.forEach((o) => {
      totalInitial += o.initialAmount;
      totalExtra += o.extraAmount;
      totalRevised += o.totalRevisedAmount;
      totalPaidAll += o.totalPaid;
      totalRemaining += o.balanceRemaining;

      o.payments?.forEach((p) => {
        if (p.paymentDate === todayStr) paidToday += p.amountPaid;
        if (p.paymentDate === yesterdayStr) paidYesterday += p.amountPaid;
      });
    });

    return {
      count: workOrders.length,
      totalInitial,
      totalExtra,
      totalRevised,
      totalPaidAll,
      totalRemaining,
      paidToday,
      paidYesterday,
    };
  }, [workOrders, todayStr, yesterdayStr]);

  // Handlers for Modals
  const handleCreateSave = async (orderData: any) => {
    const created = await createWorkOrder(orderData, effectiveProjectId);
    setWorkOrders((prev) => [created, ...prev]);
  };

  const handleAddExtraSave = async (workOrderId: string, data: any) => {
    const { order: updated } = await addExtraWorkRevision(workOrderId, effectiveProjectId, data);
    setWorkOrders((prev) => prev.map((o) => (o.id === workOrderId ? updated : o)));
    if (drawerOrder?.id === workOrderId) {
      setDrawerOrder(updated);
    }
  };

  const handleRecordPaymentSave = async (workOrderId: string, data: any) => {
    const { order: updated } = await recordWorkOrderPayment(workOrderId, effectiveProjectId, data);
    setWorkOrders((prev) => prev.map((o) => (o.id === workOrderId ? updated : o)));
    if (drawerOrder?.id === workOrderId) {
      setDrawerOrder(updated);
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* 1. Top Section Title & Site Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Contractor Work Orders & Khata
              </h1>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                Commercial Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Work done contracts, variation orders / extra work with notes history, payouts and barcode invoices.
            </p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Site Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-slate-500 hidden sm:inline">Project:</span>
            {availableProjects.length > 1 ? (
              <select
                value={effectiveProjectId}
                onChange={(e) => handleSwitchProject(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-slate-900 font-semibold">{effectiveProjectName}</strong>
            )}
          </div>

          <button
            type="button"
            onClick={loadOrders}
            title="Refresh Ledger"
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Daily Payouts KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Initial Deal */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Base Contracts</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900">{formatINR(stats.totalInitial)}</div>
          <p className="text-[10px] text-slate-500">{stats.count} Work Contracts</p>
        </div>

        {/* KPI 2: Extra Work Added */}
        <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-2xs space-y-1 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 text-xs">
            <span className="font-semibold">Extra Work Added (+)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-800">+{formatINR(stats.totalExtra)}</div>
          <p className="text-[10px] text-amber-600/80">Variation Orders / Scope Notes</p>
        </div>

        {/* KPI 3: Total Revised Contract Deal */}
        <div className="p-4 bg-white border border-purple-200 rounded-2xl shadow-2xs space-y-1 bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 text-xs">
            <span className="font-semibold">Total Revised Value</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-extrabold text-purple-900">{formatINR(stats.totalRevised)}</div>
          <p className="text-[10px] text-purple-600">Base Deal + All Extra Work</p>
        </div>

        {/* KPI 4: Given / Paid Out (With Today & Yesterday Highlights) */}
        <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-2xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 text-xs">
            <span className="font-semibold">Total Amount Given</span>
            <HandCoins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-800">{formatINR(stats.totalPaidAll)}</div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700">
            <span>Today: {formatINR(stats.paidToday)}</span>
            <span>•</span>
            <span>Y'day: {formatINR(stats.paidYesterday)}</span>
          </div>
        </div>

        {/* KPI 5: Balance Remaining to Give */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Remaining to Give</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className={`text-lg font-extrabold ${stats.totalRemaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
            {formatINR(stats.totalRemaining)}
          </div>
          <p className="text-[10px] text-slate-500">
            {stats.totalRemaining > 0 ? 'Outstanding Contractor Balances' : 'All Contracts Settled'}
          </p>
        </div>
      </div>

      {/* 3. Comprehensive Filter Bar (Date Presets, Search, Category, Status) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Contractor, Work Order #, Work Title, Area note..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Trade Filter */}
          <div className="sm:col-span-4">
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-600 bg-white text-slate-700"
            >
              <option value="all">All Trade Categories</option>
              {WORK_TRADE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-600 bg-white text-slate-700"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid (No payout yet)</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Fully Settled (0 Balance)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filter Presets (Today, Yesterday, Week, Month, Custom Range) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Date Filter:
            </span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Date Range' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id as WorkDateFilterPreset)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-purple-300 rounded-lg focus:outline-hidden focus:border-purple-600"
                placeholder="Start Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-purple-300 rounded-lg focus:outline-hidden focus:border-purple-600"
                placeholder="End Date"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Table / List of Work Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            Showing <span className="text-purple-700">{filteredOrders.length}</span> of {workOrders.length} Work Orders
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <BarcodeIcon className="w-3.5 h-3.5 text-purple-600" />
            <span>All certified invoices generate scannable barcodes</span>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Contractor Work Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || tradeFilter !== 'all' || datePreset !== 'all'
                ? 'Try adjusting your filters or date range.'
                : 'Click "New Work Order" above to register your first contractor contract and track extra work variations & payouts.'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Work Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">WO # & Barcode</th>
                  <th className="py-3 px-4">Work Title & Trade</th>
                  <th className="py-3 px-4">Contractor / Vendor</th>
                  <th className="py-3 px-4 text-right">Initial Deal</th>
                  <th className="py-3 px-4 text-right">Extra Work (+)</th>
                  <th className="py-3 px-4 text-right">Revised Total</th>
                  <th className="py-3 px-4 text-right">Given / Paid</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const hasExtra = order.extraAmount > 0;
                  const isSettled = order.balanceRemaining <= 0;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setDrawerOrder(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Work Order Number & Barcode */}
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{order.workOrderNumber}</span>
                          <span
                            title="Barcode enabled"
                            className="text-slate-400 group-hover:text-purple-600 transition-colors"
                          >
                            <BarcodeIcon className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <span className="text-[10px] font-normal text-slate-400 font-sans block">{order.startDate}</span>
                      </td>

                      {/* Work Title & Scope */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate" title={order.title}>
                          {order.title}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                            {order.tradeCategory}
                          </span>
                          {order.scopeDescription && (
                            <span className="truncate max-w-[120px]" title={order.scopeDescription}>
                              • {order.scopeDescription}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vendor Details */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{order.vendorName}</div>
                        {order.vendorPhone ? (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {order.vendorPhone}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No phone</div>
                        )}
                      </td>

                      {/* Initial Deal */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {formatINR(order.initialAmount)}
                      </td>

                      {/* Extra Work Added */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasExtra ? (
                          <div>
                            <span className="font-bold text-amber-700">+{formatINR(order.extraAmount)}</span>
                            <span className="block text-[9px] text-amber-600/80 font-medium">
                              {order.revisions?.length ? `${order.revisions.length} variation(s)` : 'extra'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Revised Total */}
                      <td className="py-3 px-4 text-right font-extrabold text-purple-900 whitespace-nowrap">
                        {formatINR(order.totalRevisedAmount)}
                      </td>

                      {/* Given / Paid */}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        {formatINR(order.totalPaid)}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {formatINR(order.balanceRemaining)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isSettled ? 'Settled' : 'In Progress'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Add Extra Work Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForExtra(order)}
                            title="Add Extra Work / Variation"
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Record Payment Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForPayment(order)}
                            title="Record Payout / Disbursement"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                          >
                            <HandCoins className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / Download PDF Invoice with Barcode */}
                          <button
                            type="button"
                            onClick={() =>
                              downloadWorkOrderPdf(order, {
                                projectName: effectiveProjectName,
                                projectCode: effectiveProjectCode,
                              })
                            }
                            title="Download Certified PDF Invoice (with Barcode)"
                            className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer border border-purple-200"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Detail Drawer */}
                          <button
                            type="button"
                            onClick={() => setDrawerOrder(order)}
                            title="View Full History"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modals and Drawers */}
      {isCreateOpen && (
        <CreateWorkOrderModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          projectName={effectiveProjectName}
          projectId={effectiveProjectId}
          existingCount={workOrders.length}
          onSave={handleCreateSave}
          showToast={showToast}
        />
      )}

      {selectedOrderForExtra && (
        <AddExtraWorkModal
          isOpen={Boolean(selectedOrderForExtra)}
          onClose={() => setSelectedOrderForExtra(null)}
          workOrder={selectedOrderForExtra}
          onSaveRevision={handleAddExtraSave}
          showToast={showToast}
        />
      )}

      {selectedOrderForPayment && (
        <RecordPaymentModal
          isOpen={Boolean(selectedOrderForPayment)}
          onClose={() => setSelectedOrderForPayment(null)}
          workOrder={selectedOrderForPayment}
          onSavePayment={handleRecordPaymentSave}
          showToast={showToast}
        />
      )}

      {drawerOrder && (
        <WorkOrderDetailDrawer
          isOpen={Boolean(drawerOrder)}
          onClose={() => setDrawerOrder(null)}
          workOrder={drawerOrder}
          projectName={effectiveProjectName}
          projectCode={effectiveProjectCode || 'NC-2026'}
          onOpenAddExtra={(o: ContractorWorkOrder) => {
            setSelectedOrderForExtra(o);
          }}
          onOpenRecordPayment={(o: ContractorWorkOrder) => {
            setSelectedOrderForPayment(o);
          }}
        />
      )}
    </div>
  );
};

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
