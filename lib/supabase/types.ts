export interface DbProject {
  id: string;
  serial_no: number;
  name: string;
  code?: string | null;
  location?: string | null;
  client_name?: string | null;
  principal_contractor?: string | null;
  address: string | null;
  project_person: string | null;
  person_number: string | null;
  user_id: string | null;
  safety_key: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  page?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  name: string;
  value: string[] | any;
}

export type ExpensePaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'petty_cash';
export type ExpensePaymentStatus = 'paid' | 'pending' | 'reimbursable';

export interface SiteExpense {
  id: string;
  serial_no: number;
  expense_code: string;
  project_id?: string | null;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;
  vendor_id?: string | null;
  vendor_name?: string | null;
  paid_by?: string | null;
  receipt_url?: string | null;
  receipt_file_name?: string | null;
  bill_number?: string | null;
  notes?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

