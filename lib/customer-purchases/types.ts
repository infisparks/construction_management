export interface PurchaseImageAttachment {
  name: string;
  url: string;
  size?: number;
}

export interface CustomerPayment {
  id: string;
  purchaseId?: string;
  purchase_id?: string;
  projectId?: string | null;
  project_id?: string | null;
  receiptVoucherNo?: string;
  receipt_voucher_no?: string;
  amountPaid?: number;
  amount_paid?: number;
  paymentDate?: string;
  payment_date?: string;
  paymentMode?: string;
  payment_mode?: string;
  referenceNo?: string | null;
  reference_no?: string | null;
  receivedBy?: string | null;
  received_by?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  receipt_url?: string | null;
  createdByUserId?: string | null;
  created_by_user_id?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
}

export interface CustomerPurchase {
  id: string;
  projectId?: string;
  project_id?: string;
  dealNumber?: string;
  deal_number?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string | null;
  customer_phone?: string | null;
  customerEmail?: string | null;
  customer_email?: string | null;
  customerAddress?: string | null;
  customer_address?: string | null;
  purchaseType?: string;
  purchase_type?: string;
  unitNumber?: string | null;
  unit_number?: string | null;
  totalAmount?: number;
  total_amount?: number;
  totalCollected?: number;
  balanceRemaining?: number;
  notes?: string | null;
  images?: PurchaseImageAttachment[];
  bookingDate?: string;
  booking_date?: string;
  status?: 'active' | 'completed' | 'cancelled';
  createdByUserId?: string | null;
  created_by_user_id?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
  payments?: CustomerPayment[];
  project?: {
    id: string;
    name: string;
    code?: string | null;
    serial_no?: number;
  };
}

export const DEFAULT_PURCHASE_TYPES = [
  'Room',
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  'Commercial Shop',
  'Office Space',
  'Plot / Land',
  'Penthouse',
  'Studio Apartment',
  'Other',
] as const;

export const DEFAULT_PAYMENT_MODES = [
  'Cash',
  'Online / Bank Transfer',
  'UPI / GPay / PhonePe',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cheque',
  'RTGS / NEFT',
] as const;
