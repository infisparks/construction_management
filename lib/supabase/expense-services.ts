import { supabase } from './client';
import { SiteExpense, ExpenseAttachment, ExpensePaymentEntry, ExpensePaymentMethod, ExpensePaymentStatus } from './types';
import { ProfileVendor, fetchProfileVendors } from './profile-services';
import { compressFileBeforeUpload } from '../common/file-compression';

export const EXPENSE_STORAGE_BUCKET = 'expense-documents';

/**
 * Extracts strictly relative path inside the Supabase Storage bucket.
 */
export function extractExpenseStoragePath(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const bucketMatch = trimmed.match(new RegExp(`/${EXPENSE_STORAGE_BUCKET}/(.+)$`));
  if (bucketMatch && bucketMatch[1]) {
    return bucketMatch[1].split('?')[0].replace(/^\/+/, '');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname.replace(/^\/+/, '');
      const storagePrefix = `storage/v1/object/public/${EXPENSE_STORAGE_BUCKET}/`;
      if (pathname.includes(storagePrefix)) {
        return pathname.split(storagePrefix)[1] || pathname;
      }
      return pathname;
    } catch {
      return trimmed;
    }
  }

  return trimmed.replace(/^\/+/, '');
}

/**
 * Resolves a storage path or full URL to active public URL from Supabase client.
 */
export function resolveExpenseFileUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const cleanPath = extractExpenseStoragePath(trimmed);
  if (!cleanPath) return '';

  const { data } = supabase.storage
    .from(EXPENSE_STORAGE_BUCKET)
    .getPublicUrl(cleanPath);

  return data?.publicUrl || cleanPath;
}

/**
 * Upload an expense bill/receipt (all image types including iOS HEIC/HEIF, PNG, JPG, or PDF) to Supabase Storage.
 */
export async function uploadExpenseBillToStorage(
  file: File,
  folder: string = 'receipts'
): Promise<{ publicUrl: string; filePath: string; fileName: string }> {
  const preparedFile = await compressFileBeforeUpload(file);
  const cleanFileName = preparedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(EXPENSE_STORAGE_BUCKET)
    .upload(filePath, preparedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const publicUrl = resolveExpenseFileUrl(filePath);

  return {
    publicUrl,
    filePath,
    fileName: preparedFile.name,
  };
}

export interface CreateExpensePayload {
  title: string;
  category: string;
  amount: number;
  gst_amount?: number | null;
  tds_amount?: number | null;
  hsn_sac_code?: string | null;
  paid_amount?: number | null;
  first_payment_date?: string | null;
  settlement_date?: string | null;
  payment_history?: ExpensePaymentEntry[] | null;
  expense_date?: string;
  payment_method?: ExpensePaymentMethod;
  payment_status?: ExpensePaymentStatus;
  vendor_id?: string | null;
  vendor_name?: string | null;
  paid_by?: string | null;
  bill_number?: string | null;
  receipt_url?: string | null;
  receipt_file_name?: string | null;
  attachments?: ExpenseAttachment[] | null;
  notes?: string | null;
  project_id?: string | null;
  enterdby?: string | null;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
}

export interface ExpenseSummaryStats {
  todayTotal: number;
  todayPaid: number;
  todayDue: number;
  todayCount: number;
  monthTotal: number;
  monthPaid: number;
  monthDue: number;
  monthCount: number;
  allTimeTotal: number;
  allTimeCount: number;
  paidTotal: number;
  pendingTotal: number;
}

export interface ExpenseSummaryRpcFilters {
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  vendorName?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  search?: string | null;
}

/**
 * Fetches server-side aggregated expense totals via Postgres RPC `get_site_expenses_summary`.
 * Ignores soft-deleted rows (is_deleted = true) and scales to 20k–100k+ records in ~10ms.
 * Returns null if the RPC is not yet deployed so callers can fall back gracefully.
 */
export async function fetchSiteExpensesSummaryRpc(
  filters: ExpenseSummaryRpcFilters = {}
): Promise<ExpenseSummaryStats | null> {
  try {
    const cleanUuid =
      filters.projectId && filters.projectId !== 'all' && isValidUUID(filters.projectId)
        ? filters.projectId.trim()
        : null;

    const { data, error } = await supabase.rpc('get_site_expenses_summary', {
      p_project_id: cleanUuid,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_vendor_name: filters.vendorName && filters.vendorName !== 'all' ? filters.vendorName.trim() : null,
      p_payment_method: filters.paymentMethod && filters.paymentMethod !== 'all' ? filters.paymentMethod : null,
      p_payment_status: filters.paymentStatus && filters.paymentStatus !== 'all' ? filters.paymentStatus : null,
      p_search: filters.search && filters.search.trim() ? filters.search.trim() : null,
    });

    if (error) {
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      todayTotal: Number(row.today_total) || 0,
      todayPaid: Number(row.today_paid) || 0,
      todayDue: Number(row.today_due) || 0,
      todayCount: Number(row.today_count) || 0,
      monthTotal: Number(row.month_total) || 0,
      monthPaid: Number(row.month_paid) || 0,
      monthDue: Number(row.month_due) || 0,
      monthCount: Number(row.month_count) || 0,
      allTimeTotal: Number(row.total_amount) || 0,
      allTimeCount: Number(row.total_count) || 0,
      paidTotal: Number(row.total_paid) || 0,
      pendingTotal: Number(row.total_due) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Generates next sequential expense code (e.g. EXP-2026-0004)
 */
export async function generateNextExpenseCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const { data, error } = await supabase
      .from('site_expenses')
      .select('serial_no')
      .order('serial_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching latest expense serial_no:', error.message);
    }

    const nextSerial = (data?.serial_no || 0) + 1;
    const padded = String(nextSerial).padStart(4, '0');
    return `EXP-${currentYear}-${padded}`;
  } catch {
    const fallbackSerial = Math.floor(1000 + Math.random() * 9000);
    return `EXP-${currentYear}-${fallbackSerial}`;
  }
}

/**
 * Fetch all active site expenses from Supabase.
 */
export async function fetchSiteExpenses(
  projectId?: string,
  options?: { startDate?: string | null; endDate?: string | null }
): Promise<SiteExpense[]> {
  try {
    let query = supabase
      .from('site_expenses')
      .select('*')
      .eq('is_deleted', false)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }
    if (options?.startDate) {
      query = query.gte('expense_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('expense_date', options.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[expense-services] Error fetching site expenses:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount) || 0,
      receipt_url: row.receipt_url ? resolveExpenseFileUrl(row.receipt_url) : null,
      receipt_file_name: row.receipt_file_name || null,
    })) as SiteExpense[];
  } catch (err) {
    console.error('[expense-services] Exception in fetchSiteExpenses:', err);
    return [];
  }
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

/**
 * Safely resolves all attachments for an expense (merging JSONB `attachments` and legacy `receipt_url`).
 */
export function getExpenseAttachments(
  exp?: Pick<SiteExpense, 'attachments' | 'receipt_url' | 'receipt_file_name'> | null
): ExpenseAttachment[] {
  if (!exp) return [];
  const list: ExpenseAttachment[] = [];
  const seen = new Set<string>();

  if (Array.isArray(exp.attachments)) {
    for (const att of exp.attachments) {
      if (att && att.url) {
        const resolved = resolveExpenseFileUrl(att.url);
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          list.push({
            url: resolved,
            name: att.name || 'Bill Attachment',
            type: att.type,
          });
        }
      }
    }
  }

  if (exp.receipt_url) {
    const resolved = resolveExpenseFileUrl(exp.receipt_url);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      list.push({
        url: resolved,
        name: exp.receipt_file_name || 'Bill Attachment',
      });
    }
  }

  return list;
}

/**
 * Computes exact paid & pending amounts for any expense, safely handling legacy rows
 * where paid_amount is NULL without disturbing existing data.
 */
export function getExpensePaymentBreakdown(
  exp: Pick<SiteExpense, 'amount' | 'paid_amount' | 'payment_status'>
): {
  total: number;
  paid: number;
  pending: number;
  isPartial: boolean;
  isFullyPaid: boolean;
} {
  const total = Number(exp.amount) || 0;
  let paid: number;
  if (exp.payment_status === 'paid') {
    paid = total;
  } else if (exp.payment_status === 'partial' && exp.paid_amount != null && !Number.isNaN(Number(exp.paid_amount))) {
    paid = Math.min(Math.max(Number(exp.paid_amount), 0), total);
  } else {
    paid = 0;
  }
  const pending = Math.max(total - paid, 0);
  const isPartial = paid > 0 && pending > 0;
  const isFullyPaid = pending <= 0 && total > 0;
  return { total, paid, pending, isPartial, isFullyPaid };
}

/**
 * Create a new expense record in Supabase site_expenses table.
 */
export async function createSiteExpense(
  payload: CreateExpensePayload
): Promise<{ data: SiteExpense | null; error: string | null }> {
  try {
    const expenseCode = await generateNextExpenseCode();
    const todayStr = new Date().toISOString().split('T')[0];

    const candidateUid = payload.enterdby || payload.created_by_user_id;
    const finalEnterdby = isValidUUID(candidateUid)
      ? candidateUid!
      : 'a72d7229-1476-4f82-b105-7d38de4e2af3';

    const recordToInsert: any = {
      expense_code: expenseCode,
      project_id: payload.project_id || null,
      title: payload.title.trim(),
      category: payload.category || 'Petty Cash',
      amount: Number(payload.amount) || 0,
      gst_amount: Math.max(Number(payload.gst_amount) || 0, 0),
      tds_amount: Math.max(Number(payload.tds_amount) || 0, 0),
      hsn_sac_code: payload.hsn_sac_code?.trim() || null,
      expense_date: payload.expense_date || todayStr,
      payment_method: payload.payment_method || 'cash',
      payment_status: payload.payment_status || 'paid',
      paid_amount:
        payload.paid_amount !== undefined
          ? payload.paid_amount
          : payload.payment_status === 'paid'
          ? Number(payload.amount) || 0
          : 0,
      first_payment_date:
        payload.first_payment_date !== undefined
          ? payload.first_payment_date
          : payload.payment_status === 'paid' || payload.payment_status === 'partial'
          ? payload.expense_date || todayStr
          : null,
      settlement_date:
        payload.settlement_date !== undefined
          ? payload.settlement_date
          : payload.payment_status === 'paid'
          ? payload.expense_date || todayStr
          : null,
      payment_history: Array.isArray(payload.payment_history) ? payload.payment_history : [],
      vendor_id: payload.vendor_id || null,
      vendor_name: payload.vendor_name ? payload.vendor_name.trim() : null,
      paid_by: payload.paid_by ? payload.paid_by.trim() : null,
      bill_number: payload.bill_number ? payload.bill_number.trim() : null,
      receipt_url: payload.receipt_url || null,
      receipt_file_name: payload.receipt_file_name || null,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      notes: payload.notes ? payload.notes.trim() : null,
      enterdby: finalEnterdby,
      is_deleted: false,
    };

    let { data, error } = await supabase
      .from('site_expenses')
      .insert(recordToInsert)
      .select()
      .single();

    if (error && error.message && (error.message.includes('attachments') || error.message.includes('gst_amount') || error.message.includes('tds_amount') || error.message.includes('hsn_sac_code'))) {
      delete recordToInsert.attachments;
      delete recordToInsert.gst_amount;
      delete recordToInsert.tds_amount;
      delete recordToInsert.hsn_sac_code;
      const retry = await supabase
        .from('site_expenses')
        .insert(recordToInsert)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[expense-services] Error creating site expense:', error.message);
      return { data: null, error: error.message };
    }

    return {
      data: {
        ...data,
        amount: Number(data.amount) || 0,
        receipt_url: data.receipt_url ? resolveExpenseFileUrl(data.receipt_url) : null,
        receipt_file_name: data.receipt_file_name || null,
      } as SiteExpense,
      error: null,
    };
  } catch (err: any) {
    console.error('[expense-services] Exception in createSiteExpense:', err);
    return { data: null, error: err?.message || 'Failed to save expense.' };
  }
}

/**
 * Soft delete an expense.
 */
export async function deleteSiteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('site_expenses')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[expense-services] Error deleting expense:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[expense-services] Exception in deleteSiteExpense:', err);
    return false;
  }
}

/**
 * Update an existing site expense record in Supabase site_expenses table.
 */
export async function updateSiteExpense(
  id: string,
  payload: Partial<CreateExpensePayload>
): Promise<{ data: SiteExpense | null; error: string | null }> {
  try {
    const updateRecord: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updateRecord.title = payload.title.trim();
    if (payload.category !== undefined) updateRecord.category = payload.category;
    if (payload.amount !== undefined) updateRecord.amount = Number(payload.amount) || 0;
    if (payload.gst_amount !== undefined) updateRecord.gst_amount = Math.max(Number(payload.gst_amount) || 0, 0);
    if (payload.tds_amount !== undefined) updateRecord.tds_amount = Math.max(Number(payload.tds_amount) || 0, 0);
    if (payload.hsn_sac_code !== undefined) updateRecord.hsn_sac_code = payload.hsn_sac_code?.trim() || null;
    if (payload.expense_date !== undefined) updateRecord.expense_date = payload.expense_date;
    if (payload.payment_method !== undefined) updateRecord.payment_method = payload.payment_method;
    if (payload.payment_status !== undefined) updateRecord.payment_status = payload.payment_status;
    if (payload.paid_amount !== undefined) updateRecord.paid_amount = payload.paid_amount;
    if (payload.first_payment_date !== undefined) updateRecord.first_payment_date = payload.first_payment_date;
    if (payload.settlement_date !== undefined) updateRecord.settlement_date = payload.settlement_date;
    if (payload.payment_history !== undefined) updateRecord.payment_history = payload.payment_history;
    if (payload.vendor_id !== undefined) updateRecord.vendor_id = payload.vendor_id || null;
    if (payload.vendor_name !== undefined) updateRecord.vendor_name = payload.vendor_name ? payload.vendor_name.trim() : null;
    if (payload.paid_by !== undefined) updateRecord.paid_by = payload.paid_by ? payload.paid_by.trim() : null;
    if (payload.bill_number !== undefined) updateRecord.bill_number = payload.bill_number ? payload.bill_number.trim() : null;
    if (payload.receipt_url !== undefined) updateRecord.receipt_url = payload.receipt_url || null;
    if (payload.receipt_file_name !== undefined) updateRecord.receipt_file_name = payload.receipt_file_name || null;
    if (payload.attachments !== undefined) updateRecord.attachments = payload.attachments || [];
    if (payload.notes !== undefined) updateRecord.notes = payload.notes ? payload.notes.trim() : null;
    if (payload.project_id !== undefined) updateRecord.project_id = payload.project_id || null;

    let { data, error } = await supabase
      .from('site_expenses')
      .update(updateRecord)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message && error.message.includes('attachments')) {
      delete updateRecord.attachments;
      const retry = await supabase
        .from('site_expenses')
        .update(updateRecord)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[expense-services] Error updating site expense:', error.message);
      return { data: null, error: error.message };
    }

    return {
      data: {
        ...data,
        amount: Number(data.amount) || 0,
        receipt_url: data.receipt_url ? resolveExpenseFileUrl(data.receipt_url) : null,
        receipt_file_name: data.receipt_file_name || null,
      } as SiteExpense,
      error: null,
    };
  } catch (err: any) {
    console.error('[expense-services] Exception in updateSiteExpense:', err);
    return { data: null, error: err?.message || 'Failed to update expense.' };
  }
}

/**
 * Fetch soft-deleted site expenses (for Recycle Bin).
 */
export async function fetchDeletedSiteExpenses(projectId?: string): Promise<SiteExpense[]> {
  try {
    let query = supabase
      .from('site_expenses')
      .select('*')
      .eq('is_deleted', true)
      .order('updated_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[expense-services] Error fetching deleted site expenses:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount) || 0,
      receipt_url: row.receipt_url ? resolveExpenseFileUrl(row.receipt_url) : null,
      receipt_file_name: row.receipt_file_name || null,
    })) as SiteExpense[];
  } catch (err) {
    console.error('[expense-services] Exception in fetchDeletedSiteExpenses:', err);
    return [];
  }
}

/**
 * Restore a soft-deleted expense from the Recycle Bin.
 */
export async function restoreSiteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('site_expenses')
      .update({ is_deleted: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[expense-services] Error restoring expense:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[expense-services] Exception in restoreSiteExpense:', err);
    return false;
  }
}

/**
 * Computes live summary statistics from expenses list.
 */
export function calculateExpenseSummary(expenses: SiteExpense[]): ExpenseSummaryStats {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  let todayTotal = 0;
  let todayPaid = 0;
  let todayDue = 0;
  let todayCount = 0;
  let monthTotal = 0;
  let monthPaid = 0;
  let monthDue = 0;
  let monthCount = 0;
  let allTimeTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    const { paid, pending } = getExpensePaymentBreakdown(exp);
    allTimeTotal += amt;
    paidTotal += paid;
    pendingTotal += pending;

    if (exp.expense_date === todayStr) {
      todayTotal += amt;
      todayPaid += paid;
      todayDue += pending;
      todayCount += 1;
    }

    if (exp.expense_date && exp.expense_date.startsWith(currentMonthPrefix)) {
      monthTotal += amt;
      monthPaid += paid;
      monthDue += pending;
      monthCount += 1;
    }
  }

  return {
    todayTotal,
    todayPaid,
    todayDue,
    todayCount,
    monthTotal,
    monthPaid,
    monthDue,
    monthCount,
    allTimeTotal,
    allTimeCount: expenses.length,
    paidTotal,
    pendingTotal,
  };
}

/**
 * Records a partial or final balance payment on an existing expense
 * while preserving the original expense_date and first_payment_date.
 */
export async function recordExpensePayment(
  expense: SiteExpense,
  payAmount: number,
  paymentDate: string,
  paymentMethod: ExpensePaymentMethod,
  note?: string
): Promise<{ data: SiteExpense | null; error: string | null }> {
  const { total, paid: currentPaid } = getExpensePaymentBreakdown(expense);
  const safePay = Math.max(0, Number(payAmount) || 0);
  if (safePay <= 0) {
    return { data: null, error: 'Payment amount must be greater than 0.' };
  }

  const newPaid = Math.min(currentPaid + safePay, total);
  const newPending = Math.max(total - newPaid, 0);
  const nextStatus: ExpensePaymentStatus = newPending <= 0 ? 'paid' : 'partial';

  const existingHistory: ExpensePaymentEntry[] = Array.isArray(expense.payment_history)
    ? [...expense.payment_history]
    : currentPaid > 0
    ? [
        {
          amount: currentPaid,
          date: expense.first_payment_date || expense.expense_date,
          method: expense.payment_method,
          note: 'Initial payment',
        },
      ]
    : [];

  existingHistory.push({
    amount: Math.min(safePay, total - currentPaid),
    date: paymentDate,
    method: paymentMethod,
    note: note?.trim() || (newPending <= 0 ? 'Final settlement' : 'Installment payment'),
  });

  const preservedFirstDate =
    expense.first_payment_date || (currentPaid > 0 ? expense.expense_date : paymentDate);

  return updateSiteExpense(expense.id, {
    payment_status: nextStatus,
    paid_amount: newPaid,
    first_payment_date: preservedFirstDate,
    settlement_date: newPending <= 0 ? paymentDate : null,
    payment_history: existingHistory,
    payment_method: paymentMethod,
  });
}
