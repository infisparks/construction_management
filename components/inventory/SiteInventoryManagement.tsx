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
  Tag,
  Paperclip,
  Trash2,
  ArchiveRestore,
  MoreVertical,
  ChevronDown,
  MessageCircle,
  Users,
  Box
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySupplier,
  InventorySubcontractor,
  VendorProfile,
  VendorPartyType,
} from '@/lib/inventory/inventory-types';
import { ConstructionTask, ProjectInfo } from '@/lib/construction-planning/types';
import {
  viewInventoryVoucherPdfInNewTab,
  downloadInventoryVoucherPdf,
  downloadMaterialCheckoutHistoryPdf,
  viewMaterialCheckoutHistoryPdfInNewTab,
  uploadOrGetVoucherPdfUrl
} from '@/lib/inventory/inventory-voucher-pdf';
import { MaterialActionModal } from './MaterialActionModal';
import { VoucherSlipModal } from './VoucherSlipModal';
import { MaterialHistoryDrawer } from './MaterialHistoryDrawer';
import { MaterialActionDrawer } from './MaterialActionDrawer';
import { ProductProfileDrawer } from './ProductProfileDrawer';
import { VendorProfileDrawer } from './VendorProfileDrawer';
import { StockSummaryPdfModal } from './StockSummaryPdfModal';
import { InventoryBillViewerModal } from './InventoryBillViewerModal';
import {
  viewInventoryStockSummaryPdfInNewTab,
  downloadInventoryStockSummaryPdf,
  uploadOrGetStockSummaryPdfUrl
} from '@/lib/inventory/inventory-stock-pdf';
import { WhatsAppShareModal, WhatsAppSharePayload } from '@/components/whatsapp/WhatsAppShareModal';

import { ProductProfileView } from './ProductProfileView';
import { VendorProfileView } from './VendorProfileView';

import {
  fetchInventoryTransactions,
  createInventoryTransaction,
  fetchQuickStockSummary,
  mapDbToInventoryTransaction,
  softDeleteInventoryTransaction,
  restoreInventoryTransaction,
  updateInventoryTransactionRecord,
  InventoryQuickSummary,
} from '@/lib/supabase/inventory-services';
import {
  fetchProfileProducts,
  fetchProfileVendors,
  createProfileProduct,
  createProfileVendor,
  deleteProfileProduct,
  restoreProfileProduct,
  fetchDeletedProfileProducts,
  fetchDeletedProfileVendors,
  restoreProfileVendor,
  ProfileProduct,
  ProfileVendor,
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
  initialTab?: 'products' | 'vendors' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'bin';
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

        // Calculate live stock balance directly from inventory_transactions ledger
        // Inward (+), Outward / Defect / Return (-)
        const productTxs = (txList || []).filter(
          (t) => t.product_id === p.id && !t.is_deleted && !(t.notes && t.notes.startsWith('[DELETED]'))
        );
        let liveStockBalance = 0;
        for (const t of productTxs) {
          const type = (t.type || '').toLowerCase();
          const qty = Number(t.quantity) || 0;
          if (type === 'in' || type === 'check_in') {
            liveStockBalance += qty;
          } else {
            liveStockBalance = Math.max(0, liveStockBalance - qty);
          }
        }

        const effectiveStock = txList !== null && txList !== undefined ? liveStockBalance : Number(p.current_stock ?? 0);

        return {
          id: p.id,
          code: p.code || 'MAT-000',
          name: p.name,
          description: p.description || '',
          category: (p.category || 'General') as any,
          unit: (p.unit || 'Nos') as any,
          currentStock: effectiveStock,
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

  // Recycle Bin State
  const [deletedProducts, setDeletedProducts] = useState<ProfileProduct[]>([]);
  const [deletedVendors, setDeletedVendors] = useState<ProfileVendor[]>([]);
  const [isLoadingBin, setIsLoadingBin] = useState(false);

  const loadDeletedProducts = async () => {
    setIsLoadingBin(true);
    try {
      const [prods, vends] = await Promise.all([
        fetchDeletedProfileProducts(),
        fetchDeletedProfileVendors(),
      ]);
      setDeletedProducts(prods || []);
      setDeletedVendors(vends || []);
    } catch (err) {
      console.error('Error fetching deleted items for bin:', err);
    } finally {
      setIsLoadingBin(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
    loadDeletedProducts();
  }, []);

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? It will be moved to the Recycle Bin and can be restored anytime.`)) {
      return;
    }
    const { error } = await deleteProfileProduct(id);
    if (!error) {
      showToast?.(`Product "${name}" moved to Recycle Bin.`, 'info');
      await Promise.all([loadDataFromSupabase(), loadDeletedProducts()]);
    } else {
      showToast?.('Failed to delete product', 'error');
    }
  };

  const handleRestoreMaterial = async (id: string, name: string) => {
    const { error } = await restoreProfileProduct(id);
    if (!error) {
      showToast?.(`Product "${name}" restored to Active Inventory!`, 'success');
      await Promise.all([loadDataFromSupabase(), loadDeletedProducts()]);
    } else {
      showToast?.('Failed to restore product', 'error');
    }
  };

  const handleRestoreVendorFromBin = async (id: string, name: string) => {
    const { error } = await restoreProfileVendor(id);
    if (!error) {
      showToast?.(`Vendor "${name}" restored to Active Parties!`, 'success');
      await Promise.all([loadDataFromSupabase(), loadDeletedProducts()]);
    } else {
      showToast?.('Failed to restore vendor profile', 'error');
    }
  };

  // Profile Drawers State
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isVendorDrawerOpen, setIsVendorDrawerOpen] = useState(false);
  const [vendorDrawerDefaultType, setVendorDrawerDefaultType] = useState<VendorPartyType>('vendor');
  const [vendorTypeFilter, setVendorTypeFilter] = useState<'all' | 'vendor' | 'contractor' | 'other'>('all');

  // Stock Summary PDF Modal
  const [isStockPdfModalOpen, setIsStockPdfModalOpen] = useState(false);

  // WhatsApp Share Modal
  const [isWhatsAppShareOpen, setIsWhatsAppShareOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppSharePayload | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'products' | 'vendors' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'bin'>(initialTab);
  const [binViewMode, setBinViewMode] = useState<'products' | 'movements' | 'vendors'>('products');

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

  // Material Action Drawer & Row Actions Popover State
  const [actionDrawerMaterial, setActionDrawerMaterial] = useState<ConstructionMaterial | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Voucher Slip Modal
  const [viewingTransaction, setViewingTransaction] = useState<InventoryTransaction | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Material Checkout & Movement History Drawer
  const [historyDrawerMaterial, setHistoryDrawerMaterial] = useState<ConstructionMaterial | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Attached Bill Viewer Modal (PNG/PDF)
  const [billViewerState, setBillViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    fileName?: string;
    voucherNumber?: string;
  }>({
    isOpen: false,
    fileUrl: null,
  });

  // KPI Calculations (combines instantaneous Supabase quick summary with local state)
  const metrics = useMemo(() => {
    const totalItems = materials.length;
    const totalCurrentStock = materials.reduce((sum, m) => sum + (Number(m.currentStock) || 0), 0);
    const totalValuation = materials.reduce((sum, m) => sum + m.currentStock * m.averageUnitRate, 0);
    const lowStockItems = materials.filter((m) => m.currentStock <= m.minimumAlertStock);
    const activeTransactions = transactions.filter((t) => !t.isDeleted);
    const inwardTxs = activeTransactions.filter((t) => t.type === 'check_in');
    const outwardTxs = activeTransactions.filter((t) => t.type === 'check_out');
    const returnTxs = activeTransactions.filter((t) => t.type === 'return');
    const damageTxs = activeTransactions.filter((t) => t.type === 'damage');

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
      if (t.isDeleted) return false;
      if (t.type !== 'check_in') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.brand && t.brand.toLowerCase().includes(q)) ||
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
      if (t.isDeleted) return false;
      if (t.type !== 'check_out') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.brand && t.brand.toLowerCase().includes(q)) ||
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
      if (t.isDeleted) return false;
      if (t.type !== 'return' && t.type !== 'damage') return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.voucherNumber.toLowerCase().includes(q) ||
          t.materialName.toLowerCase().includes(q) ||
          (t.brand && t.brand.toLowerCase().includes(q)) ||
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
      if (t.isDeleted) return false;
      if (!matchesDateFilter(t.date, dateFilter)) return false;
      const matchesSearch =
        searchQuery === '' ||
        t.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.brand && t.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

  // Soft-deleted transactions list for Bin
  const deletedTransactions = useMemo(() => {
    return transactions.filter((t) => t.isDeleted);
  }, [transactions]);

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
          brand: txData.brand,
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
          file_url: txData.fileUrl,
          file_name: txData.fileName,
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

  // WhatsApp Share Handlers
  const handleShareInventoryStatusToWhatsApp = () => {
    const totalValuation = materials.reduce((acc, m) => acc + (m.currentStock * (m.averageUnitRate || 0)), 0);
    const lowStockCount = materials.filter(m => m.currentStock <= m.minimumAlertStock).length;
    const criticalStockCount = materials.filter(m => m.currentStock === 0).length;

    const summaryText = [
      `*SITE INVENTORY STATUS & VALUATION REPORT*`,
      `🏢 Project: *${project?.name || 'Noori Crest Tower'}*`,
      `📅 As on: *${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}*`,
      ``,
      `📊 *KEY METRICS:*`,
      `• Total Tracked Items: *${materials.length}*`,
      `• Total Live Valuation: *₹${totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}*`,
      `• Low Stock Alert: *${lowStockCount} items*`,
      `• Critical Out of Stock: *${criticalStockCount} items*`,
      `• Total Recorded Transactions: *${transactions.length}*`,
      ``,
      `_Automated report generated from Armee Enterprises Construction ERP._`
    ].join('\n');

    const docNo = `INV-STAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    setWhatsAppPayload({
      title: `${project?.name || 'Site'} Inventory Status Report`,
      documentNo: docNo,
      category: 'Inventory & Materials',
      projectName: project?.name || 'Noori Crest Tower',
      customSummary: summaryText,
      isGeneratingMedia: true,
    });
    setIsWhatsAppShareOpen(true);

    // Asynchronously generate & upload official Stock Summary PDF report to Supabase Storage
    (async () => {
      try {
        const { publicUrl, fileName } = await uploadOrGetStockSummaryPdfUrl(materials, project?.name || 'Noori Crest Tower');
        setWhatsAppPayload((prev) => {
          if (!prev || prev.documentNo !== docNo) return prev;
          return {
            ...prev,
            mediaUrl: publicUrl,
            fileName: fileName,
            fileType: 'document',
            isGeneratingMedia: false,
          };
        });
      } catch (uploadErr) {
        console.warn('Could not upload stock summary PDF to storage for WhatsApp:', uploadErr);
        setWhatsAppPayload((prev) => (prev ? { ...prev, isGeneratingMedia: false } : null));
      }
    })();
  };

  const handleShareTransactionToWhatsApp = (tx: InventoryTransaction) => {
    const isReceipt = tx.type === 'check_in';
    const isReturn = tx.type === 'return';
    const isDamage = tx.type === 'damage';
    const typeLabel = isReceipt
      ? 'Material Receipt (GRN)'
      : isReturn
      ? 'Material Return Slip'
      : isDamage
      ? 'Material Damage Slip'
      : 'Material Issue (MIN)';

    // Clean 1-line item summary since complete details are inside the attached PDF document
    const itemSummary = `📦 ${tx.materialName}${tx.brand ? ` (${tx.brand})` : ''} • ${isReceipt ? '+' : '-'}${tx.quantity} ${tx.unit}${tx.totalAmount ? ` (₹${tx.totalAmount.toLocaleString('en-IN')})` : ''}`;

    const alreadyHasUrl = Boolean(tx.fileUrl && tx.fileUrl.startsWith('http'));

    setWhatsAppPayload({
      title: `${typeLabel} — ${tx.voucherNumber}`,
      documentNo: tx.voucherNumber,
      category: 'Bills & Vouchers',
      projectName: project?.name || 'Noori Crest Tower',
      mediaUrl: alreadyHasUrl ? tx.fileUrl : undefined,
      fileName: tx.fileName || `Voucher_${tx.voucherNumber}.pdf`,
      customSummary: itemSummary,
      isGeneratingMedia: !alreadyHasUrl,
    });
    setIsWhatsAppShareOpen(true);

    if (!alreadyHasUrl) {
      // Asynchronously generate & upload official Voucher PDF to Supabase Storage so WhatsApp sends the actual PDF document!
      (async () => {
        try {
          const { publicUrl, fileName } = await uploadOrGetVoucherPdfUrl(tx, project?.name || 'Noori Crest Tower');
          setWhatsAppPayload((prev) => {
            if (!prev || prev.documentNo !== tx.voucherNumber) return prev;
            return {
              ...prev,
              mediaUrl: publicUrl,
              fileName: fileName,
              fileType: 'document',
              isGeneratingMedia: false,
            };
          });
        } catch (uploadErr) {
          console.warn('Could not upload voucher PDF to storage for WhatsApp:', uploadErr);
          setWhatsAppPayload((prev) => (prev ? { ...prev, isGeneratingMedia: false } : null));
        }
      })();
    }
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

  // Soft Delete a Movement Voucher (sets is_deleted = true, adjusts stock)
  const handleDeleteTransaction = async (tx: InventoryTransaction) => {
    // 1. Optimistic update
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === tx.id
          ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() }
          : t
      )
    );

    // 2. Adjust material stock:
    const isAddition = tx.type === 'check_in' || (tx.type as any) === 'in';
    const delta = isAddition ? -tx.quantity : tx.quantity;

    setMaterials((prev) =>
      prev.map((m) =>
        m.id === tx.materialId
          ? { ...m, currentStock: Math.max(0, m.currentStock + delta) }
          : m
      )
    );

    if (historyDrawerMaterial && historyDrawerMaterial.id === tx.materialId) {
      setHistoryDrawerMaterial((prev) =>
        prev ? { ...prev, currentStock: Math.max(0, prev.currentStock + delta) } : null
      );
    }

    // 3. Persist to Supabase
    try {
      await softDeleteInventoryTransaction(tx.id, tx.notes);
      fetchQuickStockSummary().then((s) => s && setDbSummary(s));
      if (showToast) {
        showToast(`Voucher ${tx.voucherNumber} moved to Bin (is_deleted: true). Stock adjusted.`, 'info');
      }
    } catch (err) {
      console.error('Failed to soft delete transaction in Supabase:', err);
    }
  };

  // Restore a Soft-Deleted Movement Voucher from Bin
  const handleRestoreTransaction = async (tx: InventoryTransaction) => {
    // 1. Optimistic update
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === tx.id
          ? { ...t, isDeleted: false, deletedAt: undefined }
          : t
      )
    );

    // 2. Adjust material stock back:
    const isAddition = tx.type === 'check_in' || (tx.type as any) === 'in';
    const delta = isAddition ? tx.quantity : -tx.quantity;

    setMaterials((prev) =>
      prev.map((m) =>
        m.id === tx.materialId
          ? { ...m, currentStock: Math.max(0, m.currentStock + delta) }
          : m
      )
    );

    if (historyDrawerMaterial && historyDrawerMaterial.id === tx.materialId) {
      setHistoryDrawerMaterial((prev) =>
        prev ? { ...prev, currentStock: Math.max(0, prev.currentStock + delta) } : null
      );
    }

    // 3. Persist to Supabase
    try {
      await restoreInventoryTransaction(tx.id, tx.notes);
      fetchQuickStockSummary().then((s) => s && setDbSummary(s));
      if (showToast) {
        showToast(`Voucher ${tx.voucherNumber} restored to active ledger.`, 'success');
      }
    } catch (err) {
      console.error('Failed to restore transaction in Supabase:', err);
    }
  };

  // Update a Movement Voucher's metadata
  const handleUpdateTransaction = async (updatedTx: InventoryTransaction) => {
    // 1. Optimistic update
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );

    // 2. Persist to Supabase
    try {
      await updateInventoryTransactionRecord(updatedTx.id, {
        type: updatedTx.type === 'check_in' ? 'check_in' : updatedTx.type === 'check_out' ? 'check_out' : updatedTx.type === 'damage' ? 'damage' : 'return',
        vendor_name: updatedTx.subcontractorName || updatedTx.supplierName,
        vendor_id: updatedTx.subcontractorId || updatedTx.supplierId,
        person_name: updatedTx.foremanName || updatedTx.authorizedBy || updatedTx.receivedOrIssuedBy,
        location: updatedTx.floorZone || updatedTx.unloadingLocation || updatedTx.storageLocation,
        reason: updatedTx.purpose || updatedTx.returnReason || updatedTx.damageReason,
        reference_no: updatedTx.challanNumber || updatedTx.vehicleNumber,
        notes: updatedTx.notes,
        transaction_date: updatedTx.date,
        transaction_time: updatedTx.time,
        file_url: updatedTx.fileUrl,
        file_name: updatedTx.fileName,
      });
      if (showToast) {
        showToast(`Voucher ${updatedTx.voucherNumber} updated successfully.`, 'success');
      }
    } catch (err) {
      console.error('Failed to persist transaction update to Supabase:', err);
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
    <div className="space-y-2 sm:space-y-2.5 animate-in fade-in duration-200 w-full">
      {/* 1. Executive Top Header (Compact & Shifted Up, Matching Image 2 with Transparent 3D Cube & Warehouse Hero) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgb(101,62,241,0.06)] relative group">
        
        {/* Soft Ambient Backdrop Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 via-white to-indigo-50/20 pointer-events-none" />

        {/* Delicate Fluid Aurora Wave Ribbon (Matching Reference Image 2) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-35"
          preserveAspectRatio="none"
          viewBox="0 0 1200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 140 C 200 160, 320 60, 550 80 C 780 100, 920 20, 1250 50"
            stroke="url(#auroraGradient1)"
            strokeWidth="36"
            strokeLinecap="round"
            className="filter blur-[16px]"
          />
          <path
            d="M-30 110 C 240 130, 380 40, 620 60 C 860 80, 1020 10, 1260 30"
            stroke="url(#auroraGradient2)"
            strokeWidth="18"
            strokeLinecap="round"
            className="filter blur-[8px]"
          />
          <defs>
            <linearGradient id="auroraGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#ec4899" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="auroraGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Top Hero Section: Logo, Title, 3D Warehouse Illustration & Squircle Action Buttons (Compact Padding) */}
        <div className="relative px-4 sm:px-5 py-2.5 sm:py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          {/* Left: 3D Transparent Floating Purple Glass Cube (Direct on card) & Title Block */}
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0 z-10">
            <img
              src="/inventry/Glowing Purple Glass Cube.png"
              alt="Store & Site Inventory"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 animate-float-slow select-none pointer-events-none drop-shadow-[0_6px_16px_rgba(101,62,241,0.3)]"
            />
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Store & Site
              </span>
              <h1 className="text-2xl sm:text-[25px] font-extrabold text-[#6338eb] tracking-tight leading-none mt-0.5">
                Inventory
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs sm:max-w-sm leading-snug">
                Centralized inventory & stock ledger shared across all construction sites
              </p>
            </div>
          </div>

          {/* Center: 3D Warehouse Storefront with Forklift (Enlarged to fill space beautifully) */}
          <div className="hidden lg:flex items-end justify-center relative flex-1 max-w-xl xl:max-w-2xl mx-auto px-3 pointer-events-none select-none z-10">
            {/* Luminous Glow Behind Warehouse */}
            <div className="absolute inset-x-8 bottom-1 h-20 bg-gradient-to-r from-purple-400/20 via-pink-400/15 to-cyan-400/20 rounded-full blur-2xl" />
            
            <img
              src="/inventry/3D Warehouse Storefront with Forklift.png"
              alt="Central Site Store & Warehouse"
              className="w-full max-w-[560px] h-28 sm:h-32 xl:h-36 object-contain relative z-10 drop-shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>

          {/* Right: 5 Tactile Squircle Action Buttons with Colored Glows (Matching Image 2) */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0 z-10">
            {/* + Product Button with Purple Glow */}
            <button
              type="button"
              onClick={() => setIsProductDrawerOpen(true)}
              className="shine-container shine-hover h-[58px] sm:h-[60px] min-w-[66px] sm:min-w-[68px] px-2.5 py-1.5 rounded-2xl bg-gradient-to-b from-[#875cf6] to-[#6338eb] hover:from-[#9366fa] hover:to-[#572be0] text-white flex flex-col items-center justify-center gap-1 shadow-[0_6px_16px_rgba(99,56,235,0.32)] hover:shadow-[0_8px_22px_rgba(99,56,235,0.45)] cursor-pointer active:scale-95 transition-all group"
              title="Create new product profile"
            >
              <Box className="w-4 h-4 stroke-[2] text-white group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-white tracking-tight">+ Product</span>
            </button>

            {/* Vendor Button with Blue Glow */}
            <button
              type="button"
              onClick={() => {
                setVendorDrawerDefaultType('vendor');
                setIsVendorDrawerOpen(true);
              }}
              className="h-[58px] sm:h-[60px] min-w-[66px] sm:min-w-[68px] px-2.5 py-1.5 rounded-2xl bg-[#edf3ff] hover:bg-[#e4edff] border border-[#d6e4ff] text-[#2563eb] flex flex-col items-center justify-center gap-1 shadow-[0_6px_14px_rgba(37,99,235,0.14)] hover:shadow-[0_8px_18px_rgba(37,99,235,0.22)] cursor-pointer active:scale-95 group transition-all"
              title="Create new vendor / contractor profile"
            >
              <Users className="w-4 h-4 stroke-[2] text-[#2563eb] group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-[#2563eb] tracking-tight">Vendor</span>
            </button>

            {/* Return Button with Amber Glow */}
            <button
              type="button"
              onClick={() => openActionModal('return')}
              className="h-[58px] sm:h-[60px] min-w-[66px] sm:min-w-[68px] px-2.5 py-1.5 rounded-2xl bg-[#fff7ea] hover:bg-[#ffeed3] border border-[#ffe4be] text-[#d97706] flex flex-col items-center justify-center gap-1 shadow-[0_6px_14px_rgba(217,119,6,0.14)] hover:shadow-[0_8px_18px_rgba(217,119,6,0.22)] cursor-pointer active:scale-95 group transition-all"
              title="Log return of material to supplier"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.2] text-[#d97706] group-hover:rotate-[-30deg] transition-transform" />
              <span className="text-[11px] font-bold text-[#d97706] tracking-tight">Return</span>
            </button>

            {/* Defect Button with Rose Glow */}
            <button
              type="button"
              onClick={() => openActionModal('damage')}
              className="h-[58px] sm:h-[60px] min-w-[66px] sm:min-w-[68px] px-2.5 py-1.5 rounded-2xl bg-[#fff0f2] hover:bg-[#ffe2e6] border border-[#ffd2d8] text-[#e11d48] flex flex-col items-center justify-center gap-1 shadow-[0_6px_14px_rgba(225,29,72,0.14)] hover:shadow-[0_8px_18px_rgba(225,29,72,0.22)] cursor-pointer active:scale-95 group transition-all"
              title="Log damaged / spoiled material"
            >
              <AlertTriangle className="w-4 h-4 stroke-[2.2] text-[#e11d48] group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-[#e11d48] tracking-tight">Defect</span>
            </button>

            {/* Issue (MIN) Button with Sky Blue Glow */}
            <button
              type="button"
              onClick={() => openActionModal('check_out')}
              className="h-[58px] sm:h-[60px] min-w-[70px] sm:min-w-[72px] px-2.5 py-1.5 rounded-2xl bg-[#eef4ff] hover:bg-[#e4edff] border border-[#d6e4ff] text-[#3b82f6] flex flex-col items-center justify-center gap-1 shadow-[0_6px_14px_rgba(59,130,246,0.14)] hover:shadow-[0_8px_18px_rgba(59,130,246,0.22)] cursor-pointer active:scale-95 group transition-all"
              title="Issue material to site contractor (Material Issue Note)"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.4] text-[#3b82f6] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[11px] font-bold text-[#3b82f6] tracking-tight">Issue (MIN)</span>
            </button>
          </div>
        </div>

        {/* Bottom Strip / Ribbon (Pill Badges on Left, WhatsApp & Inward GRN Shifted Right Next to Each Other) */}
        <div className="px-4 sm:px-5 py-2 border-t border-slate-100 bg-gradient-to-r from-slate-50/90 via-purple-50/15 to-slate-50/90 flex flex-wrap items-center justify-between gap-2 relative z-10">
          
          {/* Left Pill Group: System & Export Badges */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Live Sync Pill */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#e6f9ed] text-[#16a34a] border border-[#b8f0ca] shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16a34a]" />
              </span>
              Live Sync
            </span>

            {/* Common for All Sites Pill */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#f0ecff] text-[#6338eb] border border-[#ddd4ff] shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-[#6338eb]" />
              Common for All Sites
            </span>

            <span className="text-slate-300 hidden md:inline mx-0.5 font-light">|</span>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={loadDataFromSupabase}
              className="h-7.5 px-3 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-slate-300"
              title="Refresh stock and ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
              <span>Sync</span>
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-7.5 px-3 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-slate-300"
              title="Export full ledger as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {/* Preview Stock Balance PDF */}
            <button
              type="button"
              onClick={() => {
                viewInventoryStockSummaryPdfInNewTab(materials, project?.name || 'Noori Crest Tower');
                setIsStockPdfModalOpen(true);
              }}
              className="h-7.5 px-3 rounded-full border border-[#e3d8ff] bg-[#f4f0ff] hover:bg-[#ebe3ff] text-[#6338eb] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Preview all inventory stock as PDF statement"
            >
              <Printer className="w-3.5 h-3.5 text-[#6338eb]" />
              <span>Preview PDF</span>
            </button>
          </div>

          {/* Right Action Group: WhatsApp Status & Shiny Inward GRN Shifted Right Next to Each Other! */}
          <div className="flex items-center gap-2 relative">
            {/* Share Inventory Status via WhatsApp (Shifted here to eliminate empty gap) */}
            <button
              type="button"
              onClick={handleShareInventoryStatusToWhatsApp}
              className="h-8 px-3.5 rounded-full border border-[#b8f0ca] bg-[#e6f9ed] hover:bg-[#d5f7de] text-[#16a34a] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.02] active:scale-95"
              title="Share full live inventory valuation & stock report via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#16a34a] fill-[#16a34a]/20" />
              <span>WhatsApp Status</span>
            </button>

            {/* Radiant Inward (GRN) Button with Continuous Shine Beam & Purple Glow */}
            <button
              type="button"
              onClick={() => openActionModal('check_in')}
              className="shine-container shine-infinite h-8 px-5 rounded-full bg-gradient-to-r from-[#7b46f8] via-[#6338eb] to-[#5a24ea] hover:from-[#8855fa] hover:to-[#501fe0] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(99,56,235,0.4)] hover:shadow-[0_6px_22px_rgba(99,56,235,0.55)] cursor-pointer active:scale-95"
              title="Record inward delivery from supplier (Goods Receipt Note)"
            >
              <ArrowDownLeft className="w-4 h-4 stroke-[2.4]" />
              <span>Inward (GRN)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Ribbon (5 Ultra-Modern Cards with Full-Card Tinted Gradients Matching 3D Icons) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        
        {/* Card 1: Total Stock with Full-Card Sky Blue Gradient */}
        <div 
          onClick={() => setActiveTab('catalog')}
          className="shine-container shine-hover bg-gradient-to-br from-[#f2f8ff] via-[#e8f2ff] to-[#d9ebfe] p-3 sm:p-3.5 rounded-3xl border border-[#bedbfe] shadow-[0_4px_16px_rgba(37,99,235,0.05)] cursor-pointer hover:border-[#93c5fd] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(59,130,246,0.15)] flex flex-col justify-between min-h-[116px] sm:min-h-[120px] group relative overflow-hidden"
        >
          {/* Vibrant Cyan / Sky Blue Floor Glow Pool under Pallet */}
          <div className="absolute -bottom-2 -right-1 w-28 h-12 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.7)_0%,rgba(59,130,246,0.35)_45%,transparent_75%)] rounded-full blur-md pointer-events-none group-hover:scale-110 transition-transform" />

          {/* Top Row: Title + SKU Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider block">
              Total Stock
            </span>
            <span className="text-[10.5px] font-bold text-[#1d4ed8] bg-[#dbeafe] border border-[#bfdbfe] px-2.5 py-0.5 rounded-full font-mono">
              {metrics.totalItems} SKUs
            </span>
          </div>

          {/* Bottom Row: Number/Subtitle on left, 3D render with Blue Shadow on right */}
          <div className="flex items-end justify-between gap-1.5 mt-1.5 relative z-10">
            <div>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none font-numeric">
                {metrics.totalCurrentStock.toLocaleString()}
              </div>
              <span className="text-[10.5px] text-slate-500 mt-1 block font-medium truncate">
                Live store inventory
              </span>
            </div>
            <div className="w-18 h-13 sm:w-20 sm:h-14 shrink-0 flex items-end justify-end">
              <img
                src="/inventry/Stacked Shipping Boxes on Blue Pallet.png"
                alt="Total Stock"
                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(59,130,246,0.45)] group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Low Stock Alerts with Full-Card Warm Amber/Rose Gradient (No line/ring under siren) */}
        <div 
          onClick={() => setActiveTab('low_stock')}
          className={`shine-container shine-hover p-3 sm:p-3.5 rounded-3xl border shadow-[0_4px_16px_rgba(244,63,94,0.05)] cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(239,68,68,0.16)] flex flex-col justify-between min-h-[116px] sm:min-h-[120px] group relative overflow-hidden ${
            metrics.lowStockCount > 0
              ? 'bg-gradient-to-br from-[#fffdf5] via-[#fff5ea] to-[#ffe4db] border-[#fecdd3] hover:border-[#fda4af]'
              : 'bg-gradient-to-br from-[#f0fdf4] via-[#e6f9ee] to-[#d1fae5] border-[#bbf7d0] hover:border-[#86efac]'
          }`}
        >
          {/* Smooth, Natural Red / Amber Glow Pool (Clean without any hard line or border) */}
          <div className="absolute -bottom-2 -right-1 w-28 h-12 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.75)_0%,rgba(245,158,11,0.35)_45%,transparent_75%)] rounded-full blur-md pointer-events-none group-hover:scale-110 transition-transform" />

          {/* Top Row: Title + Reorder Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${
              metrics.lowStockCount > 0 ? 'text-[#9f1239]' : 'text-[#065f46]'
            }`}>
              Low Stock Alerts
            </span>
            <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
              metrics.lowStockCount > 0
                ? 'text-[#b91c1c] bg-[#fee2e2] border-[#fca5a5]'
                : 'text-[#047857] bg-[#d1fae5] border-[#a7f3d0]'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {metrics.lowStockCount > 0 ? 'Reorder' : 'Healthy'}
            </span>
          </div>

          {/* Bottom Row: Number on left, 3D Siren Beacon on right */}
          <div className="flex items-end justify-between gap-1.5 mt-1.5 relative z-10">
            <div className="flex items-baseline">
              <span className={`text-2xl sm:text-[26px] font-black font-numeric tracking-tight leading-none ${metrics.lowStockCount > 0 ? 'text-[#e11d48]' : 'text-slate-900'}`}>
                {metrics.lowStockCount}
              </span>
              <span className="text-[10.5px] font-medium text-slate-500 ml-1.5">Items</span>
            </div>
            <div className="w-16 h-13 sm:w-18 sm:h-14 shrink-0 flex items-end justify-end">
              <img
                src="/inventry/Glossy Red Emergency Siren Beacon.png"
                alt="Low Stock Warning Siren"
                className={`w-full h-full object-contain drop-shadow-[0_8px_18px_rgba(239,68,68,0.55)] group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none ${
                  metrics.lowStockCount > 0 ? 'animate-pulse' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Inward Receipts with Full-Card Mint/Emerald Gradient */}
        <div 
          onClick={() => setActiveTab('inward')}
          className="shine-container shine-hover bg-gradient-to-br from-[#f0fdf5] via-[#e6f9ee] to-[#d2f7e2] p-3 sm:p-3.5 rounded-3xl border border-[#baf2cf] shadow-[0_4px_16px_rgba(16,185,129,0.05)] cursor-pointer hover:border-[#86efac] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(16,185,129,0.15)] flex flex-col justify-between min-h-[116px] sm:min-h-[120px] group relative overflow-hidden"
        >
          {/* Brilliant Emerald Green Floor Glow Pool under Open Box */}
          <div className="absolute -bottom-2 -right-1 w-28 h-12 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.75)_0%,rgba(16,185,129,0.35)_45%,transparent_75%)] rounded-full blur-md pointer-events-none group-hover:scale-110 transition-transform" />

          {/* Top Row: Title + GRN Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-[#065f46] uppercase tracking-wider block">
              Inward Receipts
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#047857] bg-[#d1fae5] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
              <ArrowDownLeft className="w-3 h-3 stroke-[2.2]" /> GRN
            </span>
          </div>

          {/* Bottom Row: Number on left, 3D Open Box with Green Shadow on right */}
          <div className="flex items-end justify-between gap-1.5 mt-1.5 relative z-10">
            <div>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none font-numeric">
                {metrics.totalInwardCount}
              </div>
              <span className="text-[10.5px] text-slate-500 mt-1 block font-medium truncate">
                Material deliveries logged
              </span>
            </div>
            <div className="w-18 h-13 sm:w-20 sm:h-14 shrink-0 flex items-end justify-end">
              <img
                src="/inventry/Open Box with Green Downward Arrow.png"
                alt="Inward Delivery Receipts"
                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(16,185,129,0.45)] group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Site Dispatches with Full-Card Lavender/Purple Gradient */}
        <div 
          onClick={() => setActiveTab('outward')}
          className="shine-container shine-hover bg-gradient-to-br from-[#faf7ff] via-[#f3eeff] to-[#ebe0ff] p-3 sm:p-3.5 rounded-3xl border border-[#ddd3fe] shadow-[0_4px_16px_rgba(109,40,217,0.05)] cursor-pointer hover:border-[#c4b5fd] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(147,51,234,0.15)] flex flex-col justify-between min-h-[116px] sm:min-h-[120px] group relative overflow-hidden"
        >
          {/* Radiant Lavender / Purple Ground Glow under Truck */}
          <div className="absolute -bottom-2 -right-1 w-32 h-12 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.7)_0%,rgba(99,102,241,0.35)_45%,transparent_75%)] rounded-full blur-md pointer-events-none group-hover:scale-110 transition-transform" />

          {/* Top Row: Title + MIN Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-[#37246e] uppercase tracking-wider block">
              Site Dispatches
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#5b21b6] bg-[#ece5ff] border border-[#d8c5fd] px-2.5 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 stroke-[2.2]" /> MIN
            </span>
          </div>

          {/* Bottom Row: Number on left, 3D Truck with Purple Underglow on right */}
          <div className="flex items-end justify-between gap-1.5 mt-1.5 relative z-10">
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-[26px] font-black text-[#6338eb] font-numeric tracking-tight leading-none">
                {metrics.totalOutwardCount}
              </span>
              <span className="text-[10.5px] font-medium text-slate-500 ml-1.5">Issues</span>
            </div>
            <div className="w-20 h-13 sm:w-22 sm:h-14 shrink-0 flex items-end justify-end">
              <img
                src="/inventry/Glowing Lavender Delivery Truck.png"
                alt="Site Material Dispatches"
                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(147,51,234,0.45)] group-hover:scale-110 group-hover:translate-x-1 transition-transform duration-300 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Card 5: Returns & Defects with Full-Card Coral/Amber-Peach Gradient */}
        <div 
          onClick={() => setActiveTab('returns_damages')}
          className="shine-container shine-hover bg-gradient-to-br from-[#fff8f6] via-[#fff0ed] to-[#ffe2dc] p-3 sm:p-3.5 rounded-3xl border border-[#fecaca] shadow-[0_4px_16px_rgba(239,68,68,0.05)] cursor-pointer hover:border-[#fca5a5] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(244,63,94,0.15)] flex flex-col justify-between min-h-[116px] sm:min-h-[120px] group relative overflow-hidden"
        >
          {/* Warm Amber / Coral Floor Glow Pool under Damaged Box */}
          <div className="absolute -bottom-2 -right-1 w-28 h-12 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.6)_0%,rgba(245,158,11,0.35)_45%,transparent_75%)] rounded-full blur-md pointer-events-none group-hover:scale-110 transition-transform" />

          {/* Top Row: Title + Deductions Badge */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-[#991b1b] uppercase tracking-wider block">
              Returns & Defects
            </span>
            <span className="text-[10.5px] font-bold text-[#c2410c] bg-[#ffedd5] border border-[#fed7aa] px-2.5 py-0.5 rounded-full">
              Deductions
            </span>
          </div>

          {/* Bottom Row: Number/Subtitle on left, 3D Damaged Box with Red Shadow on right */}
          <div className="flex items-end justify-between gap-1.5 mt-1.5 relative z-10">
            <div>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-none font-numeric">
                {metrics.totalReturnsDamagesCount}
              </div>
              <span className="text-[10.5px] text-slate-500 mt-1 block font-medium truncate">
                {metrics.totalReturnCount} Ret + {metrics.totalDefectCount} Defect
              </span>
            </div>
            <div className="w-18 h-13 sm:w-20 sm:h-14 shrink-0 flex items-end justify-end">
              <img
                src="/inventry/Damaged Shipping Box with Red X.png"
                alt="Returns and Damaged Materials"
                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(244,63,94,0.4)] group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Modern Rounded Pill Tabs with Vibrant Active States) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Current Stock ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'products'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products Master ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Vendors & Parties ({vendorProfiles.length})</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveTab('inward')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'inward'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Inward GRN ({inwardTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outward')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'outward'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Site Issues ({outwardTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns_damages')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'returns_damages'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Returns & Defects ({returnsAndDamagesTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Ledger ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'low_stock'
              ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-amber-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${metrics.lowStockCount > 0 ? 'text-amber-500 animate-pulse' : ''}`} />
          <span>Low Stock ({metrics.lowStockCount})</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => {
            setActiveTab('bin');
            loadDeletedProducts();
          }}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'bin'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
              : 'text-rose-700 hover:bg-rose-50 border border-rose-200/90'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Recycle Bin ({deletedProducts.length + deletedTransactions.length})</span>
        </button>
      </div>

      {/* 4. Filter & Search Toolbar (Matching Image 1 with Rounded-2xl Search & Filters) */}
      {!['products', 'vendors', 'bin'].includes(activeTab) && (
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6338eb] absolute left-3.5 top-3 pointer-events-none" />
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
            className="w-full h-10 pl-10 pr-4 rounded-2xl border border-slate-200/90 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#6338eb] focus:ring-2 focus:ring-purple-500/10 bg-white shadow-2xs transition-all"
          />
        </div>

        {/* Filter Selectors based on tab */}
        <div className="flex items-center flex-wrap gap-2.5">
          {activeTab === 'catalog' && (
            <>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 px-3.5 rounded-2xl border border-slate-200/90 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-[#6338eb] shadow-2xs cursor-pointer"
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
                className="h-10 px-3.5 rounded-2xl border border-slate-200/90 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-[#6338eb] shadow-2xs cursor-pointer"
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
                className="h-10 px-4 rounded-2xl border border-purple-200 bg-white hover:bg-purple-50 text-[#6338eb] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Preview all inventory with stock as PDF statement"
              >
                <Printer className="w-3.5 h-3.5 text-[#6338eb]" />
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
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingDb ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">Loading inventory from Supabase...</span>
                        <span className="text-[11px] text-slate-400">Fetching live products & store balance</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No construction materials found in Supabase.</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;+ Product&quot; above to create your first product profile.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((m) => {
                    const isLow = m.currentStock <= m.minimumAlertStock && m.currentStock > 0;
                    const isDepleted = m.currentStock <= 0;

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

                        {/* 1 Action Button / 3-Dots Menu */}
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === m.id ? null : m.id);
                              }}
                              className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                activeActionMenuId === m.id
                                  ? 'bg-[#653ef1] text-white border-[#653ef1] shadow-xs'
                                  : 'bg-white hover:bg-[#653ef1]/10 hover:border-[#653ef1] text-slate-700 hover:text-[#653ef1] border-slate-200'
                              }`}
                              title="Material Actions & Drawer"
                            >
                              <span>Actions</span>
                              <MoreVertical className="w-3.5 h-3.5 shrink-0" />
                            </button>

                            {/* Floating Actions Popover Dropdown */}
                            {activeActionMenuId === m.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(null);
                                  }}
                                />
                                <div
                                  className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Header Info */}
                                  <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      Material Actions
                                    </p>
                                    <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                                      {m.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                      Current Stock: <strong className="text-slate-800">{m.currentStock} {m.unit}</strong>
                                    </p>
                                  </div>

                                  {/* Action Drawer Button (Directly opens full Drawer) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActiveActionMenuId(null);
                                      setTimeout(() => {
                                        setActionDrawerMaterial(m);
                                      }, 60);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-[#653ef1] bg-purple-50/70 hover:bg-purple-100/80 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                                  >
                                    <span className="w-6 h-6 rounded-lg bg-[#653ef1] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <SlidersHorizontal className="w-3.5 h-3.5" />
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-bold">Open Actions Drawer</div>
                                      <div className="text-[10px] text-[#653ef1]/80">Manage all movements in panel ↗</div>
                                    </div>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  {/* Check In (GRN) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      openActionModal('check_in', m.id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-[#653ef1]/10 hover:text-[#653ef1] flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-purple-50 text-[#653ef1] flex items-center justify-center shrink-0">
                                      <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                                    </span>
                                    <span>Check In Delivery (+ IN)</span>
                                  </button>

                                  {/* Check Out (MIN) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      openActionModal('check_out', m.id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                      <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                                    </span>
                                    <span>Issue to Site (- OUT)</span>
                                  </button>

                                  {/* Return to Supplier */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      openActionModal('return', m.id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                                      <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                                    </span>
                                    <span>Return to Supplier (⟲ RET)</span>
                                  </button>

                                  {/* Log Damaged */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      openActionModal('damage', m.id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                                      <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                    </span>
                                    <span>Log Damaged (⚠ DMG)</span>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  {/* Movement History Drawer */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setHistoryDrawerMaterial(m);
                                      setIsHistoryDrawerOpen(true);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                      <History className="w-3 h-3" />
                                    </span>
                                    <span>Movement History Drawer</span>
                                  </button>

                                  {/* Delete Material */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDeleteMaterial(m.id, m.name);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                      <Trash2 className="w-3 h-3" />
                                    </span>
                                    <span>Delete (Recycle Bin)</span>
                                  </button>
                                </div>
                              </>
                            )}
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
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>{tx.category}</span>
                          {tx.brand && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {tx.brand}
                            </span>
                          )}
                        </div>
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
                          {tx.fileUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setBillViewerState({
                                  isOpen: true,
                                  fileUrl: tx.fileUrl!,
                                  fileName: tx.fileName || 'Uploaded Bill Copy',
                                  voucherNumber: tx.voucherNumber,
                                })
                              }
                              className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title={`View uploaded physical bill (${tx.fileName || 'PNG/PDF'})`}
                            >
                              <Paperclip className="w-3 h-3 text-purple-600" />
                              <span>Bill Copy</span>
                            </button>
                          )}
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
                            onClick={() => handleShareTransactionToWhatsApp(tx)}
                            className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            title="Share GRN Bill on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                            <span>WhatsApp</span>
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
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>{tx.category}</span>
                          {tx.brand && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {tx.brand}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700 text-sm">
                        -{tx.quantity} {tx.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {tx.authorizedBy || 'Er. Amit Verma'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.fileUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setBillViewerState({
                                  isOpen: true,
                                  fileUrl: tx.fileUrl!,
                                  fileName: tx.fileName || 'Uploaded Issue Slip',
                                  voucherNumber: tx.voucherNumber,
                                })
                              }
                              className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title={`View uploaded issue slip (${tx.fileName || 'PNG/PDF'})`}
                            >
                              <Paperclip className="w-3 h-3 text-purple-600" />
                              <span>Bill Copy</span>
                            </button>
                          )}
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
                            onClick={() => handleShareTransactionToWhatsApp(tx)}
                            className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            title="Share Issue Voucher on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                            <span>WhatsApp</span>
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
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{tx.category || tx.materialId}</span>
                            {tx.brand && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {tx.brand}
                              </span>
                            )}
                          </div>
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
                            {tx.fileUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setBillViewerState({
                                    isOpen: true,
                                    fileUrl: tx.fileUrl!,
                                    fileName: tx.fileName || 'Uploaded Return/Damage Document',
                                    voucherNumber: tx.voucherNumber,
                                  })
                                }
                                className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                title={`View uploaded return/damage document (${tx.fileName || 'PNG/PDF'})`}
                              >
                                <Paperclip className="w-3 h-3 text-purple-600" />
                                <span>Bill Copy</span>
                              </button>
                            )}
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
                              onClick={() => handleShareTransactionToWhatsApp(tx)}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title="Share Return Bill on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                              <span>WhatsApp</span>
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
                            {tx.fileUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setBillViewerState({
                                    isOpen: true,
                                    fileUrl: tx.fileUrl!,
                                    fileName: tx.fileName || 'Uploaded Bill Document',
                                    voucherNumber: tx.voucherNumber,
                                  })
                                }
                                className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                title={`View uploaded bill document (${tx.fileName || 'PNG/PDF'})`}
                              >
                                <Paperclip className="w-3 h-3 text-purple-600" />
                                <span>Bill Copy</span>
                              </button>
                            )}
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
                              onClick={() => handleShareTransactionToWhatsApp(tx)}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title="Share Voucher Bill on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                              <span>WhatsApp</span>
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

      {/* TAB 8: RECYCLE BIN (is_deleted = true in profile_product) */}
      {activeTab === 'bin' && (
        <div className="space-y-3">
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-rose-900 text-sm">
                  Recycle Bin ({deletedProducts.length + deletedTransactions.length + deletedVendors.length} Soft-Deleted Items)
                </span>
                <p className="text-xs text-rose-700">
                  Items deleted are safely retained with <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">is_deleted = true</code>. They do not affect active store stock balances and can be restored anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bin Sub-Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white border border-rose-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBinViewMode('products')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    binViewMode === 'products'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Products ({deletedProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBinViewMode('movements')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    binViewMode === 'movements'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Movements & Vouchers ({deletedTransactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBinViewMode('vendors')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    binViewMode === 'vendors'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Vendors & Parties ({deletedVendors.length})
                </button>
              </div>

              <button
                type="button"
                onClick={loadDeletedProducts}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBin ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* VIEW A: DELETED PRODUCTS */}
          {binViewMode === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product Code & Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Storage Location</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBin ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <p className="font-semibold text-slate-600">Loading deleted products...</p>
                      </td>
                    </tr>
                  ) : deletedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">Recycle Bin is empty</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No products currently deleted.</p>
                      </td>
                    </tr>
                  ) : (
                    deletedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] font-mono text-purple-700 mt-0.5 flex items-center gap-1.5">
                            <span>{p.code}</span>
                            {p.brand && <span className="text-slate-400 font-sans">• {p.brand}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-100">
                            {p.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.storage_location || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deleted (In Bin)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestoreMaterial(p.id, p.name)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Restore product back to active catalog"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            <span>Restore Product</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* VIEW B: DELETED MOVEMENTS & VOUCHERS */}
          {binViewMode === 'movements' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Voucher # & Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Material & Quantity</th>
                      <th className="px-4 py-3">Party (Subcontractor / Supplier)</th>
                      <th className="px-4 py-3">Reason / Purpose</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No deleted movement vouchers</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">All transactions in your store are active.</p>
                        </td>
                      </tr>
                    ) : (
                      deletedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-700 line-through">{tx.voucherNumber}</div>
                            <div className="text-[11px] text-slate-400">{tx.date} • {tx.time}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.type === 'check_in'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {tx.type === 'check_in' ? 'Check-In (+)' : 'Check-Out (-)'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{tx.materialName}</span>
                              {tx.brand && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {tx.brand}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-rose-700 text-xs">
                              {tx.quantity} {tx.unit}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">
                            {tx.subcontractorName || tx.supplierName || 'Site General'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px]">
                            {tx.purpose || tx.returnReason || tx.damageReason || tx.notes || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              is_deleted = true
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewPdfBlob(tx)}
                                className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="View PDF Voucher"
                              >
                                <ExternalLink className="w-3 h-3 text-purple-600" />
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestoreTransaction(tx)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Restore voucher and reactivate in ledger"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Voucher</span>
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

          {/* VIEW C: DELETED VENDORS & PARTIES */}
          {binViewMode === 'vendors' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Vendor / Party Name</th>
                      <th className="px-4 py-3">Classification</th>
                      <th className="px-4 py-3">Contact Person</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Trade / Specialization</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedVendors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No deleted vendor profiles in bin</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">All vendor & party profiles are active.</p>
                        </td>
                      </tr>
                    ) : (
                      deletedVendors.map((v) => (
                        <tr key={v.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 line-through">{v.name}</div>
                            {v.address && <div className="text-[11px] text-slate-400">{v.address}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold capitalize bg-slate-100 text-slate-700 border border-slate-200">
                              {v.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {v.contact_person || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {v.phone || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {v.trade || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Deleted (In Bin)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRestoreVendorFromBin(v.id, v.name)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Restore party back to active directory"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore Party</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Material Action Sidebar Drawer */}
      <MaterialActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        vendorProfiles={vendorProfiles}
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
        onShareWhatsApp={handleShareTransactionToWhatsApp}
      />

      {/* Material Quick Action Drawer */}
      <MaterialActionDrawer
        isOpen={!!actionDrawerMaterial}
        onClose={() => setActionDrawerMaterial(null)}
        material={actionDrawerMaterial}
        onCheckIn={(matId) => openActionModal('check_in', matId)}
        onCheckOut={(matId) => openActionModal('check_out', matId)}
        onReturn={(matId) => openActionModal('return', matId)}
        onDamage={(matId) => openActionModal('damage', matId)}
        onViewHistory={(mat) => {
          setHistoryDrawerMaterial(mat);
          setIsHistoryDrawerOpen(true);
        }}
        onDelete={(matId, name) => handleDeleteMaterial(matId, name)}
      />

      {/* Item Checkout & Movement History Drawer */}
      <MaterialHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        material={historyDrawerMaterial}
        transactions={transactions}
        projectName={project?.name || 'Noori Crest Tower'}
        onOpenVoucherModal={handleOpenVoucher}
        onDeleteTransaction={handleDeleteTransaction}
        onRestoreTransaction={handleRestoreTransaction}
        onUpdateTransaction={handleUpdateTransaction}
        suppliers={suppliers}
        subcontractors={subcontractors}
        vendorProfiles={vendorProfiles}
        onOpenVendorDrawer={(defType) => {
          setVendorDrawerDefaultType(defType || 'vendor');
          setIsVendorDrawerOpen(true);
        }}
        onShareWhatsApp={handleShareTransactionToWhatsApp}
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
        onShareWhatsApp={handleShareInventoryStatusToWhatsApp}
      />

      {/* Uploaded Physical Bill Viewer Modal (PNG/PDF) */}
      <InventoryBillViewerModal
        isOpen={billViewerState.isOpen}
        onClose={() => setBillViewerState((prev) => ({ ...prev, isOpen: false }))}
        fileUrl={billViewerState.fileUrl}
        fileName={billViewerState.fileName}
        voucherNumber={billViewerState.voucherNumber}
      />

      {/* WhatsApp Share Modal for Inventory Reports & Vouchers */}
      <WhatsAppShareModal
        isOpen={isWhatsAppShareOpen}
        onClose={() => {
          setIsWhatsAppShareOpen(false);
          setWhatsAppPayload(null);
        }}
        payload={whatsAppPayload}
      />
    </div>
  );
};
