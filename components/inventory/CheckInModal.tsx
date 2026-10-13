'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowDownLeft,
  Truck,
  FileText,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Package,
  Loader2,
  Paperclip
} from 'lucide-react';
import {
  ConstructionMaterial,
  InventoryTransaction,
  InventorySupplier
} from '@/lib/inventory/inventory-types';
import { uploadInventoryBillToStorage } from '@/lib/supabase/inventory-services';
import { InventoryBillUploader } from './InventoryBillUploader';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: ConstructionMaterial[];
  suppliers: InventorySupplier[];
  selectedMaterialId?: string | null;
  onConfirmCheckIn: (
    transaction: Omit<InventoryTransaction, 'id' | 'runningStockBalance'>,
    updatedMaterialStock: { materialId: string; addedQuantity: number; newRate?: number }
  ) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  materials,
  suppliers,
  selectedMaterialId,
  onConfirmCheckIn,
}) => {
  const initialMat = materials.find((m) => m.id === selectedMaterialId) || materials[0];

  const [materialId, setMaterialId] = useState<string>(initialMat ? initialMat.id : '');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitRate, setUnitRate] = useState<number | ''>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [qcStatus, setQcStatus] = useState<'Passed' | 'Conditional' | 'Rejected'>('Passed');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('10:30 AM');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Reset all fields to empty defaults when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const initM = materials.find((m) => m.id === selectedMaterialId) || materials[0];
      if (initM) setMaterialId(initM.id);
      setQuantity('');
      setUnitRate('');
      setSupplierId('');
      setChallanNumber('');
      setPoNumber('');
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      setStorageLocation('');
      setReceivedBy('');
      setNotes('');
      setSelectedFile(null);
      setIsUploading(false);
    }
  }, [isOpen, selectedMaterialId, materials]);

  if (!isOpen) return null;

  const currentMat = materials.find((m) => m.id === materialId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleMaterialChange = (newId: string) => {
    setMaterialId(newId);
    const m = materials.find((mat) => mat.id === newId);
    if (m) {
      setUnitRate(m.averageUnitRate > 0 ? m.averageUnitRate : '');
      setStorageLocation(m.storageLocation);
    }
  };

  const qtyNum = typeof quantity === 'number' ? quantity : 0;
  const rateNum = typeof unitRate === 'number' ? unitRate : 0;
  const subtotal = qtyNum * rateNum;
  const gstRate = currentMat?.gstRate || 0;
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  const totalValuation = subtotal + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMat || qtyNum <= 0 || isUploading) return;

    let uploadedFileUrl: string | undefined = undefined;
    let uploadedFileName: string | undefined = undefined;

    if (selectedFile) {
      try {
        setIsUploading(true);
        const res = await uploadInventoryBillToStorage(selectedFile, 'check_in_bills');
        uploadedFileUrl = res.publicUrl;
        uploadedFileName = res.fileName;
      } catch (uploadErr: any) {
        console.error('Failed to upload bill in CheckInModal:', uploadErr);
        alert(`Failed to upload bill: ${uploadErr?.message || 'Storage error'}`);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const voucherNum = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    onConfirmCheckIn(
      {
        voucherNumber: voucherNum,
        type: 'check_in',
        materialId: currentMat.id,
        materialName: currentMat.name,
        category: currentMat.category,
        quantity: qtyNum,
        unit: currentMat.unit,
        unitRate: rateNum,
        totalAmount: totalValuation,
        date: date || new Date().toISOString().split('T')[0],
        time: time || '10:00 AM',
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier?.name || 'Authorized Site Supplier',
        poNumber,
        challanNumber,
        vehicleNumber,
        driverName,
        driverPhone,
        qcStatus,
        unloadingLocation: storageLocation,
        receivedOrIssuedBy: receivedBy,
        notes,
        fileUrl: uploadedFileUrl,
        fileName: uploadedFileName,
      },
      {
        materialId: currentMat.id,
        addedQuantity: qtyNum,
        newRate: rateNum > 0 ? rateNum : undefined,
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
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Inward Goods Receipt (Check-In GRN)
              </h2>
              <p className="text-xs text-slate-500">
                Log arriving construction delivery, verify challan, and increment store stock
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
          {/* Section 1: Material & Quantity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Package className="w-3.5 h-3.5 text-purple-600" />
              <span>1. Material & Received Quantity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Material Dropdown */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select Construction Material *
                </label>
                <select
                  value={materialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
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
                    <span>Current In-Store: <strong className="text-purple-700">{currentMat.currentStock} {currentMat.unit}</strong></span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Quantity Received ({currentMat?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 500"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  required
                />
              </div>

              {/* Unit Rate */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Purchase Unit Rate (Rs. per {currentMat?.unit || 'unit'}) (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[11px] text-slate-400 font-medium">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unitRate}
                    onChange={(e) => setUnitRate(e.target.value === '' ? '' : Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder={currentMat?.averageUnitRate && currentMat.averageUnitRate > 0 ? String(currentMat.averageUnitRate) : "e.g. 100"}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {currentMat?.averageUnitRate && currentMat.averageUnitRate > 0
                    ? `Current rate: Rs. ${currentMat.averageUnitRate.toLocaleString('en-IN')}`
                    : 'Enter rate per unit for this arrival'}
                </span>
              </div>
            </div>

            {/* Quick Valuation Banner */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">
                Subtotal: <strong className="text-slate-800">Rs. {subtotal.toLocaleString('en-IN')}</strong> + GST ({gstRate}%): <strong className="text-slate-800">Rs. {gstAmount.toLocaleString('en-IN')}</strong>
              </span>
              <span className="font-semibold text-purple-800">
                Total Value: Rs. {totalValuation.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Supplier & Delivery Docs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-purple-600" />
              <span>2. Supplier & Gate Documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Supplier / Vendor (Optional)
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                >
                  <option value="">Select Supplier / Vendor (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Delivery Challan / Invoice # (Optional)
                </label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  placeholder="e.g. DC-9941 / INV-104"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Purchase Order (PO) #
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-088"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Vehicle & Driver Logistics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-purple-600" />
              <span>3. Vehicle Logistics & Driver</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Vehicle / Truck # (Optional)
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH-04-CP-8812"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver Full Name"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Driver Mobile Phone
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Quality Check & Storage Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>4. Quality Inspection & Storage Yard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Physical QC Status *
                </label>
                <select
                  value={qcStatus}
                  onChange={(e) => setQcStatus(e.target.value as any)}
                  className={`w-full h-10 px-3 rounded-lg border text-xs font-semibold focus:outline-hidden ${
                    qcStatus === 'Passed'
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                      : qcStatus === 'Conditional'
                      ? 'border-amber-200 bg-amber-50/60 text-amber-800'
                      : 'border-rose-200 bg-rose-50/60 text-rose-800'
                  }`}
                >
                  <option value="Passed">Passed (Accepted 100%)</option>
                  <option value="Conditional">Conditional Approval (Pending Lab Report)</option>
                  <option value="Rejected">Rejected (Defective / Moisture Damaged)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Unloading Yard / Shed (Optional)
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Cement Shed #1"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Received By / Person Name *
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Enter receiving person name (e.g. Ravi Kumar)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Receiving Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Storekeeper Notes / Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Moisture free, stacked 8 bags high..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              {/* Optional Bill / Challan Document Upload */}
              <div className="pt-2 border-t border-slate-100">
                <InventoryBillUploader
                  file={selectedFile}
                  onFileChange={setSelectedFile}
                  disabled={isUploading}
                  label="Attach Supplier Delivery Challan / Invoice (Optional)"
                  hint="Attach bill copy in PNG, JPG, or PDF (up to 25MB)"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Bill & Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Inward Check-In</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
