import { supabase } from './client';
import { SiteExpense, ExpensePaymentMethod, ExpensePaymentStatus } from './types';
import { ProfileVendor, fetchProfileVendors } from './profile-services';

export interface CreateExpensePayload {
  title: string;
  category: string;
  amount: number;
  expense_date?: string;
  payment_method?: ExpensePaymentMethod;
  payment_status?: ExpensePaymentStatus;
  vendor_id?: string | null;
  vendor_name?: string | null;
  paid_by?: string | null;
  bill_number?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  project_id?: string | null;
}

export interface ExpenseSummaryStats {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  allTimeTotal: number;
  allTimeCount: number;
  paidTotal: number;
  pendingTotal: number;
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
export async function fetchSiteExpenses(projectId?: string): Promise<SiteExpense[]> {
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

    const { data, error } = await query;
    if (error) {
      console.error('[expense-services] Error fetching site expenses:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount) || 0,
    })) as SiteExpense[];
  } catch (err) {
    console.error('[expense-services] Exception in fetchSiteExpenses:', err);
    return [];
  }
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

    const recordToInsert = {
      expense_code: expenseCode,
      project_id: payload.project_id || null,
      title: payload.title.trim(),
      category: payload.category || 'Petty Cash',
      amount: Number(payload.amount) || 0,
      expense_date: payload.expense_date || todayStr,
      payment_method: payload.payment_method || 'cash',
      payment_status: payload.payment_status || 'paid',
      vendor_id: payload.vendor_id || null,
      vendor_name: payload.vendor_name ? payload.vendor_name.trim() : null,
      paid_by: payload.paid_by ? payload.paid_by.trim() : null,
      bill_number: payload.bill_number ? payload.bill_number.trim() : null,
      receipt_url: payload.receipt_url || null,
      notes: payload.notes ? payload.notes.trim() : null,
      is_deleted: false,
    };

    const { data, error } = await supabase
      .from('site_expenses')
      .insert(recordToInsert)
      .select()
      .single();

    if (error) {
      console.error('[expense-services] Error creating site expense:', error.message);
      return { data: null, error: error.message };
    }

    return {
      data: { ...data, amount: Number(data.amount) || 0 } as SiteExpense,
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
 * Computes live summary statistics from expenses list.
 */
export function calculateExpenseSummary(expenses: SiteExpense[]): ExpenseSummaryStats {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  let todayTotal = 0;
  let todayCount = 0;
  let monthTotal = 0;
  let monthCount = 0;
  let allTimeTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    allTimeTotal += amt;

    if (exp.expense_date === todayStr) {
      todayTotal += amt;
      todayCount += 1;
    }

    if (exp.expense_date && exp.expense_date.startsWith(currentMonthPrefix)) {
      monthTotal += amt;
      monthCount += 1;
    }

    if (exp.payment_status === 'paid') {
      paidTotal += amt;
    } else {
      pendingTotal += amt;
    }
  }

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    allTimeTotal,
    allTimeCount: expenses.length,
    paidTotal,
    pendingTotal,
  };
}
