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
  Paperclip
} from 'lucide-react';
import { ConstructionMaterial, InventoryTransaction } from '@/lib/inventory/inventory-types';
import {
  downloadInventoryVoucherPdf,
  viewInventoryVoucherPdfInNewTab,
  downloadMaterialCheckoutHistoryPdf,
  viewMaterialCheckoutHistoryPdfInNewTab
} from '@/lib/inventory/inventory-voucher-pdf';

interface MaterialHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: ConstructionMaterial | null;
  transactions: InventoryTransaction[];
  projectName?: string;
  onOpenVoucherModal: (tx: InventoryTransaction) => void;
  defaultFilter?: 'checkouts_only' | 'all';
}

export const MaterialHistoryDrawer: React.FC<MaterialHistoryDrawerProps> = ({
  isOpen,
  onClose,
  material,
  transactions,
  projectName = 'Noori Crest Tower',
  onOpenVoucherModal,
  defaultFilter = 'checkouts_only',
}) => {
  const [filterMode, setFilterMode] = useState<'checkouts_only' | 'all'>(defaultFilter);

  // Filter transactions for this specific material - must always execute hooks before any conditional returns
  const itemTransactions = useMemo(() => {
    if (!material) return [];
    return transactions.filter((t) => t.materialId === material.id);
  }, [transactions, material]);

  const checkOuts = useMemo(() => {
    return itemTransactions.filter((t) => t.type === 'check_out');
  }, [itemTransactions]);

  const displayedTransactions = useMemo(() => {
    if (filterMode === 'checkouts_only') return checkOuts;
    return itemTransactions;
  }, [filterMode, checkOuts, itemTransactions]);

  const totalCheckedOutQty = useMemo(() => {
    return checkOuts.reduce((sum, t) => sum + t.quantity, 0);
  }, [checkOuts]);

  const totalInwardQty = useMemo(() => {
    return itemTransactions
      .filter((t) => t.type === 'check_in')
      .reduce((sum, t) => sum + t.quantity, 0);
  }, [itemTransactions]);

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

        {/* Filter Switcher */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <span className="text-xs font-bold text-slate-700">
            {filterMode === 'checkouts_only' ? `Check-Out Issues Only (${checkOuts.length})` : `All Item Movements (${itemTransactions.length})`}
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
              All Movements ({itemTransactions.length})
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {filterMode === 'checkouts_only' ? 'Check-Out Issue Records' : 'Complete Movement Ledger'}
            </h3>
            <span className="text-[11px] text-slate-500">
              Sorted newest to oldest
            </span>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              {filterMode === 'checkouts_only' 
                ? 'No check-out issue history recorded for this material yet.'
                : 'No transaction history found for this item yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTransactions.map((tx) => {

                const isOut = tx.type === 'check_out';
                const isIn = tx.type === 'check_in';
                const isRet = tx.type === 'return';
                const isDmg = tx.type === 'damage';

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-purple-200 transition-all space-y-2.5 text-xs"
                  >
                    {/* Top Row: Voucher & Type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isIn
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
                        <span className="font-mono font-bold text-slate-800">{tx.voucherNumber}</span>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-bold ${isIn ? 'text-emerald-700' : 'text-indigo-700'}`}>
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
                    </div>

                    {/* Bottom Metadata & PDF Action Buttons */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{tx.time}</span>
                      </div>

                      {/* PDF Action Buttons */}
                      <div className="flex items-center gap-1.5">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
