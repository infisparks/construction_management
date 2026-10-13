export interface ConstructionMaterial {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 
    | 'Cement & Binders' 
    | 'Steel & Rebar' 
    | 'Aggregates & Sand' 
    | 'Blocks & Masonry' 
    | 'Concrete & RMC' 
    | 'Formwork & Shuttering' 
    | 'Chemicals & Waterproofing' 
    | 'Plumbing & Drainage' 
    | 'Electrical & Conduits' 
    | 'Safety PPE' 
    | 'Site Fuel & Machinery'
    | (string & {});
  unit: 'Bags' | 'MT' | 'Kg' | 'Cu.Ft' | 'Cu.M' | 'Nos' | 'Sheets' | 'Liters' | 'Meters' | 'Coils' | 'Sets' | (string & {});
  currentStock: number;
  minimumAlertStock: number;
  averageUnitRate: number; // In INR ₹
  gstRate: 0 | 5 | 12 | 18 | 28;
  storageLocation: string;
  hsnCode?: string;
  brand?: string;
  lastUpdated: string;
}

export type InventoryTransactionType = 'check_in' | 'check_out' | 'return' | 'damage';

export interface InventoryTransaction {
  id: string;
  voucherNumber: string;
  type: InventoryTransactionType;
  materialId: string;
  materialCode?: string;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  unitRate?: number;
  gstRate?: number;
  gstAmount?: number;
  totalAmount?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  runningStockBalance: number;
  
  // Specific Reasons
  returnReason?: string;
  damageReason?: string;

  // Inward (Check-In) attributes
  supplierId?: string;
  supplierName?: string;
  poNumber?: string;
  challanNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  qcStatus?: 'Passed' | 'Conditional' | 'Rejected';
  unloadingLocation?: string;

  // Outward (Check-Out) attributes
  subcontractorId?: string;
  subcontractorName?: string;
  foremanName?: string;
  wbsTaskId?: string;
  wbsTaskCode?: string;
  wbsTaskName?: string;
  floorZone?: string;
  purpose?: string;
  authorizedBy?: string;
  isReturnable?: boolean;

  // Audit attributes
  receivedOrIssuedBy: string;
  notes?: string;

  // Attached Bill / Document Proof (PNG, PDF, etc.)
  fileUrl?: string;
  fileName?: string;
}

export type VendorPartyType = 'vendor' | 'contractor' | 'other';

export interface VendorProfile {
  id: string;
  name: string;
  type: VendorPartyType;
  phone?: string;
  address?: string;
  location?: string;
  trade?: string;
  contactPerson?: string;
  email?: string;
  gstin?: string;
  notes?: string;
  createdAt: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
  type?: VendorPartyType;
  trade?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  address?: string;
  location?: string;
  notes?: string;
}

export interface InventorySubcontractor {
  id: string;
  name: string;
  type?: VendorPartyType;
  trade?: string;
  foremanName?: string;
  phone?: string;
  address?: string;
  location?: string;
  activeWorkers?: number;
  notes?: string;
}
