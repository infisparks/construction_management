'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Truck,
  Building2,
  HardHat,
  Layers,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  AlertOctagon,
  UserPlus,
  PlusCircle,
  Phone,
  Tag
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySupplier,
  InventorySubcontractor,
  VendorProfile,
  VendorPartyType,
} from '@/lib/inventory/mock-inventory-data';
import { ConstructionTask, ProjectInfo } from '@/lib/construction-planning/types';
import {
  viewInventoryVoucherPdfInNewTab,
  downloadInventoryVoucherPdf,
  downloadMaterialCheckoutHistoryPdf,
  viewMaterialCheckoutHistoryPdfInNewTab
} from '@/lib/inventory/inventory-voucher-pdf';
import { MaterialActionModal } from './MaterialActionModal';
import { VoucherSlipModal } from './VoucherSlipModal';
import { MaterialHistoryDrawer } from './MaterialHistoryDrawer';
import { ProductProfileDrawer } from './ProductProfileDrawer';
import { VendorProfileDrawer } from './VendorProfileDrawer';
import { StockSummaryPdfModal } from './StockSummaryPdfModal';
import {
  viewInventoryStockSummaryPdfInNewTab,
  downloadInventoryStockSummaryPdf,
} from '@/lib/inventory/inventory-stock-pdf';

import { ProductProfileView } from './ProductProfileView';
import { VendorProfileView } from './VendorProfileView';

import {
  fetchInventoryTransactions,
  createInventoryTransaction,
  fetchQuickStockSummary,
  mapDbToInventoryTransaction,
  InventoryQuickSummary,
} from '@/lib/supabase/inventory-services';
import {
  fetchProfileProducts,
  fetchProfileVendors,
  createProfileProduct,
  createProfileVendor,
} from '@/lib/supabase/profile-services';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';

interface SiteInventoryManagementProps {
  allTasks?: ConstructionTask[];
  project?: ProjectInfo;
  initialTab?: 'products' | 'vendors' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock';
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  externalActionTrigger?: { action: InventoryTransactionType; timestamp: number } | null;
}

export const SiteInventoryManagement: React.FC<SiteInventoryManagementProps> = ({
  allTasks = [],
  project,
  initialTab = 'catalog',
  showToast,
  externalActionTrigger,
}) => {
  // Master Live State (Loaded purely from Supabase)
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [subcontractors, setSubcontractors] = useState<InventorySubcontractor[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<VendorProfile[]>([]);

  // Supabase Live State
  const [dbSummary, setDbSummary] = useState<InventoryQuickSummary | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Synchronize Live Data from Supabase (profile_product, profile_vendor & inventory_transactions)
  const loadDataFromSupabase = async () => {
    setIsLoadingDb(true);
    try {
      const [prodList, txList, summary, vendList] = await Promise.all([
        fetchProfileProducts(),
        fetchInventoryTransactions({ limit: 200 }),
        fetchQuickStockSummary(),
        fetchProfileVendors(),
      ]);

      // 1. Process materials from Supabase profile_product
      const mappedMaterials: ConstructionMaterial[] = (prodList || []).map((p) => {
        // Find latest rate from inward transactions if available
        const relatedTxs = (txList || []).filter(
          (t) => t.product_id === p.id && (t.type === 'in' || t.type === 'check_in') && Number(t.unit_rate) > 0
        );
        const latestRate = relatedTxs.length > 0 ? Number(relatedTxs[0].unit_rate) : 0;

        return {
          id: p.id,
          code: p.code || 'MAT-000',
          name: p.name,
          description: p.description || '',
          category: (p.category || 'General') as any,
          unit: (p.unit || 'Nos') as any,
          currentStock: Number(p.current_stock ?? 0),
          minimumAlertStock: Number(p.minimum_alert_stock ?? 0),
          averageUnitRate: latestRate,
          gstRate: 18 as any,
          storageLocation: p.storage_location || 'Central Site Store #1',
          hsnCode: p.hsn_code,
          brand: p.brand,
          lastUpdated: p.updated_at
            ? p.updated_at.split('T')[0]
            : (p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        };
      });
      setMaterials(mappedMaterials);

      // 2. Process transactions from Supabase inventory_transactions
      if (txList) {
        const mapped = txList.map(mapDbToInventoryTransaction);
        setTransactions(mapped);
      } else {
        setTransactions([]);
      }

      // 3. KPI Summary
      if (summary) {
        setDbSummary(summary);
      }

      // 4. Process vendors from Supabase profile_vendor
      if (vendList) {
        const mappedVendors: VendorProfile[] = vendList.map((v) => ({
          id: v.id,
          name: v.name,
          type: (v.type === 'contractor' ? 'contractor' : v.type === 'vendor' ? 'vendor' : 'other') as any,
          contactPerson: v.contact_person || '',
          phone: v.phone || '',
          email: v.email || '',
          trade: v.trade || '',
          gstin: v.gstin || '',
          address: v.address || '',
          location: v.location || v.city || '',
          notes: v.notes || '',
          createdAt: v.created_at || new Date().toISOString(),
        }));
        setVendorProfiles(mappedVendors);

        // Derive suppliers from vendorProfiles
        const supList: InventorySupplier[] = vendList
          .filter((v) => v.type === 'vendor' || v.type === 'other' || !v.type)
          .map((v) => ({
            id: v.id,
            name: v.name,
            type: v.type as any,
            trade: v.trade || '',
            phone: v.phone || '',
            email: v.email || '',
            gstin: v.gstin || '',
            city: v.city || v.location || '',
            address: v.address || '',
            location: v.location || '',
            notes: v.notes || '',
          }));
        setSuppliers(supList);

        // Derive subcontractors from vendorProfiles
        const subList: InventorySubcontractor[] = vendList
          .filter((v) => v.type === 'contractor' || v.type === 'other')
          .map((v) => ({
            id: v.id,
            name: v.name,
            type: v.type as any,
            trade: v.trade || '',
            foremanName: v.contact_person || '',
            phone: v.phone || '',
            address: v.address || '',
            location: v.location || '',
            activeWorkers: 0,
            notes: v.notes || '',
          }));
        setSubcontractors(subList);
      } else {
        setVendorProfiles([]);
        setSuppliers([]);
        setSubcontractors([]);
      }
    } catch (err) {
      console.error('Error syncing inventory from Supabase:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, []);

  // Profile Drawers State
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isVendorDrawerOpen, setIsVendorDrawerOpen] = useState(false);
  const [vendorDrawerDefaultType, setVendorDrawerDefaultType] = useState<VendorPartyType>('vendor');
  const [vendorTypeFilter, setVendorTypeFilter] = useState<'all' | 'vendor' | 'contractor' | 'other'>('all');

  // Stock Summary PDF Modal
  const [isStockPdfModalOpen, setIsStockPdfModalOpen] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'products' | 'vendors' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock'>(initialTab);

  // Sync initialTab when changed externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'depleted'>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'check_in' | 'check_out' | 'return' | 'damage'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  // Unified Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<InventoryTransactionType>('check_in');
  const [selectedMaterialForAction, setSelectedMaterialForAction] = useState<string | null>(null);

  // Voucher Slip Modal
  const [viewingTransaction, setViewingTransaction] = useState<InventoryTransaction | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Material Checkout & Movement History Drawer
  const [historyDrawerMaterial, setHistoryDrawerMaterial] = useState<ConstructionMaterial | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // KPI Calculations (combines instantaneous Supabase quick summary with local state)
  const metrics = useMemo(() => {
    const totalItems = materials.length;
    const totalCurrentStock = materials.reduce((sum, m) => sum + (Number(m.currentStock) || 0), 0);
    const totalValuation = materials.reduce((sum, m) => sum + m.currentStock * m.averageUnitRate, 0);
    const lowStockItems = materials.filter((m) => m.currentStock <= m.minimumAlertStock);
    const inwardTxs = transactions.filter((t) => t.type === 'check_in');
    const outwardTxs = transactions.filter((t) => t.type === 'check_out');
    const returnTxs = transactions.filter((t) => t.type === 'return');
    const damageTxs = transactions.filter((t) => t.type === 'damage');

    return {
      totalItems: dbSummary ? dbSummary.total_products : totalItems,
      totalCurrentStock: dbSummary ? dbSummary.total_current_stock : totalCurrentStock,
      totalValuation,
      lowStockCount: dbSummary ? dbSummary.low_stock_count : lowStockItems.length,
      totalInwardCount: dbSummary ? dbSummary.total_in_count : inwardTxs.length,
      totalOutwardCount: dbSummary ? dbSummary.total_out_count : outwardTxs.length,
      totalReturnsDamagesCount: dbSummary
        ? dbSummary.total_return_count + dbSummary.total_defect_count
        : returnTxs.length + damageTxs.length,
      totalReturnCount: dbSummary ? dbSummary.total_return_count : returnTxs.length,
      totalDefectCount: dbSummary ? dbSummary.total_defect_count : damageTxs.length,
      totalInQuantity: dbSummary?.total_in_quantity ?? 0,
      totalOutQuantity: dbSummary?.total_out_quantity ?? 0,
      totalReturnQuantity: dbSummary?.total_return_quantity ?? 0,
      totalDefectQuantity: dbSummary?.total_defect_quantity ?? 0,
    };
  }, [materials, transactions, dbSummary]);

  // Unique Categories
  const categories = useMemo(() => {
    const set = new Set(materials.map((m) => m.category));
    return Array.from(set);
  }, [materials]);

  // Filtered Materials for Catalog
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        searchQuery === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.storageLocation && m.storageLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.brand && m.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = m.currentStock > 0 && m.currentStock <= m.minimumAlertStock;
      } else if (statusFilter === 'depleted') {
        matchesStatus = m.currentStock <= 0;
      } else if (statusFilter === 'in_stock') {
        matchesStatus = m.currentStock > m.minimumAlertStock;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [materials, searchQuery, selectedCategory, statusFilter]);

  // Filtered Inward Transactions
  const inwardTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'check_in') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.supplierName && t.supplierName.toLowerCase().includes(q)) ||
          (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, searchQuery]);

  // Filtered Outward Transactions
  const outwardTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'check_out') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.subcontractorName && t.subcontractorName.toLowerCase().includes(q)) ||
          (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, searchQuery]);

  // Filtered Returns & Damages
  const returnsAndDamagesTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'return' && t.type !== 'damage') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.returnReason && t.returnReason.toLowerCase().includes(q)) ||
          (t.damageReason && t.damageReason.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, searchQuery]);

  // Filtered Ledger Transactions
  const filteredLedger = useMemo(() => {
    return transactions.filter((t) => {
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      const matchesSearch =
        searchQuery === '' ||
        t.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.subcontractorName && t.subcontractorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.returnReason && t.returnReason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.damageReason && t.damageReason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.wbsTaskCode && t.wbsTaskCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = ledgerTypeFilter === 'all' || t.type === ledgerTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, ledgerTypeFilter, dateFilter]);

  // Low Stock Items
  const lowStockMaterials = useMemo(() => {
    return materials.filter((m) => m.currentStock <= m.minimumAlertStock);
  }, [materials]);

  // Handle external trigger from sidebar
  useEffect(() => {
    if (externalActionTrigger) {
      setActionModalType(externalActionTrigger.action);
      setSelectedMaterialForAction(null);
      setIsActionModalOpen(true);
    }
  }, [externalActionTrigger]);

  // Action: Unified Confirm (handles Check In [+], Check Out [-], Return [-], Damage [-])
  const handleConfirmAction = (
    actionType: InventoryTransactionType,
    txData: Omit<InventoryTransaction, 'id' | 'runningStockBalance'>,
    stockUpdate: { materialId: string; quantityDelta: number; newRate?: number }
  ) => {
    let updatedBalance = 0;
    let targetMaterialObj: ConstructionMaterial | null = null;

    // Update material stock in-memory
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === stockUpdate.materialId) {
          const newStock = Math.max(0, Math.round((m.currentStock + stockUpdate.quantityDelta) * 100) / 100);
          updatedBalance = newStock;
          const updated = {
            ...m,
            currentStock: newStock,
            averageUnitRate: stockUpdate.newRate || m.averageUnitRate,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          targetMaterialObj = updated;
          return updated;
        }
        return m;
      })
    );

    // Add new transaction to top of ledger
    const newTx: InventoryTransaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      runningStockBalance: updatedBalance,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // When Check-Out is recorded: Automatically open Material History Drawer showing full history and bills!
    if (actionType === 'check_out') {
      const currentTarget = targetMaterialObj || materials.find((m) => m.id === stockUpdate.materialId);
      if (currentTarget) {
        setHistoryDrawerMaterial({
          ...currentTarget,
          currentStock: updatedBalance,
        });
        setIsHistoryDrawerOpen(true);
      }
    } else {
      // For Check-in, Return, Damage: Open Voucher Modal in default PDF mode
      setViewingTransaction(newTx);
      setIsVoucherModalOpen(true);
    }

    // Persist asynchronously to Supabase inventory_transactions
    (async () => {
      try {
        const dbType =
          actionType === 'check_in'
            ? 'in'
            : actionType === 'check_out'
            ? 'out'
            : actionType === 'damage'
            ? 'defect'
            : 'return';

        const currentMat = materials.find((m) => m.id === stockUpdate.materialId);

        const { data: dbTx, error } = await createInventoryTransaction({
          voucher_no: txData.voucherNumber,
          type: dbType,
          product_id: stockUpdate.materialId,
          product_name: txData.materialName,
          product_code: currentMat?.code,
          category: txData.category,
          quantity: txData.quantity,
          unit: txData.unit,
          unit_rate: txData.unitRate,
          total_amount: txData.totalAmount,
          vendor_id: txData.supplierId || txData.subcontractorId,
          vendor_name: txData.supplierName || txData.subcontractorName,
          reference_no: txData.challanNumber || txData.poNumber,
          location: txData.unloadingLocation || (txData as any).storageLocation || txData.floorZone,
          reason: txData.returnReason || txData.damageReason || txData.purpose,
          person_name: txData.receivedOrIssuedBy || txData.foremanName || txData.authorizedBy,
          notes: txData.notes,
          transaction_date: txData.date,
          transaction_time: txData.time,
        });

        if (!error && dbTx) {
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === newTx.id
                ? {
                    ...t,
                    id: dbTx.id,
                    runningStockBalance: Number(dbTx.stock_after ?? updatedBalance),
                  }
                : t
            )
          );
          fetchQuickStockSummary().then((s) => s && setDbSummary(s));
        }
      } catch (dbErr) {
        console.error('Failed to persist transaction to Supabase:', dbErr);
      }
    })();

    if (showToast) {
      if (actionType === 'check_in') {
        showToast(`Inward GRN Logged (${txData.voucherNumber}): +${txData.quantity} ${txData.unit} ${txData.materialName}`, 'success');
      } else if (actionType === 'check_out') {
        showToast(`Site MIN Issued (${txData.voucherNumber}): -${txData.quantity} ${txData.unit}. Stock updated!`, 'success');
      } else if (actionType === 'return') {
        showToast(`Vendor Return Logged (${txData.voucherNumber}): -${txData.quantity} ${txData.unit} (${txData.returnReason})`, 'info');
      } else if (actionType === 'damage') {
        showToast(`Damage Write-Off Logged (${txData.voucherNumber}): -${txData.quantity} ${txData.unit} (${txData.damageReason})`, 'error');
      }
    }
  };

  // Quick Open Modal with specific action type
  const openActionModal = (type: InventoryTransactionType, matId?: string | null) => {
    setActionModalType(type);
    setSelectedMaterialForAction(matId || null);
    setIsActionModalOpen(true);
  };

  const handleOpenVoucher = (tx: InventoryTransaction) => {
    setViewingTransaction(tx);
    setIsVoucherModalOpen(true);
  };

  // Open professional PDF via Blob URL in new browser tab
  const handleViewPdfBlob = (tx: InventoryTransaction) => {
    viewInventoryVoucherPdfInNewTab(tx, project?.name || 'Noori Crest Tower');
  };

  const handleDownloadPdf = (tx: InventoryTransaction) => {
    downloadInventoryVoucherPdf(tx, project?.name || 'Noori Crest Tower');
  };

  const handleOpenMaterialHistory = (matId: string) => {
    const targetMat = materials.find((m) => m.id === matId);
    if (targetMat) {
      setHistoryDrawerMaterial(targetMat);
      setIsHistoryDrawerOpen(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Type', 'Date', 'Time', 'Material Code', 'Material Name', 'Quantity', 'Unit', 'Rate', 'Total', 'Party / Reason', 'Vehicle / Task', 'Storekeeper'];
    const rows = transactions.map((t) => [
      t.voucherNumber,
      t.type,
      t.date,
      t.time,
      t.materialId,
      t.materialName,
      t.quantity,
      t.unit,
      t.unitRate || 0,
      t.totalAmount || 0,
      t.returnReason || t.damageReason || t.supplierName || t.subcontractorName || '',
      t.vehicleNumber || t.wbsTaskCode || '',
      t.receivedOrIssuedBy,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Site_Inventory_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Product Profile Creation Handler
  const handleSaveProduct = async (newProduct: ConstructionMaterial) => {
    setMaterials((prev) => [newProduct, ...prev]);
    try {
      const { data, error } = await createProfileProduct({
        code: newProduct.code,
        name: newProduct.name,
        category: newProduct.category,
        unit: newProduct.unit,
        description: newProduct.description,
        brand: newProduct.brand,
        storage_location: newProduct.storageLocation,
        minimum_alert_stock: newProduct.minimumAlertStock,
        current_stock: newProduct.currentStock,
        is_active: true,
      });
      if (data) {
        setMaterials((prev) => prev.map((m) => (m.id === newProduct.id ? { ...m, id: data.id } : m)));
      }
      if (error) {
        console.error('Error creating product in Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to create product in Supabase:', err);
    }
    if (showToast) {
      showToast(`Product profile "${newProduct.name}" created (Code: ${newProduct.code})!`, 'success');
    }
  };

  // Vendor Profile Creation Handler
  const handleSaveVendor = async (newVendor: VendorProfile) => {
    setVendorProfiles((prev) => [newVendor, ...prev]);

    // Automatically register into suppliers and/or subcontractors so it populates all dropdowns
    if (newVendor.type === 'vendor' || newVendor.type === 'other') {
      const newSupplier: InventorySupplier = {
        id: newVendor.id,
        name: newVendor.name,
        type: newVendor.type,
        trade: newVendor.trade || '',
        phone: newVendor.phone || '',
        email: newVendor.email || '',
        gstin: newVendor.gstin || '',
        city: newVendor.location || '',
        address: newVendor.address || '',
        location: newVendor.location || '',
        notes: newVendor.notes || '',
      };
      setSuppliers((prev) => [newSupplier, ...prev]);
    }

    if (newVendor.type === 'contractor' || newVendor.type === 'other') {
      const newSub: InventorySubcontractor = {
        id: newVendor.id,
        name: newVendor.name,
        type: newVendor.type,
        trade: newVendor.trade || '',
        foremanName: newVendor.contactPerson || '',
        phone: newVendor.phone || '',
        address: newVendor.address || '',
        location: newVendor.location || '',
        activeWorkers: 10,
        notes: newVendor.notes || '',
      };
      setSubcontractors((prev) => [newSub, ...prev]);
    }

    try {
      const { data, error } = await createProfileVendor({
        name: newVendor.name,
        type: newVendor.type,
        phone: newVendor.phone,
        email: newVendor.email,
        contact_person: newVendor.contactPerson,
        trade: newVendor.trade,
        gstin: newVendor.gstin,
        address: newVendor.address,
        location: newVendor.location,
        notes: newVendor.notes,
        is_active: true,
      });
      if (data) {
        setVendorProfiles((prev) => prev.map((v) => (v.id === newVendor.id ? { ...v, id: data.id } : v)));
        setSuppliers((prev) => prev.map((s) => (s.id === newVendor.id ? { ...s, id: data.id } : s)));
        setSubcontractors((prev) => prev.map((s) => (s.id === newVendor.id ? { ...s, id: data.id } : s)));
      }
      if (error) {
        console.error('Error creating vendor in Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to create vendor in Supabase:', err);
    }

    if (showToast) {
      showToast(`Vendor profile "${newVendor.name}" created and added to dropdowns!`, 'success');
    }
  };

  // Filtered Vendor Profiles for directory tab
  const filteredVendors = useMemo(() => {
    return vendorProfiles.filter((v) => {
      if (vendorTypeFilter !== 'all' && v.type !== vendorTypeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q)) ||
        (v.trade && v.trade.toLowerCase().includes(q)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q))
      );
    });
  }, [vendorProfiles, vendorTypeFilter, searchQuery]);

  return (
    <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-200 w-full">
      {/* 1. Executive Top Header (Compact & Professional) */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-2.5 sm:py-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Package className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Store & Site Inventory
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time stock balance, inward receipts, dispatches & alert monitoring
            </p>
          </div>
        </div>

        {/* Clean, Organized Button Toolbar */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Quick Refresh */}
          <button
            type="button"
            onClick={loadDataFromSupabase}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Refresh stock and ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-purple-600' : 'text-slate-400'}`} />
            <span>Sync</span>
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Export full ledger as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          {/* Preview Stock Balance PDF (Opens Blob URL in new tab & viewer) */}
          <button
            type="button"
            onClick={() => {
              viewInventoryStockSummaryPdfInNewTab(materials, project?.name || 'Noori Crest Tower');
              setIsStockPdfModalOpen(true);
            }}
            className="h-8 px-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Preview all inventory stock as PDF statement (opens Blob URL)"
          >
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>Preview PDF</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5 shrink-0 hidden sm:block" />

          {/* Master Profile Form Drawers */}
          <button
            type="button"
            onClick={() => setIsProductDrawerOpen(true)}
            className="h-8 px-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Create new product profile"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Product</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVendorDrawerDefaultType('vendor');
              setIsVendorDrawerOpen(true);
            }}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Create new vendor / contractor profile"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Vendor</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5 shrink-0 hidden sm:block" />

          {/* Return & Defect Quick Actions */}
          <button
            type="button"
            onClick={() => openActionModal('return')}
            className="h-8 px-2.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Log return of material to supplier"
          >
            <RotateCcw className="w-3 h-3 text-amber-600" />
            <span>Return</span>
          </button>

          <button
            type="button"
            onClick={() => openActionModal('damage')}
            className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Log damaged / spoiled material"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Defect</span>
          </button>

          {/* Issue to Site */}
          <button
            type="button"
            onClick={() => openActionModal('check_out')}
            className="h-8 px-3 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Issue material to site contractor"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 stroke-[2.2]" />
            <span>Issue (MIN)</span>
          </button>

          {/* Primary Action: Inward Delivery */}
          <button
            type="button"
            onClick={() => openActionModal('check_in')}
            className="h-8 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
            title="Record inward delivery from supplier"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Inward (GRN)</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Ribbon (5 Compact Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Card 1: Total Stock */}
        <div 
          onClick={() => setActiveTab('catalog')}
          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-purple-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Stock</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              {metrics.totalItems} SKUs
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">
              {metrics.totalCurrentStock.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Units
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Live store inventory</span>
        </div>

        {/* Card 2: Low Stock Alerts */}
        <div 
          onClick={() => setActiveTab('low_stock')}
          className={`p-3 rounded-xl border shadow-2xs cursor-pointer transition-all ${
            metrics.lowStockCount > 0
              ? 'bg-amber-50/50 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
              metrics.lowStockCount > 0
                ? 'text-amber-800 bg-amber-100 border-amber-300'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              <AlertTriangle className="w-2.5 h-2.5" />
              {metrics.lowStockCount > 0 ? 'Reorder' : 'Healthy'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-xl font-bold ${metrics.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {metrics.lowStockCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Items</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Below alert buffer</span>
        </div>

        {/* Card 3: Inward Deliveries */}
        <div 
          onClick={() => setActiveTab('inward')}
          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-purple-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inward Receipts</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
              <ArrowDownLeft className="w-2.5 h-2.5" /> (+) GRN
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{metrics.totalInwardCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Deliveries</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Added to store</span>
        </div>

        {/* Card 4: Site Dispatches */}
        <div 
          onClick={() => setActiveTab('outward')}
          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-indigo-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Site Dispatches</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> (-) MIN
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{metrics.totalOutwardCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Issues</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">Issued to site work</span>
        </div>

        {/* Card 5: Returns & Defects */}
        <div 
          onClick={() => setActiveTab('returns_damages')}
          className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Returns & Defects</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Deductions
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{metrics.totalReturnsDamagesCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Logs</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
            {metrics.totalReturnCount} Ret • {metrics.totalDefectCount} Defect
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs (Clean & Professional - Current Stock is Tab #1) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-1 shadow-2xs flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Current Stock ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'products'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Products Master ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Vendors & Parties ({vendorProfiles.length})</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveTab('inward')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'inward'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Inward GRN ({inwardTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outward')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'outward'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Site Issues ({outwardTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns_damages')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'returns_damages'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Returns & Defects ({returnsAndDamagesTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Stock Ledger ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'low_stock'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${metrics.lowStockCount > 0 ? 'text-amber-500' : ''}`} />
          <span>Low Stock ({metrics.lowStockCount})</span>
        </button>
      </div>

      {/* 4. Filter & Search Toolbar (Compact Single Bar) */}
      {!['products', 'vendors'].includes(activeTab) && (
      <div className="bg-white rounded-xl border border-slate-200/80 p-2 sm:p-2.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'catalog'
                ? 'Search material name, code, storage shed, or brand...'
                : activeTab === 'inward'
                ? 'Search GRN #, challan, vehicle #, or supplier...'
                : activeTab === 'outward'
                ? 'Search MIN #, contractor, foreman, or floor...'
                : activeTab === 'returns_damages'
                ? 'Search return reason, damage reason, or voucher...'
                : 'Search transactions, slip codes, vehicles, reasons...'
            }
            className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 bg-slate-50/50"
          />
        </div>

        {/* Filter Selectors based on tab */}
        <div className="flex items-center flex-wrap gap-2">
          {activeTab === 'catalog' && (
            <>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600"
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock (Alert)</option>
                <option value="depleted">Depleted (0 Stock)</option>
              </select>

              {/* Quick Preview Stock PDF Button in Toolbar */}
              <button
                type="button"
                onClick={() => {
                  viewInventoryStockSummaryPdfInNewTab(materials, project?.name || 'Noori Crest Tower');
                  setIsStockPdfModalOpen(true);
                }}
                className="h-8.5 px-3 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Preview all inventory with stock as PDF statement"
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                <span>Preview PDF</span>
              </button>
            </>
          )}

          {activeTab === 'vendors' && (
            <select
              value={vendorTypeFilter}
              onChange={(e) => setVendorTypeFilter(e.target.value as any)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600 font-semibold"
            >
              <option value="all">All Party Types</option>
              <option value="vendor">Material Vendors (Suppliers)</option>
              <option value="contractor">Subcontractors (Agencies)</option>
              <option value="other">Other Parties (Logistics/Rental)</option>
            </select>
          )}

          {activeTab === 'ledger' && (
            <select
              value={ledgerTypeFilter}
              onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
              className="h-8.5 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600"
            >
              <option value="all">All Transaction Types</option>
              <option value="check_in">(+) Check-In (GRN)</option>
              <option value="check_out">(-) Check-Out (MIN)</option>
              <option value="return">(-) Return to Vendor</option>
              <option value="damage">(-) Damaged / Breakage</option>
            </select>
          )}

          {/* Universal Date Filter for Inward, Outward, Returns, and Ledger */}
          {['inward', 'outward', 'returns_damages', 'ledger'].includes(activeTab) && (
            <DateFilterControl
              value={dateFilter}
              onChange={setDateFilter}
              label={activeTab === 'inward' ? 'GRN Date' : activeTab === 'outward' ? 'Dispatch Date' : 'Transaction Date'}
            />
          )}

          {/* Reset Filters button if search or filters active */}
          {(searchQuery || isDateFilterActive(dateFilter) || selectedCategory !== 'all' || statusFilter !== 'all' || ledgerTypeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFilter(DEFAULT_DATE_FILTER);
                setSelectedCategory('all');
                setStatusFilter('all');
                setLedgerTypeFilter('all');
              }}
              className="text-xs text-purple-700 hover:underline px-2 py-1 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      )}

      {/* 5. TAB VIEW CONTENTS */}

      {/* TAB 1: LIVE STOCK CATALOG */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Material Code & Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Storage Godown / Yard</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Min Buffer</th>
                  <th className="px-4 py-3 text-right">Avg Rate (Rs.)</th>
                  <th className="px-4 py-3 text-right">Est. Valuation</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions (Movement)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading inventory from Supabase...</span>
                        <span className="text-[11px] text-slate-400">Fetching live products & store balance</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No construction materials found in Supabase.</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;+ Product&quot; above to create your first product profile.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => {
                    const isLow = m.currentStock <= m.minimumAlertStock && m.currentStock > 0;
                    const isDepleted = m.currentStock <= 0;
                    const valuation = m.currentStock * m.averageUnitRate;

                    return (
                      <tr key={m.id} className="hover:bg-purple-50/20 transition-colors">
                        {/* Code & Name */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryDrawerMaterial(m);
                              setIsHistoryDrawerOpen(true);
                            }}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {m.name}
                            </div>
                            <div className="text-[11px] font-mono text-purple-700 flex items-center gap-1.5 mt-0.5">
                              <span>{m.code}</span>
                              {m.brand && (
                                <span className="text-slate-400 font-sans">• {m.brand}</span>
                              )}
                              <span className="text-[10px] text-purple-600 bg-purple-50 px-1 py-0.2 rounded group-hover:underline">
                                View History ↗
                              </span>
                            </div>
                          </button>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {m.category}
                          </span>
                        </td>

                        {/* Storage Location */}
                        <td className="px-4 py-3">
                          <span className="text-slate-600 flex items-center gap-1 truncate max-w-[190px]" title={m.storageLocation}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{m.storageLocation}</span>
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                          {m.currentStock} <span className="text-xs font-normal text-slate-500">{m.unit}</span>
                        </td>

                        {/* Min Buffer */}
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                          {m.minimumAlertStock} {m.unit}
                        </td>

                        {/* Avg Rate */}
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {m.averageUnitRate > 0 ? (
                            `Rs. ${m.averageUnitRate.toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans font-normal italic">
                              Set on purchase
                            </span>
                          )}
                        </td>

                        {/* Valuation */}
                        <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">
                          Rs. {Math.round(valuation).toLocaleString('en-IN')}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3 text-center">
                          {isDepleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Depleted
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </td>

                        {/* Quick 4 Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Check In */}
                            <button
                              type="button"
                              onClick={() => openActionModal('check_in', m.id)}
                              className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                              title="Check-In (+) delivery"
                            >
                              <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>IN</span>
                            </button>

                            {/* Check Out */}
                            <button
                              type="button"
                              onClick={() => openActionModal('check_out', m.id)}
                              className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                              title="Check-Out (-) issue to contractor"
                            >
                              <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>OUT</span>
                            </button>

                            {/* Return */}
                            <button
                              type="button"
                              onClick={() => openActionModal('return', m.id)}
                              className="px-1.5 py-1 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                              title="Return (-) to supplier with reason"
                            >
                              <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>RET</span>
                            </button>

                            {/* Damage */}
                            <button
                              type="button"
                              onClick={() => openActionModal('damage', m.id)}
                              className="px-1.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                              title="Log Damaged (-) with reason"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>DMG</span>
                            </button>

                            {/* View Full History */}
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryDrawerMaterial(m);
                                setIsHistoryDrawerOpen(true);
                              }}
                              className="px-1.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer ml-0.5"
                              title="View full checkout & movement history"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>History</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INWARD DELIVERIES REGISTER (GRN) */}
      {activeTab === 'inward' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Goods Receipt Note (GRN) Deliveries Register</h3>
              <p className="text-xs text-slate-500">Incoming deliveries added (+) to inventory store</p>
            </div>
            <button
              type="button"
              onClick={() => openActionModal('check_in')}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Check In (GRN)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">GRN Voucher #</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Supplier Agency</th>
                  <th className="px-4 py-3">Challan / Vehicle #</th>
                  <th className="px-4 py-3">Material Received</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Total (Rs.)</th>
                  <th className="px-4 py-3 text-right">Storekeeper</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading inward receipts from Supabase...</span>
                      </div>
                    </td>
                  </tr>
                ) : inwardTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <ArrowDownLeft className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No inward deliveries recorded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;Record Check In (GRN)&quot; to log incoming delivery.</p>
                    </td>
                  </tr>
                ) : (
                  inwardTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">
                        {tx.voucherNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{tx.date}</div>
                        <div className="text-[11px] text-slate-400">{tx.time}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {tx.supplierName || 'Site Material Supplier'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-mono">{tx.challanNumber || 'No Challan'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tx.vehicleNumber || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{tx.materialName}</div>
                        <div className="text-[11px] text-slate-500">{tx.category}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                        +{tx.quantity} {tx.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                        {tx.totalAmount ? `Rs. ${tx.totalAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {tx.receivedOrIssuedBy}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewPdfBlob(tx)}
                            className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            title="Open certified GRN PDF voucher in new browser tab via Blob URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Bill (PDF)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenVoucher(tx)}
                            className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Preview voucher in-app"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SITE ISSUE MIN REGISTER */}
      {activeTab === 'outward' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Material Issue Note (MIN) Dispatches</h3>
              <p className="text-xs text-slate-500">Materials issued (-) to site execution contractors</p>
            </div>
            <button
              type="button"
              onClick={() => openActionModal('check_out')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Issue Material (MIN)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">MIN Voucher #</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Subcontractor Agency</th>
                  <th className="px-4 py-3">Receiving Foreman</th>
                  <th className="px-4 py-3">Floor / Purpose</th>
                  <th className="px-4 py-3">Material Issued</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Authorized By</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading site dispatches from Supabase...</span>
                      </div>
                    </td>
                  </tr>
                ) : outwardTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <ArrowUpRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No material dispatches recorded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;Issue Material (MIN)&quot; to issue stock to site work.</p>
                    </td>
                  </tr>
                ) : (
                  outwardTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                        {tx.voucherNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{tx.date}</div>
                        <div className="text-[11px] text-slate-400">{tx.time}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {tx.subcontractorName || 'Site Labour Gang'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {tx.foremanName || 'Supervisor'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{tx.floorZone || 'General Floor'}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{tx.purpose || 'Site work'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{tx.materialName}</div>
                        <div className="text-[11px] text-slate-500">{tx.category}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700 text-sm">
                        -{tx.quantity} {tx.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {tx.authorizedBy || 'Er. Amit Verma'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewPdfBlob(tx)}
                            className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            title="Open certified MIN voucher in new browser tab via Blob URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Bill (PDF)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMaterialHistory(tx.materialId)}
                            className="px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="View full checkout history & download consolidated bill"
                          >
                            <History className="w-3 h-3 text-indigo-600" />
                            <span>History</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenVoucher(tx)}
                            className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Preview voucher in-app"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RETURNS & DAMAGED REGISTER */}
      {activeTab === 'returns_damages' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Returns & Damaged Material Register</h3>
              <p className="text-xs text-slate-500">
                All returns to suppliers and damage/scrap write-offs deducted (-) from inventory with reasons
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openActionModal('return')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>- Return</span>
              </button>
              <button
                type="button"
                onClick={() => openActionModal('damage')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>- Damage</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Deducted Qty</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3">Authorized By</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading returns & defects from Supabase...</span>
                      </div>
                    </td>
                  </tr>
                ) : returnsAndDamagesTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No returns or damaged items recorded.</p>
                      <p className="text-xs text-slate-400 mt-1">All vendor returns and scrap write-offs will be tracked here.</p>
                    </td>
                  </tr>
                ) : (
                  returnsAndDamagesTransactions.map((tx) => {
                    const isRet = tx.type === 'return';
                    return (
                      <tr key={tx.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {tx.voucherNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div>{tx.date}</div>
                          <div className="text-[11px] text-slate-400">{tx.time}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRet
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isRet ? 'Return (-)' : 'Damaged (-)'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{tx.materialName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{tx.materialId}</div>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold text-sm ${isRet ? 'text-amber-800' : 'text-rose-700'}`}>
                          -{tx.quantity} {tx.unit}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {tx.returnReason || tx.damageReason || '—'}
                          </div>
                          {tx.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{tx.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {tx.authorizedBy || 'Er. Amit Verma'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewPdfBlob(tx)}
                              className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title="Open certified Return / Damage bill in new browser tab via Blob URL"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Bill (PDF)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenVoucher(tx)}
                              className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Preview voucher in-app"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span>Preview</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLETE STOCK HISTORY & LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit Ledger & Transaction History</h3>
              <p className="text-xs text-slate-500">Chronological trail of every check-in, check-out, return, and damage with running stock</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLedger.length} events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Movement Qty</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3">Party / Reason</th>
                  <th className="px-4 py-3">Storekeeper</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading audit ledger from Supabase...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No history transactions found in Supabase.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((tx) => {
                    const isCheckIn = tx.type === 'check_in';
                    const isCheckOut = tx.type === 'check_out';
                    const isReturn = tx.type === 'return';
                    const isDamage = tx.type === 'damage';

                    return (
                      <tr key={tx.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-4 py-3 text-slate-600">
                          <div>{tx.date}</div>
                          <div className="text-[11px] text-slate-400">{tx.time}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {tx.voucherNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCheckIn
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCheckOut
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isReturn
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isCheckIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span>
                              {isCheckIn && 'Check-In (+)'}
                              {isCheckOut && 'Check-Out (-)'}
                              {isReturn && 'Return (-)'}
                              {isDamage && 'Damaged (-)'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{tx.materialName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{tx.materialId}</div>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold text-sm ${
                          isCheckIn 
                            ? 'text-emerald-700' 
                            : isReturn 
                            ? 'text-amber-800' 
                            : isDamage 
                            ? 'text-rose-700' 
                            : 'text-indigo-700'
                        }`}>
                          {isCheckIn ? `+${tx.quantity}` : `-${tx.quantity}`} {tx.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {tx.runningStockBalance} {tx.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="font-medium text-slate-800 truncate max-w-[190px]">
                            {tx.returnReason || tx.damageReason || tx.supplierName || tx.subcontractorName || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[190px]">
                            {tx.vehicleNumber || tx.floorZone || tx.wbsTaskCode || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {tx.receivedOrIssuedBy}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewPdfBlob(tx)}
                              className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title="Open certified voucher bill in new browser tab via Blob URL"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Bill (PDF)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenVoucher(tx)}
                              className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Preview voucher in-app"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: LOW STOCK & REORDER ALERTS */}
      {activeTab === 'low_stock' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {lowStockMaterials.length} Construction Materials Below Safety Reorder Point
                </h3>
                <p className="text-xs text-amber-700">
                  Replenish immediately to ensure site execution proceeds without supply bottlenecks.
                </p>
              </div>
            </div>
          </div>

          {isLoadingDb ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-700">Checking stock buffer levels...</span>
            </div>
          ) : lowStockMaterials.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">All materials are adequately stocked</p>
              <p className="text-xs text-slate-400 mt-1">No items currently below safety reorder threshold.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {lowStockMaterials.map((m) => {
                const shortfall = Math.max(0, m.minimumAlertStock * 2 - m.currentStock);
                const estCost = shortfall * m.averageUnitRate;

                return (
                  <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-purple-700">{m.code}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{m.name}</h4>
                        <span className="text-[11px] text-slate-500">{m.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Low Stock
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current In-Store:</span>
                        <strong className="text-rose-700">{m.currentStock} {m.unit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Minimum Safe Threshold:</span>
                        <strong className="text-slate-800">{m.minimumAlertStock} {m.unit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recommended Order:</span>
                        <strong className="text-purple-700">+{shortfall} {m.unit} (Rs. {Math.round(estCost).toLocaleString('en-IN')})</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openActionModal('check_in', m.id)}
                      className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Create Check-In / Reorder</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 0: PRODUCT PROFILES (profile_product) */}
      {activeTab === 'products' && (
        <ProductProfileView showToast={showToast} />
      )}

      {/* TAB 7: VENDORS & PARTIES DIRECTORY (profile_vendor) */}
      {activeTab === 'vendors' && (
        <VendorProfileView showToast={showToast} />
      )}

      {/* Unified Material Action Sidebar Drawer */}
      <MaterialActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        tasks={allTasks}
        transactions={transactions}
        selectedMaterialId={selectedMaterialForAction}
        initialAction={actionModalType}
        onConfirmAction={handleConfirmAction}
        onViewFullHistory={handleOpenMaterialHistory}
        onOpenVendorDrawer={(defType) => {
          setVendorDrawerDefaultType(defType || 'vendor');
          setIsVendorDrawerOpen(true);
        }}
        onOpenProductDrawer={() => setIsProductDrawerOpen(true)}
      />

      {/* Digital Voucher Slip Preview Modal */}
      <VoucherSlipModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        transaction={viewingTransaction}
        projectName={project?.name || 'Noori Crest Tower'}
      />

      {/* Item Checkout & Movement History Drawer */}
      <MaterialHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        material={historyDrawerMaterial}
        transactions={transactions}
        projectName={project?.name || 'Noori Crest Tower'}
        onOpenVoucherModal={handleOpenVoucher}
      />

      {/* Product Profile Sidebar Drawer */}
      <ProductProfileDrawer
        isOpen={isProductDrawerOpen}
        onClose={() => setIsProductDrawerOpen(false)}
        onSaveProduct={handleSaveProduct}
        existingCategories={categories}
      />

      {/* Vendor Profile Sidebar Drawer */}
      <VendorProfileDrawer
        isOpen={isVendorDrawerOpen}
        onClose={() => setIsVendorDrawerOpen(false)}
        onSaveVendor={handleSaveVendor}
        defaultType={vendorDrawerDefaultType}
      />

      {/* Site Stock Summary PDF Modal (Blob URL Preview) */}
      <StockSummaryPdfModal
        isOpen={isStockPdfModalOpen}
        onClose={() => setIsStockPdfModalOpen(false)}
        materials={materials}
        projectName={project?.name || 'Noori Crest Tower'}
      />
    </div>
  );
};
