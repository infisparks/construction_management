'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertTriangle,
  Building,
  HardHat,
  Package,
  Calendar,
  CheckCircle2,
  MapPin,
  FileText,
  UserCheck,
  UserPlus,
  PlusCircle
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySupplier,
  InventorySubcontractor
} from '@/lib/inventory/mock-inventory-data';
import { ConstructionTask } from '@/lib/construction-planning/types';

interface MaterialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: ConstructionMaterial[];
  suppliers: InventorySupplier[];
  subcontractors: InventorySubcontractor[];
  tasks?: ConstructionTask[];
  transactions?: InventoryTransaction[];
  selectedMaterialId?: string | null;
  initialAction?: InventoryTransactionType;
  existingStorageLocations?: string[];
  onAddStorageLocation?: (location: string) => void;
  onConfirmAction: (
    actionType: InventoryTransactionType,
    transaction: Omit<InventoryTransaction, 'id' | 'runningStockBalance'>,
    stockUpdate: {
      materialId: string;
      quantityDelta: number;
      newRate?: number;
      newGstRate?: 0 | 5 | 12 | 18 | 28;
      newLocation?: string;
    }
  ) => void;
  onViewFullHistory?: (materialId: string) => void;
  onOpenVendorDrawer?: (defaultType?: 'vendor' | 'contractor' | 'other') => void;
  onOpenProductDrawer?: () => void;
}

const BASE_STORAGE_LOCATIONS = [
  'Central Site Store #1',
  'Cement Godown Shed #2',
  'Steel Rebar Yard Bay #4',
  'Open Stacking Yard #3',
];

export const MaterialActionModal: React.FC<MaterialActionModalProps> = ({
  isOpen,
  onClose,
  materials,
  suppliers,
  subcontractors,
  tasks = [],
  transactions = [],
  selectedMaterialId,
  initialAction = 'check_in',
  existingStorageLocations = [],
  onAddStorageLocation,
  onConfirmAction,
  onViewFullHistory,
  onOpenVendorDrawer,
  onOpenProductDrawer,
}) => {
  const allLocations = Array.from(new Set([...BASE_STORAGE_LOCATIONS, ...existingStorageLocations]));

  const [actionType, setActionType] = useState<InventoryTransactionType>(initialAction);
  const [materialId, setMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>(50);

  // Check-In fields
  const [unitRate, setUnitRate] = useState<number | ''>('');
  const [checkInGstRate, setCheckInGstRate] = useState<0 | 5 | 12 | 18 | 28>(0);
  const [storageLocation, setStorageLocation] = useState<string>(allLocations[0] || 'Central Site Store #1');
  const [customStorage, setCustomStorage] = useState<string>('');
  const [isCustomStorage, setIsCustomStorage] = useState<boolean>(false);
  const [supplierId, setSupplierId] = useState<string>('');
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('MH-04-CP-8812');

  // Check-Out fields
  const [subcontractorId, setSubcontractorId] = useState<string>('');
  const [foremanName, setForemanName] = useState<string>('');
  const [floorZone, setFloorZone] = useState<string>('Tower A - 3rd Floor Slab');
  const [purpose, setPurpose] = useState<string>('Site construction work');
  const [authorizedBy, setAuthorizedBy] = useState<string>('Er. Amit Verma');

  // Return fields
  const [returnReason, setReturnReason] = useState<string>('Defective / sub-standard material (QC Rejected)');
  const [returnCustomNote, setReturnCustomNote] = useState<string>('Returned to supplier for credit adjustment');
  const [returnSlipNo, setReturnSlipNo] = useState<string>('RET-DC-901');

  // Damaged fields
  const [damageReason, setDamageReason] = useState<string>('Corner cracking / transit fracture during unloading');
  const [damageCustomNote, setDamageCustomNote] = useState<string>('Unloading fracture beyond allowable tolerance');
  const [damageLocation, setDamageLocation] = useState<string>('Ground Stacking Yard');

  // General fields
  const [recordedBy, setRecordedBy] = useState<string>('Ravi Kumar (Storekeeper)');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setActionType(initialAction);
      const targetMat = materials.find((m) => m.id === selectedMaterialId) || materials[0];
      if (targetMat) {
        setMaterialId(targetMat.id);
        setUnitRate(targetMat.averageUnitRate > 0 ? targetMat.averageUnitRate : '');
        setCheckInGstRate((targetMat.gstRate !== undefined ? targetMat.gstRate : 0) as any);
        setStorageLocation(targetMat.storageLocation || allLocations[0] || 'Central Site Store #1');
        setIsCustomStorage(false);
        setCustomStorage('');
      }
      if (suppliers.length > 0 && !supplierId) {
        setSupplierId(suppliers[0].id);
      }
      if (subcontractors.length > 0 && !subcontractorId) {
        setSubcontractorId(subcontractors[0].id);
        setForemanName(subcontractors[0].foremanName || '');
      }
      setChallanNumber('DC-' + Math.floor(1000 + Math.random() * 9000));
    }
  }, [isOpen, selectedMaterialId, initialAction, materials, suppliers, subcontractors]);

  // Current material and recent checkouts - must execute before any conditional returns
  const currentMat = materials.find((m) => m.id === materialId) || materials[0] || null;

  // Recent checkouts for current material
  const recentCheckouts = useMemo(() => {
    if (!transactions || !currentMat) return [];
    return transactions
      .filter((t) => t.materialId === currentMat.id && t.type === 'check_out')
      .slice(0, 3);
  }, [transactions, currentMat]);

  // Last purchase record for current material
  const lastPurchaseTx = useMemo(() => {
    if (!transactions || !currentMat) return null;
    return transactions.find(
      (t) => t.materialId === currentMat.id && t.type === 'check_in' && typeof t.unitRate === 'number' && t.unitRate > 0
    );
  }, [transactions, currentMat]);

  const lastPurchaseRate = lastPurchaseTx?.unitRate ?? (currentMat?.averageUnitRate && currentMat.averageUnitRate > 0 ? currentMat.averageUnitRate : null);

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const selectedSub = subcontractors.find((s) => s.id === subcontractorId);

  const handleMaterialChange = (newId: string) => {
    setMaterialId(newId);
    const m = materials.find((mat) => mat.id === newId);
    if (m) {
      setUnitRate(m.averageUnitRate > 0 ? m.averageUnitRate : '');
      setCheckInGstRate((m.gstRate !== undefined ? m.gstRate : 0) as any);
      setStorageLocation(m.storageLocation || allLocations[0] || 'Central Site Store #1');
      setIsCustomStorage(false);
      setCustomStorage('');
    }
  };

  const handleSubChange = (newSubId: string) => {
    setSubcontractorId(newSubId);
    const sub = subcontractors.find((s) => s.id === newSubId);
    if (sub) {
      setForemanName(sub.foremanName || '');
    }
  };

  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const currentStock = currentMat ? currentMat.currentStock : 0;

  // Check-In adds stock (+), all other 3 actions decrease stock (-)
  const isDeduction = actionType === 'check_out' || actionType === 'return' || actionType === 'damage';
  const newProjectedStock = isDeduction
    ? Math.max(0, Math.round((currentStock - qtyNum) * 100) / 100)
    : Math.round((currentStock + qtyNum) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMat || qtyNum <= 0) return;

    if (isDeduction && qtyNum > currentStock) {
      const proceed = confirm(
        `Warning: Quantity (${qtyNum} ${currentMat.unit}) exceeds currently available stock (${currentStock} ${currentMat.unit}). Do you wish to continue?`
      );
      if (!proceed) return;
    }

    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    let voucherCode = '';

    if (actionType === 'check_in') voucherCode = `GRN-${year}-${randomCode}`;
    else if (actionType === 'check_out') voucherCode = `MIN-${year}-${randomCode}`;
    else if (actionType === 'return') voucherCode = `RET-${year}-${randomCode}`;
    else if (actionType === 'damage') voucherCode = `DMG-${year}-${randomCode}`;

    const rateNum = typeof unitRate === 'number' && unitRate > 0 ? unitRate : (currentMat.averageUnitRate || 0);
    const subtotal = qtyNum * rateNum;
    const activeGst = actionType === 'check_in' ? checkInGstRate : (currentMat.gstRate || 0);
    const gstAmount = Math.round((subtotal * activeGst) / 100);
    const totalAmount = subtotal + gstAmount;

    const finalStorage = isCustomStorage && customStorage.trim()
      ? customStorage.trim()
      : (storageLocation.trim() || currentMat.storageLocation || 'Central Site Store #1');

    if (actionType === 'check_in' && isCustomStorage && customStorage.trim() && onAddStorageLocation) {
      onAddStorageLocation(customStorage.trim());
    }

    const baseTx: Omit<InventoryTransaction, 'id' | 'runningStockBalance'> = {
      voucherNumber: voucherCode,
      type: actionType,
      materialId: currentMat.id,
      materialName: currentMat.name,
      category: currentMat.category,
      quantity: qtyNum,
      unit: currentMat.unit,
      unitRate: rateNum,
      gstRate: activeGst,
      gstAmount,
      totalAmount,
      date: date || new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      receivedOrIssuedBy: recordedBy,
    };

    if (actionType === 'check_in') {
      baseTx.supplierId = selectedSupplier?.id;
      baseTx.supplierName = selectedSupplier?.name || 'Authorized Site Supplier';
      baseTx.challanNumber = challanNumber;
      baseTx.vehicleNumber = vehicleNumber;
      baseTx.unloadingLocation = finalStorage;
      baseTx.notes = `Inward delivery received in good condition. Unloaded in ${finalStorage}.`;
    } else if (actionType === 'check_out') {
      baseTx.subcontractorId = selectedSub?.id;
      baseTx.subcontractorName = selectedSub?.name || 'Site Labour Agency';
      baseTx.foremanName = foremanName;
      baseTx.floorZone = floorZone;
      baseTx.purpose = purpose;
      baseTx.authorizedBy = authorizedBy;
      baseTx.notes = `Dispatched to ${selectedSub?.name || 'contractor'} for ${purpose}.`;
    } else if (actionType === 'return') {
      baseTx.supplierId = selectedSupplier?.id;
      baseTx.supplierName = selectedSupplier?.name || 'Authorized Site Supplier';
      baseTx.challanNumber = returnSlipNo;
      baseTx.returnReason = returnReason;
      baseTx.authorizedBy = authorizedBy;
      baseTx.notes = `Returned to vendor: ${returnReason}. Note: ${returnCustomNote}`;
    } else if (actionType === 'damage') {
      baseTx.damageReason = damageReason;
      baseTx.floorZone = damageLocation;
      baseTx.authorizedBy = authorizedBy;
      baseTx.notes = `Material damage / scrap write-off: ${damageReason}. Note: ${damageCustomNote}`;
    }

    const delta = isDeduction ? -qtyNum : qtyNum;

    onConfirmAction(actionType, baseTx, {
      materialId: currentMat.id,
      quantityDelta: delta,
      newRate: actionType === 'check_in' && rateNum > 0 ? rateNum : undefined,
      newGstRate: actionType === 'check_in' ? checkInGstRate : undefined,
      newLocation: actionType === 'check_in' ? finalStorage : undefined,
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl sm:max-w-xl lg:max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
              actionType === 'check_in'
                ? 'bg-purple-100 border-purple-200 text-purple-700'
                : actionType === 'check_out'
                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                : actionType === 'return'
                ? 'bg-amber-100 border-amber-200 text-amber-700'
                : 'bg-rose-100 border-rose-200 text-rose-700'
            }`}>
              {actionType === 'check_in' && <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />}
              {actionType === 'check_out' && <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />}
              {actionType === 'return' && <RotateCcw className="w-5 h-5 stroke-[2.2]" />}
              {actionType === 'damage' && <AlertTriangle className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Record Material Action
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Sidebar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select action type to update inventory stock and create audit trail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Action Selector Pills */}
        <div className="p-3 bg-slate-100/60 border-b border-slate-200/70 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* 1. Check-In */}
            <button
              type="button"
              onClick={() => setActionType('check_in')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                actionType === 'check_in'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Check In</span>
            </button>

            {/* 2. Check-Out */}
            <button
              type="button"
              onClick={() => setActionType('check_out')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                actionType === 'check_out'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>- Check Out</span>
            </button>

            {/* 3. Return */}
            <button
              type="button"
              onClick={() => setActionType('return')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                actionType === 'return'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>- Return</span>
            </button>

            {/* 4. Damaged */}
            <button
              type="button"
              onClick={() => setActionType('damage')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                actionType === 'damage'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>- Damaged</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Top Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            actionType === 'check_in'
              ? 'bg-purple-50/70 border-purple-200 text-purple-900'
              : actionType === 'check_out'
              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
              : actionType === 'return'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}>
            <span className="font-semibold">
              {actionType === 'check_in' && 'Inward Goods Receipt (+ Adds to Store Stock)'}
              {actionType === 'check_out' && 'Site Contractor Dispatch (- Decreases from Store Stock)'}
              {actionType === 'return' && 'Vendor Return (- Decreases from Store Stock with reason)'}
              {actionType === 'damage' && 'Damage / Breakage Write-Off (- Decreases from Store Stock with reason)'}
            </span>
            <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-white border border-current">
              {isDeduction ? '(-) Outward' : '(+) Inward'}
            </span>
          </div>

          {/* Section 1: Material & Quantity */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700">
                  Select Construction Material *
                </label>
                {onOpenProductDrawer && (
                  <button
                    type="button"
                    onClick={onOpenProductDrawer}
                    className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+ New Product Profile</span>
                  </button>
                )}
              </div>
              <select
                value={materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
                required
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name} ({m.currentStock} {m.unit} in store)
                  </option>
                ))}
              </select>
              {currentMat && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Category: <strong className="text-slate-700">{currentMat.category}</strong></span>
                  <span>Store Balance: <strong className="text-purple-700">{currentMat.currentStock} {currentMat.unit}</strong></span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Quantity ({currentMat?.unit || 'Units'}) *
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 font-bold ${
                    isDeduction ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {isDeduction ? '–' : '+'}
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="50"
                    className="w-full h-10 pl-7 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Resulting Stock
                </label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between font-mono font-bold text-slate-800">
                  <span>{currentStock} {currentMat?.unit}</span>
                  <span className="text-slate-400">→</span>
                  <span className={isDeduction ? 'text-amber-700' : 'text-purple-700'}>
                    {newProjectedStock} {currentMat?.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: DYNAMIC FIELDS PER ACTION TYPE */}

          {/* MODE A: CHECK-IN */}
          {actionType === 'check_in' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">
                      Supplier / Vendor *
                    </label>
                    {onOpenVendorDrawer && (
                      <button
                        type="button"
                        onClick={() => onOpenVendorDrawer('vendor')}
                        className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ New Vendor</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Challan / Invoice # *
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="DC-9921"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Purchase Unit Rate (₹ per {currentMat?.unit || 'unit'}) <span className="text-purple-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={unitRate}
                      onChange={(e) => setUnitRate(e.target.value === '' ? '' : Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={currentMat?.averageUnitRate && currentMat.averageUnitRate > 0 ? String(currentMat.averageUnitRate) : "Enter unit purchase rate"}
                      className="w-full h-10 pl-7 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {currentMat?.averageUnitRate && currentMat.averageUnitRate > 0
                      ? `Current avg rate: ₹${currentMat.averageUnitRate.toLocaleString('en-IN')}`
                      : 'Enter unit purchase rate for incoming delivery'}
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Vehicle / Truck #
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="MH-04-CP-8812"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODE B: CHECK-OUT */}
          {actionType === 'check_out' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">
                      Subcontractor Agency *
                    </label>
                    {onOpenVendorDrawer && (
                      <button
                        type="button"
                        onClick={() => onOpenVendorDrawer('contractor')}
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ New Contractor</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={subcontractorId}
                    onChange={(e) => handleSubChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  >
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.trade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Receiving Foreman / Person *
                  </label>
                  <input
                    type="text"
                    value={foremanName}
                    onChange={(e) => setForemanName(e.target.value)}
                    placeholder="Ramprasad Sharma"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Floor / Zone / Work Area *
                  </label>
                  <input
                    type="text"
                    value={floorZone}
                    onChange={(e) => setFloorZone(e.target.value)}
                    placeholder="Tower A - 3rd Floor Slab"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Work Purpose / Description
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Beam and slab concrete casting"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                {/* Recent Checkouts Preview & Statement link */}
                {recentCheckouts.length > 0 && (
                  <div className="pt-2.5 border-t border-indigo-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                      <span>Past Checkouts for {currentMat.name}</span>
                      {onViewFullHistory && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onViewFullHistory(currentMat.id);
                          }}
                          className="text-purple-700 hover:text-purple-900 underline text-[10px] font-bold cursor-pointer"
                        >
                          View Full History & Bill →
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {recentCheckouts.map((rc: InventoryTransaction) => (
                        <div key={rc.id} className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-[10px]">
                          <div>
                            <span className="font-bold text-slate-800">{rc.subcontractorName || 'Site Agency'}</span>
                            <span className="text-slate-500 ml-1.5">• {rc.floorZone || 'Site'} ({rc.date})</span>
                          </div>
                          <span className="font-bold text-indigo-700 font-mono">
                            -{rc.quantity} {rc.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE C: RETURN */}
          {actionType === 'return' && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-amber-900 mb-1">
                  Reason for Material Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-amber-300 bg-amber-50/50 text-xs font-semibold text-amber-900 focus:outline-hidden focus:border-amber-600"
                  required
                >
                  <option value="Defective / sub-standard material (QC Rejected)">
                    Defective / sub-standard material (QC Rejected)
                  </option>
                  <option value="Excess quantity returned to vendor for credit">
                    Excess quantity returned to vendor for credit
                  </option>
                  <option value="Wrong material specification delivered">
                    Wrong material specification delivered
                  </option>
                  <option value="Damaged on delivery / expired packaging">
                    Damaged on delivery / expired packaging
                  </option>
                  <option value="Contractor surplus unused return">
                    Contractor surplus unused return
                  </option>
                  <option value="Other return reason">Other return reason</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">
                      Vendor Returning To
                    </label>
                    {onOpenVendorDrawer && (
                      <button
                        type="button"
                        onClick={() => onOpenVendorDrawer('vendor')}
                        className="text-amber-700 hover:text-amber-900 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ New Vendor</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Return Gate Pass / Slip #
                  </label>
                  <input
                    type="text"
                    value={returnSlipNo}
                    onChange={(e) => setReturnSlipNo(e.target.value)}
                    placeholder="RET-DC-901"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Explanation / Return Notes
                  </label>
                  <input
                    type="text"
                    value={returnCustomNote}
                    onChange={(e) => setReturnCustomNote(e.target.value)}
                    placeholder="Loaded back onto supplier lorry for credit note..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODE D: DAMAGED */}
          {actionType === 'damage' && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-rose-900 mb-1">
                  Reason for Damage / Scrap Write-Off *
                </label>
                <select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-rose-300 bg-rose-50/50 text-xs font-semibold text-rose-900 focus:outline-hidden focus:border-rose-600"
                  required
                >
                  <option value="Corner cracking / transit fracture during unloading">
                    Corner cracking / transit fracture during unloading
                  </option>
                  <option value="Rain / moisture damage in storage yard">
                    Rain / moisture damage in storage yard
                  </option>
                  <option value="Handling accident on site / hoist drop">
                    Handling accident on site / hoist drop
                  </option>
                  <option value="Rusting / corrosion / atmospheric exposure">
                    Rusting / corrosion / atmospheric exposure
                  </option>
                  <option value="Chemical expiry / hardened cement">
                    Chemical expiry / hardened cement
                  </option>
                  <option value="Site cutting scrap & wastage write-off">
                    Site cutting scrap & wastage write-off
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Location Where Damaged *
                  </label>
                  <input
                    type="text"
                    value={damageLocation}
                    onChange={(e) => setDamageLocation(e.target.value)}
                    placeholder="Ground Stacking Yard Bay #2"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Inspected By (Engineer / Incharge) *
                  </label>
                  <input
                    type="text"
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    placeholder="Er. Amit Verma"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Damage Assessment Notes
                  </label>
                  <input
                    type="text"
                    value={damageCustomNote}
                    onChange={(e) => setDamageCustomNote(e.target.value)}
                    placeholder="Fractured blocks removed from usable stack and written off..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* Section 3: Sign-Off */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Storekeeper / Logged By *
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          </div>

          {/* Sticky Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                actionType === 'check_in'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : actionType === 'check_out'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : actionType === 'return'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {actionType === 'check_in' && `Confirm Check In (+${qtyNum} ${currentMat?.unit || ''})`}
                {actionType === 'check_out' && `Confirm Check Out (-${qtyNum} ${currentMat?.unit || ''})`}
                {actionType === 'return' && `Confirm Return (-${qtyNum} ${currentMat?.unit || ''})`}
                {actionType === 'damage' && `Confirm Damage (-${qtyNum} ${currentMat?.unit || ''})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MaterialActionDrawer = MaterialActionModal;

