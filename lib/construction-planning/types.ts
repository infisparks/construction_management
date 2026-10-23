export type TaskType = 'work_package' | 'task' | 'milestone' | 'inspection';

export type ScheduleStatus = 
  | 'not_started' 
  | 'ready_to_start' 
  | 'in_progress' 
  | 'at_risk' 
  | 'delayed' 
  | 'blocked' 
  | 'completed' 
  | 'on_hold';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lagDays: number;
}

export interface ConstructionTask {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: TaskType;
  parentTaskId: string | null;
  status: ScheduleStatus;
  progress: number; // 0 to 100
  floor?: string;
  responsible: string;
  isCritical: boolean;
  totalFloatDays: number;
  
  // Baseline & Planned Schedule
  plannedStartDate: string; // YYYY-MM-DD
  plannedEndDate: string; // YYYY-MM-DD
  plannedDurationDays: number;
  
  // Actual Site Execution
  actualStartDate: string | null;
  actualEndDate: string | null;
  actualDurationDays?: number;
  
  // Schedule Forecasting
  forecastStartDate: string;
  forecastEndDate: string;
  varianceDays: number; // Positive = delayed, Negative/0 = on track
  
  // Quantity tracking (optional)
  plannedQuantity?: number;
  completedQuantity?: number;
  quantityUnit?: string;
  
  notes?: string;
  blockerReason?: string;
  sortOrder: number;
  isDeleted?: boolean;
}

export interface DailyProgressEntry {
  id: string;
  taskId: string;
  reportDate: string; // YYYY-MM-DD
  workCompletedToday: string;
  previousProgress: number;
  newProgress: number;
  quantityCompletedToday?: number;
  quantityUnit?: string;
  workersCount?: number;
  materialUsage?: string;
  supervisorName: string;
  status: ScheduleStatus;
  issues?: string;
  remarks?: string;
  photos?: string[];
  createdAt: string;
}

export interface TaskIssue {
  id: string;
  taskId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  reportedBy: string;
  reportedDate: string;
  resolutionNotes?: string;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  durationMonths: number;
  plannedStartDate: string;
  plannedCompletionDate: string;
  forecastCompletionDate: string;
  clientName: string;
  generalContractor: string;
  overallProgress: number;
}

export interface RecoveryScenario {
  id: string;
  name: string;
  description: string;
  affectedTaskCodes: string[];
  currentForecastDate: string;
  simulatedForecastDate: string;
  recoveredDays: number;
  strategy: 'parallel_execution' | 'fast_tracking' | 'additional_crews' | 'extended_shifts' | 'lead_time_compression';
  assumptions: string[];
  risks: string[];
}

export type ViewMode = 
  | 'list' 
  | 'gantt' 
  | 'critical' 
  | 'progress' 
  | 'milestones' 
  | 'materials' 
  | 'billing' 
  | 'subcontractor-bills' 
  | 'files-archive'
  | 'expenses'
  | 'contractor-work-orders';

// Module 3 — Files Archive (Project Documents & Media Repository)
export type FileCategory =
  | 'Project information'
  | 'Legal and statutory documents'
  | 'Contracts and agreements'
  | 'Architectural drawings'
  | 'Structural and RCC drawings'
  | 'MEP drawings'
  | 'BOQs and cost estimates'
  | 'Quotations and purchase orders'
  | 'Bills, invoices and payment records'
  | 'Site photographs and reports'
  | 'Meeting minutes and correspondence'
  | 'Quality, safety and handover documents'
  | (string & {});

export type FileType = 'pdf' | 'image' | 'spreadsheet' | 'document' | 'dwg' | 'other';
export type FileStatus = 'approved' | 'under_review' | 'draft' | 'superseded';

export interface ProjectFile {
  id: string;
  project_id: string;
  project_code?: string;
  project?: {
    id: string;
    serial_no: number;
    name: string;
  };
  document_no: string;
  title: string;
  file_name: string;
  description?: string;
  category: FileCategory;
  file_type: FileType;
  file_size: number;
  file_url?: string;
  storage_path?: string; // Relative storage path within bucket (domain-agnostic for self-hosted migration)
  uploaded_by?: string;
  version: string;
  status: FileStatus;
  tags: string[];
  building_floor?: string;
  contractor_name?: string;
  task_id?: string;
  task_code?: string;
  is_starred?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at?: string;
}

// Material Management (Powerplay / Onsite model)
export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: 'Cement' | 'Steel & Rebar' | 'Aggregates & Sand' | 'Masonry & Blocks' | 'RMC' | 'Finishes & Paint' | 'Plumbing & Electrical';
  unit: string;
  currentStock: number;
  minimumAlertStock: number;
  averageUnitRate: number; // In INR / currency
  gstRate: number; // 0, 5, 12, 18, 28
  lastUpdated: string;
}

export interface MaterialTransaction {
  id: string;
  type: 'inward' | 'outward';
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  date: string;
  supplierPartyId?: string;
  supplierPartyName?: string;
  vehicleChallanNo?: string;
  taskId?: string;
  taskCode?: string;
  taskName?: string;
  floor?: string;
  contractorPartyId?: string;
  contractorPartyName?: string;
  unitRate?: number;
  totalAmount?: number;
  recordedBy: string;
  notes?: string;
}

// Parties Khata (Vendors & Subcontractors)
export interface Party {
  id: string;
  name: string;
  category: 'subcontractor' | 'material_supplier' | 'equipment_rental' | 'consultant_service';
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  trade: string;
  bankDetails?: string;
  totalBilledAmount: number;
  totalPaidAmount: number;
  currentBalanceDue: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// Invoicing & Billing with full GST options (0% to 28%)
export interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  partyId: string;
  partyName: string;
  partyCategory: 'subcontractor' | 'material_supplier' | 'equipment_rental' | 'consultant_service';
  billType: 'ra_bill_labour' | 'material_purchase' | 'equipment_hire' | 'other';
  taskId?: string;
  taskName?: string;
  description: string;
  baseAmount: number;
  gstRate: 0 | 5 | 12 | 18 | 28;
  gstAmount: number;
  totalAmountWithGst: number;
  tdsDeduction?: number; // 1% or 2%
  retentionDeduction?: number; // e.g. 5%
  netPayable: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMode?: 'neft_rtgs' | 'cheque' | 'upi' | 'cash';
  paymentRef?: string;
  paymentDate?: string;
  notes?: string;
}

// Subcontractor Bill specific models (matching exact mobile/desktop workflow)
export interface SubcontractorBillItem {
  id: string;
  name: string;
  unit: string;
  billedQty: number;
  unbilledQty: number;
  rate: number;
  quantity: number;
  amount: number;
  gstRate?: number; // if item level tax enabled
}

export interface SubcontractorDeductionItem {
  id: string;
  name: string;
  amount: number;
  isSelected: boolean;
}

export interface SubcontractorRetentionItem {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
  isSelected: boolean;
}

export interface SubcontractorBill {
  id: string;
  projectId?: string;
  billNumber: string;
  billDate: string; // YYYY-MM-DD
  dueDate?: string;
  vendorId?: string;
  vendorName: string;
  vendorTrade?: string;
  vendorPhone?: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorBankDetails?: string;
  itemLevelTax: boolean;
  items: SubcontractorBillItem[];
  itemSubtotal: number;
  deductions: SubcontractorDeductionItem[];
  preTaxDeductionTotal: number;
  retentions: SubcontractorRetentionItem[];
  preTaxRetentionTotal: number;
  netSubtotal: number;
  gstRate: number; // 0, 5, 12, 18, 28
  gstAmount: number;
  additionalCharges: number;
  additionalChargesDesc?: string;
  grandTotal: number;
  notes?: string;
  attachments?: { name: string; size?: string; type: 'image' | 'doc'; url?: string }[];
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'partial';
  createdAt: string;
  updatedAt?: string;
}
