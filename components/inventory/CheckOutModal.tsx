'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowUpRight,
  HardHat,
  Package,
  Layers,
  MapPin,
  UserCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventorySubcontractor
} from '@/lib/inventory/mock-inventory-data';
import { ConstructionTask } from '@/lib/construction-planning/types';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: ConstructionMaterial[];
  subcontractors: InventorySubcontractor[];
  tasks?: ConstructionTask[];
  selectedMaterialId?: string | null;
  onConfirmCheckOut: (
    transaction: Omit<InventoryTransaction, 'id' | 'runningStockBalance'>,
    updatedMaterialStock: { materialId: string; deductedQuantity: number }
  ) => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  materials,
  subcontractors,
  tasks = [],
  selectedMaterialId,
  onConfirmCheckOut,
}) => {
  const initialMat = materials.find((m) => m.id === selectedMaterialId) || materials[0];

  const [materialId, setMaterialId] = useState<string>(initialMat ? initialMat.id : '');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [subcontractorId, setSubcontractorId] = useState<string>('');
  const [foremanName, setForemanName] = useState<string>('');
  const [selectedTaskCode, setSelectedTaskCode] = useState<string>(tasks[0]?.code || '3.4.3');
  const [floorZone, setFloorZone] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [authorizedBy, setAuthorizedBy] = useState<string>('');
  const [issuedBy, setIssuedBy] = useState<string>('');
  const [isReturnable, setIsReturnable] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('11:45 AM');

  // Reset fields to clean empty defaults when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const initM = materials.find((m) => m.id === selectedMaterialId) || materials[0];
      if (initM) setMaterialId(initM.id);
      setQuantity('');
      setSubcontractorId('');
      setForemanName('');
      setFloorZone('');
      setPurpose('');
      setAuthorizedBy('');
      setIssuedBy('');
      setNotes('');
    }
  }, [isOpen, selectedMaterialId, materials]);

  if (!isOpen) return null;

  const currentMat = materials.find((m) => m.id === materialId);
  const selectedSub = subcontractors.find((s) => s.id === subcontractorId);
  const currentTask = tasks.find((t) => t.code === selectedTaskCode);

  const handleSubcontractorChange = (subId: string) => {
    setSubcontractorId(subId);
  };

  const handleMaterialChange = (newId: string) => {
    setMaterialId(newId);
    const m = materials.find((mat) => mat.id === newId);
    if (m && m.category === 'Formwork & Shuttering') {
      setIsReturnable(true);
    } else {
      setIsReturnable(false);
    }
  };

  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const isOverStock = currentMat ? qtyNum > currentMat.currentStock : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMat || qtyNum <= 0) return;

    if (isOverStock) {
      const proceed = confirm(
        `Warning: Requested quantity (${qtyNum} ${currentMat.unit}) exceeds current available store stock (${currentMat.currentStock} ${currentMat.unit}). Do you still wish to proceed?`
      );
      if (!proceed) return;
    }

    const voucherNum = `MIN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    onConfirmCheckOut(
      {
        voucherNumber: voucherNum,
        type: 'check_out',
        materialId: currentMat.id,
        materialName: currentMat.name,
        category: currentMat.category,
        quantity: qtyNum,
        unit: currentMat.unit,
        unitRate: currentMat.averageUnitRate,
        totalAmount: qtyNum * currentMat.averageUnitRate,
        date: date || new Date().toISOString().split('T')[0],
        time: time || '11:45 AM',
        subcontractorId: selectedSub?.id,
        subcontractorName: selectedSub?.name || 'Site Labour Agency',
        foremanName,
        wbsTaskId: currentTask?.id || selectedTaskCode,
        wbsTaskCode: selectedTaskCode,
        wbsTaskName: currentTask?.name || 'Site Construction Work',
        floorZone,
        purpose,
        authorizedBy,
        receivedOrIssuedBy: issuedBy,
        isReturnable,
        notes,
      },
      {
        materialId: currentMat.id,
        deductedQuantity: qtyNum,
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Site Issue & Dispatch (Check-Out MIN)
              </h2>
              <p className="text-xs text-slate-500">
                Issue materials to site contractors, link to WBS task/floor, and update stock
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section 1: Material & Issued Qty */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Material to Issue & Current Balance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select Construction Material *
                </label>
                <select
                  value={materialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} [Available: {m.currentStock} {m.unit}]
                    </option>
                  ))}
                </select>
                {currentMat && (
                  <div className="mt-1.5 flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">Location: <strong className="text-slate-800">{currentMat.storageLocation}</strong></span>
                    <span className="font-semibold text-indigo-700">
                      Available Stock: {currentMat.currentStock} {currentMat.unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Quantity to Issue ({currentMat?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 50"
                  className={`w-full h-10 px-3 rounded-lg border text-xs text-slate-900 focus:outline-hidden ${
                    isOverStock ? 'border-amber-400 bg-amber-50/40 text-amber-900' : 'border-slate-200 bg-white focus:border-indigo-600'
                  }`}
                  required
                />
                {isOverStock && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Warning: Exceeds currently available store balance ({currentMat?.currentStock} {currentMat?.unit}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Material Classification
                </label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Avg Cost: Rs. {currentMat?.averageUnitRate || 0}/{currentMat?.unit}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={isReturnable}
                      onChange={(e) => setIsReturnable(e.target.checked)}
                      className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Returnable Asset</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Contractor & Foreman */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <HardHat className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Subcontractor & Receiving Foreman</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Subcontractor Agency (Optional)
                </label>
                <select
                  value={subcontractorId}
                  onChange={(e) => handleSubcontractorChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="">Select Subcontractor / Agency (Optional)</option>
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.trade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Receiving Foreman / Person *
                </label>
                <input
                  type="text"
                  value={foremanName}
                  onChange={(e) => setForemanName(e.target.value)}
                  placeholder={
                    selectedSub?.foremanName
                      ? `Enter receiving person name (e.g. ${selectedSub.foremanName})`
                      : "Enter receiving person name (e.g. Ramprasad Sharma)"
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  required
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: WBS Task & Site Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Linked WBS Task & Floor / Zone</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Linked Construction WBS Task
                </label>
                <select
                  value={selectedTaskCode}
                  onChange={(e) => setSelectedTaskCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                >
                  {tasks.length > 0 ? (
                    tasks.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.code} - {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="3.4.3">3.4.3 - 3rd Floor Slab Concrete Pouring</option>
                      <option value="3.4.2">3.4.2 - 3rd Floor Rebar Fabrication</option>
                      <option value="3.2">3.2 - 2nd Floor Brickwork & AAC Blocks</option>
                      <option value="4.1">4.1 - Internal Plumbing & Drainage Rough-in</option>
                      <option value="4.2">4.2 - Electrical Conduits & Wire Pulling</option>
                      <option value="general">General Site Maintenance / Shuttering</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tower / Floor / Zone (Optional)
                </label>
                <input
                  type="text"
                  value={floorZone}
                  onChange={(e) => setFloorZone(e.target.value)}
                  placeholder="e.g. Tower A - 3rd Floor Slab"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Specific Purpose / Work Description
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Concrete mix for column and beam casting..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Authorizations & Sign-off */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Authorizations & Dispatch Sign-Off</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Authorized By (Optional)
                </label>
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="e.g. Er. Amit Verma"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Issued By (Storekeeper) (Optional)
                </label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Issue Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="11:45 AM"
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Site Notes / Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dispatched via site hoist..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Site Issue (Check-Out)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
