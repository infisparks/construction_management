import { supabase } from './client';
import { compressFileBeforeUpload } from '../common/file-compression';

export const PURCHASE_STORAGE_BUCKET = 'purchase-documents';
const FALLBACK_STORAGE_BUCKET = 'expense-documents';

export interface VendorQuotationItem {
  id: string;
  vendor_name: string;
  quoted_amount?: number | null;
  file_url: string;
  file_name: string;
  file_type?: string;
  notes?: string;
  is_finalized: boolean;
  finalized_by?: string | null;
  finalized_at?: string | null;
  uploaded_at: string;
}

export interface PurchaseQuotationInquiry {
  id: string;
  serial_no: number;
  inquiry_code: string;
  project_id?: string | null;
  heading: string;
  description?: string | null;
  quotations: VendorQuotationItem[];
  status: 'open' | 'finalized' | 'closed';
  created_by_email?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export type ApprovalStage =
  | 'pending_purchase'
  | 'pending_director'
  | 'pending_accounts'
  | 'approved'
  | 'rejected';

export interface ApprovalHistoryEntry {
  stage: 'purchase' | 'director' | 'accounts';
  decision: 'approved' | 'rejected';
  by_email: string;
  by_role: string;
  at: string;
  remarks?: string;
}

export interface PurchaseRequisition {
  id: string;
  serial_no: number;
  req_code: string;
  project_id?: string | null;
  title: string;
  form_data: Record<string, any>;
  approval_stage: ApprovalStage;
  approval_history: ApprovalHistoryEntry[];
  submitted_by_email?: string | null;
  submitted_by_role?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Uploads a vendor quotation file (image compressed automatically, PDF preserved).
 */
export async function uploadPurchaseQuotationFile(
  file: File,
  folder: string = 'quotations'
): Promise<{ publicUrl: string; fileName: string; fileType: string }> {
  const prepared = await compressFileBeforeUpload(file);
  const cleanName = prepared.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanName}`;

  let bucket = PURCHASE_STORAGE_BUCKET;
  let { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, prepared, { cacheControl: '3600', upsert: false });

  // Fallback to expense-documents if purchase-documents bucket isn't created yet
  if (uploadError && uploadError.message?.toLowerCase().includes('bucket')) {
    bucket = FALLBACK_STORAGE_BUCKET;
    const retry = await supabase.storage
      .from(bucket)
      .upload(`purchase_${filePath}`, prepared, { cacheControl: '3600', upsert: false });
    uploadError = retry.error;
    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(`purchase_${filePath}`);
      return {
        publicUrl: data?.publicUrl || '',
        fileName: prepared.name,
        fileType: prepared.type,
      };
    }
  }

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return {
    publicUrl: data?.publicUrl || '',
    fileName: prepared.name,
    fileType: prepared.type,
  };
}

// ==========================================
// 1. Vendor Quotations & Finalization
// ==========================================

export async function fetchPurchaseQuotations(
  projectId?: string
): Promise<{ data: PurchaseQuotationInquiry[]; error: string | null }> {
  try {
    let query = supabase
      .from('purchase_quotations')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((row: any) => ({
        ...row,
        quotations: Array.isArray(row.quotations) ? row.quotations : [],
      })) as PurchaseQuotationInquiry[],
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to load purchase quotations.' };
  }
}

export async function createPurchaseQuotation(payload: {
  project_id?: string | null;
  heading: string;
  description?: string | null;
  quotations: VendorQuotationItem[];
  created_by_email?: string | null;
}): Promise<{ data: PurchaseQuotationInquiry | null; error: string | null }> {
  try {
    const code = `PQ-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const hasFinalized = payload.quotations.some((q) => q.is_finalized);

    const { data, error } = await supabase
      .from('purchase_quotations')
      .insert({
        inquiry_code: code,
        project_id: payload.project_id && payload.project_id !== 'all' ? payload.project_id : null,
        heading: payload.heading.trim(),
        description: payload.description?.trim() || null,
        quotations: payload.quotations,
        status: hasFinalized ? 'finalized' : 'open',
        created_by_email: payload.created_by_email || null,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PurchaseQuotationInquiry, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create purchase quotation inquiry.' };
  }
}

export async function updatePurchaseQuotationItems(
  id: string,
  quotations: VendorQuotationItem[]
): Promise<{ data: PurchaseQuotationInquiry | null; error: string | null }> {
  try {
    const hasFinalized = quotations.some((q) => q.is_finalized);
    const { data, error } = await supabase
      .from('purchase_quotations')
      .update({
        quotations,
        status: hasFinalized ? 'finalized' : 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PurchaseQuotationInquiry, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update quotations.' };
  }
}

export async function softDeletePurchaseQuotation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('purchase_quotations')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// ==========================================
// 2. Purchase Requisitions & 3-Step Approval
// ==========================================

export async function fetchPurchaseRequisitions(
  projectId?: string
): Promise<{ data: PurchaseRequisition[]; error: string | null }> {
  try {
    let query = supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((row: any) => ({
        ...row,
        form_data: row.form_data && typeof row.form_data === 'object' ? row.form_data : {},
        approval_history: Array.isArray(row.approval_history) ? row.approval_history : [],
      })) as PurchaseRequisition[],
      error: null,
    };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to load purchase requisitions.' };
  }
}

export async function createPurchaseRequisition(payload: {
  project_id?: string | null;
  title: string;
  form_data: Record<string, any>;
  submitted_by_email?: string | null;
  submitted_by_role?: string | null;
}): Promise<{ data: PurchaseRequisition | null; error: string | null }> {
  try {
    const code = `PR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        req_code: code,
        project_id: payload.project_id && payload.project_id !== 'all' ? payload.project_id : null,
        title: payload.title.trim(),
        form_data: payload.form_data || {},
        approval_stage: 'pending_purchase',
        approval_history: [],
        submitted_by_email: payload.submitted_by_email || null,
        submitted_by_role: payload.submitted_by_role || 'user',
        is_deleted: false,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PurchaseRequisition, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to submit purchase requisition.' };
  }
}

export async function processRequisitionApproval(
  req: PurchaseRequisition,
  decision: 'approved' | 'rejected',
  approverEmail: string,
  approverRole: string,
  remarks?: string
): Promise<{ data: PurchaseRequisition | null; error: string | null }> {
  const stageMap: Record<
    'pending_purchase' | 'pending_director' | 'pending_accounts',
    { step: 'purchase' | 'director' | 'accounts'; next: ApprovalStage }
  > = {
    pending_purchase: { step: 'purchase', next: 'pending_director' },
    pending_director: { step: 'director', next: 'pending_accounts' },
    pending_accounts: { step: 'accounts', next: 'approved' },
  };

  if (
    req.approval_stage !== 'pending_purchase' &&
    req.approval_stage !== 'pending_director' &&
    req.approval_stage !== 'pending_accounts'
  ) {
    return { data: null, error: 'This requisition has already completed its approval workflow.' };
  }

  const currentMeta = stageMap[req.approval_stage];
  const nextStage: ApprovalStage = decision === 'rejected' ? 'rejected' : currentMeta.next;

  const nextHistory: ApprovalHistoryEntry[] = [
    ...(Array.isArray(req.approval_history) ? req.approval_history : []),
    {
      stage: currentMeta.step,
      decision,
      by_email: approverEmail,
      by_role: approverRole,
      at: new Date().toISOString(),
      remarks: remarks?.trim() || undefined,
    },
  ];

  try {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .update({
        approval_stage: nextStage,
        approval_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PurchaseRequisition, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to process approval.' };
  }
}

export async function softDeletePurchaseRequisition(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('purchase_requisitions')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
