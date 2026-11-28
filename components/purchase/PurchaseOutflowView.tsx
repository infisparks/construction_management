'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  FileText,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Eye,
  Trash2,
  Award,
  RefreshCw,
  AlertCircle,
  X,
  ClipboardCheck,
  UserCheck,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { DbProject } from '@/lib/supabase/types';
import {
  PurchaseQuotationInquiry,
  VendorQuotationItem,
  PurchaseRequisition,
  ApprovalStage,
  fetchPurchaseQuotations,
  createPurchaseQuotation,
  updatePurchaseQuotationItems,
  softDeletePurchaseQuotation,
  fetchPurchaseRequisitions,
  fetchDeletedPurchaseRequisitions,
  restorePurchaseRequisition,
  createPurchaseRequisition,
  updatePurchaseRequisition,
  processRequisitionApproval,
  softDeletePurchaseRequisition,
  uploadPurchaseQuotationFile,
} from '@/lib/supabase/purchase-outflow-services';
import { isAccountRole, isAdminUser, isPurchaseRole } from '@/lib/auth/role-access';
import { BillDocumentViewerModal, BillViewerAttachment } from '@/components/inventory/InventoryBillViewerModal';
import { formatMumbaiDate } from '@/lib/common/date-format';

interface PurchaseOutflowViewProps {
  projectId?: string;
  allProjects?: DbProject[];
  userEmail?: string;
  userRole?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type PurchaseTab = 'quotations' | 'requisitions';

interface DraftQuoteRow {
  id: string;
  vendor_name: string;
  quoted_amount: string;
  notes: string;
  file: File | null;
}

function formatINR(val: number): string {
  return Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const STAGE_LABEL: Record<ApprovalStage, string> = {
  pending_purchase: 'Pending Purchase Approval',
  pending_director: 'Pending Director Approval',
  pending_accounts: 'Pending Accounts Approval',
  approved: 'Fully Approved',
  rejected: 'Rejected',
};

export const PurchaseOutflowView: React.FC<PurchaseOutflowViewProps> = ({
  projectId,
  allProjects = [],
  userEmail,
  userRole,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<PurchaseTab>('quotations');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [insideQuoteSearch, setInsideQuoteSearch] = useState('');

  // Quotations State
  const [inquiries, setInquiries] = useState<PurchaseQuotationInquiry[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [quoteSetupError, setQuoteSetupError] = useState<string | null>(null);

  // Requisitions State
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [deletedRequisitions, setDeletedRequisitions] = useState<PurchaseRequisition[]>([]);
  const [reqViewTab, setReqViewTab] = useState<'active' | 'bin'>('active');
  const [isLoadingReqs, setIsLoadingReqs] = useState(true);
  const [reqSetupError, setReqSetupError] = useState<string | null>(null);
  const [deleteReqTarget, setDeleteReqTarget] = useState<PurchaseRequisition | null>(null);
  const [deleteReqConfirmText, setDeleteReqConfirmText] = useState('');
  const [isDeletingReq, setIsDeletingReq] = useState(false);

  // Viewer Modal
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    attachments: BillViewerAttachment[];
    initialIndex: number;
    voucherNumber?: string;
  }>({ isOpen: false, attachments: [], initialIndex: 0 });

  // New Inquiry Modal
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [inqSiteId, setInqSiteId] = useState<string>(projectId || '');
  const [inqHeading, setInqHeading] = useState('');
  const [inqDesc, setInqDesc] = useState('');
  const [draftQuotes, setDraftQuotes] = useState<DraftQuoteRow[]>([
    { id: '1', vendor_name: '', quoted_amount: '', notes: '', file: null },
    { id: '2', vendor_name: '', quoted_amount: '', notes: '', file: null },
  ]);
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);

  // Add Extra Quotation to Existing Inquiry Modal
  const [addQuoteTarget, setAddQuoteTarget] = useState<PurchaseQuotationInquiry | null>(null);
  const [extraVendorName, setExtraVendorName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [isAddingExtraQuote, setIsAddingExtraQuote] = useState(false);

  // New Requisition Modal (flexible JSONB table inside form_data)
  const DEFAULT_REQ_COLUMNS = [
    { key: 'product_name', label: 'Product Name', type: 'text' as const },
    { key: 'quantity', label: 'Quantity', type: 'number' as const },
    { key: 'amount', label: 'Amount (₹)', type: 'number' as const },
    { key: 'gst', label: 'GST (%)', type: 'number' as const },
  ];
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [reqSiteId, setReqSiteId] = useState<string>(projectId || '');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqColumns, setReqColumns] = useState<{ key: string; label: string; type: 'text' | 'number' }[]>(DEFAULT_REQ_COLUMNS);
  const [reqRows, setReqRows] = useState<Record<string, string>[]>([
    { product_name: '', quantity: '1', amount: '', gst: '0' },
  ]);
  const [viewingReqTable, setViewingReqTable] = useState<PurchaseRequisition | null>(null);
  const [editingReq, setEditingReq] = useState<PurchaseRequisition | null>(null);
  const [isSavingReq, setIsSavingReq] = useState(false);

  // Approval Action Modal
  const [approvalTarget, setApprovalTarget] = useState<{
    req: PurchaseRequisition;
    decision: 'approved' | 'rejected' | 'reverted' | 'undo_reject';
  } | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    allProjects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [allProjects]);

  const isAdmin = isAdminUser(userRole, userEmail);
  const isPurchase = isPurchaseRole(userRole);
  const isAccounts = isAccountRole(userRole);

  const canApproveStage = (stage: ApprovalStage): boolean => {
    if (stage === 'pending_purchase') return isPurchase || isAdmin;
    if (stage === 'pending_director') return isAdmin;
    if (stage === 'pending_accounts') return isAccounts;
    return false;
  };

  const loadAll = async () => {
    setIsLoadingQuotes(true);
    setIsLoadingReqs(true);
    const [qRes, rRes, deletedReqs] = await Promise.all([
      fetchPurchaseQuotations(siteFilter),
      fetchPurchaseRequisitions(siteFilter),
      fetchDeletedPurchaseRequisitions(),
    ]);
    setInquiries(qRes.data);
    setQuoteSetupError(qRes.error);
    setRequisitions(rRes.data);
    setDeletedRequisitions(deletedReqs);
    setReqSetupError(rRes.error);
    setIsLoadingQuotes(false);
    setIsLoadingReqs(false);
  };

  useEffect(() => {
    loadAll();
  }, [siteFilter]);

  const filteredInquiries = useMemo(() => {
    if (!searchQuery.trim()) return inquiries;
    const q = searchQuery.toLowerCase();
    return inquiries.filter(
      (inq) =>
        inq.heading.toLowerCase().includes(q) ||
        (inq.description || '').toLowerCase().includes(q) ||
        inq.inquiry_code.toLowerCase().includes(q) ||
        inq.quotations.some(
          (qt) =>
            (qt.heading || '').toLowerCase().includes(q) ||
            (qt.vendor_name || '').toLowerCase().includes(q) ||
            (qt.description || '').toLowerCase().includes(q) ||
            (qt.notes || '').toLowerCase().includes(q) ||
            (qt.file_name || '').toLowerCase().includes(q)
        )
    );
  }, [inquiries, searchQuery]);

  const filteredRequisitions = useMemo(() => {
    const source = reqViewTab === 'active' ? requisitions : deletedRequisitions;
    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.req_code.toLowerCase().includes(q) ||
        (r.submitted_by_email || '').toLowerCase().includes(q) ||
        JSON.stringify(r.form_data || {}).toLowerCase().includes(q)
    );
  }, [reqViewTab, requisitions, deletedRequisitions, searchQuery]);

  // Create New Quotation Inquiry Profile (Step 1: Heading + Description only)
  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqHeading.trim()) {
      showToast?.('Please enter a purchase heading.', 'error');
      return;
    }

    setIsSavingInquiry(true);
    try {
      const res = await createPurchaseQuotation({
        project_id: inqSiteId || null,
        heading: inqHeading,
        description: inqDesc,
        quotations: [],
        created_by_email: userEmail || null,
      });

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setInquiries((prev) => [res.data!, ...prev]);
        showToast?.('Inquiry profile created! Upload your quotations inside.', 'success');
        setIsNewInquiryOpen(false);
        setInqHeading('');
        setInqDesc('');
        setSelectedInquiryId(res.data.id);
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Failed to create inquiry profile.', 'error');
    } finally {
      setIsSavingInquiry(false);
    }
  };

  // Toggle Finalize (allows selecting 1 or 2 quotations)
  const handleToggleFinalize = async (inquiry: PurchaseQuotationInquiry, quotationId: string) => {
    const currentFinalizedCount = inquiry.quotations.filter((q) => q.is_finalized).length;
    const target = inquiry.quotations.find((q) => q.id === quotationId);
    if (!target) return;

    if (!target.is_finalized && currentFinalizedCount >= 2) {
      showToast?.('You can finalize up to 2 quotations per inquiry. Deselect one first.', 'info');
      return;
    }

    const updated = inquiry.quotations.map((q) =>
      q.id === quotationId
        ? {
            ...q,
            is_finalized: !q.is_finalized,
            finalized_by: !q.is_finalized ? userEmail || 'Admin' : null,
            finalized_at: !q.is_finalized ? new Date().toISOString() : null,
          }
        : q
    );

    const res = await updatePurchaseQuotationItems(inquiry.id, updated);
    if (res.error) {
      showToast?.(res.error, 'error');
    } else if (res.data) {
      setInquiries((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      const label = target.heading || target.vendor_name;
      showToast?.(
        !target.is_finalized
          ? `Finalized quotation "${label}"`
          : `Removed finalization for "${label}"`,
        'success'
      );
    }
  };

  const handleAddExtraQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuoteTarget || !extraVendorName.trim() || !extraFile) {
      showToast?.('Quotation heading and PDF/Image file are required.', 'error');
      return;
    }

    setIsAddingExtraQuote(true);
    try {
      const uploaded = await uploadPurchaseQuotationFile(extraFile);
      const newItem: VendorQuotationItem = {
        id: `${Date.now()}`,
        heading: extraVendorName.trim(),
        description: extraNotes.trim() || undefined,
        vendor_name: extraVendorName.trim(),
        file_url: uploaded.publicUrl,
        file_name: uploaded.fileName,
        file_type: uploaded.fileType,
        notes: extraNotes.trim() || undefined,
        is_finalized: false,
        uploaded_at: new Date().toISOString(),
      };

      const res = await updatePurchaseQuotationItems(addQuoteTarget.id, [
        ...addQuoteTarget.quotations,
        newItem,
      ]);

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setInquiries((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
        setAddQuoteTarget(res.data);
        showToast?.('Quotation uploaded! You can upload another or close.', 'success');
        setExtraVendorName('');
        setExtraNotes('');
        setExtraFile(null);
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Upload failed.', 'error');
    } finally {
      setIsAddingExtraQuote(false);
    }
  };

  const calcRowTotals = (row: Record<string, string>) => {
    const qty = Math.max(Number(row.quantity || 0), 0);
    const rate = Math.max(Number(row.amount || 0), 0);
    const gstPct = Math.max(Number(row.gst || 0), 0);
    const base = qty * rate;
    const gstAmt = (base * gstPct) / 100;
    const total = base + gstAmt;
    return { base, gstAmt, total };
  };

  const reqSummary = useMemo(() => {
    return reqRows.reduce(
      (acc, r) => {
        const { base, gstAmt, total } = calcRowTotals(r);
        acc.subtotal += base;
        acc.gstTotal += gstAmt;
        acc.grandTotal += total;
        return acc;
      },
      { subtotal: 0, gstTotal: 0, grandTotal: 0 }
    );
  }, [reqRows]);

  // Submit Purchase Requisition (Flexible Table JSONB in form_data)
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) {
      showToast?.('Please enter a requisition heading.', 'error');
      return;
    }

    const nonEmptyRows = reqRows.filter((r) =>
      reqColumns.some((c) => (r[c.key] || '').trim() !== '')
    );
    if (nonEmptyRows.length === 0) {
      showToast?.('Please enter at least one item row in the table.', 'error');
      return;
    }

    setIsSavingReq(true);
    try {
      const normalizedRows = nonEmptyRows.map((r, idx) => {
        const { base, gstAmt, total } = calcRowTotals(r);
        return {
          sr_no: idx + 1,
          ...r,
          line_subtotal: Number(base.toFixed(2)),
          line_gst: Number(gstAmt.toFixed(2)),
          total_amount: Number(total.toFixed(2)),
        };
      });

      const formData = {
        description: reqDescription.trim() || null,
        table: {
          columns: reqColumns,
          rows: normalizedRows,
          subtotal: Number(reqSummary.subtotal.toFixed(2)),
          gst_total: Number(reqSummary.gstTotal.toFixed(2)),
          grand_total: Number(reqSummary.grandTotal.toFixed(2)),
        },
      };

      const res = editingReq
        ? await updatePurchaseRequisition(editingReq.id, {
            project_id: reqSiteId || null,
            title: reqTitle,
            description: reqDescription.trim() || null,
            form_data: formData,
          })
        : await createPurchaseRequisition({
            project_id: reqSiteId || null,
            title: reqTitle,
            description: reqDescription.trim() || null,
            form_data: formData,
            submitted_by_email: userEmail || null,
            submitted_by_role: userRole || 'user',
          });

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        if (editingReq) {
          setRequisitions((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
          showToast?.('Requisition updated! Purchase can now approve.', 'success');
        } else {
          setRequisitions((prev) => [res.data!, ...prev]);
          showToast?.('Purchase Requisition submitted for Purchase Approval!', 'success');
        }
        setIsNewReqOpen(false);
        setEditingReq(null);
        setReqTitle('');
        setReqDescription('');
        setReqColumns(DEFAULT_REQ_COLUMNS);
        setReqRows([{ product_name: '', quantity: '1', amount: '', gst: '0' }]);
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Failed to submit requisition.', 'error');
    } finally {
      setIsSavingReq(false);
    }
  };

  // Process 3-Step Approval
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalTarget) return;

    setIsProcessingApproval(true);
    try {
      const res = await processRequisitionApproval(
        approvalTarget.req,
        approvalTarget.decision,
        userEmail || 'Unknown',
        userRole || 'user',
        approvalRemarks
      );

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setRequisitions((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
        showToast?.(
          approvalTarget.decision === 'approved'
            ? `Approved! Current status: ${STAGE_LABEL[res.data.approval_stage]}`
            : approvalTarget.decision === 'reverted'
              ? `Reverted ${res.data.req_code} to ${STAGE_LABEL[res.data.approval_stage]}`
              : approvalTarget.decision === 'undo_reject'
                ? `Rejection undone! ${res.data.req_code} restored to ${STAGE_LABEL[res.data.approval_stage]}`
                : `Requisition ${res.data.req_code} rejected.`,
          approvalTarget.decision === 'approved' || approvalTarget.decision === 'undo_reject' ? 'success' : 'info'
        );
        setApprovalTarget(null);
        setApprovalRemarks('');
      }
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const setupError = activeTab === 'quotations' ? quoteSetupError : reqSetupError;

  return (
    <div className="w-full space-y-4">
      {/* 1. Header & Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#653ef1]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                Purchase Outflow
              </h1>
              <p className="text-xs text-[#6B7280]">
                Vendor Quotation Comparison &amp; 3-Step Purchase Requisition Approvals
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs + Primary Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('quotations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'quotations'
                  ? 'bg-[#653ef1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vendor Quotations ({inquiries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requisitions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'requisitions'
                  ? 'bg-[#653ef1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Purchase Requisition ({requisitions.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'quotations') {
                setIsNewInquiryOpen(true);
              } else {
                setEditingReq(null);
                setReqTitle('');
                setReqDescription('');
                setReqColumns(DEFAULT_REQ_COLUMNS);
                setReqRows([{ product_name: '', quantity: '1', amount: '', gst: '0' }]);
                setIsNewReqOpen(true);
              }
            }}
            className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'quotations' ? 'New Purchase Inquiry' : 'New Requisition'}</span>
          </button>
        </div>
      </div>

      {/* SQL Table Missing Notice (only if table not yet created in Supabase) */}
      {setupError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Database Setup Required</div>
            <p className="mt-0.5">
              Please run <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">supabase/migrations/20261126_purchase_outflow_tables.sql</code> in Supabase SQL Editor. ({setupError})
            </p>
          </div>
        </div>
      )}

      {/* 2. Search & Site Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#653ef1] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'quotations'
                ? 'Search inquiry or vendor quotation heading, vendor, code...'
                : 'Search requisition title, code, or requester...'
            }
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 focus:outline-hidden focus:border-[#653ef1]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-[#653ef1] cursor-pointer"
          >
            <option value="all">All Sites</option>
            {allProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadAll}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#653ef1] ${isLoadingQuotes || isLoadingReqs ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 3. TAB 1: VENDOR QUOTATIONS & FINALIZATION (List -> Separate Detail View) */}
      {activeTab === 'quotations' && (() => {
        const selectedInquiry = selectedInquiryId
          ? inquiries.find((i) => i.id === selectedInquiryId) || null
          : null;

        if (selectedInquiry) {
          const finalizedCount = selectedInquiry.quotations.filter((q) => q.is_finalized).length;
          const viewerAtts: BillViewerAttachment[] = selectedInquiry.quotations.map((q) => ({
            url: q.file_url,
            name: `${q.heading || q.vendor_name} — ${q.file_name}`,
            type: q.file_type,
          }));

          return (
            <div className="space-y-4">
              {/* Back + Inquiry Detail Header */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInquiryId(null)}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Inquiries List</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddQuoteTarget(selectedInquiry)}
                      className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Quotation</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#653ef1] border border-purple-200">
                      {selectedInquiry.inquiry_code}
                    </span>
                    {selectedInquiry.project_id && projectMap.get(selectedInquiry.project_id) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        <Building2 className="w-3 h-3 text-[#653ef1]" />
                        {projectMap.get(selectedInquiry.project_id)}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        finalizedCount > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {finalizedCount > 0 ? `${finalizedCount} Finalized` : 'Comparing Quotes'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#111827] mt-1.5">{selectedInquiry.heading}</h2>
                  {selectedInquiry.description && (
                    <p className="text-xs text-[#6B7280] mt-1">{selectedInquiry.description}</p>
                  )}
                </div>
              </div>

              {/* Uploaded Quotations Inside This Inquiry */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">
                      Uploaded Quotations ({selectedInquiry.quotations.length})
                    </h3>
                    <span className="text-[11px] text-[#6B7280]">
                      Select 1 or 2 quotations to finalize
                    </span>
                  </div>
                  {selectedInquiry.quotations.length > 0 && (
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-[#653ef1] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={insideQuoteSearch}
                        onChange={(e) => setInsideQuoteSearch(e.target.value)}
                        placeholder="Search quotation heading, file, notes..."
                        className="w-full h-8.5 pl-8 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 focus:outline-hidden focus:border-[#653ef1]"
                      />
                    </div>
                  )}
                </div>

                {selectedInquiry.quotations.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-purple-200 bg-purple-50/30 text-center">
                    <Upload className="w-8 h-8 text-[#653ef1] mx-auto mb-2 opacity-80" />
                    <div className="text-xs font-semibold text-slate-800">No Quotations Uploaded Yet</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                      Upload vendor quotations (PDF or Image) with heading and description.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddQuoteTarget(selectedInquiry)}
                      className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload First Quotation</span>
                    </button>
                  </div>
                ) : (() => {
                  const iq = insideQuoteSearch.trim().toLowerCase();
                  const visibleQuotes = !iq
                    ? selectedInquiry.quotations
                    : selectedInquiry.quotations.filter(
                        (qt) =>
                          (qt.heading || '').toLowerCase().includes(iq) ||
                          (qt.vendor_name || '').toLowerCase().includes(iq) ||
                          (qt.description || '').toLowerCase().includes(iq) ||
                          (qt.notes || '').toLowerCase().includes(iq) ||
                          (qt.file_name || '').toLowerCase().includes(iq)
                      );

                  if (visibleQuotes.length === 0) {
                    return (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500">
                        No vendor quotations match &ldquo;{insideQuoteSearch}&rdquo;.
                      </div>
                    );
                  }

                  return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visibleQuotes.map((qt) => {
                      const originalIdx = selectedInquiry.quotations.findIndex((item) => item.id === qt.id);
                      return (
                      <div
                        key={qt.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          qt.is_finalized
                            ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400/40'
                            : 'bg-slate-50/60 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#111827] truncate">
                              {qt.heading || qt.vendor_name}
                            </div>
                            <div className="text-[11px] text-[#6B7280] truncate mt-0.5">{qt.file_name}</div>
                          </div>
                          {(qt.description || qt.notes) && (
                            <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                              {qt.description || qt.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                          <button
                            type="button"
                            onClick={() =>
                              setViewerState({
                                isOpen: true,
                                attachments: viewerAtts,
                                initialIndex: originalIdx >= 0 ? originalIdx : 0,
                                voucherNumber: selectedInquiry.inquiry_code,
                              })
                            }
                            className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#653ef1] text-xs font-semibold text-slate-700 hover:text-[#653ef1] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFinalize(selectedInquiry, qt.id)}
                            className={`h-7 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              qt.is_finalized
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-[#653ef1]/10 hover:bg-[#653ef1] text-[#653ef1] hover:text-white'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{qt.is_finalized ? 'Finalized' : 'Finalize'}</span>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  );
                })()}
              </div>
            </div>
          );
        }

        // Clean Inquiries List Table (click row to open separate detail view)
        return (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
            {isLoadingQuotes ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading purchase inquiries...</div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-800">No Purchase Inquiries Yet</div>
                <p className="text-xs text-slate-500 mt-1">
                  Click &quot;+ New Purchase Inquiry&quot; to create a profile, then click it to upload quotations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">Sr.</th>
                      <th className="px-4 py-3">Inquiry Code</th>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Heading &amp; Description</th>
                      <th className="px-4 py-3 text-center">Quotations</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInquiries.map((inq, idx) => {
                      const finalizedCount = inq.quotations.filter((q) => q.is_finalized).length;
                      return (
                        <tr
                          key={inq.id}
                          onClick={() => setSelectedInquiryId(inq.id)}
                          className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#653ef1] border border-purple-200">
                              {inq.inquiry_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-700">
                              {(inq.project_id && projectMap.get(inq.project_id)) || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#111827] group-hover:text-[#653ef1] transition-colors">
                              {inq.heading}
                            </div>
                            {inq.description && (
                              <div className="text-[11px] text-[#6B7280] truncate max-w-md">
                                {inq.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {inq.quotations.length} {inq.quotations.length === 1 ? 'File' : 'Files'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                finalizedCount > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {finalizedCount > 0 ? `${finalizedCount} Finalized` : 'Open'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInquiryId(inq.id)}
                                className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-[#653ef1] text-[#653ef1] hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Open</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (await softDeletePurchaseQuotation(inq.id)) {
                                    setInquiries((prev) => prev.filter((item) => item.id !== inq.id));
                                    showToast?.('Inquiry deleted.', 'info');
                                  }
                                }}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                                title="Delete inquiry"
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
        );
      })()}

      {/* 4. TAB 2: PURCHASE REQUISITIONS & 3-STEP APPROVAL TABLE */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setReqViewTab('active')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  reqViewTab === 'active'
                    ? 'bg-white text-[#653ef1] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Requisitions ({requisitions.length})
              </button>
              <button
                type="button"
                onClick={() => setReqViewTab('bin')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  reqViewTab === 'bin'
                    ? 'bg-white text-rose-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Recycle Bin ({deletedRequisitions.length})
              </button>
            </div>
          </div>

          {isLoadingReqs ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Loading purchase requisitions...
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">
                {reqViewTab === 'bin' ? 'Recycle Bin is Empty' : 'No Purchase Requisitions Yet'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {reqViewTab === 'bin'
                  ? 'Soft-deleted requisitions appear here so you can restore them anytime.'
                  : 'Click "+ New Requisition" to add items. Approvals flow: Purchase → Director → Accounts.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">Sr.</th>
                    <th className="px-3.5 py-3">Req &amp; Date</th>
                    <th className="px-3.5 py-3">Site</th>
                    <th className="px-3.5 py-3">Heading &amp; Items</th>
                    <th className="px-3.5 py-3">1. Purchase</th>
                    <th className="px-3.5 py-3">2. Director</th>
                    <th className="px-3.5 py-3">3. Accounts</th>
                    <th className="px-3.5 py-3 text-center">Status</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequisitions.map((req, idx) => {
                    const historyMap = new Map(req.approval_history.map((h) => [h.stage, h]));
                    const canAct = canApproveStage(req.approval_stage);
                    const fileUrl = req.file_url || req.form_data?.file_url || '';
                    const fileName = req.file_name || req.form_data?.file_name || 'Requisition.pdf';
                    const fileType = req.form_data?.file_type || undefined;
                    const desc = req.description || req.form_data?.description || '';

                    const renderStepCell = (
                      stepKey: 'purchase' | 'director' | 'accounts',
                      pendingStage: ApprovalStage
                    ) => {
                      const entry = historyMap.get(stepKey);
                      const isCurrent = req.approval_stage === pendingStage;
                      if (entry?.decision === 'approved') {
                        return (
                          <div className="text-[11px] max-w-[160px]">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Approved
                            </span>
                            <div className="text-[10px] text-slate-500 truncate" title={entry.by_email}>
                              {entry.by_email}
                            </div>
                            {entry.remarks && (
                              <div className="mt-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 whitespace-normal break-words">
                                &ldquo;{entry.remarks}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (entry?.decision === 'reverted') {
                        return (
                          <div className="text-[11px] max-w-[160px]">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              Reverted
                            </span>
                            <div className="text-[10px] text-slate-500 truncate" title={entry.by_email}>
                              {entry.by_email}
                            </div>
                            {entry.remarks && (
                              <div className="mt-1 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 whitespace-normal break-words">
                                &ldquo;{entry.remarks}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (entry?.decision === 'rejected') {
                        return (
                          <div className="text-[11px] max-w-[160px]">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              Rejected
                            </span>
                            <div className="text-[10px] text-slate-500 truncate" title={entry.by_email}>
                              {entry.by_email}
                            </div>
                            {entry.remarks && (
                              <div className="mt-1 text-[10px] text-rose-800 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 whitespace-normal break-words">
                                &ldquo;{entry.remarks}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            isCurrent ? 'text-[#653ef1]' : 'text-slate-400'
                          }`}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          {isCurrent ? 'Waiting' : 'Pending'}
                        </span>
                      );
                    };

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#653ef1] border border-purple-200 block w-fit">
                            {req.req_code}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {formatMumbaiDate(req.created_at)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">
                            {(req.project_id && projectMap.get(req.project_id)) || 'General'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-[#111827]">{req.title}</div>
                          {req.form_data?.table?.rows?.length > 0 && (
                            <div className="text-[11px] font-semibold text-[#653ef1] mt-0.5">
                              {req.form_data.table.rows.length} item(s) • Grand Total: ₹
                              {formatINR(req.form_data.table.grand_total || 0)}
                            </div>
                          )}
                          {desc && <div className="text-[11px] text-[#6B7280] truncate max-w-[220px]">{desc}</div>}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            By: {req.submitted_by_email || 'Staff'}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {renderStepCell('purchase', 'pending_purchase')}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {renderStepCell('director', 'pending_director')}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {renderStepCell('accounts', 'pending_accounts')}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              req.approval_stage === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : req.approval_stage === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {STAGE_LABEL[req.approval_stage]}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {req.form_data?.table?.rows?.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setViewingReqTable(req)}
                                className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-[#653ef1] text-[#653ef1] hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="View requisition items table"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Items</span>
                              </button>
                            )}
                            {fileUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewerState({
                                    isOpen: true,
                                    attachments: [{ url: fileUrl, name: fileName, type: fileType }],
                                    initialIndex: 0,
                                    voucherNumber: req.req_code,
                                  })
                                }
                                className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-[#653ef1] text-[#653ef1] hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="View uploaded requisition PDF"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View PDF</span>
                              </button>
                            )}
                            {reqViewTab === 'bin' ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (await restorePurchaseRequisition(req.id)) {
                                    setDeletedRequisitions((prev) => prev.filter((r) => r.id !== req.id));
                                    setRequisitions((prev) => [{ ...req, is_deleted: false }, ...prev]);
                                    showToast?.(`${req.req_code} restored!`, 'success');
                                  }
                                }}
                                className="h-7 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                            {req.approval_stage === 'pending_purchase' && (isPurchase || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReq(req);
                                  setReqTitle(req.title);
                                  setReqSiteId(req.project_id || '');
                                  setReqDescription(req.description || '');
                                  setReqColumns(
                                    req.form_data?.table?.columns?.length > 0
                                      ? req.form_data.table.columns
                                      : DEFAULT_REQ_COLUMNS
                                  );
                                  setReqRows(
                                    req.form_data?.table?.rows?.length > 0
                                      ? req.form_data.table.rows
                                      : [{ product_name: '', quantity: '1', amount: '', gst: '0' }]
                                  );
                                  setIsNewReqOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Edit requisition items"
                              >
                                <span>Edit</span>
                              </button>
                            )}
                            {canAct && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApprovalTarget({ req, decision: 'approved' })}
                                  className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                {(req.approval_stage === 'pending_director' ||
                                  req.approval_stage === 'pending_accounts') && (
                                  <button
                                    type="button"
                                    onClick={() => setApprovalTarget({ req, decision: 'reverted' })}
                                    className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Revert back for changes"
                                  >
                                    <span>Revert</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setApprovalTarget({ req, decision: 'rejected' })}
                                  className="h-7 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            {req.approval_stage === 'rejected' && isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApprovalTarget({ req, decision: 'undo_reject' })}
                                  className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Undo rejection so you can approve or revert"
                                >
                                  <span>Undo Reject</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setApprovalTarget({ req, decision: 'reverted' })}
                                  className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Revert rejected requisition back to Purchase"
                                >
                                  <span>Revert to Purchase</span>
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteReqTarget(req);
                                  setDeleteReqConfirmText('');
                                }}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                                title="Delete requisition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                              </>
                            )}
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
      )}

      {/* MODAL 1: New Purchase Inquiry + Multi-Quotation Upload */}
      {isNewInquiryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827]">New Purchase Inquiry &amp; Quotations</h2>
                <p className="text-xs text-[#6B7280]">Upload multiple vendor quotes (PDF/Image) to compare &amp; finalize</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewInquiryOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Heading <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inqHeading}
                    onChange={(e) => setInqHeading(e.target.value)}
                    placeholder="e.g. Split AC 1.5 Ton for Site Office"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site / Project
                  </label>
                  <select
                    value={inqSiteId}
                    onChange={(e) => setInqSiteId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-[#653ef1]"
                  >
                    <option value="">General / All Sites</option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Specifications
                </label>
                <textarea
                  rows={3}
                  value={inqDesc}
                  onChange={(e) => setInqDesc(e.target.value)}
                  placeholder="Enter technical specs, brand preference, delivery notes..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewInquiryOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInquiry}
                  className="h-9 px-5 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isSavingInquiry ? 'Creating...' : 'Create Profile & Upload Quotations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Upload Quotation to Existing Inquiry (Heading + Description + File, NO Amount) */}
      {addQuoteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Upload Quotation — {addQuoteTarget.inquiry_code}
                </h3>
                <p className="text-[11px] text-[#6B7280] truncate max-w-[280px]">
                  {addQuoteTarget.heading} ({addQuoteTarget.quotations.length} uploaded)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddQuoteTarget(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
            <form onSubmit={handleAddExtraQuotation} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quotation Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Electronics - Daikin Quote"
                  value={extraVendorName}
                  onChange={(e) => setExtraVendorName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms, warranty, delivery notes..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>
              <label className="w-full h-10 px-3 rounded-lg border border-dashed border-[#653ef1] bg-purple-50/30 text-xs font-semibold text-[#653ef1] flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">{extraFile ? extraFile.name : 'Choose PDF or Image *'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.heic,.heif"
                  className="hidden"
                  onChange={(e) => setExtraFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddQuoteTarget(null)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isAddingExtraQuote}
                  className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isAddingExtraQuote ? 'Uploading...' : 'Upload Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: New Purchase Requisition (Flexible Table Builder) */}
      {isNewReqOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center sm:p-4">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  {editingReq ? `Edit Requisition — ${editingReq.req_code}` : 'New Purchase Requisition'}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Approval Flow: Purchase → Director → Accounts • Flexible item table
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReqOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="flex-1 overflow-y-auto p-5 space-y-4">
              {editingReq && (() => {
                const lastRevert = [...(editingReq.approval_history || [])]
                  .reverse()
                  .find((h) => h.decision === 'reverted' || h.decision === 'rejected');
                if (!lastRevert?.remarks) return null;
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">Director / Reviewer Remark: </span>
                    <span>&ldquo;{lastRevert.remarks}&rdquo;</span>
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requisition Heading <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Split AC & Electrical Material"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site / Project
                  </label>
                  <select
                    value={reqSiteId}
                    onChange={(e) => setReqSiteId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-[#653ef1]"
                  >
                    <option value="">General / All Sites</option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  placeholder="Any remarks or urgency note..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>

              {/* Flexible Requisition Items Table */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#111827]">
                      Requisition Items Table
                    </span>
                    <p className="text-[11px] text-[#6B7280]">
                      Click any header to rename it, or add custom columns &amp; rows.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newKey = `col_${Date.now()}`;
                        setReqColumns((prev) => [
                          ...prev,
                          { key: newKey, label: 'Custom Column', type: 'text' },
                        ]);
                      }}
                      className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Column</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReqRows((prev) => [
                          ...prev,
                          { product_name: '', quantity: '1', amount: '', gst: '0' },
                        ])
                      }
                      className="h-8 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#653ef1] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[680px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <tr>
                        <th className="px-2.5 py-2.5 w-12 text-center">Sr. No.</th>
                        {reqColumns.map((col, cIdx) => {
                          const isCore = ['product_name', 'quantity', 'amount', 'gst'].includes(col.key);
                          return (
                            <th key={col.key} className="px-2 py-2 min-w-[110px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={col.label}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReqColumns((prev) =>
                                      prev.map((c, i) => (i === cIdx ? { ...c, label: val } : c))
                                    );
                                  }}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#653ef1] focus:outline-hidden font-bold text-slate-700 py-0.5 text-[11px]"
                                />
                                {!isCore && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReqColumns((prev) => prev.filter((_, i) => i !== cIdx))
                                    }
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                                    title="Remove column"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-2.5 py-2.5 text-right w-28">Total (₹)</th>
                        <th className="px-2 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reqRows.map((row, rIdx) => {
                        const { total } = calcRowTotals(row);
                        return (
                          <tr key={rIdx} className="hover:bg-slate-50/50">
                            <td className="px-2.5 py-2 text-center font-mono text-slate-500">
                              {rIdx + 1}
                            </td>
                            {reqColumns.map((col) => (
                              <td key={col.key} className="px-2 py-1.5">
                                <input
                                  type={col.type === 'number' ? 'number' : 'text'}
                                  step={col.type === 'number' ? 'any' : undefined}
                                  min={col.type === 'number' ? '0' : undefined}
                                  value={row[col.key] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReqRows((prev) =>
                                      prev.map((r, i) =>
                                        i === rIdx ? { ...r, [col.key]: val } : r
                                      )
                                    );
                                  }}
                                  placeholder={col.label}
                                  className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                                />
                              </td>
                            ))}
                            <td className="px-2.5 py-2 text-right font-bold text-[#111827] whitespace-nowrap">
                              ₹{formatINR(total)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {reqRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReqRows((prev) => prev.filter((_, i) => i !== rIdx))
                                  }
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Remove row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Live Totals Summary Bar */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 font-medium">
                    Total Rows: <strong className="text-slate-900">{reqRows.length}</strong>
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-600">
                      Subtotal: <strong className="text-slate-900">₹{formatINR(reqSummary.subtotal)}</strong>
                    </span>
                    <span className="text-slate-600">
                      GST: <strong className="text-slate-900">₹{formatINR(reqSummary.gstTotal)}</strong>
                    </span>
                    <span className="text-sm font-bold text-[#653ef1]">
                      Grand Total: ₹{formatINR(reqSummary.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReqOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingReq}
                  className="h-9 px-5 rounded-xl bg-[#653ef1] hover:bg-[#542be3] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isSavingReq ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3B: View Requisition Items Table */}
      {viewingReqTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[88vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  {viewingReqTable.title} — {viewingReqTable.req_code}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  By {viewingReqTable.submitted_by_email || 'Staff'} •{' '}
                  {(viewingReqTable.project_id && projectMap.get(viewingReqTable.project_id)) || 'General'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReqTable(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              {viewingReqTable.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {viewingReqTable.description}
                </p>
              )}

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 text-center">Sr. No.</th>
                      {(viewingReqTable.form_data?.table?.columns || []).map((col: any) => (
                        <th key={col.key} className="px-3 py-2.5">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingReqTable.form_data?.table?.rows || []).map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-center font-mono text-slate-500">
                          {r.sr_no || idx + 1}
                        </td>
                        {(viewingReqTable.form_data?.table?.columns || []).map((col: any) => (
                          <td key={col.key} className="px-3 py-2 text-slate-800">
                            {r[col.key] || '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold text-[#111827]">
                          ₹{formatINR(r.total_amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-purple-50/60 rounded-xl border border-purple-200 p-3.5 flex flex-wrap items-center justify-end gap-5 text-xs">
                <span>
                  Subtotal: <strong>₹{formatINR(viewingReqTable.form_data?.table?.subtotal || 0)}</strong>
                </span>
                <span>
                  GST: <strong>₹{formatINR(viewingReqTable.form_data?.table?.gst_total || 0)}</strong>
                </span>
                <span className="text-sm font-bold text-[#653ef1]">
                  Grand Total: ₹{formatINR(viewingReqTable.form_data?.table?.grand_total || 0)}
                </span>
              </div>

              {viewingReqTable.approval_history?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-[#111827]">Approval History &amp; Remarks</div>
                  <div className="space-y-1.5">
                    {viewingReqTable.approval_history.map((h, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold capitalize text-[#111827]">
                            {h.stage} —{' '}
                            <span
                              className={
                                h.decision === 'approved'
                                  ? 'text-emerald-700'
                                  : h.decision === 'reverted'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                              }
                            >
                              {h.decision.toUpperCase()}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {h.by_email} • {formatMumbaiDate(h.at)}
                          </span>
                        </div>
                        {h.remarks && (
                          <div className="text-[11px] text-slate-700 italic">&ldquo;{h.remarks}&rdquo;</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Approval / Rejection / Revert Confirmation */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">
                {approvalTarget.decision === 'approved'
                  ? 'Approve Requisition'
                  : approvalTarget.decision === 'reverted'
                    ? 'Revert Requisition for Update'
                    : approvalTarget.decision === 'undo_reject'
                      ? 'Undo Rejection'
                      : 'Reject Requisition'}{' '}
                — {approvalTarget.req.req_code}
              </h3>
              <button
                type="button"
                onClick={() => setApprovalTarget(null)}
                className="text-xs text-slate-500 cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleConfirmApproval} className="p-5 space-y-3">
              <div className="text-xs text-slate-600">
                <strong>{approvalTarget.req.title}</strong> ({STAGE_LABEL[approvalTarget.req.approval_stage]})
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks {approvalTarget.decision === 'reverted' ? '(Explain what to update)' : '(Optional)'}
                </label>
                <textarea
                  rows={2}
                  required={approvalTarget.decision === 'reverted'}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder={
                    approvalTarget.decision === 'reverted'
                      ? 'Write reason/comment for Purchase to update...'
                      : 'Enter approval or rejection notes...'
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingApproval}
                  className={`h-9 px-4 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-60 ${
                    approvalTarget.decision === 'approved' || approvalTarget.decision === 'undo_reject'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : approvalTarget.decision === 'reverted'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessingApproval
                    ? 'Saving...'
                    : approvalTarget.decision === 'approved'
                      ? 'Confirm Approval'
                      : approvalTarget.decision === 'reverted'
                        ? 'Confirm Revert'
                        : approvalTarget.decision === 'undo_reject'
                          ? 'Confirm Undo Reject'
                          : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Type DELETE Confirmation for Purchase Requisition */}
      {deleteReqTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Confirm Delete Requisition</h3>
                  <p className="text-xs text-[#6B7280]">
                    This will move {deleteReqTarget.req_code} to the Recycle Bin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteReqTarget(null);
                  setDeleteReqConfirmText('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-[#111827]">{deleteReqTarget.title}</div>
              <div className="text-slate-500 mt-0.5">{deleteReqTarget.req_code}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <span className="font-mono text-rose-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={deleteReqConfirmText}
                onChange={(e) => setDeleteReqConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteReqTarget(null);
                  setDeleteReqConfirmText('');
                }}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingReq || deleteReqConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={async () => {
                  setIsDeletingReq(true);
                  const ok = await softDeletePurchaseRequisition(deleteReqTarget.id);
                  setIsDeletingReq(false);
                  if (ok) {
                    setRequisitions((prev) => prev.filter((r) => r.id !== deleteReqTarget.id));
                    setDeletedRequisitions((prev) => [
                      { ...deleteReqTarget, is_deleted: true },
                      ...prev,
                    ]);
                    showToast?.(`${deleteReqTarget.req_code} moved to Recycle Bin.`, 'info');
                    setDeleteReqTarget(null);
                    setDeleteReqConfirmText('');
                  } else {
                    showToast?.('Failed to delete requisition.', 'error');
                  }
                }}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                {isDeletingReq ? 'Deleting...' : 'Delete Requisition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Attachment Quotation Viewer */}
      <BillDocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
        fileUrl={viewerState.attachments[0]?.url || null}
        fileName={viewerState.attachments[0]?.name || null}
        attachments={viewerState.attachments}
        initialIndex={viewerState.initialIndex}
        voucherNumber={viewerState.voucherNumber}
        title="Vendor Quotation"
      />
    </div>
  );
};
