import { supabase } from './client';
import { DbProject } from './types';
import { sortProjectsBySequence } from './site-storage';

export interface DashboardExpenseRow {
  id: string;
  project_id: string | null;
  expense_code: string;
  title: string;
  category: string;
  amount: number;
  paid_amount?: number | null;
  expense_date: string;
  payment_method: string;
  payment_status: string;
  vendor_name: string | null;
}

export interface DashboardProductRow {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  storage_location: string | null;
  minimum_alert_stock: number;
  current_stock: number;
}

export interface DashboardInventoryTxRow {
  id: string;
  type: string;
  product_name: string;
  quantity: number;
  unit: string;
  total_amount: number | null;
  transaction_date: string;
  location: string | null;
}

export interface DashboardDocumentRow {
  id: string;
  project_id: string | null;
  document_no: string | null;
  title: string;
  category: string;
  status: string;
  file_size: number;
  created_at: string;
}

export interface DashboardTaskRow {
  id: string;
  project_id: string | null;
  plan_name: string;
  plan_type: string;
  plan_status: string;
  plan_progress: number;
  is_critical: boolean;
  variance_days: number;
  planned_end_date: string | null;
}

export interface DashboardOperatingExpenseRow {
  id: string;
  expense_type: 'petty_cash' | 'other_expense';
  project_id: string | null;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
}

export interface DirectorDashboardData {
  projects: DbProject[];
  expenses: DashboardExpenseRow[];
  operatingExpenses: DashboardOperatingExpenseRow[];
  products: DashboardProductRow[];
  inventoryTx: DashboardInventoryTxRow[];
  documents: DashboardDocumentRow[];
  tasks: DashboardTaskRow[];
  fetchedAt: string;
}

/**
 * Fetches all Director Dashboard datasets in parallel using minimal column projections
 * for maximum speed.
 */
export async function fetchDirectorDashboardData(): Promise<DirectorDashboardData> {
  const [
    projectsRes,
    expensesRes,
    operatingRes,
    productsRes,
    inventoryTxRes,
    documentsRes,
    tasksRes,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, serial_no, sequence_order, name, code, location, client_name, is_deleted, created_at, updated_at')
      .eq('is_deleted', false)
      .order('serial_no', { ascending: true }),

    supabase
      .from('site_expenses')
      .select('id, project_id, expense_code, title, category, amount, paid_amount, expense_date, payment_method, payment_status, vendor_name')
      .eq('is_deleted', false)
      .order('expense_date', { ascending: false }),

    supabase
      .from('operating_expenses')
      .select('id, expense_type, project_id, title, category, amount, expense_date, payment_method')
      .eq('is_deleted', false)
      .order('expense_date', { ascending: false }),

    supabase
      .from('profile_product')
      .select('id, code, name, category, unit, storage_location, minimum_alert_stock, current_stock')
      .eq('is_deleted', false)
      .order('name', { ascending: true }),

    supabase
      .from('inventory_transactions')
      .select('id, type, product_name, quantity, unit, total_amount, transaction_date, location')
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false })
      .limit(500),

    supabase
      .from('project_files')
      .select('id, project_id, document_no, title, category, status, file_size, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),

    supabase
      .from('plan_tasks')
      .select('id, project_id, plan_name, plan_type, plan_status, plan_progress, is_critical, variance_days, planned_end_date')
      .eq('is_deleted', false),
  ]);

  if (projectsRes.error) console.error('[dashboard] projects error:', projectsRes.error.message);
  if (expensesRes.error) console.error('[dashboard] expenses error:', expensesRes.error.message);
  if (operatingRes.error) console.warn('[dashboard] operating_expenses note:', operatingRes.error.message);
  if (productsRes.error) console.error('[dashboard] products error:', productsRes.error.message);
  if (inventoryTxRes.error) console.error('[dashboard] inventoryTx error:', inventoryTxRes.error.message);
  if (documentsRes.error) console.error('[dashboard] documents error:', documentsRes.error.message);
  if (tasksRes.error) console.error('[dashboard] tasks error:', tasksRes.error.message);

  const rawProjects = (projectsRes.data || []) as DbProject[];
  const projects = sortProjectsBySequence(rawProjects);

  return {
    projects,
    expenses: (expensesRes.data || []) as DashboardExpenseRow[],
    operatingExpenses: (operatingRes.error ? [] : operatingRes.data || []).map((o: any) => ({
      ...o,
      amount: Number(o.amount ?? 0),
    })) as DashboardOperatingExpenseRow[],
    products: (productsRes.data || []).map((p: any) => ({
      ...p,
      minimum_alert_stock: Number(p.minimum_alert_stock ?? 0),
      current_stock: Number(p.current_stock ?? 0),
    })),
    inventoryTx: (inventoryTxRes.data || []).map((tx: any) => ({
      ...tx,
      quantity: Number(tx.quantity ?? 0),
      total_amount: tx.total_amount != null ? Number(tx.total_amount) : null,
    })),
    documents: (documentsRes.data || []).map((d: any) => ({
      ...d,
      file_size: Number(d.file_size ?? 0),
    })),
    tasks: (tasksRes.data || []).map((t: any) => ({
      ...t,
      plan_progress: Number(t.plan_progress ?? 0),
      variance_days: Number(t.variance_days ?? 0),
    })),
    fetchedAt: new Date().toISOString(),
  };
}
