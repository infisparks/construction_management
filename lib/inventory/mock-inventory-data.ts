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

export const INITIAL_INVENTORY_SUPPLIERS: InventorySupplier[] = [
  {
    id: 'sup-1',
    name: 'Shree Cement & Building Materials Supply',
    trade: 'Cement, Sand & Bulk Aggregates',
    phone: '+91 98450 11982',
    email: 'sales@shreebuildingmaterials.in',
    gstin: '27AAECF5521R1ZW',
    city: 'Mumbai',
  },
  {
    id: 'sup-2',
    name: 'Jindal Steel & Alloys Corp',
    trade: 'TMT Rebar Fe550D & Binding Wire',
    phone: '+91 97110 33819',
    email: 'orders@jindalalloys.com',
    gstin: '27AABPJ8821C1ZU',
    city: 'Navi Mumbai',
  },
  {
    id: 'sup-3',
    name: 'ACC Concrete Ready Mix Plant',
    trade: 'RMC M25, M30, M35 Transit Mixers',
    phone: '+91 98200 44102',
    email: 'dispatch@accconcrete.com',
    gstin: '27AAACA1928K1ZZ',
    city: 'Thane',
  },
  {
    id: 'sup-4',
    name: 'UltraLite AAC Blocks & Mortar Ltd',
    trade: 'AAC Blocks 6" & 4", Jointing Chemical',
    phone: '+91 98922 77110',
    email: 'orders@ultraliteblocks.com',
    gstin: '27AABCU7721L1ZM',
    city: 'Bhiwandi',
  },
  {
    id: 'sup-5',
    name: 'Pidilite & Fosroc Construction Chemicals Depot',
    trade: 'Waterproofing, SBR Latex, Admixtures',
    phone: '+91 91671 22904',
    email: 'chem.depot@pidilite-dealers.com',
    gstin: '27AABCP9910D1ZR',
    city: 'Mumbai',
  },
  {
    id: 'sup-6',
    name: 'Bharat Petroleum Site Fuel Depot',
    trade: 'High Speed Diesel (HSD) for DG & JCB',
    phone: '+91 98211 55901',
    email: 'commercial.fuel@bpcl-dealers.com',
    gstin: '27AABCB2219J1ZQ',
    city: 'Mumbai',
  },
  {
    id: 'sup-7',
    name: 'SureSafe Industrial PPE & Tools',
    trade: 'Helmets, Fall Harnesses, Safety Shoes',
    phone: '+91 98334 11200',
    email: 'sales@suresafetools.in',
    gstin: '27AACCS8812F1ZP',
    city: 'Mumbai',
  },
];

export const INITIAL_INVENTORY_SUBCONTRACTORS: InventorySubcontractor[] = [
  {
    id: 'sub-1',
    name: 'M/S Sharma RCC Labour Gang',
    trade: 'RCC Formwork, Shuttering & Bar Bending',
    foremanName: 'Ramprasad Sharma',
    phone: '+91 98201 44512',
    activeWorkers: 38,
  },
  {
    id: 'sub-2',
    name: 'Al-Madina Masonry & Plaster Works',
    trade: 'AAC Block Masonry, Brickwork & Internal Plaster',
    foremanName: 'Ustad Tariq Khan',
    phone: '+91 91672 88491',
    activeWorkers: 24,
  },
  {
    id: 'sub-3',
    name: 'Apex Concrete Pump & Plant Operators',
    trade: 'Concrete Pumping, Tremie & Slab Pouring',
    foremanName: 'Sunil Patil',
    phone: '+91 98920 77162',
    activeWorkers: 12,
  },
  {
    id: 'sub-4',
    name: 'Elite MEP & Electrical Contractors',
    trade: 'Electrical Conduit Chasing, Wiring & DBs',
    foremanName: 'Praveen Nair',
    phone: '+91 98450 33910',
    activeWorkers: 16,
  },
  {
    id: 'sub-5',
    name: 'Supreme Plumbing & Fire Safety Systems',
    trade: 'CPVC Water Supply, SWR Drainage & Fire Lines',
    foremanName: 'Devendra Yadav',
    phone: '+91 98199 44321',
    activeWorkers: 14,
  },
  {
    id: 'sub-6',
    name: 'Site Plant & Heavy Equipment Crew',
    trade: 'Tower Crane, Material Hoist & DG Set Ops',
    foremanName: 'Kishore Shinde',
    phone: '+91 98700 88219',
    activeWorkers: 8,
  },
];

export const INITIAL_VENDOR_PROFILES: VendorProfile[] = [
  ...INITIAL_INVENTORY_SUPPLIERS.map((s) => ({
    id: s.id,
    name: s.name,
    type: 'vendor' as VendorPartyType,
    phone: s.phone,
    address: `${s.trade}, Commercial Complex`,
    location: s.city,
    trade: s.trade,
    email: s.email,
    gstin: s.gstin,
    createdAt: '2026-08-01',
  })),
  ...INITIAL_INVENTORY_SUBCONTRACTORS.map((sub) => ({
    id: sub.id,
    name: sub.name,
    type: 'contractor' as VendorPartyType,
    phone: sub.phone,
    address: 'On-site Labour Camp & Transit Office',
    location: 'Mumbai Project Site',
    trade: sub.trade,
    contactPerson: sub.foremanName,
    createdAt: '2026-08-05',
  })),
  {
    id: 'ven-other-1',
    name: 'Reliable Mobile Crane & Equipment Hire',
    type: 'other' as VendorPartyType,
    phone: '+91 98205 99312',
    address: 'Plot 12, Heavy Machinery Depot, Kalamboli',
    location: 'Navi Mumbai',
    trade: 'Hydra 14T, Boom Placers & JCB Hire',
    contactPerson: 'Suresh Chauhan',
    email: 'rentals@reliablecranes.in',
    gstin: '27AABCR9912E1ZQ',
    createdAt: '2026-08-10',
  },
];

export const INITIAL_CONSTRUCTION_MATERIALS: ConstructionMaterial[] = [
  {
    id: 'mat-1',
    code: 'MAT-CEM-01',
    name: 'Ultratech PPC Cement 53 Grade',
    category: 'Cement & Binders',
    unit: 'Bags',
    currentStock: 480,
    minimumAlertStock: 150,
    averageUnitRate: 385,
    gstRate: 28,
    storageLocation: 'Cement Godown Shed #1 (Waterproof Bay)',
    hsnCode: '252329',
    brand: 'Ultratech',
    lastUpdated: '2026-10-10',
  },
  {
    id: 'mat-2',
    code: 'MAT-CEM-02',
    name: 'Ambuja OPC 53 Grade High Early Strength',
    category: 'Cement & Binders',
    unit: 'Bags',
    currentStock: 95,
    minimumAlertStock: 100, // Trigger low stock alert
    averageUnitRate: 410,
    gstRate: 28,
    storageLocation: 'Cement Godown Shed #1 (Waterproof Bay)',
    hsnCode: '252329',
    brand: 'Ambuja',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-3',
    code: 'MAT-STL-01',
    name: 'JSW Fe550D TMT Rebar 12mm & 16mm',
    category: 'Steel & Rebar',
    unit: 'MT',
    currentStock: 22.5,
    minimumAlertStock: 8.0,
    averageUnitRate: 58500,
    gstRate: 18,
    storageLocation: 'Rebar Yard - Bay A (Covered Tarpaulin)',
    hsnCode: '721420',
    brand: 'JSW Neosteel',
    lastUpdated: '2026-10-08',
  },
  {
    id: 'mat-4',
    code: 'MAT-STL-02',
    name: 'Tata Tiscon Fe550D TMT Rebar 8mm & 10mm (Stirrups)',
    category: 'Steel & Rebar',
    unit: 'MT',
    currentStock: 6.2,
    minimumAlertStock: 7.0, // Trigger low stock alert
    averageUnitRate: 59800,
    gstRate: 18,
    storageLocation: 'Rebar Yard - Bay B',
    hsnCode: '721420',
    brand: 'Tata Tiscon',
    lastUpdated: '2026-10-07',
  },
  {
    id: 'mat-5',
    code: 'MAT-STL-03',
    name: 'GI Binding Wire 18 Gauge',
    category: 'Steel & Rebar',
    unit: 'Kg',
    currentStock: 220,
    minimumAlertStock: 80,
    averageUnitRate: 85,
    gstRate: 18,
    storageLocation: 'Central Store - Tool Room Shelf 3',
    hsnCode: '721720',
    brand: 'Jindal',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-6',
    code: 'MAT-SND-01',
    name: 'Crushed M-Sand (Zone II River Sand Substitute)',
    category: 'Aggregates & Sand',
    unit: 'Cu.Ft',
    currentStock: 1450,
    minimumAlertStock: 500,
    averageUnitRate: 48,
    gstRate: 5,
    storageLocation: 'Aggregate Open Bin #1',
    hsnCode: '250510',
    brand: 'VSI Crushed',
    lastUpdated: '2026-10-10',
  },
  {
    id: 'mat-7',
    code: 'MAT-AGG-01',
    name: 'Coarse Aggregate 20mm Blue Metal Basalt',
    category: 'Aggregates & Sand',
    unit: 'Cu.Ft',
    currentStock: 1100,
    minimumAlertStock: 400,
    averageUnitRate: 44,
    gstRate: 5,
    storageLocation: 'Aggregate Open Bin #2',
    hsnCode: '251710',
    brand: 'Commercial Quarry',
    lastUpdated: '2026-10-10',
  },
  {
    id: 'mat-8',
    code: 'MAT-AGG-02',
    name: 'Coarse Aggregate 10mm Blue Metal',
    category: 'Aggregates & Sand',
    unit: 'Cu.Ft',
    currentStock: 350,
    minimumAlertStock: 400, // Trigger low stock alert
    averageUnitRate: 46,
    gstRate: 5,
    storageLocation: 'Aggregate Open Bin #3',
    hsnCode: '251710',
    brand: 'Commercial Quarry',
    lastUpdated: '2026-10-08',
  },
  {
    id: 'mat-9',
    code: 'MAT-BLK-01',
    name: 'AAC Lightweight Blocks (600 x 200 x 150mm - 6 Inch)',
    category: 'Blocks & Masonry',
    unit: 'Nos',
    currentStock: 3600,
    minimumAlertStock: 1200,
    averageUnitRate: 64,
    gstRate: 12,
    storageLocation: 'Tower A Ground Floor Stacking Zone',
    hsnCode: '681011',
    brand: 'UltraLite',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-10',
    code: 'MAT-BLK-02',
    name: 'AAC Lightweight Blocks (600 x 200 x 100mm - 4 Inch Partition)',
    category: 'Blocks & Masonry',
    unit: 'Nos',
    currentStock: 850,
    minimumAlertStock: 1000, // Trigger low stock alert
    averageUnitRate: 48,
    gstRate: 12,
    storageLocation: 'Tower B Ground Floor Stacking Zone',
    hsnCode: '681011',
    brand: 'UltraLite',
    lastUpdated: '2026-10-07',
  },
  {
    id: 'mat-11',
    code: 'MAT-BLK-03',
    name: 'Polymer Modified Block Jointing Mortar (40kg Bag)',
    category: 'Blocks & Masonry',
    unit: 'Bags',
    currentStock: 140,
    minimumAlertStock: 50,
    averageUnitRate: 240,
    gstRate: 18,
    storageLocation: 'Cement Godown Shed #2',
    hsnCode: '321490',
    brand: 'Ultratech Fixoblock',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-12',
    code: 'MAT-RMC-01',
    name: 'RMC M25 Grade Design Mix Concrete',
    category: 'Concrete & RMC',
    unit: 'Cu.M',
    currentStock: 0, // Direct pour on-site
    minimumAlertStock: 0,
    averageUnitRate: 4500,
    gstRate: 18,
    storageLocation: 'Direct Pour - Batching Transit Mixer',
    hsnCode: '382450',
    brand: 'ACC ReadyMix',
    lastUpdated: '2026-10-06',
  },
  {
    id: 'mat-13',
    code: 'MAT-PLY-01',
    name: 'Film-Faced Shuttering Plywood 18mm (34kg Densified)',
    category: 'Formwork & Shuttering',
    unit: 'Sheets',
    currentStock: 280,
    minimumAlertStock: 100,
    averageUnitRate: 1450,
    gstRate: 18,
    storageLocation: 'Carpentry Shed Stacking Rack A',
    hsnCode: '441239',
    brand: 'Century Ply Formwork',
    lastUpdated: '2026-10-08',
  },
  {
    id: 'mat-14',
    code: 'MAT-PRO-01',
    name: 'MS Adjustable Acrow Props (3.5m Heavy Duty)',
    category: 'Formwork & Shuttering',
    unit: 'Nos',
    currentStock: 620,
    minimumAlertStock: 200,
    averageUnitRate: 1100,
    gstRate: 18,
    storageLocation: 'Scaffolding Yard Stacking Bay',
    hsnCode: '730840',
    brand: 'Site Scaffolding Asset',
    lastUpdated: '2026-10-05',
  },
  {
    id: 'mat-15',
    code: 'MAT-CHM-01',
    name: 'Dr. Fixit Pidiproof LW+ Integral Waterproofing (20L Can)',
    category: 'Chemicals & Waterproofing',
    unit: 'Liters',
    currentStock: 320,
    minimumAlertStock: 100,
    averageUnitRate: 145,
    gstRate: 18,
    storageLocation: 'Chemical Store - Flammable Goods Room',
    hsnCode: '382440',
    brand: 'Dr. Fixit',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-16',
    code: 'MAT-CHM-02',
    name: 'SBR Latex Bonding Agent & Crack Repair (20kg Can)',
    category: 'Chemicals & Waterproofing',
    unit: 'Liters',
    currentStock: 80,
    minimumAlertStock: 40,
    averageUnitRate: 195,
    gstRate: 18,
    storageLocation: 'Chemical Store Room',
    hsnCode: '382440',
    brand: 'Fosroc Nitobond',
    lastUpdated: '2026-10-08',
  },
  {
    id: 'mat-17',
    code: 'MAT-PIP-01',
    name: 'CPVC Water Supply Pipe 1" (SDR 11 - 3m Length)',
    category: 'Plumbing & Drainage',
    unit: 'Nos',
    currentStock: 160,
    minimumAlertStock: 60,
    averageUnitRate: 320,
    gstRate: 18,
    storageLocation: 'Plumbing Store Rack #4',
    hsnCode: '391723',
    brand: 'Astral CPVC',
    lastUpdated: '2026-10-07',
  },
  {
    id: 'mat-18',
    code: 'MAT-PIP-02',
    name: 'PVC SWR Drainage Pipe 4" (110mm Type B Ringfit - 3m)',
    category: 'Plumbing & Drainage',
    unit: 'Nos',
    currentStock: 90,
    minimumAlertStock: 50,
    averageUnitRate: 480,
    gstRate: 18,
    storageLocation: 'Plumbing Yard Shed',
    hsnCode: '391723',
    brand: 'Supreme SWR',
    lastUpdated: '2026-10-06',
  },
  {
    id: 'mat-19',
    code: 'MAT-ELE-01',
    name: 'PVC Rigid Conduit Pipe 25mm Heavy Duty (3m Length)',
    category: 'Electrical & Conduits',
    unit: 'Nos',
    currentStock: 450,
    minimumAlertStock: 150,
    averageUnitRate: 95,
    gstRate: 18,
    storageLocation: 'Electrical Store Room #2',
    hsnCode: '391723',
    brand: 'Precision Plastics',
    lastUpdated: '2026-10-09',
  },
  {
    id: 'mat-20',
    code: 'MAT-ELE-02',
    name: 'FRLS Copper Wire 2.5 sq.mm Red (90m Coil)',
    category: 'Electrical & Conduits',
    unit: 'Coils',
    currentStock: 18,
    minimumAlertStock: 25, // Trigger low stock alert
    averageUnitRate: 2150,
    gstRate: 18,
    storageLocation: 'Electrical Store Locked Cabinet',
    hsnCode: '854449',
    brand: 'Polycab FRLS',
    lastUpdated: '2026-10-08',
  },
  {
    id: 'mat-21',
    code: 'MAT-SAF-01',
    name: 'ISI Industrial Safety Helmets (Yellow & White)',
    category: 'Safety PPE',
    unit: 'Nos',
    currentStock: 110,
    minimumAlertStock: 40,
    averageUnitRate: 160,
    gstRate: 18,
    storageLocation: 'Safety & First Aid Office',
    hsnCode: '650610',
    brand: 'Karam ISI',
    lastUpdated: '2026-10-05',
  },
  {
    id: 'mat-22',
    code: 'MAT-SAF-02',
    name: 'Full Body Fall Arrest Safety Harness with Shock Absorber',
    category: 'Safety PPE',
    unit: 'Nos',
    currentStock: 28,
    minimumAlertStock: 30, // Trigger low stock alert
    averageUnitRate: 1250,
    gstRate: 18,
    storageLocation: 'Safety Officer Locker',
    hsnCode: '630720',
    brand: 'Udyogi Fall Safe',
    lastUpdated: '2026-10-04',
  },
  {
    id: 'mat-23',
    code: 'MAT-FUL-01',
    name: 'High Speed Diesel (HSD) for DG Set & JCB Excavator',
    category: 'Site Fuel & Machinery',
    unit: 'Liters',
    currentStock: 850,
    minimumAlertStock: 300,
    averageUnitRate: 92,
    gstRate: 0,
    storageLocation: 'Flammable Fuel Underground Bunded Tank',
    hsnCode: '271019',
    brand: 'BPCL Fuel',
    lastUpdated: '2026-10-10',
  },
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'tx-101',
    voucherNumber: 'GRN-2026-0142',
    type: 'check_in',
    materialId: 'mat-1',
    materialName: 'Ultratech PPC Cement 53 Grade',
    category: 'Cement & Binders',
    quantity: 500,
    unit: 'Bags',
    unitRate: 385,
    totalAmount: 192500,
    date: '2026-10-05',
    time: '09:30 AM',
    runningStockBalance: 500,
    supplierId: 'sup-1',
    supplierName: 'Shree Cement & Building Materials Supply',
    poNumber: 'PO-2026-088',
    challanNumber: 'CH-9941 / DC-8812',
    vehicleNumber: 'MH-04-CP-8812',
    driverName: 'Rameshwar Yadav',
    driverPhone: '+91 97654 33210',
    qcStatus: 'Passed',
    unloadingLocation: 'Cement Godown Shed #1 (Waterproof Bay)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: '500 Bags unloaded cleanly. Bags free of moisture, factory fresh batch.',
  },
  {
    id: 'tx-102',
    voucherNumber: 'MIN-2026-0089',
    type: 'check_out',
    materialId: 'mat-1',
    materialName: 'Ultratech PPC Cement 53 Grade',
    category: 'Cement & Binders',
    quantity: 120,
    unit: 'Bags',
    date: '2026-10-06',
    time: '11:15 AM',
    runningStockBalance: 380,
    subcontractorId: 'sub-1',
    subcontractorName: 'M/S Sharma RCC Labour Gang',
    foremanName: 'Ramprasad Sharma',
    wbsTaskId: '3.4.3',
    wbsTaskCode: '3.4.3',
    wbsTaskName: '3rd Floor Slab Concrete Pouring',
    floorZone: 'Tower A - 3rd Floor Slab',
    purpose: 'Concrete mix for columns, beams and slab casting',
    authorizedBy: 'Er. Amit Verma (Project Engineer)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Issued via material hoist to 3rd floor slab casting bay.',
  },
  {
    id: 'tx-103',
    voucherNumber: 'GRN-2026-0143',
    type: 'check_in',
    materialId: 'mat-3',
    materialName: 'JSW Fe550D TMT Rebar 12mm & 16mm',
    category: 'Steel & Rebar',
    quantity: 15.0,
    unit: 'MT',
    unitRate: 58500,
    totalAmount: 877500,
    date: '2026-10-06',
    time: '02:45 PM',
    runningStockBalance: 25.5,
    supplierId: 'sup-2',
    supplierName: 'Jindal Steel & Alloys Corp',
    poNumber: 'PO-2026-079',
    challanNumber: 'JSW-INV-4401',
    vehicleNumber: 'MH-46-AR-5520',
    driverName: 'Gurmeet Singh',
    driverPhone: '+91 98110 44921',
    qcStatus: 'Passed',
    unloadingLocation: 'Rebar Yard - Bay A (Covered Tarpaulin)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Mill test certificates (MTC) received and cross-checked with invoice.',
  },
  {
    id: 'tx-104',
    voucherNumber: 'MIN-2026-0090',
    type: 'check_out',
    materialId: 'mat-3',
    materialName: 'JSW Fe550D TMT Rebar 12mm & 16mm',
    category: 'Steel & Rebar',
    quantity: 3.0,
    unit: 'MT',
    date: '2026-10-07',
    time: '10:00 AM',
    runningStockBalance: 22.5,
    subcontractorId: 'sub-1',
    subcontractorName: 'M/S Sharma RCC Labour Gang',
    foremanName: 'Ramprasad Sharma',
    wbsTaskId: '3.4.2',
    wbsTaskCode: '3.4.2',
    wbsTaskName: '3rd Floor Rebar Fabrication & Placement',
    floorZone: 'Tower A - 3rd Floor Level',
    purpose: 'Main tensile reinforcement bars for 3rd floor cantilever beams',
    authorizedBy: 'Er. Amit Verma (Project Engineer)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Shifted to bar bending yard machine #1.',
  },
  {
    id: 'tx-105',
    voucherNumber: 'GRN-2026-0144',
    type: 'check_in',
    materialId: 'mat-6',
    materialName: 'Crushed M-Sand (Zone II River Sand Substitute)',
    category: 'Aggregates & Sand',
    quantity: 800,
    unit: 'Cu.Ft',
    unitRate: 48,
    totalAmount: 38400,
    date: '2026-10-07',
    time: '04:10 PM',
    runningStockBalance: 1650,
    supplierId: 'sup-1',
    supplierName: 'Shree Cement & Building Materials Supply',
    poNumber: 'PO-2026-091',
    challanNumber: 'DC-9921',
    vehicleNumber: 'MH-12-DT-2291',
    driverName: 'Suresh Patil',
    driverPhone: '+91 99230 11988',
    qcStatus: 'Passed',
    unloadingLocation: 'Aggregate Open Bin #1',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Tipper dumper unloaded. Silt test 3.5% well within permissible limits.',
  },
  {
    id: 'tx-106',
    voucherNumber: 'MIN-2026-0091',
    type: 'check_out',
    materialId: 'mat-6',
    materialName: 'Crushed M-Sand (Zone II River Sand Substitute)',
    category: 'Aggregates & Sand',
    quantity: 200,
    unit: 'Cu.Ft',
    date: '2026-10-08',
    time: '09:00 AM',
    runningStockBalance: 1450,
    subcontractorId: 'sub-2',
    subcontractorName: 'Al-Madina Masonry & Plaster Works',
    foremanName: 'Ustad Tariq Khan',
    wbsTaskId: '3.2',
    wbsTaskCode: '3.2',
    wbsTaskName: '2nd Floor Brickwork & AAC Blocks',
    floorZone: 'Tower A - 2nd Floor Flats 201-204',
    purpose: 'Mortar mixing for external wall masonry and lintels',
    authorizedBy: 'Er. Rajesh Gupta (Site Incharge)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Dispatched in wheelbarrows via hoist.',
  },
  {
    id: 'tx-107',
    voucherNumber: 'GRN-2026-0145',
    type: 'check_in',
    materialId: 'mat-9',
    materialName: 'AAC Lightweight Blocks (600 x 200 x 150mm - 6 Inch)',
    category: 'Blocks & Masonry',
    quantity: 2000,
    unit: 'Nos',
    unitRate: 64,
    totalAmount: 128000,
    date: '2026-10-08',
    time: '11:30 AM',
    runningStockBalance: 4200,
    supplierId: 'sup-4',
    supplierName: 'UltraLite AAC Blocks & Mortar Ltd',
    poNumber: 'PO-2026-085',
    challanNumber: 'UL-INV-8819',
    vehicleNumber: 'MH-04-GF-6632',
    driverName: 'Mohd. Salim',
    driverPhone: '+91 97022 44109',
    qcStatus: 'Passed',
    unloadingLocation: 'Tower A Ground Floor Stacking Zone',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Truck unloaded with pallet jack. 20 blocks with edge chipping noted and deducted from challan.',
  },
  {
    id: 'tx-108',
    voucherNumber: 'MIN-2026-0092',
    type: 'check_out',
    materialId: 'mat-9',
    materialName: 'AAC Lightweight Blocks (600 x 200 x 150mm - 6 Inch)',
    category: 'Blocks & Masonry',
    quantity: 600,
    unit: 'Nos',
    date: '2026-10-08',
    time: '03:15 PM',
    runningStockBalance: 3600,
    subcontractorId: 'sub-2',
    subcontractorName: 'Al-Madina Masonry & Plaster Works',
    foremanName: 'Ustad Tariq Khan',
    wbsTaskId: '3.2',
    wbsTaskCode: '3.2',
    wbsTaskName: '2nd Floor Brickwork & AAC Blocks',
    floorZone: 'Tower A - 2nd Floor Outer Perimeter',
    purpose: 'Outer peripheral facade walls construction',
    authorizedBy: 'Er. Rajesh Gupta (Site Incharge)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Stacked floor-wise to prevent overloading slab.',
  },
  {
    id: 'tx-109',
    voucherNumber: 'RET-2026-0012',
    type: 'return',
    materialId: 'mat-1',
    materialName: 'Ultratech PPC Cement 53 Grade',
    category: 'Cement & Binders',
    quantity: 20,
    unit: 'Bags',
    date: '2026-10-09',
    time: '05:00 PM',
    runningStockBalance: 400,
    returnReason: 'Excess stock returned to supplier for credit note',
    supplierId: 'sup-1',
    supplierName: 'Shree Cement & Building Materials Supply',
    challanNumber: 'RET-DC-9912',
    authorizedBy: 'Er. Amit Verma (Project Engineer)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: '20 surplus sealed bags loaded back into supplier truck.',
  },
  {
    id: 'tx-113',
    voucherNumber: 'DMG-2026-0005',
    type: 'damage',
    materialId: 'mat-9',
    materialName: 'AAC Lightweight Blocks (600 x 200 x 150mm - 6 Inch)',
    category: 'Blocks & Masonry',
    quantity: 25,
    unit: 'Nos',
    date: '2026-10-10',
    time: '02:00 PM',
    runningStockBalance: 3575,
    damageReason: 'Corner edge cracking & unloading transit fracture',
    floorZone: 'Ground Stacking Yard Bay #2',
    authorizedBy: 'Er. Rajesh Gupta (Site Incharge)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: '25 blocks fractured beyond masonry tolerance. Written off to scrap disposal area.',
  },
  {
    id: 'tx-110',
    voucherNumber: 'GRN-2026-0146',
    type: 'check_in',
    materialId: 'mat-1',
    materialName: 'Ultratech PPC Cement 53 Grade',
    category: 'Cement & Binders',
    quantity: 80,
    unit: 'Bags',
    unitRate: 385,
    totalAmount: 30800,
    date: '2026-10-10',
    time: '08:45 AM',
    runningStockBalance: 480,
    supplierId: 'sup-1',
    supplierName: 'Shree Cement & Building Materials Supply',
    poNumber: 'PO-2026-095',
    challanNumber: 'DC-10024',
    vehicleNumber: 'MH-04-EB-1102',
    driverName: 'Sanjay Shinde',
    driverPhone: '+91 98330 99421',
    qcStatus: 'Passed',
    unloadingLocation: 'Cement Godown Shed #1 (Waterproof Bay)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Mini truck top-up delivery. Fresh manufacturing week 39.',
  },
  {
    id: 'tx-111',
    voucherNumber: 'GRN-2026-0147',
    type: 'check_in',
    materialId: 'mat-23',
    materialName: 'High Speed Diesel (HSD) for DG Set & JCB Excavator',
    category: 'Site Fuel & Machinery',
    quantity: 500,
    unit: 'Liters',
    unitRate: 92,
    totalAmount: 46000,
    date: '2026-10-10',
    time: '11:00 AM',
    runningStockBalance: 950,
    supplierId: 'sup-6',
    supplierName: 'Bharat Petroleum Site Fuel Depot',
    poNumber: 'PO-2026-092',
    challanNumber: 'BP-TANKER-310',
    vehicleNumber: 'MH-06-BQ-7700',
    driverName: 'Pawan Kumar',
    driverPhone: '+91 98204 55198',
    qcStatus: 'Passed',
    unloadingLocation: 'Flammable Fuel Underground Bunded Tank',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Meter reading certified before and after pumping into underground diesel tank.',
  },
  {
    id: 'tx-112',
    voucherNumber: 'MIN-2026-0093',
    type: 'check_out',
    materialId: 'mat-23',
    materialName: 'High Speed Diesel (HSD) for DG Set & JCB Excavator',
    category: 'Site Fuel & Machinery',
    quantity: 100,
    unit: 'Liters',
    date: '2026-10-10',
    time: '01:30 PM',
    runningStockBalance: 850,
    subcontractorId: 'sub-6',
    subcontractorName: 'Site Plant & Heavy Equipment Crew',
    foremanName: 'Kishore Shinde',
    wbsTaskId: 'site-ops',
    wbsTaskCode: 'OPS-DG',
    wbsTaskName: 'Site Power Backup (250 kVA DG Set)',
    floorZone: 'Ground Utility Yard DG Enclosure',
    purpose: 'DG generator fueling for non-stop evening concrete pump operation',
    authorizedBy: 'Er. Rajesh Gupta (Site Incharge)',
    receivedOrIssuedBy: 'Ravi Kumar (Storekeeper)',
    notes: 'Fueled with calibrated diesel dispenser gun.',
  },
];
