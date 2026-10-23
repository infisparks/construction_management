export type WorkOrderStatus = 'draft' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type WorkOrderRevisionType = 
  | 'initial_agreement' 
  | 'extra_work' 
  | 'scope_addition' 
  | 'rate_revision' 
  | 'deduction';

export type WorkOrderPaymentMode = 
  | 'cash' 
  | 'upi' 
  | 'bank_transfer' 
  | 'cheque' 
  | 'rtgs_neft';

export interface WorkOrderRevision {
  id: string;
  workOrderId: string;
  projectId: string;
  revisionType: WorkOrderRevisionType;
  previousAmount: number;
  additionalAmount: number; // Positive for extra work, negative for deductions
  newTotalAmount: number;
  reason: string; // e.g. "Extra plaster work 1000 area requested by client"
  notes?: string;
  addedBy?: string;
  revisionDate: string; // YYYY-MM-DD
  createdAt: string;
  isDeleted?: boolean;
}

export interface WorkOrderPayment {
  id: string;
  workOrderId: string;
  projectId: string;
  paymentVoucherNo: string;
  paymentDate: string; // YYYY-MM-DD
  amountPaid: number;
  paymentMode: WorkOrderPaymentMode;
  referenceNumber?: string; // Cheque #, UTR, Txn ID
  paidTo: string; // Vendor name or representative
  paidBy?: string; // Supervisor / Cashier
  notes?: string; // e.g. "Part payment for 1st floor plaster completion"
  createdAt: string;
  isDeleted?: boolean;
}

export interface ContractorWorkOrder {
  id: string;
  projectId: string;
  workOrderNumber: string; // e.g. WO-2026-001
  title: string; // e.g. "Internal & External Plastering Work"
  tradeCategory: string; // Plastering, Masonry, Painting, Electrical, etc.
  scopeDescription?: string; // Detailed area/quantity specs
  
  // Vendor / Contractor Profile
  vendorName: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorBankUpi?: string;

  // Timeline
  startDate: string; // YYYY-MM-DD
  expectedCompletionDate?: string; // YYYY-MM-DD
  status: WorkOrderStatus;

  // Commercials & Balances
  initialAmount: number; // Agreed base contract amount
  extraAmount: number; // Sum of extra work variations
  totalRevisedAmount: number; // initialAmount + extraAmount
  totalPaid: number; // Sum of all payouts
  balanceRemaining: number; // totalRevisedAmount - totalPaid
  
  notes?: string;
  revisions?: WorkOrderRevision[];
  payments?: WorkOrderPayment[];
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export const WORK_TRADE_CATEGORIES = [
  'Plastering Work',
  'Masonry & Brickwork',
  'RCC & Shuttering',
  'Steel Reinforcement',
  'Electrical & Wiring',
  'Plumbing & Sanitation',
  'Flooring & Tiling',
  'Painting & Waterproofing',
  'Fabrication & Grills',
  'Carpentry & Woodwork',
  'Excavation & Earthwork',
  'HVAC & Firefighting',
  'General Civil Labour',
  'Other Specialized Work',
] as const;

export type WorkDateFilterPreset = 
  | 'all' 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'this_month' 
  | 'custom';
