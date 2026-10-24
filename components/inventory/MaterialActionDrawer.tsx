'use client';

import React from 'react';
import {
  X,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertTriangle,
  History,
  Trash2,
  MapPin,
  Tag,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { ConstructionMaterial } from '@/lib/inventory/inventory-types';

interface MaterialActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: ConstructionMaterial | null;
  onCheckIn: (materialId: string) => void;
  onCheckOut: (materialId: string) => void;
  onReturn: (materialId: string) => void;
  onDamage: (materialId: string) => void;
  onViewHistory: (material: ConstructionMaterial) => void;
  onDelete: (materialId: string, name: string) => void;
}

export const MaterialActionDrawer: React.FC<MaterialActionDrawerProps> = ({
  isOpen,
  onClose,
  material,
  onCheckIn,
  onCheckOut,
  onReturn,
  onDamage,
  onViewHistory,
  onDelete,
}) => {
  if (!isOpen || !material) return null;

  const isLow = material.currentStock <= material.minimumAlertStock && material.currentStock > 0;
  const isDepleted = material.currentStock <= 0;
  const valuation = material.currentStock * material.averageUnitRate;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />

      {/* Right Slide-Over Panel */}
      <div 
        className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-250">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center shadow-md shadow-[#653ef1]/25 shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-[#653ef1] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {material.code || 'SKU'}
                  </span>
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
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-1">
                  {material.name}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {material.category} {material.brand ? `• ${material.brand}` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            {/* Live Inventory Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Current Balance
                </span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {material.storageLocation || 'Main Yard'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">In Hand Stock</div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {material.currentStock}{' '}
                    <span className="text-xs font-normal text-slate-500">{material.unit}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Min Buffer</div>
                  <div className="text-sm sm:text-base font-semibold text-slate-700 mt-0.5">
                    {material.minimumAlertStock} {material.unit}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Est. Valuation</div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">
                    ₹{Math.round(valuation).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Stock Movement Actions */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Stock Movement Actions
              </h3>

              {/* Action 1: Check In (GRN) */}
              <button
                type="button"
                onClick={() => {
                  onCheckIn(material.id);
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl border border-purple-200/90 bg-purple-50/50 hover:bg-purple-100/70 hover:border-purple-300 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#653ef1] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#653ef1]/25 group-hover:scale-105 transition-transform">
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Check-In Delivery (GRN)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-[#653ef1] font-bold">
                        + IN
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Receive incoming stock from supplier, vendor, or store challan.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#653ef1] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Action 2: Check Out (Issue to Site) */}
              <button
                type="button"
                onClick={() => {
                  onCheckOut(material.id);
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl border border-[#653ef1]/25 bg-[#653ef1]/5 hover:bg-[#653ef1]/10 hover:border-[#653ef1]/40 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#653ef1]/25 group-hover:scale-105 transition-transform">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Check-Out (Site Issue MIN)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#653ef1]/15 text-[#653ef1] font-bold">
                        - OUT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Issue materials to contractor, site engineer, floor, or task.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#653ef1] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Action 3: Return to Supplier */}
              <button
                type="button"
                onClick={() => {
                  onReturn(material.id);
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-100/60 hover:border-amber-300 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Return to Supplier</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                        ⟲ RET
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Return defective, surplus, or incorrect materials with credit slip.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Action 4: Log Damaged / Defect */}
              <button
                type="button"
                onClick={() => {
                  onDamage(material.id);
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-100/60 hover:border-rose-300 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/25 group-hover:scale-105 transition-transform">
                    <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Log Damaged / Scrap</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                        ⚠ DMG
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Write off broken, spoiled, or damaged goods with photographic record.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>

            {/* Section: Ledger, Audit & Administration */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Audit Trail & Product Operations
              </h3>

              {/* Action 5: View Movement History Drawer */}
              <button
                type="button"
                onClick={() => {
                  onViewHistory(material);
                  onClose();
                }}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Full Transaction History & Bills
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Inspect all past inward/outward vouchers, dates, and uploaded invoices.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Action 6: Delete to Recycle Bin */}
              <button
                type="button"
                onClick={() => {
                  onDelete(material.id, material.name);
                  onClose();
                }}
                className="w-full p-3 rounded-xl border border-rose-200/70 bg-white hover:bg-rose-50/60 hover:border-rose-300 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-700">
                      Move Product to Recycle Bin
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Archive product. Can be restored anytime from the Recycle Bin tab.
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:text-rose-700 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
