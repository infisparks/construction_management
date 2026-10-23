'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  Plus,
  Calendar,
  Building2,
  Trash2,
  Camera,
  UploadCloud,
  FileText,
  Percent,
  Receipt,
  ShieldCheck,
  ChevronDown,
  Info,
  Edit2,
  Paperclip,
  Check,
  Sparkles,
  Package,
  Layers,
  Search,
  Lock
} from 'lucide-react';
import { 
  SubcontractorBill, 
  SubcontractorBillItem, 
  SubcontractorDeductionItem, 
  SubcontractorRetentionItem,
  Party,
  ConstructionTask 
} from '@/lib/construction-planning/types';
import { SubcontractorRetentionModal } from './SubcontractorRetentionModal';
import { SubcontractorDeductionModal } from './SubcontractorDeductionModal';
import { VendorProfileDrawer } from './VendorProfileDrawer';
import { fetchProfileVendors, fetchProfileProducts, ProfileVendor, ProfileProduct } from '@/lib/supabase/profile-services';
import { fetchBillItemCatalog, saveBillItemToCatalog, BillItemTemplate } from '@/lib/supabase/category-services';
import { fetchAllActiveSites } from '@/lib/supabase/site-storage';
import { useAuth } from '@/lib/supabase/auth-context';
import { isAdminUser } from '@/lib/auth/role-access';

interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
  serial_no?: number;
}

interface SubcontractorBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: SubcontractorBill) => void;
  billToEdit?: SubcontractorBill | null;
  currentProjectId?: string;
  availableProjects?: ProjectOption[];
  parties?: Party[];
  allTasks?: ConstructionTask[];
  isAdmin?: boolean;
}

// Default fallback product profiles for quick selection
const DEFAULT_FALLBACK_PRODUCTS: ProfileProduct[] = [
  { id: 'def-p1', code: 'PRD-001', name: 'UltraTech 53 Grade PPC Cement', category: 'Cement & Concrete', unit: 'bags' },
  { id: 'def-p2', code: 'PRD-002', name: 'Fe550D TMT Steel Rebar (12mm/16mm)', category: 'Structural Steel', unit: 'mt' },
  { id: 'def-p3', code: 'PRD-003', name: 'Crushed River Sand / M-Sand', category: 'Aggregates & Sand', unit: 'cum' },
  { id: 'def-p4', code: 'PRD-004', name: '20mm Graded Coarse Aggregate (Jelly)', category: 'Aggregates & Sand', unit: 'cum' },
  { id: 'def-p5', code: 'PRD-005', name: 'Red Clay Wirecut Bricks (Standard)', category: 'Masonry & Blocks', unit: 'nos' },
  { id: 'def-p6', code: 'PRD-006', name: 'AAC Lightweight Blocks (600x200x150mm)', category: 'Masonry & Blocks', unit: 'nos' },
];

// Default fallback work catalog items
const DEFAULT_FALLBACK_CATALOG: BillItemTemplate[] = [
  { name: 'Excavation & Earthwork in Foundation', rate: 220, unit: 'cum' },
  { name: 'Plain Cement Concrete (PCC 1:4:8) for Bed', rate: 4200, unit: 'cum' },
  { name: 'Reinforced Cement Concrete (RCC M25) for Columns & Slabs', rate: 6800, unit: 'cum' },
  { name: 'Brickwork in Cement Mortar 1:6 (9 inch thick)', rate: 450, unit: 'sqm' },
  { name: 'Internal Cement Plastering 12mm thick (1:4)', rate: 180, unit: 'sqm' },
  { name: 'External Sand Faced Plastering 20mm thick', rate: 260, unit: 'sqm' },
  { name: 'Vitrified Floor Tiles (600x600mm) with Grouting', rate: 110, unit: 'sqft' },
  { name: 'Shuttering & Formwork with Marine Ply', rate: 380, unit: 'sqm' },
];

// =========================================================================
// Dedicated Searchable Dropdown Combobox Component for Subcontractor Items
// =========================================================================
interface BillItemSearchComboboxProps {
  item: SubcontractorBillItem;
  onSelect: (selected: { name: string; unit?: string; rate?: number }) => void;
  onChangeName: (name: string) => void;
  onBlurItem: () => void;
  dbProducts: ProfileProduct[];
  catalogItems: BillItemTemplate[];
}

const BillItemSearchCombobox: React.FC<BillItemSearchComboboxProps> = ({
  item,
  onSelect,
  onChangeName,
  onBlurItem,
  dbProducts,
  catalogItems,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'catalog'>('all');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown cleanly when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onBlurItem();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onBlurItem]);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dbProducts.slice(0, 15);
    return dbProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query)) ||
          (p.brand && p.brand.toLowerCase().includes(query))
      )
      .slice(0, 15);
  }, [dbProducts, searchQuery]);

  // Filter catalog items by search query
  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return catalogItems.slice(0, 15);
    return catalogItems
      .filter((c) => c.name.toLowerCase().includes(query))
      .slice(0, 15);
  }, [catalogItems, searchQuery]);

  const totalResults = filteredProducts.length + filteredCatalog.length;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar with Dropdown Trigger */}
      <div
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-50/70 hover:bg-white border rounded-lg transition-all ${
          isOpen
            ? 'border-purple-500 ring-2 ring-purple-100 bg-white'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Search
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isOpen ? 'text-purple-600' : 'text-slate-400'
          }`}
        />

        <input
          type="text"
          value={item.name}
          onChange={(e) => {
            onChangeName(e.target.value);
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setSearchQuery('');
            setIsOpen(true);
          }}
          placeholder="Search or select work item / material..."
          className="w-full text-xs font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-400 placeholder:font-normal"
        />

        {item.name ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeName('');
              setSearchQuery('');
              setIsOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
            title="Clear item"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) setSearchQuery('');
            setIsOpen(!isOpen);
          }}
          className="p-1 text-slate-400 hover:text-purple-600 rounded transition-colors cursor-pointer"
          title="Toggle search dropdown"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-purple-600' : ''
            }`}
          />
        </button>
      </div>

      {/* Floating Search Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Search Filter & Tabs */}
          <div className="p-2.5 bg-slate-50/90 border-b border-slate-200/80 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter products or work..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All ({filteredProducts.length + filteredCatalog.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'products'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Products ({filteredProducts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'catalog'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Work Catalog ({filteredCatalog.length})</span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-2">
            {/* Group 1: Product Profiles */}
            {(activeTab === 'all' || activeTab === 'products') && filteredProducts.length > 0 && (
              <div>
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50/70 rounded-md mb-1">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>Product Profiles (Materials)</span>
                  </div>
                  <span>{filteredProducts.length}</span>
                </div>
                <div className="space-y-0.5">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          name: prod.name,
                          unit: prod.unit,
                          rate: item.rate || 0,
                        });
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 group-hover:text-purple-900 block truncate">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {prod.category || 'Material'} {prod.brand ? `• ${prod.brand}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded shrink-0">
                        {prod.unit || 'nos'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Saved Work Items & Catalog */}
            {(activeTab === 'all' || activeTab === 'catalog') && filteredCatalog.length > 0 && (
              <div>
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50/70 rounded-md mb-1">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>Saved Work Items & Rates</span>
                  </div>
                  <span>{filteredCatalog.length}</span>
                </div>
                <div className="space-y-0.5">
                  {filteredCatalog.map((cat, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => {
                        onSelect({
                          name: cat.name,
                          unit: cat.unit,
                          rate: cat.rate,
                        });
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-indigo-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 group-hover:text-indigo-900 block truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Standard Work Item
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded shrink-0">
                        ₹{cat.rate} / {cat.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty matching results */}
            {totalResults === 0 && (
              <div className="py-5 px-3 text-center text-slate-500">
                <p className="text-xs font-medium text-slate-700">No matching items found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click below to use &ldquo;{searchQuery || item.name}&rdquo; as a custom work item.
                </p>
              </div>
            )}
          </div>

          {/* Action Footer: Use Custom Item */}
          {(searchQuery.trim() || item.name.trim()) && (
            <div className="p-2 bg-purple-50/60 border-t border-purple-100">
              <button
                type="button"
                onClick={() => {
                  const finalName = searchQuery.trim() || item.name.trim();
                  onSelect({
                    name: finalName,
                    unit: item.unit || 'sqm',
                    rate: item.rate || 0,
                  });
                  setIsOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-between shadow-xs transition-colors cursor-pointer"
              >
                <span className="truncate">
                  + Use &ldquo;{searchQuery.trim() || item.name.trim()}&rdquo; as item
                </span>
                <span className="text-[10px] bg-purple-700/80 text-purple-100 px-1.5 py-0.5 rounded shrink-0 ml-1">
                  Saves to catalog
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SubcontractorBillDialog: React.FC<SubcontractorBillDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  billToEdit,
  currentProjectId,
  availableProjects = [],
  parties = [],
  allTasks = [],
  isAdmin: propIsAdmin,
}) => {
  const auth = useAuth();
  const isUserAdmin = propIsAdmin !== undefined ? propIsAdmin : isAdminUser(auth.userRole?.role, auth.user?.email);

  // Project / Site Selection State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(billToEdit?.projectId || currentProjectId || '');
  const [projectsList, setProjectsList] = useState<ProjectOption[]>(availableProjects);

  // Remote Database Data States
  const [dbVendors, setDbVendors] = useState<ProfileVendor[]>([]);
  const [dbProducts, setDbProducts] = useState<ProfileProduct[]>([]);
  const [catalogItems, setCatalogItems] = useState<BillItemTemplate[]>([]);

  // Vendor Profile Drawer state
  const [isVendorDrawerOpen, setIsVendorDrawerOpen] = useState(false);

  // Form States
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<SubcontractorBill['status']>('submitted');
  const [selectedVendorName, setSelectedVendorName] = useState('');
  const [selectedVendorTrade, setSelectedVendorTrade] = useState('');
  const [selectedVendorPhone, setSelectedVendorPhone] = useState('');
  const [selectedVendorGstin, setSelectedVendorGstin] = useState('');
  const [selectedVendorPan, setSelectedVendorPan] = useState('');
  const [selectedVendorBank, setSelectedVendorBank] = useState('');
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Item Level Tax Toggle
  const [itemLevelTax, setItemLevelTax] = useState(false);

  // Items List - EMPTY BY DEFAULT as requested
  const [items, setItems] = useState<SubcontractorBillItem[]>([]);

  // Deductions State & Modal - UNSELECTED & ZERO BY DEFAULT as requested
  const [deductions, setDeductions] = useState<SubcontractorDeductionItem[]>([
    { id: 'ded-1', name: 'TDS (Income Tax)', amount: 0, isSelected: false },
    { id: 'ded-2', name: 'Royalty & Mineral Cess', amount: 0, isSelected: false },
    { id: 'ded-3', name: 'Labour Welfare Cess', amount: 0, isSelected: false },
  ]);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

  // Retentions State & Modal - UNSELECTED & ZERO BY DEFAULT as requested
  const [retentions, setRetentions] = useState<SubcontractorRetentionItem[]>([
    { id: 'ret-1', name: 'Performance Retention', amount: 0, dueDate: '', isSelected: false },
    { id: 'ret-2', name: 'Security Deposit', amount: 0, dueDate: '', isSelected: false },
  ]);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Global GST Dropdown (0%, 5%, 12%, 18%, 28%)
  const [gstRate, setGstRate] = useState<number>(0.0);

  // Additional Charges
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalChargesDesc, setAdditionalChargesDesc] = useState('');
  const [showAdditionalChargesInput, setShowAdditionalChargesInput] = useState(false);

  // Notes field
  const [notes, setNotes] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; size?: string; type: 'image' | 'doc'; url?: string }[]>([]);

  // Fetch Supabase Vendors, Products & Catalog on Dialog Open
  useEffect(() => {
    if (!isOpen) return;

    fetchProfileVendors().then((vendors) => {
      if (vendors && vendors.length > 0) {
        setDbVendors(vendors);
      }
    });

    fetchProfileProducts().then((prods) => {
      if (prods && prods.length > 0) {
        setDbProducts(prods);
      }
    });

    fetchBillItemCatalog().then((cat) => {
      if (cat && cat.length > 0) {
        setCatalogItems(cat);
      }
    });
  }, [isOpen]);

  // Combined product list (DB + rich default fallback)
  const combinedProducts = useMemo(() => {
    if (dbProducts && dbProducts.length > 0) {
      const list = [...dbProducts];
      DEFAULT_FALLBACK_PRODUCTS.forEach((def) => {
        if (!list.some((p) => p.name.toLowerCase() === def.name.toLowerCase())) {
          list.push(def);
        }
      });
      return list;
    }
    return DEFAULT_FALLBACK_PRODUCTS;
  }, [dbProducts]);

  // Combined catalog list (DB category + rich default fallback)
  const combinedCatalog = useMemo(() => {
    if (catalogItems && catalogItems.length > 0) {
      const list = [...catalogItems];
      DEFAULT_FALLBACK_CATALOG.forEach((def) => {
        if (!list.some((c) => c.name.toLowerCase() === def.name.toLowerCase())) {
          list.push(def);
        }
      });
      return list;
    }
    return DEFAULT_FALLBACK_CATALOG;
  }, [catalogItems]);

  // Combined vendor list (from DB + fallback default)
  const allAvailableVendors = useMemo(() => {
    const list = [...dbVendors];
    if (!list.some((v) => v.name.toLowerCase().includes('apex civil'))) {
      list.push({
        id: 'pty-apex-default',
        name: 'Apex Civil Contractors',
        type: 'contractor',
        trade: 'Excavation, Foundation & Plinth Works',
        phone: '+91 98201 44512',
        gstin: '27AABCS1429B1Z4',
        pan: 'AABCS1429B',
        bank_details: 'HDFC Bank A/C: 501002391024 / IFSC: HDFC0000128',
      });
    }
    return list;
  }, [dbVendors]);

  // Initialize or Reset Form
  useEffect(() => {
    if (billToEdit) {
      setBillNumber(billToEdit.billNumber);
      setBillDate(billToEdit.billDate);
      setDueDate(billToEdit.dueDate || '');
      setSelectedVendorName(billToEdit.vendorName);
      setSelectedVendorTrade(billToEdit.vendorTrade || '');
      setSelectedVendorPhone(billToEdit.vendorPhone || '');
      setSelectedVendorGstin(billToEdit.vendorGstin || '');
      setSelectedVendorPan(billToEdit.vendorPan || '');
      setSelectedVendorBank(billToEdit.vendorBankDetails || '');
      setItemLevelTax(billToEdit.itemLevelTax || false);
      setItems(billToEdit.items || []);
      setDeductions(billToEdit.deductions && billToEdit.deductions.length > 0 ? billToEdit.deductions : [
        { id: 'ded-1', name: 'TDS (Income Tax)', amount: 0, isSelected: false },
        { id: 'ded-2', name: 'Royalty & Mineral Cess', amount: 0, isSelected: false },
        { id: 'ded-3', name: 'Labour Welfare Cess', amount: 0, isSelected: false },
      ]);
      setRetentions(billToEdit.retentions && billToEdit.retentions.length > 0 ? billToEdit.retentions : [
        { id: 'ret-1', name: 'Performance Retention', amount: 0, dueDate: '', isSelected: false },
        { id: 'ret-2', name: 'Security Deposit', amount: 0, dueDate: '', isSelected: false },
      ]);
      setGstRate(billToEdit.gstRate ?? 0.0);
      setAdditionalCharges(billToEdit.additionalCharges || 0);
      setAdditionalChargesDesc(billToEdit.additionalChargesDesc || '');
      setNotes(billToEdit.notes || '');
      setAttachments(billToEdit.attachments || []);
      setStatus(billToEdit.status || 'submitted');
      setIsEditingVendor(false);
    } else {
      // EMPTY BY DEFAULT for new bills
      const today = new Date().toISOString().split('T')[0];
      setBillNumber(`SB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setBillDate(today);
      setDueDate('');
      setStatus('submitted');
      setSelectedVendorName('');
      setSelectedVendorTrade('');
      setSelectedVendorPhone('');
      setSelectedVendorGstin('');
      setSelectedVendorPan('');
      setSelectedVendorBank('');
      setIsEditingVendor(true); // Open selector by default
      setItemLevelTax(false);
      setItems([]); // Empty items list
      setDeductions([
        { id: 'ded-1', name: 'TDS (Income Tax)', amount: 0, isSelected: false },
        { id: 'ded-2', name: 'Royalty & Mineral Cess', amount: 0, isSelected: false },
        { id: 'ded-3', name: 'Labour Welfare Cess', amount: 0, isSelected: false },
      ]);
      setRetentions([
        { id: 'ret-1', name: 'Performance Retention', amount: 0, dueDate: '', isSelected: false },
        { id: 'ret-2', name: 'Security Deposit', amount: 0, dueDate: '', isSelected: false },
      ]);
      setGstRate(0.0);
      setAdditionalCharges(0);
      setAdditionalChargesDesc('');
      setNotes('');
      setAttachments([]);
    }

    // Sync selected project
    setSelectedProjectId(billToEdit?.projectId || currentProjectId || '');
    if (availableProjects && availableProjects.length > 0) {
      setProjectsList(availableProjects);
    } else {
      fetchAllActiveSites().then((sites) => {
        if (sites && sites.length > 0) {
          setProjectsList(sites);
        }
      });
    }
  }, [billToEdit, isOpen, currentProjectId, availableProjects]);

  // Handle vendor creation from drawer
  const handleVendorCreated = (newVendor: ProfileVendor) => {
    setDbVendors((prev) => [newVendor, ...prev]);
    setSelectedVendorName(newVendor.name);
    setSelectedVendorTrade(newVendor.trade || '');
    setSelectedVendorPhone(newVendor.phone || '');
    setSelectedVendorGstin(newVendor.gstin || '');
    setSelectedVendorPan(newVendor.pan || '');
    setSelectedVendorBank(newVendor.bank_details || '');
    setIsEditingVendor(false);
  };

  // Item modifications
  const handleItemChange = (index: number, field: keyof SubcontractorBillItem, value: unknown) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'rate' || field === 'quantity') {
        const rate = field === 'rate' ? Number(value) || 0 : Number(current.rate) || 0;
        const qty = field === 'quantity' ? Number(value) || 0 : Number(current.quantity) || 0;
        current.amount = Math.round(rate * qty);
      }

      updated[index] = current;
      return updated;
    });
  };

  // When user finishes typing or modifies an item, auto-save to Category table
  const handleItemBlur = async (item: SubcontractorBillItem) => {
    if (item.name && item.name.trim()) {
      saveBillItemToCatalog({
        name: item.name.trim(),
        rate: item.rate,
        unit: item.unit,
      }).then((updatedCatalog) => {
        if (updatedCatalog && updatedCatalog.length > 0) {
          setCatalogItems(updatedCatalog);
        }
      });
    }
  };

  const handleAddItem = () => {
    const newItem: SubcontractorBillItem = {
      id: `item-${Date.now()}`,
      name: '',
      unit: 'sqm',
      billedQty: 0,
      unbilledQty: 0,
      rate: 0,
      quantity: 1,
      amount: 0,
      gstRate: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select an item from autocomplete dropdown
  const handleSelectAutocompleteItem = (
    index: number, 
    selected: { name: string; unit?: string; rate?: number }
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };
      current.name = selected.name;
      if (selected.unit) current.unit = selected.unit.toLowerCase();
      if (selected.rate !== undefined && selected.rate > 0) {
        current.rate = selected.rate;
        current.amount = Math.round(selected.rate * (Number(current.quantity) || 1));
      }
      updated[index] = current;
      return updated;
    });

    // Save to catalog
    if (selected.name) {
      saveBillItemToCatalog({
        name: selected.name,
        rate: selected.rate,
        unit: selected.unit,
      });
    }
  };

  // Calculations
  const itemSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  const preTaxDeductionTotal = useMemo(() => {
    return deductions
      .filter((d) => d.isSelected)
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [deductions]);

  const preTaxRetentionTotal = useMemo(() => {
    return retentions
      .filter((r) => r.isSelected)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [retentions]);

  const netSubtotal = Math.max(0, itemSubtotal - preTaxDeductionTotal - preTaxRetentionTotal);

  const gstAmount = useMemo(() => {
    if (itemLevelTax) {
      return items.reduce((sum, item) => {
        const rate = item.gstRate || 0;
        return sum + Math.round((Number(item.amount || 0) * rate) / 100);
      }, 0);
    }
    return Math.round((netSubtotal * gstRate) / 100);
  }, [itemLevelTax, items, netSubtotal, gstRate]);

  const grandTotal = netSubtotal + gstAmount + Number(additionalCharges || 0);

  // Handle Save
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-save any typed items to category table
    items.forEach((item) => {
      if (item.name.trim()) {
        saveBillItemToCatalog({ name: item.name.trim(), rate: item.rate, unit: item.unit });
      }
    });

    const savedBill: SubcontractorBill = {
      id: billToEdit?.id || `sb-${Date.now()}`,
      projectId: selectedProjectId || billToEdit?.projectId || currentProjectId || undefined,
      billNumber: billNumber.trim() || `SB-${Date.now()}`,
      billDate: billDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || undefined,
      vendorName: selectedVendorName.trim() || 'Subcontractor Vendor',
      vendorTrade: selectedVendorTrade.trim() || undefined,
      vendorPhone: selectedVendorPhone.trim() || undefined,
      vendorGstin: selectedVendorGstin.trim() || undefined,
      vendorPan: selectedVendorPan.trim() || undefined,
      vendorBankDetails: selectedVendorBank.trim() || undefined,
      itemLevelTax,
      items,
      itemSubtotal,
      deductions,
      preTaxDeductionTotal,
      retentions,
      preTaxRetentionTotal,
      netSubtotal,
      gstRate,
      gstAmount,
      additionalCharges: Number(additionalCharges) || 0,
      additionalChargesDesc,
      grandTotal,
      notes: notes.trim(),
      attachments,
      status: isUserAdmin ? status : (billToEdit?.status || 'submitted'),
      createdAt: billToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(savedBill);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Main Slide-over Drawer Container */}
        <div 
          className="bg-[#F5F6F8] h-full shadow-2xl border-l border-slate-200 w-full max-w-md sm:max-w-lg md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Top Bar */}
          <div className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-indigo-900" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Sub-Contractor Bill
                </h2>
                <span className="text-[10px] font-mono text-purple-700 font-semibold">
                  Armee Enterprises PMS
                </span>
              </div>
            </div>

            {/* Item Level Tax Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Item Level Tax</span>
              <button
                type="button"
                role="switch"
                aria-checked={itemLevelTax}
                onClick={() => setItemLevelTax(!itemLevelTax)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  itemLevelTax ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    itemLevelTax ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSaveBill} id="subcontractor-bill-form" className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 space-y-3.5">
            
            {/* Top Card: Construction Site Selection */}
            <div className="bg-purple-50/70 rounded-xl p-3.5 border border-purple-100 shadow-2xs space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-purple-900">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Site / Construction Project</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                  Default: Current Site
                </span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-2xs cursor-pointer"
              >
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.serial_no ? `#${p.serial_no} ` : ''}{p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                This RA bill will be logged under this construction site. You can switch to another site if needed.
              </p>
            </div>

            {/* Card 1: Sub-Contractor Bill Details & Date */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Sub-Contractor Bill
                  </span>
                  {!isEditingDate ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-slate-900">
                        {new Date(billDate || Date.now()).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {billNumber || 'SB-AUTO'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Bill Number"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 w-28 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingDate(!isEditingDate)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Date or Bill Number"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Status & Approval State Control */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Bill Status:
                  </span>
                  {isUserAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3 text-purple-600" />
                      Admin Controlled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Admin Only
                    </span>
                  )}
                </div>

                {isUserAdmin ? (
                  <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200 overflow-x-auto">
                    {(
                      [
                        { key: 'draft', label: 'Draft', activeClass: 'bg-slate-700 text-white shadow-xs' },
                        { key: 'submitted', label: 'Submitted', activeClass: 'bg-purple-600 text-white shadow-xs' },
                        { key: 'approved', label: 'Approved', activeClass: 'bg-indigo-600 text-white shadow-xs' },
                        { key: 'paid', label: 'Paid', activeClass: 'bg-emerald-600 text-white shadow-xs' },
                        { key: 'partial', label: 'Partial', activeClass: 'bg-amber-600 text-white shadow-xs' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setStatus(opt.key)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                          status === opt.key
                            ? `${opt.activeClass}`
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      {status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (Login as Admin to change)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Vendor Selection & Quick Create Sidebar Trigger */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Subcontractor / Vendor *
                </span>
                <button
                  type="button"
                  onClick={() => setIsVendorDrawerOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Vendor Profile</span>
                </button>
              </div>

              {!isEditingVendor && selectedVendorName ? (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {selectedVendorName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {selectedVendorTrade || 'Civil Contractor'} {selectedVendorPhone && `• ${selectedVendorPhone}`}
                    </span>
                    {(selectedVendorGstin || selectedVendorPan) && (
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {selectedVendorGstin && `GST: ${selectedVendorGstin}`} {selectedVendorPan && `| PAN: ${selectedVendorPan}`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingVendor(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <select
                    value={selectedVendorName}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_NEW__') {
                        setIsVendorDrawerOpen(true);
                        return;
                      }
                      const found = allAvailableVendors.find((v) => v.name === e.target.value);
                      if (found) {
                        setSelectedVendorName(found.name);
                        setSelectedVendorTrade(found.trade || '');
                        setSelectedVendorPhone(found.phone || '');
                        setSelectedVendorGstin(found.gstin || '');
                        setSelectedVendorPan(found.pan || '');
                        setSelectedVendorBank(found.bank_details || '');
                        setIsEditingVendor(false);
                      } else {
                        setSelectedVendorName(e.target.value);
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  >
                    <option value="">-- Select Subcontractor / Vendor --</option>
                    {allAvailableVendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} {v.trade ? `(${v.trade})` : ''}
                      </option>
                    ))}
                    <option value="__CREATE_NEW__" className="text-purple-600 font-bold">
                      + Create New Vendor Profile...
                    </option>
                  </select>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>Not in the list? Click &ldquo;+ Create Vendor Profile&rdquo; above.</span>
                    {selectedVendorName && (
                      <button
                        type="button"
                        onClick={() => setIsEditingVendor(false)}
                        className="text-purple-600 font-bold hover:underline"
                      >
                        Keep Selected
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Items Header & List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600">
                  Item ({items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>

              {/* Empty Items Prompt when 0 items exist */}
              {items.length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-white text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No Items Added Yet</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click below to add work measurements, subcontracting labor, or materials from your product profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add First Item</span>
                  </button>
                </div>
              )}

              {/* Items Cards */}
              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3 relative group"
                  >
                    {/* Item Top Row: (X) icon, Search Combobox with Dropdown, Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="mt-2 text-slate-300 hover:text-rose-500 rounded-full transition-colors cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center hover:border-rose-400">
                            <X className="w-3 h-3" />
                          </div>
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Dedicated Search with Dropdown Combobox */}
                          <BillItemSearchCombobox
                            item={item}
                            onSelect={(selected) => handleSelectAutocompleteItem(idx, selected)}
                            onChangeName={(name) => handleItemChange(idx, 'name', name)}
                            onBlurItem={() => handleItemBlur(item)}
                            dbProducts={combinedProducts}
                            catalogItems={combinedCatalog}
                          />

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
                            <span>Billed : {item.billedQty || 0}</span>
                            <span>|</span>
                            <div className="flex items-center gap-1">
                              <span>Un-Billed</span>
                              <input
                                type="number"
                                min="0"
                                value={item.unbilledQty || ''}
                                onChange={(e) => handleItemChange(idx, 'unbilledQty', parseFloat(e.target.value) || 0)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-14 text-center text-[11px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-700"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium"
                              >
                                <option value="sqm">sqm</option>
                                <option value="sqft">sqft</option>
                                <option value="cum">cu.m</option>
                                <option value="nos">nos</option>
                                <option value="bags">bags</option>
                                <option value="mt">MT</option>
                                <option value="rft">Rft</option>
                                <option value="sheets">Sheets</option>
                                <option value="kg">Kg</option>
                                <option value="ton">Ton</option>
                                <option value="brass">Brass</option>
                                <option value="ltr">Ltr</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Amount */}
                      <div className="text-right shrink-0 pt-1.5">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          ₹ {Number(item.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Inputs Row: Unit Rate (₹) and Quantity */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Unit Rate (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate === 0 ? '' : item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          onBlur={() => handleItemBlur(item)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="Rate"
                          className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="Quantity"
                          className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* If Item Level Tax is ON */}
                    {itemLevelTax && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Item GST Rate:</span>
                        <select
                          value={item.gstRate || 0}
                          onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value))}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                        >
                          <option value="0">0.0% GST (Nil)</option>
                          <option value="5">5.0% GST</option>
                          <option value="12">12.0% GST</option>
                          <option value="18">18.0% GST</option>
                          <option value="28">28.0% GST</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              
              {/* Item Subtotal */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Item Subtotal</span>
                <span className="font-mono font-bold">
                  ₹ {itemSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Pre Tax Deduction */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsDeductionModalOpen(true)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pre Tax Deduction</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {preTaxDeductionTotal > 0 ? `- ₹ ${preTaxDeductionTotal.toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {/* Pre Tax Retention */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsRetentionModalOpen(true)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pre Tax Retention</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {preTaxRetentionTotal > 0 ? `- ₹ ${preTaxRetentionTotal.toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {/* Net Subtotal */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-100">
                <span>Net Subtotal</span>
                <span className="font-mono">
                  ₹ {netSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* GST Row */}
              {!itemLevelTax ? (
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">GST</span>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(parseFloat(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="0.0">0.0% (Nil)</option>
                      <option value="5.0">5.0%</option>
                      <option value="12.0">12.0%</option>
                      <option value="18.0">18.0%</option>
                      <option value="28.0">28.0%</option>
                    </select>
                  </div>
                  <span className="font-mono font-semibold text-slate-700">
                    ₹ {gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-700">GST (Item Level Combined)</span>
                  <span className="font-mono font-semibold text-slate-700">
                    ₹ {gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Additional Charges Row */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowAdditionalChargesInput(!showAdditionalChargesInput)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Additional Charges</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {additionalCharges > 0 ? `+ ₹ ${Number(additionalCharges).toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {showAdditionalChargesInput && (
                <div className="p-2.5 bg-slate-50 rounded-lg space-y-2 border border-slate-200 animate-in fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Charges description (e.g. Crane / Shifting)"
                      value={additionalChargesDesc}
                      onChange={(e) => setAdditionalChargesDesc(e.target.value)}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Amount"
                      value={additionalCharges === 0 ? '' : additionalCharges}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-24 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                <span className="uppercase tracking-wider text-xs">Total Bill Amount</span>
                <span className="font-mono text-base text-purple-700">
                  ₹ {grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Notes / Technical Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Enter remarks, measurement references, QA signoffs..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

          </form>

          {/* Sticky Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Net Payable</span>
              <span className="text-base font-extrabold text-purple-700 font-mono">
                ₹ {grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="subcontractor-bill-form"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Subcontractor Bill</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Subcontractor Deduction Modal */}
      <SubcontractorDeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        deductions={deductions}
        itemSubtotal={itemSubtotal}
        onSave={setDeductions}
      />

      {/* Subcontractor Retention Modal */}
      <SubcontractorRetentionModal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
        retentions={retentions}
        onSave={setRetentions}
      />

      {/* Dedicated Vendor Profile Creation Drawer */}
      <VendorProfileDrawer
        isOpen={isVendorDrawerOpen}
        onClose={() => setIsVendorDrawerOpen(false)}
        onVendorCreated={handleVendorCreated}
      />
    </>
  );
};
