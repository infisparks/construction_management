import { supabase } from './client';
import { compressFileBeforeUpload } from '../common/file-compression';
import { STORAGE_BUCKET, resolveFileUrl, extractStoragePath } from './project-files';

export type OperatingExpenseType = 'petty_cash' | 'other_expense';
export type OperatingPaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card';

export interface OperatingExpenseAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf';
  size?: number;
}

export interface OperatingCustomField {
  label: string;
  value: string;
}

export interface OperatingExpenseRow {
  id: string;
  expense_type: OperatingExpenseType;
  entry_code: string | null;
  project_id: string | null;
  title: string;
  category: string;
  amount: number;
  payment_method: OperatingPaymentMethod;
  expense_date: string;
  reference_no: string | null;
  notes: string | null;
  custom_fields: OperatingCustomField[];
  attachments: OperatingExpenseAttachment[];
  created_by: string | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  deleted_by_id?: string | null;
  deleted_at?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string; code?: string | null } | null;
}

export interface CreateOperatingExpensePayload {
  expense_type: OperatingExpenseType;
  project_id?: string | null;
  title: string;
  category: string;
  amount: number;
  payment_method: OperatingPaymentMethod;
  expense_date: string;
  reference_no?: string | null;
  notes?: string | null;
  custom_fields?: OperatingCustomField[];
  attachments?: OperatingExpenseAttachment[];
  created_by?: string | null;
}

function generateEntryCode(type: OperatingExpenseType): string {
  const prefix = type === 'petty_cash' ? 'PC' : 'OE';
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${ym}-${rand}`;
}

function normalizeRow(row: any): OperatingExpenseRow {
  const rawAttachments = Array.isArray(row.attachments) ? row.attachments : [];
  const rawCustomFields = Array.isArray(row.custom_fields) ? row.custom_fields : [];
  return {
    ...row,
    amount: Number(row.amount || 0),
    custom_fields: rawCustomFields
      .filter((f: any) => f && (f.label || f.value))
      .map((f: any) => ({ label: String(f.label || ''), value: String(f.value || '') })),
    attachments: rawAttachments.map((att: any) => ({
      ...att,
      url: att.url ? resolveFileUrl(att.url) : '',
    })),
  };
}

export async function fetchOperatingExpenses(
  expenseType: OperatingExpenseType | 'all',
  projectId?: string
): Promise<{ data: OperatingExpenseRow[]; error: string | null }> {
  try {
    let query = supabase
      .from('operating_expenses')
      .select('*, project:projects(id, name, code)')
      .eq('is_deleted', false)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (expenseType !== 'all') {
      query = query.eq('expense_type', expenseType);
    }

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[operating-expenses] fetch error:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data || []).map(normalizeRow), error: null };
  } catch (err: any) {
    console.error('[operating-expenses] fetch exception:', err);
    return { data: [], error: err?.message || 'Failed to load entries' };
  }
}

export async function fetchDeletedOperatingExpenses(
  expenseType: OperatingExpenseType | 'all'
): Promise<OperatingExpenseRow[]> {
  try {
    let query = supabase
      .from('operating_expenses')
      .select('*, project:projects(id, name, code)')
      .eq('is_deleted', true)
      .order('updated_at', { ascending: false });

    if (expenseType !== 'all') {
      query = query.eq('expense_type', expenseType);
    }

    const { data, error } = await query;

    if (error) return [];
    return (data || []).map(normalizeRow);
  } catch {
    return [];
  }
}

export async function createOperatingExpense(
  payload: CreateOperatingExpensePayload
): Promise<{ data: OperatingExpenseRow | null; error: string | null }> {
  try {
    const cleanAttachments = (payload.attachments || []).map((att) => ({
      ...att,
      url: extractStoragePath(att.url) || att.url,
    }));

    const amount = Number(payload.amount || 0);

    const { data, error } = await supabase
      .from('operating_expenses')
      .insert([
        {
          expense_type: payload.expense_type,
          entry_code: generateEntryCode(payload.expense_type),
          project_id: payload.project_id || null,
          title: payload.title.trim(),
          category: payload.category,
          amount,
          payment_method: payload.payment_method,
          expense_date: payload.expense_date,
          reference_no: payload.reference_no?.trim() || null,
          notes: payload.notes?.trim() || null,
          custom_fields: (payload.custom_fields || [])
            .filter((f) => f.label.trim() || f.value.trim())
            .map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
          attachments: cleanAttachments,
          created_by: payload.created_by || null,
          is_deleted: false,
        },
      ])
      .select('*, project:projects(id, name, code)')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: normalizeRow(data), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to save entry' };
  }
}

export async function updateOperatingExpense(
  id: string,
  payload: Partial<CreateOperatingExpensePayload>
): Promise<{ data: OperatingExpenseRow | null; error: string | null }> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.project_id !== undefined) updateData.project_id = payload.project_id || null;
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.amount !== undefined) updateData.amount = Number(payload.amount || 0);
    if (payload.payment_method !== undefined) updateData.payment_method = payload.payment_method;
    if (payload.expense_date !== undefined) updateData.expense_date = payload.expense_date;
    if (payload.reference_no !== undefined) updateData.reference_no = payload.reference_no?.trim() || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() || null;
    if (payload.custom_fields !== undefined) {
      updateData.custom_fields = payload.custom_fields
        .filter((f) => f.label.trim() || f.value.trim())
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() }));
    }
    if (payload.attachments !== undefined) {
      updateData.attachments = payload.attachments.map((att) => ({
        ...att,
        url: extractStoragePath(att.url) || att.url,
      }));
    }

    const { data, error } = await supabase
      .from('operating_expenses')
      .update(updateData)
      .eq('id', id)
      .select('*, project:projects(id, name, code)')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: normalizeRow(data), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update entry' };
  }
}

export async function softDeleteOperatingExpense(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('operating_expenses')
    .update({ is_deleted: true })
    .eq('id', id);
  if (error) {
    console.error('[operating-expenses] softDelete error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function restoreOperatingExpense(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('operating_expenses')
    .update({ is_deleted: false })
    .eq('id', id);
  if (error) {
    console.error('[operating-expenses] restore error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function uploadOperatingAttachmentToStorage(
  file: File,
  expenseType: OperatingExpenseType
): Promise<OperatingExpenseAttachment> {
  const preparedFile = await compressFileBeforeUpload(file);
  const cleanName = preparedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `operating-expenses/${expenseType}/${Date.now()}_${cleanName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, preparedFile, { cacheControl: '3600', upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    name: file.name,
    url: resolveFileUrl(filePath),
    type: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
    size: preparedFile.size,
  };
}
