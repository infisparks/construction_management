'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  Eye,
  MoreVertical,
  Paperclip,
  Check,
  ChevronDown,
  Lock,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  SubcontractorBill, 
  ProjectInfo, 
  Party, 
  ConstructionTask 
} from '@/lib/construction-planning/types';
import { 
  downloadSubcontractorBillPdf, 
  viewSubcontractorBillPdfInNewTab,
  getSubcontractorBillPdfBlobUrl
} from '@/lib/construction-planning/subcontractor-bill-pdf';
import { SubcontractorBillDialog } from './SubcontractorBillDialog';
import { BillSuccessPdfModal } from './BillSuccessPdfModal';
import { PdfViewerDialog } from './PdfViewerDialog';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';
import { useAuth } from '@/lib/supabase/auth-context';
import { isAdminUser } from '@/lib/auth/role-access';
import { updateSubcontractorBillStatus } from '@/lib/supabase/subcontractor-bill-services';

interface SubcontractorBillsViewProps {
  bills: SubcontractorBill[];
  project: ProjectInfo;
  parties: Party[];
  tasks: ConstructionTask[];
  onSaveBill: (bill: SubcontractorBill) => void;
  onDeleteBill: (billId: string) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  userEmail?: string;
  userRole?: string;
}

export const SubcontractorBillsView: React.FC<SubcontractorBillsViewProps> = ({
  bills,
  project,
  parties,
  tasks,
  onSaveBill,
  onDeleteBill,
  showToast,
  userEmail,
  userRole,
}) => {
  // Authentication & Admin Check
  const auth = useAuth();
  const effectiveRole = userRole || auth?.userRole?.role || '';
  const effectiveEmail = userEmail || auth?.user?.email || '';
  const isAdmin = isAdminUser(effectiveRole, effectiveEmail);

  // Status dropdown & updating state
  const [statusMenuBillId, setStatusMenuBillId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  // Modals & Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<SubcontractorBill | null>(null);

  // Success Modal
  const [justSavedBill, setJustSavedBill] = useState<SubcontractorBill | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // PDF Viewer Modal
  const [activeViewerBill, setActiveViewerBill] = useState<SubcontractorBill | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesDate = matchesDateFilter(b.billDate, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bills, searchQuery, statusFilter, dateFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = bills.length;
    const grossBilled = bills.reduce((sum, b) => sum + (b.itemSubtotal || 0), 0);
    const totalRetention = bills.reduce((sum, b) => sum + (b.preTaxRetentionTotal || 0), 0);
    const totalDeductions = bills.reduce((sum, b) => sum + (b.preTaxDeductionTotal || 0), 0);
    const netPayable = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    return { totalCount, grossBilled, totalRetention, totalDeductions, netPayable };
  }, [bills]);

  // Handle Bill Saved
  const handleSaveBillComplete = (savedBill: SubcontractorBill) => {
    onSaveBill(savedBill);
    setIsCreateDialogOpen(false);
    setBillToEdit(null);
    setJustSavedBill(savedBill);
    setIsSuccessModalOpen(true);
    showToast?.(`Subcontractor Bill ${savedBill.billNumber} saved successfully!`, 'success');
  };

  // Open PDF Viewer Dialog
  const handleOpenPdfViewer = (bill: SubcontractorBill) => {
    const { blobUrl } = getSubcontractorBillPdfBlobUrl(bill, project);
    setActiveViewerBill(bill);
    setViewerBlobUrl(blobUrl);
    setIsViewerModalOpen(true);
  };

  // Direct View in New Tab (Blob URL)
  const handleViewInNewTab = (bill: SubcontractorBill) => {
    viewSubcontractorBillPdfInNewTab(bill, project);
    showToast?.(`Opened PDF blob for ${bill.billNumber} in new tab`, 'info');
  };

  // Direct Download
  const handleDownloadPdf = (bill: SubcontractorBill) => {
    downloadSubcontractorBillPdf(bill, project);
    showToast?.(`Downloading ${bill.billNumber}.pdf`, 'success');
  };

  // Status Options configuration
  const STATUS_OPTIONS: {
    status: SubcontractorBill['status'];
    label: string;
    description: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      status: 'draft',
      label: 'Draft',
      description: 'Work in progress, measurements pending certification',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Clock,
    },
    {
      status: 'submitted',
      label: 'Submitted',
      description: 'Submitted by contractor, pending review & signoff',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Clock,
    },
    {
      status: 'approved',
      label: 'Approved',
      description: 'Verified & certified by Site Admin / Lead PM',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Check,
    },
    {
      status: 'paid',
      label: 'Paid',
      description: 'Payment released & settled via accounts',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    },
    {
      status: 'partial',
      label: 'Partial',
      description: 'Partially settled milestone / interim payment',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
  ];

  // Handle live status modification (Admin restricted)
  const handleUpdateStatus = async (
    bill: SubcontractorBill,
    newStatus: SubcontractorBill['status']
  ) => {
    if (!isAdmin) {
      showToast?.('Access Restricted: Only Admin login can change bill status.', 'error');
      return;
    }
    if (bill.status === newStatus) {
      setStatusMenuBillId(null);
      return;
    }

    setIsUpdatingStatusId(bill.id);
    setStatusMenuBillId(null);

    // Optimistic UI update
    const updatedBill: SubcontractorBill = { ...bill, status: newStatus };
    onSaveBill(updatedBill);

    try {
      const res = await updateSubcontractorBillStatus(bill.id, newStatus);
      if (res) {
        showToast?.(
          `Bill ${bill.billNumber} status updated to "${newStatus.toUpperCase()}" (Admin)`,
          'success'
        );
      } else {
        showToast?.('Failed to update status in Supabase. Please retry.', 'error');
      }
    } catch (err) {
      console.error('Failed to update bill status:', err);
      showToast?.('Error updating bill status', 'error');
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const getStatusBadge = (status: SubcontractorBill['status'], showHoverRing = false) => {
    const ringClass = showHoverRing ? 'hover:ring-2 hover:ring-purple-300 transition-all' : '';
    switch (status) {
      case 'paid':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs ${ringClass}`}>
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'approved':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs ${ringClass}`}>
            <Check className="w-3 h-3" />
            Approved
          </span>
        );
      case 'submitted':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs ${ringClass}`}>
            <Clock className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'partial':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs ${ringClass}`}>
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs ${ringClass}`}>
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
    }
  };

  const renderStatusCell = (bill: SubcontractorBill) => {
    const isUpdating = isUpdatingStatusId === bill.id;

    if (!isAdmin) {
      return (
        <div
          onClick={() => showToast?.('Access Restricted: Only Admin login can change bill status.', 'error')}
          className="inline-flex items-center gap-1.5 cursor-not-allowed opacity-90 select-none"
          title="Only Admin login can change bill status"
        >
          {getStatusBadge(bill.status, false)}
          <Lock className="w-3 h-3 text-slate-400" />
        </div>
      );
    }

    // Color classes matching status for admin select badge
    const getSelectBg = (status: SubcontractorBill['status']) => {
      switch (status) {
        case 'paid':
          return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80 focus:border-emerald-500';
        case 'approved':
          return 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100/80 focus:border-indigo-500';
        case 'submitted':
          return 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100/80 focus:border-purple-500';
        case 'partial':
          return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80 focus:border-amber-500';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/80 focus:border-slate-500';
      }
    };

    return (
      <div className="relative inline-flex items-center group">
        <select
          value={bill.status}
          disabled={isUpdating}
          onChange={(e) => handleUpdateStatus(bill, e.target.value as SubcontractorBill['status'])}
          className={`appearance-none cursor-pointer pl-3 pr-7 py-1 rounded-full text-[11px] font-bold border transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-400 font-sans tracking-wide ${getSelectBg(
            bill.status
          )}`}
          title="Admin: Click to change bill status"
        >
          <option value="draft">● Draft</option>
          <option value="submitted">● Submitted</option>
          <option value="approved">● Approved</option>
          <option value="paid">● Paid</option>
          <option value="partial">● Partial</option>
        </select>
        <div className="pointer-events-none absolute right-2 flex items-center">
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-purple-700 transition-colors" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Sub-Contractor Bills & RA Invoicing
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              Certified contractor measurements, pre-tax deductions (TDS/Royalty), retentions, and professional PDF generation.
            </p>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                Admin Session (Status Controls Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold">
                <Lock className="w-3 h-3 text-slate-400" />
                Status Change Restricted to Admin
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setBillToEdit(null);
            setIsCreateDialogOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Sub-Contractor Bill</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Gross Billed */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Gross Work Done
          </span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
            ₹ {metrics.grossBilled.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Across {metrics.totalCount} Subcontractor Bills
          </span>
        </div>

        {/* Card 2: Retentions Held */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-600 block uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Retentions Held
          </span>
          <div className="text-base sm:text-lg font-bold text-purple-700 mt-1 font-mono">
            ₹ {metrics.totalRetention.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Performance & Security deposits
          </span>
        </div>

        {/* Card 3: Deductions / TDS */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            Deductions & TDS
          </span>
          <div className="text-base sm:text-lg font-bold text-rose-600 mt-1 font-mono">
            ₹ {metrics.totalDeductions.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Statutory recoveries & royalties
          </span>
        </div>

        {/* Card 4: Net Payable */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-purple-200 bg-purple-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 block uppercase tracking-wider">
            Total Net Payable
          </span>
          <div className="text-base sm:text-lg font-extrabold text-purple-900 mt-1 font-mono">
            ₹ {metrics.netPayable.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">
            Certified for payment
          </span>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor, bill #, or work description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Filters Group: Date Filter + Status Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Universal Date Filter: Range + Particular Date */}
          <DateFilterControl
            value={dateFilter}
            onChange={setDateFilter}
            label="Bill Date"
          />

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'submitted', 'approved', 'paid', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {(searchQuery || isDateFilterActive(dateFilter) || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFilter(DEFAULT_DATE_FILTER);
                setStatusFilter('all');
              }}
              className="text-xs text-purple-700 hover:underline px-1.5 py-1 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View & Mobile Cards View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Sub-Contractor</th>
                <th className="py-3 px-3">Bill Ref & Date</th>
                <th className="py-3 px-3">Work Scope</th>
                <th className="py-3 px-3 text-right">Gross Subtotal</th>
                <th className="py-3 px-3 text-right">Deduction / Ret.</th>
                <th className="py-3 px-3 text-right">Net Payable</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">PDF & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No Sub-Contractor Bills found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Subcontractor / Vendor with Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {bill.vendorName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {bill.vendorName}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {bill.vendorTrade || 'Civil Subcontractor'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Bill Ref & Date */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                        {bill.billNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {bill.billDate}
                      </span>
                    </td>

                    {/* Items / Work Scope */}
                    <td className="py-3 px-3">
                      <div className="max-w-[180px]">
                        <span className="font-medium text-slate-800 block truncate">
                          {bill.items[0]?.name || 'Site Work'}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {bill.items.length > 1
                            ? `+ ${bill.items.length - 1} more items`
                            : `${bill.items[0]?.quantity || 0} ${bill.items[0]?.unit || 'sqm'}`}
                        </span>
                      </div>
                    </td>

                    {/* Gross Subtotal */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      ₹ {Number(bill.itemSubtotal || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Deductions & Retentions */}
                    <td className="py-3 px-3 text-right">
                      <div className="text-[11px] font-mono space-y-0.5">
                        {bill.preTaxRetentionTotal > 0 && (
                          <span className="text-purple-600 block">
                            Ret: ₹{Number(bill.preTaxRetentionTotal).toLocaleString('en-IN')}
                          </span>
                        )}
                        {bill.preTaxDeductionTotal > 0 && (
                          <span className="text-rose-600 block">
                            Ded: ₹{Number(bill.preTaxDeductionTotal).toLocaleString('en-IN')}
                          </span>
                        )}
                        {bill.preTaxRetentionTotal === 0 && bill.preTaxDeductionTotal === 0 && (
                          <span className="text-slate-400">None</span>
                        )}
                      </div>
                    </td>

                    {/* Net Payable */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                      ₹ {Number(bill.grandTotal || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {renderStatusCell(bill)}
                    </td>

                    {/* Professional PDF Actions: View PDF (blob) & Download PDF */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* View PDF (Blob URL) */}
                        <button
                          type="button"
                          onClick={() => handleOpenPdfViewer(bill)}
                          className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
                          title="View PDF (Blob URL Preview)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Open in New Tab directly */}
                        <button
                          type="button"
                          onClick={() => handleViewInNewTab(bill)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                          title="Open PDF Blob in New Tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(bill)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Edit Bill */}
                        <button
                          type="button"
                          onClick={() => {
                            setBillToEdit(bill);
                            setIsCreateDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Bill"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Bill */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete bill ${bill.billNumber}?`)) {
                              onDeleteBill(bill.id);
                              showToast?.(`Bill ${bill.billNumber} deleted`, 'info');
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (as specified in rule 7: Tables become cards on mobile) */}
        <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {filteredBills.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No Sub-Contractor Bills found.
            </div>
          ) : (
            filteredBills.map((bill) => (
              <div key={bill.id} className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {bill.vendorName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        {bill.vendorName}
                      </span>
                      <span className="text-[11px] text-purple-700 font-mono font-bold">
                        {bill.billNumber}
                      </span>
                    </div>
                  </div>
                  <div>
                    {renderStatusCell(bill)}
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">{bill.billDate}</span>
                  <span className="font-medium truncate max-w-[150px]">
                    {bill.items[0]?.name || 'Work item'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <span className="font-bold text-slate-700">Net Payable:</span>
                  <span className="font-mono font-extrabold text-purple-700 text-sm">
                    ₹ {Number(bill.grandTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* PDF Actions Toolbar for Mobile */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleOpenPdfViewer(bill)}
                    className="py-1.5 px-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(bill)}
                    className="py-1.5 px-2 bg-purple-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Dialog for Creating or Editing Subcontractor Bill */}
      <SubcontractorBillDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setBillToEdit(null);
        }}
        onSave={handleSaveBillComplete}
        billToEdit={billToEdit}
        parties={parties}
        allTasks={tasks}
        isAdmin={isAdmin}
      />

      {/* Bill Success Modal with Download / View PDF options */}
      <BillSuccessPdfModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        bill={justSavedBill}
        project={project}
        onViewBlobUrl={(b) => handleOpenPdfViewer(b)}
        onCreateAnother={() => {
          setIsSuccessModalOpen(false);
          setBillToEdit(null);
          setIsCreateDialogOpen(true);
        }}
      />

      {/* PDF Blob Viewer Dialog */}
      <PdfViewerDialog
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        blobUrl={viewerBlobUrl}
        bill={activeViewerBill}
        project={project}
      />

    </div>
  );
};
