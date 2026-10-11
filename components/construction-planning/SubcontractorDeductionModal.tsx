'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator, Receipt } from 'lucide-react';
import { SubcontractorDeductionItem } from '@/lib/construction-planning/types';

interface SubcontractorDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deductions: SubcontractorDeductionItem[];
  itemSubtotal: number;
  onSave: (updated: SubcontractorDeductionItem[]) => void;
}

export const SubcontractorDeductionModal: React.FC<SubcontractorDeductionModalProps> = ({
  isOpen,
  onClose,
  deductions: initialDeductions,
  itemSubtotal,
  onSave,
}) => {
  const [items, setItems] = useState<SubcontractorDeductionItem[]>(() =>
    initialDeductions.length > 0
      ? initialDeductions
      : [
          { id: 'ded-1', name: 'TDS', amount: 0, isSelected: false },
          { id: 'ded-2', name: 'Royalty', amount: 0, isSelected: false },
          { id: 'ded-3', name: 'Stamp Duty / Registration...', amount: 0, isSelected: false },
        ]
  );
  const [newItemName, setNewItemName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const handleAmountChange = (id: string, amount: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, amount: isNaN(amount) ? 0 : amount, isSelected: amount > 0 ? true : item.isSelected } : item
      )
    );
  };

  const handleAutoTds = (id: string, percent: number) => {
    const calc = Math.round((itemSubtotal * percent) / 100);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, amount: calc, isSelected: true } : item
      )
    );
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) return;
    const newItem: SubcontractorDeductionItem = {
      id: `ded-${Date.now()}`,
      name: newItemName.trim(),
      amount: 0,
      isSelected: true,
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemName('');
    setShowAddInput(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalDeduction = items
    .filter((item) => item.isSelected)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSaveAndClose = () => {
    onSave(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Mobile: Full Screen / Desktop: Compact Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Matching Image 3 */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600" />
              Deduction
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New item</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          {showAddInput && (
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in">
              <label className="text-[11px] font-semibold text-purple-900 block">
                Custom Deduction Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Advance Recovery, Diesel, Electricity"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewItem();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 shadow-xs"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInput(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Deduction items list matching Image 3 */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.isSelected
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      id={`ded-check-${item.id}`}
                      checked={item.isSelected}
                      onChange={() => handleToggle(item.id)}
                      className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`ded-check-${item.id}`}
                        className="text-xs font-semibold text-slate-800 cursor-pointer block truncate"
                      >
                        {item.name}
                      </label>

                      {/* Quick TDS 1% / 2% presets if TDS */}
                      {item.name.toLowerCase().includes('tds') && itemSubtotal > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">Presets:</span>
                          <button
                            type="button"
                            onClick={() => handleAutoTds(item.id, 1)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded font-medium"
                          >
                            1% (₹{Math.round(itemSubtotal * 0.01).toLocaleString('en-IN')})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutoTds(item.id, 2)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded font-medium"
                          >
                            2% (₹{Math.round(itemSubtotal * 0.02).toLocaleString('en-IN')})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount Input with Currency Symbol */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-semibold text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="00"
                      value={item.amount === 0 ? '' : item.amount}
                      onChange={(e) => handleAmountChange(item.id, parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-24 text-right px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors ml-0.5"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Deductions are subtracted pre-tax from item subtotal as statutory / contractual recoveries.
          </p>
        </div>

        {/* Dashed Separator & Total Section - Matching Image 3 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 space-y-3">
          <div className="border-t border-dashed border-slate-300 pt-3 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Total Deduction</span>
            <span className="text-sm font-bold text-purple-700 font-mono">
              ₹ {totalDeduction.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};
