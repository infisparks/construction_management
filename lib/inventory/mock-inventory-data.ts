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
  storageLocation: string; // e.g. "Godown A - Shed 2", "Open Rebar Yard Bay 3"
  hsnCode?: string;
  brand?: string;
  lastUpdated: string;
}

export type InventoryTransactionType = 'check_in' | 'check_out' | 'return' | 'damage';

export interface InventoryTransaction {
  id: string;
  voucherNumber: string; // e.g. "GRN-2026-0142", "MIN-2026-0089", "RET-2026-0012", "DMG-2026-0005"
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
  runningStockBalance: number; // Stock balance right after this transaction
  
  // Specific Reasons
  returnReason?: string; // Reason for returning material to vendor
  damageReason?: string; // Reason for damage / scrap write-off

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
  floorZone?: string; // e.g. "Tower A - 3rd Floor Slab"
  purpose?: string;
  authorizedBy?: string; // Site Engineer / PM
  isReturnable?: boolean;

  // General audit attributes
  receivedOrIssuedBy: string; // Storekeeper name
  notes?: string;
}

export type VendorPartyType = 'vendor' | 'contractor' | 'other';

export interface VendorProfile {
  id: string;
  name: string; // Only name is compulsory
  type: VendorPartyType; // 'vendor' | 'contractor' | 'other'
  phone?: string;
  address?: string;
  location?: string; // City / Site location
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

// All static mock data removed. Data is purely loaded live from Supabase (profile_product, profile_vendor, inventory_transactions).
export const INITIAL_INVENTORY_SUPPLIERS: InventorySupplier[] = [];
export const INITIAL_INVENTORY_SUBCONTRACTORS: InventorySubcontractor[] = [];
export const INITIAL_VENDOR_PROFILES: VendorProfile[] = [];
export const INITIAL_CONSTRUCTION_MATERIALS: ConstructionMaterial[] = [];
export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];
