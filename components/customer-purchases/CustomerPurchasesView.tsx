'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  DollarSign,
  Receipt,
  Tag,
  Calendar,
  User,
  Phone,
  FileText,
  Printer,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { ProjectInfo } from '@/lib/construction-planning/types';
import { DbProject } from '@/lib/supabase/types';
import { CustomerPurchase, CustomerPayment, DEFAULT_PURCHASE_TYPES } from '@/lib/customer-purchases/types';
import {
  fetchCustomerPurchases,
  deleteCustomerPurchase,
  fetchCategoryOptions,
} from '@/lib/customer-purchases/purchase-services';
import {
  viewPurchaseStatementPdfInNewTab,
  downloadPurchaseStatementPdf,
} from '@/lib/customer-purchases/purchase-invoice-pdf';
import { formatMumbaiDateTime } from '@/lib/common/date-format';
import { CreatePurchaseModal } from './CreatePurchaseModal';
import { RecordCustomerPaymentModal } from './RecordCustomerPaymentModal';
import { PurchaseDetailDrawer } from './PurchaseDetailDrawer';

interface CustomerPurchasesViewProps {
  project?: ProjectInfo;
  projectId?: string;
  allProjects?: DbProject[];
  userEmail?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CustomerPurchasesView: React.FC<CustomerPurchasesViewProps> = ({
  project,
  projectId = '',
  allProjects = [],
  userEmail,
  showToast,
}) => {
  // Purchases list state
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters: default site is 'all' as requested
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all | full | partial | unpaid
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic purchase types for filter
  const [purchaseTypes, setPurchaseTypes] = useState<string[]>([...DEFAULT_PURCHASE_TYPES]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [activePurchaseForPayment, setActivePurchaseForPayment] = useState<CustomerPurchase | null>(null);
  const [activePurchaseForDrawer, setActivePurchaseForDrawer] = useState<CustomerPurchase | null>(null);

  // Load purchases
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomerPurchases('all');
      setPurchases(data);

      const customTypes = await fetchCategoryOptions('customer_purchase_types', DEFAULT_PURCHASE_TYPES);
      setPurchaseTypes(customTypes);
    } catch (err: any) {
      console.error('Error loading customer purchases:', err);
      showToast?.('Failed to load purchases from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((item) => {
      // 1. Site Filter
      if (siteFilter !== 'all') {
        if (item.project_id !== siteFilter) return false;
      }

      // 2. Category / Purchase Type Filter
      if (categoryFilter !== 'all') {
        if (item.purchase_type !== categoryFilter) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all') {
        const total = item.total_amount || 0;
        const collected = item.totalCollected || 0;
        if (statusFilter === 'full' && collected < total) return false;
        if (statusFilter === 'partial' && (collected <= 0 || collected >= total)) return false;
        if (statusFilter === 'unpaid' && collected > 0) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.customer_name?.toLowerCase().includes(q);
        const matchesDealNo = item.deal_number?.toLowerCase().includes(q);
        const matchesUnit = item.unit_number?.toLowerCase().includes(q);
        const matchesType = item.purchase_type?.toLowerCase().includes(q);
        const matchesPhone = item.customer_phone?.toLowerCase().includes(q);
        const matchesSite = item.project?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesDealNo && !matchesUnit && !matchesType && !matchesPhone && !matchesSite) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || a.booking_date || 0).getTime();
      const timeB = new Date(b.created_at || b.booking_date || 0).getTime();
      return timeB - timeA;
    });
  }, [purchases, siteFilter, categoryFilter, statusFilter, searchQuery]);

  // Financial KPIs
  const kpiStats = useMemo(() => {
    let totalDealValue = 0;
    let totalCollected = 0;
    let totalBalance = 0;

    filteredPurchases.forEach((p) => {
      const deal = p.total_amount || 0;
      const coll = p.totalCollected || 0;
      totalDealValue += deal;
      totalCollected += coll;
      totalBalance += Math.max(0, deal - coll);
    });

    return {
      dealCount: filteredPurchases.length,
      totalDealValue,
      totalCollected,
      totalBalance,
      collectionRatio: totalDealValue > 0 ? Math.round((totalCollected / totalDealValue) * 100) : 0,
    };
  }, [filteredPurchases]);

  // Handle new purchase created
  const handlePurchaseCreated = (newPurchase: CustomerPurchase) => {
    setPurchases((prev) => [newPurchase, ...prev]);
  };

  // Handle payment recorded
  const handlePaymentRecorded = (payment: CustomerPayment) => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id === payment.purchase_id) {
          const updatedPayments = [payment, ...(p.payments || [])];
          const newCollected = updatedPayments.reduce(
            (sum, pay) => sum + (Number(pay.amount_paid ?? pay.amountPaid ?? 0) || 0),
            0
          );
          const tot = Number(p.total_amount ?? p.totalAmount ?? 0);
          const updatedP: CustomerPurchase = {
            ...p,
            payments: updatedPayments,
            totalCollected: newCollected,
            balanceRemaining: Math.max(0, tot - newCollected),
          };
          if (activePurchaseForDrawer?.id === p.id) {
            setActivePurchaseForDrawer(updatedP);
          }
          return updatedP;
        }
        return p;
      })
    );
  };

  // Handle payment deleted
  const handlePaymentDeleted = (paymentId: string) => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.payments?.some((pay) => pay.id === paymentId)) {
          const updatedPayments = (p.payments || []).filter((pay) => pay.id !== paymentId);
          const newCollected = updatedPayments.reduce(
            (sum, pay) => sum + (Number(pay.amount_paid ?? pay.amountPaid ?? 0) || 0),
            0
          );
          const tot = Number(p.total_amount ?? p.totalAmount ?? 0);
          const updatedP: CustomerPurchase = {
            ...p,
            payments: updatedPayments,
            totalCollected: newCollected,
            balanceRemaining: Math.max(0, tot - newCollected),
          };
          if (activePurchaseForDrawer?.id === p.id) {
            setActivePurchaseForDrawer(updatedP);
          }
          return updatedP;
        }
        return p;
      })
    );
  };

  // Handle purchase deleted
  const handleDeletePurchase = async (purchase: CustomerPurchase) => {
    const ok = confirm(
      `Are you sure you want to delete purchase "${purchase.deal_number}" for ${purchase.customer_name}?\n\nThis will also remove associated payment records.`
    );
    if (!ok) return;

    try {
      await deleteCustomerPurchase(purchase.id);
      setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      if (activePurchaseForDrawer?.id === purchase.id) {
        setActivePurchaseForDrawer(null);
      }
      showToast?.(`Purchase ${purchase.deal_number} deleted`, 'info');
    } catch (err: any) {
      alert(`Failed to delete purchase: ${err.message}`);
    }
  };

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-150">
      
      {/* 1. Header Hero Card with Soft Aurora Wave & Title */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-300 relative group p-4 sm:p-5">
        
        {/* Soft Backdrop Ribbon */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/40 via-white to-emerald-50/30 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#653ef1] to-[#8b5cf6] flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
              <ArrowDownLeft className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Client Sales & Commercial Inward
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#6338eb] tracking-tight leading-none mt-0.5">
                Client Purchases & Inflow
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-md leading-snug">
                Manage room & unit bookings, track customer collections, print scannable barcode slips & commercial statements.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
              title="Refresh from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 px-5 rounded-full bg-gradient-to-r from-[#7b46f8] via-[#6338eb] to-[#5a24ea] hover:from-[#8855fa] hover:to-[#501fe0] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(99,56,235,0.35)] hover:shadow-[0_6px_22px_rgba(99,56,235,0.5)] cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.4]" />
              <span>+ New Customer Purchase</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Four Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Deal Value */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Sales Value</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#653ef1] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">
              Rs. {kpiStats.totalDealValue.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {kpiStats.dealCount} client purchase deal{kpiStats.dealCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Metric 2: Total Realized Inflow */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Total Inflow Collected</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
              Rs. {kpiStats.totalCollected.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            {kpiStats.collectionRatio}% realized into site bank
          </p>
        </div>

        {/* Metric 3: Pending Balance Due */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white via-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Pending Balance Due</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-amber-700">
              Rs. {kpiStats.totalBalance.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-amber-600 mt-1">
            Awaiting customer installments
          </p>
        </div>

        {/* Metric 4: Bookings Count */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Bookings</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">
              {kpiStats.dealCount} Units
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Properties & rooms booked
          </p>
        </div>
      </div>

      {/* 3. Filters & Search Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer, deal #, unit, site or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#653ef1] focus:border-[#653ef1]"
          />
        </div>

        {/* Right: Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Site Selector Dropdown - Defaults to All */}
          <div className="relative">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] cursor-pointer appearance-none"
            >
              <option value="all">🏢 All Construction Sites (All Purchases)</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Building2 className="w-3.5 h-3.5 text-[#653ef1] absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Category / Purchase Type Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] cursor-pointer appearance-none"
            >
              <option value="all">All Purchase Types</option>
              {purchaseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Payment Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#653ef1] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid (Rs. 0 collected)</option>
              <option value="partial">Partially Paid</option>
              <option value="full">Fully Paid (Cleared)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Table / List Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading customer purchases from database...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#653ef1] mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No client purchases found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || siteFilter !== 'all' || categoryFilter !== 'all'
                ? 'No purchases match your selected filters. Try clearing search or choosing All Sites.'
                : 'Click "+ New Customer Purchase" above to book the first room, flat, or commercial space.'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#653ef1] hover:bg-[#522fd1] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add First Purchase</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Deal # & Date</th>
                  <th className="py-3 px-4">Site / Building</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Category & Unit</th>
                  <th className="py-3 px-4 text-right">Total Deal</th>
                  <th className="py-3 px-4 text-right">Collected</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPurchases.map((item) => {
                  const deal = item.total_amount || 0;
                  const coll = item.totalCollected || 0;
                  const bal = Math.max(0, deal - coll);
                  const isPaid = coll >= deal && deal > 0;
                  const isPartial = coll > 0 && coll < deal;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setActivePurchaseForDrawer(item)}
                    >
                      {/* Deal # & Date */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold text-[#653ef1] block">
                            {item.deal_number}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5" title="Created / Booking Date (Mumbai 12-hr IST)">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatMumbaiDateTime(item.created_at || item.booking_date)}</span>
                          </span>
                        </div>
                      </td>

                      {/* Site / Building Tag */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f5f1fe] text-[#6338eb] border border-[#e5dcff]">
                          <Building2 className="w-3 h-3 text-[#6338eb]" />
                          <span>{item.project?.name || 'General / All Sites'}</span>
                        </span>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <strong className="text-xs font-bold text-slate-900 block group-hover:text-[#653ef1] transition-colors">
                            {item.customer_name}
                          </strong>
                          {item.customer_phone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {item.customer_phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            {item.purchase_type}
                          </span>
                          <span className="text-[11px] font-medium text-slate-700 block">
                            Unit: <strong className="font-semibold">{item.unit_number || 'General'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Total Deal */}
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        Rs. {deal.toLocaleString('en-IN')}
                      </td>

                      {/* Collected */}
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        Rs. {coll.toLocaleString('en-IN')}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                        Rs. {bal.toLocaleString('en-IN')}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Unpaid
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Collect Money Button */}
                          <button
                            type="button"
                            onClick={() => setActivePurchaseForPayment(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="Record new payment & print receipt slip"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Collect</span>
                          </button>

                          {/* Print Commercial Statement */}
                          <button
                            type="button"
                            onClick={() =>
                              viewPurchaseStatementPdfInNewTab(item, item.project?.name || project?.name || 'Site Office')
                            }
                            className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#653ef1] transition-all cursor-pointer"
                            title="Preview Commercial Bill Statement (with Barcode)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Statement */}
                          <button
                            type="button"
                            onClick={() =>
                              downloadPurchaseStatementPdf(item, item.project?.name || project?.name || 'Site Office')
                            }
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                            title="Download Statement PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeletePurchase(item)}
                            className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition-all cursor-pointer"
                            title="Delete this purchase deal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Purchase Modal */}
      <CreatePurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        availableProjects={allProjects}
        defaultProjectId={siteFilter !== 'all' ? siteFilter : projectId || allProjects[0]?.id || ''}
        userEmail={userEmail}
        onPurchaseCreated={handlePurchaseCreated}
        showToast={showToast}
      />

      {/* Record Payment Modal */}
      <RecordCustomerPaymentModal
        isOpen={Boolean(activePurchaseForPayment)}
        onClose={() => setActivePurchaseForPayment(null)}
        purchase={activePurchaseForPayment}
        projectName={activePurchaseForPayment?.project?.name || project?.name}
        userEmail={userEmail}
        onPaymentRecorded={handlePaymentRecorded}
        showToast={showToast}
      />

      {/* Purchase Detail Slide-over Drawer */}
      <PurchaseDetailDrawer
        isOpen={Boolean(activePurchaseForDrawer)}
        onClose={() => setActivePurchaseForDrawer(null)}
        purchase={activePurchaseForDrawer}
        projectName={activePurchaseForDrawer?.project?.name || project?.name}
        onRecordPaymentClick={(p) => setActivePurchaseForPayment(p)}
        onPaymentDeleted={handlePaymentDeleted}
        showToast={showToast}
      />

    </div>
  );
};
