'use client';

import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Calendar, 
  Calculator, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  HardHat,
  MapPin
} from 'lucide-react';
import { MaterialTransaction, ConstructionTask } from '@/lib/construction-planning/types';
import { fetchProfileProducts, fetchProfileVendors, ProfileProduct, ProfileVendor } from '@/lib/supabase/profile-services';

interface LogMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ConstructionTask;
  onSave: (tx: MaterialTransaction) => void;
}

export const LogMaterialModal: React.FC<LogMaterialModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
}) => {
  const [products, setProducts] = useState<ProfileProduct[]>([]);
  const [vendors, setVendors] = useState<ProfileVendor[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [consumptionDate, setConsumptionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [contractorName, setContractorName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchProfileProducts().then((prods) => {
      if (prods && prods.length > 0) {
        setProducts(prods);
        setSelectedMaterialId(prods[0].id);
      }
    });
    fetchProfileVendors().then((vends) => {
      if (vends && vends.length > 0) {
        setVendors(vends);
        setContractorName(vends[0].name);
      }
    });
  }, []);

  if (!isOpen) return null;

  const selectedMaterial = products.find((m) => m.id === selectedMaterialId) || products[0];
  const estimatedCost = selectedMaterial ? quantity * 0 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('Quantity consumed must be greater than 0.');
      return;
    }

    if (!selectedMaterial) {
      setError('Please select a valid material.');
      return;
    }

    const newTx: MaterialTransaction = {
      id: `tx-${Date.now()}`,
      type: 'outward',
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      quantity,
      unit: selectedMaterial.unit || 'units',
      date: consumptionDate,
      taskId: task.id,
      taskCode: task.code,
      taskName: task.name,
      floor: task.floor,
      contractorPartyName: contractorName,
      unitRate: 0,
      totalAmount: estimatedCost,
      recordedBy: 'Er. Amit Verma',
      notes: notes.trim() || undefined,
    };

    onSave(newTx);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Log Material Consumption
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Activity: <strong className="text-slate-800">{task.code} {task.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Material Catalog Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
              Select Material *
            </label>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {products.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category || 'Material'}) — {m.unit || 'units'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Quantity & Date (2-column layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                Quantity Consumed *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="ml-2 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-xs shrink-0 border border-slate-200">
                  {selectedMaterial?.unit || 'units'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                Consumption Date *
              </label>
              <input
                type="date"
                required
                value={consumptionDate}
                onChange={(e) => setConsumptionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 3. Contractor / Labour Gang */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
              Subcontractor / Labour Gang
            </label>
            <select
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {vendors.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} {p.trade ? `(${p.trade})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Pour Notes / Location */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
              Pour Notes / Location Details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cast slab grid B1-B5, mixer batch #2"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 5. Live Estimated Cost Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-[11px] text-slate-600 block">Quantity to consume:</span>
                <span className="font-mono text-sm font-bold text-indigo-900">
                  {quantity} {selectedMaterial?.unit || 'units'}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Material: {selectedMaterial?.name || 'N/A'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Material Consumption</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
