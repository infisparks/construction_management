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
  createPurchaseRequisition,
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

  // Quotations State
  const [inquiries, setInquiries] = useState<PurchaseQuotationInquiry[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [quoteSetupError, setQuoteSetupError] = useState<string | null>(null);

  // Requisitions State
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [isLoadingReqs, setIsLoadingReqs] = useState(true);
  const [reqSetupError, setReqSetupError] = useState<string | null>(null);

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

  // New Requisition Modal (flexible JSONB form_data)
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [reqSiteId, setReqSiteId] = useState<string>(projectId || '');
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState('Equipment / Appliance');
  const [reqQuantity, setReqQuantity] = useState('1');
  const [reqUnit, setReqUnit] = useState('Nos');
  const [reqEstimatedCost, setReqEstimatedCost] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'Normal' | 'Urgent' | 'Critical'>('Normal');
  const [reqJustification, setReqJustification] = useState('');
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [isSavingReq, setIsSavingReq] = useState(false);

  // Approval Action Modal
  const [approvalTarget, setApprovalTarget] = useState<{
    req: PurchaseRequisition;
    decision: 'approved' | 'rejected';
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
    const [qRes, rRes] = await Promise.all([
      fetchPurchaseQuotations(siteFilter),
      fetchPurchaseRequisitions(siteFilter),
    ]);
    setInquiries(qRes.data);
    setQuoteSetupError(qRes.error);
    setRequisitions(rRes.data);
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
        inq.quotations.some((qt) => qt.vendor_name.toLowerCase().includes(q))
    );
  }, [inquiries, searchQuery]);

  const filteredRequisitions = useMemo(() => {
    if (!searchQuery.trim()) return requisitions;
    const q = searchQuery.toLowerCase();
    return requisitions.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.req_code.toLowerCase().includes(q) ||
        (r.submitted_by_email || '').toLowerCase().includes(q) ||
        JSON.stringify(r.form_data || {}).toLowerCase().includes(q)
    );
  }, [requisitions, searchQuery]);

  // Create New Quotation Inquiry
  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqHeading.trim()) {
      showToast?.('Please enter a purchase heading.', 'error');
      return;
    }

    const validRows = draftQuotes.filter((r) => r.vendor_name.trim() && r.file);
    if (validRows.length === 0) {
      showToast?.('Please add at least 1 vendor quotation with vendor name and PDF/Image file.', 'error');
      return;
    }

    setIsSavingInquiry(true);
    try {
      const uploadedItems: VendorQuotationItem[] = await Promise.all(
        validRows.map(async (row, idx) => {
          const uploaded = await uploadPurchaseQuotationFile(row.file!);
          return {
            id: `${Date.now()}_${idx}`,
            vendor_name: row.vendor_name.trim(),
            quoted_amount: row.quoted_amount ? Number(row.quoted_amount) : null,
            file_url: uploaded.publicUrl,
            file_name: uploaded.fileName,
            file_type: uploaded.fileType,
            notes: row.notes.trim() || undefined,
            is_finalized: false,
            uploaded_at: new Date().toISOString(),
          };
        })
      );

      const res = await createPurchaseQuotation({
        project_id: inqSiteId || null,
        heading: inqHeading,
        description: inqDesc,
        quotations: uploadedItems,
        created_by_email: userEmail || null,
      });

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setInquiries((prev) => [res.data!, ...prev]);
        showToast?.('Purchase inquiry & quotations saved!', 'success');
        setIsNewInquiryOpen(false);
        setInqHeading('');
        setInqDesc('');
        setDraftQuotes([
          { id: '1', vendor_name: '', quoted_amount: '', notes: '', file: null },
          { id: '2', vendor_name: '', quoted_amount: '', notes: '', file: null },
        ]);
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Failed to upload quotations.', 'error');
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
      showToast?.(
        !target.is_finalized
          ? `Finalized quotation from ${target.vendor_name}`
          : `Removed finalization for ${target.vendor_name}`,
        'success'
      );
    }
  };

  const handleAddExtraQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuoteTarget || !extraVendorName.trim() || !extraFile) {
      showToast?.('Vendor name and quotation file are required.', 'error');
      return;
    }

    setIsAddingExtraQuote(true);
    try {
      const uploaded = await uploadPurchaseQuotationFile(extraFile);
      const newItem: VendorQuotationItem = {
        id: `${Date.now()}`,
        vendor_name: extraVendorName.trim(),
        quoted_amount: extraAmount ? Number(extraAmount) : null,
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
        showToast?.('Quotation added!', 'success');
        setAddQuoteTarget(null);
        setExtraVendorName('');
        setExtraAmount('');
        setExtraNotes('');
        setExtraFile(null);
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Upload failed.', 'error');
    } finally {
      setIsAddingExtraQuote(false);
    }
  };

  // Submit Purchase Requisition (flexible JSONB)
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) {
      showToast?.('Please enter a requisition title.', 'error');
      return;
    }

    setIsSavingReq(true);
    try {
      const customObj: Record<string, string> = {};
      customFields.forEach((f) => {
        if (f.key.trim() && f.value.trim()) {
          customObj[f.key.trim()] = f.value.trim();
        }
      });

      const formData = {
        category: reqCategory,
        quantity: reqQuantity,
        unit: reqUnit,
        estimated_cost: reqEstimatedCost ? Number(reqEstimatedCost) : null,
        urgency: reqUrgency,
        justification: reqJustification.trim() || null,
        ...customObj,
      };

      const res = await createPurchaseRequisition({
        project_id: reqSiteId || null,
        title: reqTitle,
        form_data: formData,
        submitted_by_email: userEmail || null,
        submitted_by_role: userRole || 'user',
      });

      if (res.error) {
        showToast?.(res.error, 'error');
      } else if (res.data) {
        setRequisitions((prev) => [res.data!, ...prev]);
        showToast?.('Purchase Requisition submitted for Purchase Approval!', 'success');
        setIsNewReqOpen(false);
        setReqTitle('');
        setReqQuantity('1');
        setReqEstimatedCost('');
        setReqJustification('');
        setCustomFields([]);
      }
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
            : `Requisition ${res.data.req_code} rejected.`,
          approvalTarget.decision === 'approved' ? 'success' : 'info'
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
            onClick={() => (activeTab === 'quotations' ? setIsNewInquiryOpen(true) : setIsNewReqOpen(true))}
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
                ? 'Search inquiry heading, code, or vendor name...'
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

      {/* 3. TAB 1: VENDOR QUOTATIONS & FINALIZATION */}
      {activeTab === 'quotations' && (
        <div className="space-y-3">
          {isLoadingQuotes ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-xs text-slate-500">
              Loading vendor quotations...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
              <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">No Purchase Inquiries Yet</div>
              <p className="text-xs text-slate-500 mt-1">
                Create a purchase inquiry, upload multiple vendor quotations (PDF/Image), and finalize 1 or 2 vendors.
              </p>
            </div>
          ) : (
            filteredInquiries.map((inq) => {
              const finalizedCount = inq.quotations.filter((q) => q.is_finalized).length;
              const viewerAtts: BillViewerAttachment[] = inq.quotations.map((q) => ({
                url: q.file_url,
                name: `${q.vendor_name} — ${q.file_name}`,
                type: q.file_type,
              }));

              return (
                <div
                  key={inq.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#653ef1] border border-purple-200">
                          {inq.inquiry_code}
                        </span>
                        {inq.project_id && projectMap.get(inq.project_id) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Building2 className="w-3 h-3 text-[#653ef1]" />
                            {projectMap.get(inq.project_id)}
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
                      <h3 className="text-base font-bold text-[#111827] mt-1.5">{inq.heading}</h3>
                      {inq.description && (
                        <p className="text-xs text-[#6B7280] mt-0.5">{inq.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAddQuoteTarget(inq)}
                        className="h-8 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#653ef1] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Quote</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await softDeletePurchaseQuotation(inq.id)) {
                            setInquiries((prev) => prev.filter((item) => item.id !== inq.id));
                            showToast?.('Inquiry moved to trash.', 'info');
                          }
                        }}
                        className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quotations Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {inq.quotations.map((qt, qIdx) => (
                      <div
                        key={qt.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          qt.is_finalized
                            ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400/40'
                            : 'bg-slate-50/60 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#111827] truncate">
                                {qt.vendor_name}
                              </div>
                              <div className="text-[11px] text-[#6B7280] truncate">{qt.file_name}</div>
                            </div>
                            {qt.quoted_amount != null && (
                              <span className="text-xs font-bold text-[#111827] bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                ₹{Number(qt.quoted_amount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {qt.notes && (
                            <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">{qt.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                          <button
                            type="button"
                            onClick={() =>
                              setViewerState({
                                isOpen: true,
                                attachments: viewerAtts,
                                initialIndex: qIdx,
                                voucherNumber: inq.inquiry_code,
                              })
                            }
                            className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#653ef1] text-xs font-semibold text-slate-700 hover:text-[#653ef1] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFinalize(inq, qt.id)}
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
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. TAB 2: PURCHASE REQUISITIONS & 3-STEP APPROVAL */}
      {activeTab === 'requisitions' && (
        <div className="space-y-3">
          {isLoadingReqs ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-xs text-slate-500">
              Loading purchase requisitions...
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
              <ClipboardCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">No Purchase Requisitions Yet</div>
              <p className="text-xs text-slate-500 mt-1">
                Anyone can submit a requirement (e.g. Split AC). Approvals flow through Purchase → Director → Accounts.
              </p>
            </div>
          ) : (
            filteredRequisitions.map((req) => {
              const historyMap = new Map(req.approval_history.map((h) => [h.stage, h]));
              const canAct = canApproveStage(req.approval_stage);
              const formEntries = Object.entries(req.form_data || {}).filter(
                ([, val]) => val !== null && val !== undefined && val !== ''
              );

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-2xs space-y-4"
                >
                  {/* Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#653ef1] border border-purple-200">
                          {req.req_code}
                        </span>
                        {req.project_id && projectMap.get(req.project_id) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Building2 className="w-3 h-3 text-[#653ef1]" />
                            {projectMap.get(req.project_id)}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            req.approval_stage === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.approval_stage === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {STAGE_LABEL[req.approval_stage]}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#111827] mt-1.5">{req.title}</h3>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        Submitted by <strong>{req.submitted_by_email || 'Staff'}</strong> •{' '}
                        {formatMumbaiDate(req.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canAct && (
                        <>
                          <button
                            type="button"
                            onClick={() => setApprovalTarget({ req, decision: 'approved' })}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalTarget({ req, decision: 'rejected' })}
                            className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (await softDeletePurchaseRequisition(req.id)) {
                              setRequisitions((prev) => prev.filter((r) => r.id !== req.id));
                              showToast?.('Requisition deleted.', 'info');
                            }
                          }}
                          className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                          title="Delete requisition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flexible JSONB Form Data Summary */}
                  {formEntries.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      {formEntries.map(([key, val]) => (
                        <div key={key} className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] truncate">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs font-semibold text-[#111827] truncate mt-0.5">
                            {key === 'estimated_cost'
                              ? `₹${Number(val).toLocaleString('en-IN')}`
                              : String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3-Step Sequential Approval Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'purchase', title: '1. Purchase Approval', roleHint: 'Purchase Role', pendingStage: 'pending_purchase' },
                        { key: 'director', title: '2. Director Approval', roleHint: 'Admin / Director', pendingStage: 'pending_director' },
                        { key: 'accounts', title: '3. Accounts Approval', roleHint: 'Account Role', pendingStage: 'pending_accounts' },
                      ] as const
                    ).map((step) => {
                      const entry = historyMap.get(step.key);
                      const isCurrent = req.approval_stage === step.pendingStage;

                      return (
                        <div
                          key={step.key}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                            entry?.decision === 'approved'
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : entry?.decision === 'rejected'
                              ? 'bg-rose-50/70 border-rose-300'
                              : isCurrent
                              ? 'bg-purple-50/70 border-[#653ef1]/50'
                              : 'bg-slate-50 border-slate-200 opacity-75'
                          }`}
                        >
                          {entry?.decision === 'approved' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : entry?.decision === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : isCurrent ? (
                            <Clock className="w-4 h-4 text-[#653ef1] shrink-0 mt-0.5" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[#111827]">{step.title}</div>
                            {entry ? (
                              <div className="text-[10px] text-[#6B7280] mt-0.5">
                                <span className="capitalize font-semibold">{entry.decision}</span> by {entry.by_email}
                                {entry.remarks ? ` — "${entry.remarks}"` : ''}
                              </div>
                            ) : (
                              <div className="text-[10px] text-[#6B7280] mt-0.5">
                                {isCurrent ? `Waiting (${step.roleHint})` : `Pending (${step.roleHint})`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
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
                  rows={2}
                  value={inqDesc}
                  onChange={(e) => setInqDesc(e.target.value)}
                  placeholder="Enter technical specs, brand preference, delivery notes..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827]">
                    Vendor Quotations (PDF or Image) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftQuotes((prev) => [
                        ...prev,
                        { id: `${Date.now()}`, vendor_name: '', quoted_amount: '', notes: '', file: null },
                      ])
                    }
                    className="text-xs font-semibold text-[#653ef1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Quote
                  </button>
                </div>

                {draftQuotes.map((row, idx) => (
                  <div key={row.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#653ef1]">Quotation #{idx + 1}</span>
                      {draftQuotes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDraftQuotes((prev) => prev.filter((r) => r.id !== row.id))}
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Vendor Name *"
                        value={row.vendor_name}
                        onChange={(e) =>
                          setDraftQuotes((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, vendor_name: e.target.value } : r))
                          )
                        }
                        className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
                      />
                      <input
                        type="number"
                        placeholder="Quoted Amount (Rs.)"
                        value={row.quoted_amount}
                        onChange={(e) =>
                          setDraftQuotes((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, quoted_amount: e.target.value } : r))
                          )
                        }
                        className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
                      />
                      <label className="h-9 px-2.5 rounded-lg border border-dashed border-[#653ef1]/50 bg-white hover:bg-purple-50 text-xs text-[#653ef1] font-semibold flex items-center gap-1.5 cursor-pointer truncate">
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{row.file ? row.file.name : 'Upload PDF / Image *'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.heic,.heif"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setDraftQuotes((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, file: f } : r))
                            );
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Optional note (warranty, delivery time...)"
                      value={row.notes}
                      onChange={(e) =>
                        setDraftQuotes((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, notes: e.target.value } : r))
                        )
                      }
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
                    />
                  </div>
                ))}
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
                  {isSavingInquiry ? 'Uploading...' : 'Save Inquiry & Quotations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Extra Quotation to Existing Inquiry */}
      {addQuoteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">
                Add Quotation — {addQuoteTarget.inquiry_code}
              </h3>
              <button
                type="button"
                onClick={() => setAddQuoteTarget(null)}
                className="text-xs text-slate-500 cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAddExtraQuotation} className="p-5 space-y-3">
              <input
                type="text"
                required
                placeholder="Vendor Name *"
                value={extraVendorName}
                onChange={(e) => setExtraVendorName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="number"
                placeholder="Quoted Amount (Rs.)"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs"
              />
              <label className="w-full h-10 px-3 rounded-lg border border-dashed border-[#653ef1] text-xs font-semibold text-[#653ef1] flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingExtraQuote}
                  className="h-9 px-4 rounded-xl bg-[#653ef1] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isAddingExtraQuote ? 'Uploading...' : 'Add Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: New Purchase Requisition (Flexible JSONB Form) */}
      {isNewReqOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827]">Submit Purchase Requisition</h2>
                <p className="text-xs text-[#6B7280]">
                  Approval Flow: Purchase → Director → Accounts
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

            <form onSubmit={handleCreateRequisition} className="p-5 space-y-3.5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requirement Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Need Split AC for Site Office"
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="text"
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={reqUnit}
                    onChange={(e) => setReqUnit(e.target.value)}
                    placeholder="Nos / Bags"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Cost (Rs.)</label>
                  <input
                    type="number"
                    value={reqEstimatedCost}
                    onChange={(e) => setReqEstimatedCost(e.target.value)}
                    placeholder="45000"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Justification / Purpose
                  </label>
                  <input
                    type="text"
                    value={reqJustification}
                    onChange={(e) => setReqJustification(e.target.value)}
                    placeholder="Reason for purchase..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Custom Fields (saved in JSONB) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Additional Fields (Saved in JSONB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomFields((prev) => [...prev, { key: '', value: '' }])}
                    className="text-xs font-semibold text-[#653ef1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
                {customFields.map((cf, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Field Name (e.g. Brand)"
                      value={cf.key}
                      onChange={(e) =>
                        setCustomFields((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, key: e.target.value } : item))
                        )
                      }
                      className="col-span-5 h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Daikin 5 Star)"
                      value={cf.value}
                      onChange={(e) =>
                        setCustomFields((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                        )
                      }
                      className="col-span-6 h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFields((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-1 text-rose-600 text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                  {isSavingReq ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Approval / Rejection Confirmation */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">
                {approvalTarget.decision === 'approved' ? 'Approve Requisition' : 'Reject Requisition'} —{' '}
                {approvalTarget.req.req_code}
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
                  Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Enter approval or rejection notes..."
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
                    approvalTarget.decision === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessingApproval
                    ? 'Saving...'
                    : approvalTarget.decision === 'approved'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
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
