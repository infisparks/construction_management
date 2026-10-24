'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Clock,
  HardHat,
  MapPin,
  UserCheck,
  FileText,
  Download,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Paperclip,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  Undo2,
  Save,
  UserPlus
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySupplier,
  InventorySubcontractor,
  VendorProfile
} from '@/lib/inventory/inventory-types';
import {
  downloadInventoryVoucherPdf,
  viewInventoryVoucherPdfInNewTab,
  downloadMaterialCheckoutHistoryPdf,
  viewMaterialCheckoutHistoryPdfInNewTab
} from '@/lib/inventory/inventory-voucher-pdf';
import { uploadInventoryBillToStorage } from '@/lib/supabase/inventory-services';
import { SearchableSelect, SearchableOption } from '@/components/common/SearchableSelect';

interface MaterialHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: ConstructionMaterial | null;
  transactions: InventoryTransaction[];
  projectName?: string;
  onOpenVoucherModal: (tx: InventoryTransaction) => void;
  defaultFilter?: 'checkouts_only' | 'all' | 'bin';
  onDeleteTransaction?: (tx: InventoryTransaction) => Promise<void> | void;
  onRestoreTransaction?: (tx: InventoryTransaction) => Promise<void> | void;
  onUpdateTransaction?: (tx: InventoryTransaction) => Promise<void> | void;
  suppliers?: InventorySupplier[];
  subcontractors?: InventorySubcontractor[];
  vendorProfiles?: VendorProfile[];
  onOpenVendorDrawer?: (defaultType?: 'vendor' | 'contractor' | 'other') => void;
}

export const MaterialHistoryDrawer: React.FC<MaterialHistoryDrawerProps> = ({
  isOpen,
  onClose,
  material,
  transactions,
  projectName = 'Noori Crest Tower',
  onOpenVoucherModal,
  defaultFilter = 'checkouts_only',
  onDeleteTransaction,
  onRestoreTransaction,
  onUpdateTransaction,
  suppliers = [],
  subcontractors = [],
  vendorProfiles = [],
  onOpenVendorDrawer,
}) => {
  const [filterMode, setFilterMode] = useState<'checkouts_only' | 'all' | 'bin'>(defaultFilter);

  // Modals state: Delete confirmation (requires typing "delete")
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<InventoryTransaction | null>(null);
  const [deleteInput, setDeleteInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modals state: Edit Movement Voucher
  const [editingTx, setEditingTx] = useState<InventoryTransaction | null>(null);
  const [editType, setEditType] = useState<InventoryTransactionType>('check_out');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editPartyId, setEditPartyId] = useState<string>('');
  const [editPartyName, setEditPartyName] = useState<string>('');
  const [editForeman, setEditForeman] = useState<string>('');
  const [editFloorZone, setEditFloorZone] = useState<string>('');
  const [editPurpose, setEditPurpose] = useState<string>('');
  const [editRefNumber, setEditRefNumber] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isRemovingFile, setIsRemovingFile] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Combine contractor agencies from subcontractors array and vendorProfiles so all added parties are always selectable
  const mergedSubcontractors = useMemo(() => {
    const map = new Map<string, InventorySubcontractor>();
    subcontractors.forEach((s) => map.set(s.id, s));
    vendorProfiles.forEach((vp) => {
      if (!map.has(vp.id)) {
        map.set(vp.id, {
          id: vp.id,
          name: vp.name,
          type: vp.type,
          trade: vp.trade || (vp.type === 'contractor' ? 'Subcontractor' : vp.type === 'vendor' ? 'Material Vendor' : 'Party'),
          foremanName: vp.contactPerson || '',
          phone: vp.phone || '',
          address: vp.address || '',
          location: vp.location || '',
          activeWorkers: 0,
          notes: vp.notes || '',
        });
      }
    });
    return Array.from(map.values());
  }, [subcontractors, vendorProfiles]);

  const subcontractorOptions: SearchableOption[] = useMemo(() => {
    return mergedSubcontractors.map((s) => ({
      value: s.id,
      label: s.name,
      subtitle: s.trade ? `Trade: ${s.trade}` : undefined,
      badge: s.trade || (s.type === 'contractor' ? 'Agency' : undefined),
    }));
  }, [mergedSubcontractors]);

  // Combine suppliers and vendorProfiles
  const mergedSuppliers = useMemo(() => {
    const map = new Map<string, InventorySupplier>();
    suppliers.forEach((s) => map.set(s.id, s));
    vendorProfiles.forEach((vp) => {
      if (!map.has(vp.id)) {
        map.set(vp.id, {
          id: vp.id,
          name: vp.name,
          type: vp.type,
          trade: vp.trade || 'Vendor',
          phone: vp.phone || '',
          email: vp.email || '',
          gstin: vp.gstin || '',
          city: vp.location || '',
          address: vp.address || '',
          location: vp.location || '',
          notes: vp.notes || '',
        });
      }
    });
    return Array.from(map.values());
  }, [suppliers, vendorProfiles]);

  const supplierOptions: SearchableOption[] = useMemo(() => {
    return mergedSuppliers.map((s) => ({
      value: s.id,
      label: s.name,
      subtitle: s.trade ? `Trade: ${s.trade}` : (s.city || undefined),
      badge: s.trade || (s.type === 'vendor' ? 'Vendor' : undefined),
    }));
  }, [mergedSuppliers]);

  // Active (non-deleted) transactions for this specific material
  const activeItemTransactions = useMemo(() => {
    if (!material) return [];
    return transactions.filter((t) => t.materialId === material.id && !t.isDeleted);
  }, [transactions, material]);

  // Soft-deleted transactions for this specific material (Bin)
  const deletedItemTransactions = useMemo(() => {
    if (!material) return [];
    return transactions.filter((t) => t.materialId === material.id && t.isDeleted);
  }, [transactions, material]);

  const checkOuts = useMemo(() => {
    return activeItemTransactions.filter((t) => t.type === 'check_out');
  }, [activeItemTransactions]);

  const displayedTransactions = useMemo(() => {
    if (filterMode === 'checkouts_only') return checkOuts;
    if (filterMode === 'bin') return deletedItemTransactions;
    return activeItemTransactions;
  }, [filterMode, checkOuts, activeItemTransactions, deletedItemTransactions]);

  const totalCheckedOutQty = useMemo(() => {
    return checkOuts.reduce((sum, t) => sum + t.quantity, 0);
  }, [checkOuts]);

  const totalInwardQty = useMemo(() => {
    return activeItemTransactions
      .filter((t) => t.type === 'check_in')
      .reduce((sum, t) => sum + t.quantity, 0);
  }, [activeItemTransactions]);

  const totalValuationIssued = totalCheckedOutQty * (material?.averageUnitRate || 0);

  const handleDownloadFullCheckoutBill = () => {
    if (!material) return;
    downloadMaterialCheckoutHistoryPdf(material, checkOuts, projectName);
  };

  const handleViewFullCheckoutBillBlob = () => {
    if (!material) return;
    viewMaterialCheckoutHistoryPdfInNewTab(material, checkOuts, projectName);
  };

  const handleDownloadPdf = (tx: InventoryTransaction) => {
    downloadInventoryVoucherPdf(tx, projectName);
  };

  const handleViewPdf = (tx: InventoryTransaction) => {
    viewInventoryVoucherPdfInNewTab(tx, projectName);
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (tx: InventoryTransaction) => {
    setDeleteConfirmTx(tx);
    setDeleteInput('');
  };

  // Perform Soft Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTx) return;
    if (deleteInput.trim().toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    try {
      if (onDeleteTransaction) {
        await onDeleteTransaction(deleteConfirmTx);
      }
      setDeleteConfirmTx(null);
      setDeleteInput('');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tx: InventoryTransaction) => {
    setEditingTx(tx);
    setEditType(tx.type);
    setEditDate(tx.date || new Date().toISOString().split('T')[0]);
    setEditTime(tx.time || '12:00 PM');
    const existingPartyId = tx.subcontractorId || tx.supplierId || '';
    const existingPartyName = tx.subcontractorName || tx.supplierName || '';
    setEditPartyId(existingPartyId);
    setEditPartyName(existingPartyName);
    setEditForeman(tx.foremanName || tx.receivedOrIssuedBy || '');
    setEditFloorZone(tx.floorZone || '');
    setEditPurpose(tx.purpose || tx.returnReason || tx.damageReason || '');
    setEditRefNumber(tx.challanNumber || tx.vehicleNumber || '');
    setEditLocation(tx.storageLocation || tx.unloadingLocation || '');
    setEditNotes(tx.notes || '');
    setEditFile(null);
    setIsRemovingFile(false);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setIsSavingEdit(true);
    try {
      let fileUrl = isRemovingFile ? undefined : editingTx.fileUrl;
      let fileName = isRemovingFile ? undefined : editingTx.fileName;

      if (editFile) {
        const uploaded = await uploadInventoryBillToStorage(editFile, 'bills');
        fileUrl = uploaded.publicUrl;
        fileName = uploaded.fileName;
      }

      const isOut = editType === 'check_out';
      const isRet = editType === 'return';
      const isDmg = editType === 'damage';

      const updatedTx: InventoryTransaction = {
        ...editingTx,
        type: editType,
        date: editDate,
        time: editTime,
        subcontractorId: isOut ? editPartyId || undefined : undefined,
        subcontractorName: isOut ? editPartyName : undefined,
        supplierId: !isOut ? editPartyId || undefined : undefined,
        supplierName: !isOut ? editPartyName : undefined,
        foremanName: editForeman,
        floorZone: editFloorZone,
        purpose: isOut ? editPurpose : editingTx.purpose,
        returnReason: isRet ? editPurpose : editingTx.returnReason,
        damageReason: isDmg ? editPurpose : editingTx.damageReason,
        challanNumber: editRefNumber,
        vehicleNumber: editRefNumber,
        storageLocation: editLocation,
        notes: editNotes,
        fileUrl,
        fileName,
      };

      if (onUpdateTransaction) {
        await onUpdateTransaction(updatedTx);
      }
      setEditingTx(null);
    } catch (err) {
      console.error('Failed to update transaction:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-purple-700">{material.code}</span>
                <span className="text-[11px] font-medium text-slate-500">• {material.category}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {material.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Action Banner: Download Full Bill of Check Out */}
        <div className="px-5 py-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span>Full Checkout History Bill</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                {checkOuts.length} issues
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Grand total issued: <strong className="text-indigo-700">{totalCheckedOutQty} {material.unit}</strong> (₹{totalValuationIssued.toLocaleString('en-IN')})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleViewFullCheckoutBillBlob}
              className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Open full consolidated checkout statement PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Full Bill (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFullCheckoutBill}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Download consolidated checkout statement PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Bill</span>
            </button>
          </div>
        </div>

        {/* Material Stock Summary Bar */}
        <div className="px-5 py-3 bg-purple-50/40 border-b border-purple-100/80 grid grid-cols-3 gap-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Store Stock</span>
            <span className="text-base font-bold text-purple-900">
              {material.currentStock} {material.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Issued to Site</span>
            <span className="text-base font-bold text-indigo-700">
              {totalCheckedOutQty} {material.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Delivered (+In)</span>
            <span className="text-base font-bold text-emerald-700">
              {totalInwardQty} {material.unit}
            </span>
          </div>
        </div>

        {/* Filter Switcher: Check-Outs | All Movements | Bin (Recycle Bin) */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <span className="text-xs font-bold text-slate-700">
            {filterMode === 'checkouts_only' 
              ? `Check-Out Issues Only (${checkOuts.length})` 
              : filterMode === 'bin'
              ? `Recycle Bin (${deletedItemTransactions.length} Deleted)`
              : `All Item Movements (${activeItemTransactions.length})`}
          </span>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setFilterMode('checkouts_only')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterMode === 'checkouts_only' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Check-Outs ({checkOuts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Movements ({activeItemTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('bin')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'bin'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : deletedItemTransactions.length > 0
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View deleted movements / Recycle Bin (can restore)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Bin ({deletedItemTransactions.length})</span>
            </button>
          </div>
        </div>

        {/* Bin Notice Banner when Bin mode is active */}
        {filterMode === 'bin' && (
          <div className="px-5 py-2.5 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between text-xs text-rose-800 shrink-0">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Recycle Bin:</strong> Soft-deleted records with <code className="bg-rose-100 px-1 py-0.2 rounded text-[10px] font-mono font-bold text-rose-900">is_deleted = true</code>. They do not affect store balances. Click <strong>Restore</strong> to reactivate.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer shrink-0 ml-2"
            >
              Back to Ledger
            </button>
          </div>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {filterMode === 'checkouts_only' 
                ? 'Check-Out Issue Records' 
                : filterMode === 'bin'
                ? 'Deleted Movements (Recycle Bin)'
                : 'Complete Movement Ledger'}
            </h3>
            <span className="text-[11px] text-slate-500">
              Sorted newest to oldest
            </span>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              {filterMode === 'checkouts_only' 
                ? 'No check-out issue history recorded for this material yet.'
                : filterMode === 'bin'
                ? 'Recycle Bin is empty. No deleted transactions for this material.'
                : 'No transaction history found for this item yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTransactions.map((tx) => {
                const isOut = tx.type === 'check_out';
                const isIn = tx.type === 'check_in';
                const isRet = tx.type === 'return';
                const isDmg = tx.type === 'damage';
                const isDeleted = Boolean(tx.isDeleted);

                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-xl border transition-all space-y-2.5 text-xs ${
                      isDeleted
                        ? 'border-rose-200 bg-rose-50/20 shadow-2xs hover:border-rose-300'
                        : 'border-slate-200 bg-white shadow-2xs hover:border-purple-200'
                    }`}
                  >
                    {/* Top Row: Voucher & Type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDeleted
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isIn
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isOut
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isRet
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>
                            {isIn && 'Check-In (+)'}
                            {isOut && 'Check-Out (-)'}
                            {isRet && 'Return (-)'}
                            {isDmg && 'Damaged (-)'}
                          </span>
                        </span>
                        <span className={`font-mono font-bold ${isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {tx.voucherNumber}
                        </span>
                        {isDeleted && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            is_deleted = true
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          isDeleted
                            ? 'text-slate-400 line-through'
                            : isIn
                            ? 'text-emerald-700'
                            : 'text-indigo-700'
                        }`}>
                          {isIn ? `+${tx.quantity}` : `-${tx.quantity}`} {tx.unit}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Balance: {tx.runningStockBalance} {tx.unit}
                        </div>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {isOut ? 'Subcontractor / Agency' : 'Supplier / Location'}
                        </span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {tx.subcontractorName || tx.supplierName || 'Site Central Store'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {isOut ? 'Floor & Linked Task' : 'Challan / Vehicle'}
                        </span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {tx.floorZone || tx.challanNumber || tx.vehicleNumber || 'Site General'}
                        </span>
                      </div>

                      {tx.purpose && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">Purpose: </span>
                          <span className="text-slate-700">{tx.purpose}</span>
                        </div>
                      )}

                      {tx.returnReason && (
                        <div className="col-span-2 pt-1 border-t border-amber-200 text-amber-800">
                          <span className="font-bold">Return Reason: </span>
                          <span>{tx.returnReason}</span>
                        </div>
                      )}

                      {tx.damageReason && (
                        <div className="col-span-2 pt-1 border-t border-rose-200 text-rose-800">
                          <span className="font-bold">Damage Reason: </span>
                          <span>{tx.damageReason}</span>
                        </div>
                      )}

                      {tx.notes && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 text-slate-600">
                          <span className="font-medium text-slate-500">Remarks: </span>
                          <span>{tx.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{tx.time}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tx.fileUrl && (
                          <a
                            href={tx.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            title={`View attached bill copy (${tx.fileName || 'Document'})`}
                          >
                            <Paperclip className="w-3 h-3 text-purple-600" />
                            <span>Bill Copy</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleViewPdf(tx)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Open Professional PDF in New Tab (Blob URL)"
                        >
                          <ExternalLink className="w-3 h-3 text-purple-600" />
                          <span>View PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(tx)}
                          className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Download PDF Voucher"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>

                        {/* If in Bin: Restore Button */}
                        {isDeleted ? (
                          <button
                            type="button"
                            onClick={() => onRestoreTransaction && onRestoreTransaction(tx)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Restore this movement back to the active ledger"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          /* If Active: Edit and Delete Buttons */
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(tx)}
                              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit / Update this movement entry"
                            >
                              <Edit2 className="w-3 h-3 text-purple-600" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDelete(tx)}
                              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Soft delete this transaction (moves to Bin, is_deleted = true)"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DELETE CONFIRMATION MODAL (Requires typing "delete" to move to Bin)    */}
      {/* ========================================================================= */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-900">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Move Voucher to Bin?</h3>
                  <p className="text-[11px] text-rose-700">Soft delete with <code className="font-mono bg-rose-100 px-1 py-0.2 rounded font-bold">is_deleted = true</code></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">{deleteConfirmTx.voucherNumber}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    deleteConfirmTx.type === 'check_in'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {deleteConfirmTx.type === 'check_in' ? 'Check-In (+)' : 'Check-Out (-)'}
                  </span>
                </div>
                <div className="text-slate-700 font-semibold">
                  {deleteConfirmTx.materialName} ({deleteConfirmTx.quantity} {deleteConfirmTx.unit})
                </div>
                <div className="text-[11px] text-slate-500">
                  Party: {deleteConfirmTx.subcontractorName || deleteConfirmTx.supplierName || 'Site Central Store'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong className="block text-amber-900 mb-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Note:
                </strong>
                This movement will be marked as soft-deleted (<code className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded">is_deleted = true</code>), removed from active calculations and reports. You can restore it anytime from the <strong>Bin</strong> tab.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Type <span className="text-rose-600 font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">delete</span> to confirm:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type delete"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-rose-600 focus:ring-1 focus:ring-rose-600 font-medium"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInput.trim().toLowerCase() !== 'delete' || isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Move to Bin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT MOVEMENT VOUCHER MODAL                                            */}
      {/* ========================================================================= */}
      {editingTx && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Edit Voucher: <span className="font-mono text-purple-700">{editingTx.voucherNumber}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingTx.materialName} ({editingTx.quantity} {editingTx.unit})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              {/* Entry Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Entry Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('check_out')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      editType === 'check_out'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      editType === 'check_out' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Check-Out</span>
                      <span className="block text-[10px] text-slate-500 font-normal">Issue to Site</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('check_in')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      editType === 'check_in'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-2 ring-emerald-400/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      editType === 'check_in' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Check-In</span>
                      <span className="block text-[10px] text-slate-500 font-normal">Store Receipt</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('return')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      editType === 'return'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      editType === 'return' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Return</span>
                      <span className="block text-[10px] text-slate-500 font-normal">Site/Vendor</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditType('damage')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      editType === 'damage'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold ring-2 ring-rose-400/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      editType === 'damage' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Damage</span>
                      <span className="block text-[10px] text-slate-500 font-normal">Scrap/Defect</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Movement Date *
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Time / Shift
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="e.g. 03:45 PM"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Party (Subcontractor / Supplier) with Searchable Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    {editType === 'check_out' ? 'Subcontractor / Agency Name' : 'Supplier / Vendor Name'}
                  </label>
                  {onOpenVendorDrawer && (
                    <button
                      type="button"
                      onClick={() => onOpenVendorDrawer(editType === 'check_out' ? 'contractor' : 'vendor')}
                      className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>{editType === 'check_out' ? '+ New Contractor' : '+ New Vendor'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <SearchableSelect
                    options={editType === 'check_out' ? subcontractorOptions : supplierOptions}
                    value={editPartyId}
                    onChange={(selectedId) => {
                      setEditPartyId(selectedId);
                      const opt = (editType === 'check_out' ? subcontractorOptions : supplierOptions).find(
                        (o) => o.value === selectedId
                      );
                      if (opt) {
                        setEditPartyName(opt.label);
                      }
                      if (editType === 'check_out') {
                        const sub = mergedSubcontractors.find((s) => s.id === selectedId);
                        if (sub?.foremanName && !editForeman) {
                          setEditForeman(sub.foremanName);
                        }
                      }
                    }}
                    placeholder={
                      editType === 'check_out'
                        ? 'Select Subcontractor / Agency (or type below)'
                        : 'Select Supplier / Vendor (or type below)'
                    }
                    searchPlaceholder={
                      editType === 'check_out' ? 'Search subcontractor...' : 'Search supplier or vendor...'
                    }
                    allowClear
                  />
                  <input
                    type="text"
                    value={editPartyName}
                    onChange={(e) => setEditPartyName(e.target.value)}
                    placeholder={
                      editType === 'check_out'
                        ? 'Or enter custom agency name...'
                        : 'Or enter custom vendor name...'
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Receiving Foreman / Person */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Receiving Person / Foreman Name
                </label>
                <input
                  type="text"
                  value={editForeman}
                  onChange={(e) => setEditForeman(e.target.value)}
                  placeholder="e.g. Ramprasad Sharma / Supervisor"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                />
              </div>

              {/* Floor / Zone / Work Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Floor / Zone / Work Area
                  </label>
                  <input
                    type="text"
                    value={editFloorZone}
                    onChange={(e) => setEditFloorZone(e.target.value)}
                    placeholder="e.g. Tower A - 3rd Floor Slab"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Challan / Slip #
                  </label>
                  <input
                    type="text"
                    value={editRefNumber}
                    onChange={(e) => setEditRefNumber(e.target.value)}
                    placeholder="e.g. DC-9921 / RET-01"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Purpose / Work Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {editType === 'check_out'
                    ? 'Purpose / Work Description'
                    : editType === 'return'
                    ? 'Return Reason'
                    : editType === 'damage'
                    ? 'Damage / Defect Reason'
                    : 'Delivery / Receipt Remarks'}
                </label>
                <input
                  type="text"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder={
                    editType === 'check_out'
                      ? 'e.g. Internal partition wall masonry'
                      : editType === 'return'
                      ? 'e.g. Excess stock returned to godown / supplier'
                      : editType === 'damage'
                      ? 'e.g. Broken in transit / water damaged'
                      : 'e.g. Initial stock receipt from supplier'
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                />
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Any additional remarks..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-purple-600"
                />
              </div>

              {/* Bill Attachment / Proof */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <span className="block text-[11px] font-bold text-slate-700">
                  Attached Issue Slip / Bill Proof
                </span>
                {editingTx.fileUrl && !isRemovingFile && !editFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                    <a
                      href={editingTx.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 hover:underline flex items-center gap-1.5 font-semibold truncate max-w-[280px]"
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{editingTx.fileName || 'Attached Voucher Document'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsRemovingFile(true)}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    {isRemovingFile && (
                      <div className="mb-2 text-[11px] text-amber-700 flex items-center justify-between bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span>Document flagged for removal.</span>
                        <button
                          type="button"
                          onClick={() => setIsRemovingFile(false)}
                          className="font-bold underline text-amber-900 cursor-pointer"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Upload new document (PNG, JPG, PDF up to 15MB):
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditFile(e.target.files[0]);
                          setIsRemovingFile(false);
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-purple-200 file:bg-purple-50 file:text-purple-700 file:text-xs file:font-semibold hover:file:bg-purple-100 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit || !editDate}
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
