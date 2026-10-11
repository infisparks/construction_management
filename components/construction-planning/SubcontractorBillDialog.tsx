'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  Plus,
  Calendar,
  Building2,
  Trash2,
  Camera,
  UploadCloud,
  FileText,
  Percent,
  Receipt,
  ShieldCheck,
  ChevronDown,
  Info,
  Edit2,
  Paperclip,
  Check
} from 'lucide-react';
import { 
  SubcontractorBill, 
  SubcontractorBillItem, 
  SubcontractorDeductionItem, 
  SubcontractorRetentionItem,
  Party,
  ConstructionTask 
} from '@/lib/construction-planning/types';
import { SubcontractorRetentionModal } from './SubcontractorRetentionModal';
import { SubcontractorDeductionModal } from './SubcontractorDeductionModal';

interface SubcontractorBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: SubcontractorBill) => void;
  billToEdit?: SubcontractorBill | null;
  parties?: Party[];
  allTasks?: ConstructionTask[];
}

export const SubcontractorBillDialog: React.FC<SubcontractorBillDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  billToEdit,
  parties = [],
  allTasks = [],
}) => {
  // Common vendors for quick selection
  const defaultVendors = useMemo(() => {
    const list = parties.filter((p) => p.category === 'subcontractor').map((p) => ({
      id: p.id,
      name: p.name,
      trade: p.trade,
      phone: p.phone,
      gstin: p.gstin,
      pan: p.pan,
      bank: p.bankDetails,
    }));
    if (!list.some((v) => v.name.includes('Apex Civil Contractors'))) {
      list.unshift({
        id: 'pty-apex',
        name: 'Apex Civil Contractors',
        trade: 'Excavation, Foundation & Plinth Works',
        phone: '+91 98201 44512',
        gstin: '27AABCS1429B1Z4',
        pan: 'AABCS1429B',
        bank: 'HDFC Bank A/C: 501002391024 / IFSC: HDFC0000128',
      });
    }
    return list;
  }, [parties]);

  // Form States
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedVendorName, setSelectedVendorName] = useState('Apex Civil Contractors');
  const [selectedVendorTrade, setSelectedVendorTrade] = useState('Excavation, Foundation & Plinth Works');
  const [selectedVendorPhone, setSelectedVendorPhone] = useState('+91 98201 44512');
  const [selectedVendorGstin, setSelectedVendorGstin] = useState('27AABCS1429B1Z4');
  const [selectedVendorPan, setSelectedVendorPan] = useState('AABCS1429B');
  const [selectedVendorBank, setSelectedVendorBank] = useState('HDFC Bank A/C: 501002391024 / IFSC: HDFC0000128');
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Item Level Tax Toggle (from Screenshot 1)
  const [itemLevelTax, setItemLevelTax] = useState(false);

  // Items List
  const [items, setItems] = useState<SubcontractorBillItem[]>([
    {
      id: 'item-1',
      name: 'Plinth work',
      unit: 'sqm',
      billedQty: 0,
      unbilledQty: 400,
      rate: 200,
      quantity: 400,
      amount: 80000,
      gstRate: 18,
    },
  ]);

  // Deductions State & Modal
  const [deductions, setDeductions] = useState<SubcontractorDeductionItem[]>([
    { id: 'ded-1', name: 'TDS', amount: 800, isSelected: true },
    { id: 'ded-2', name: 'Royalty', amount: 1200, isSelected: true },
    { id: 'ded-3', name: 'Stamp Duty / Registration...', amount: 0, isSelected: false },
  ]);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

  // Retentions State & Modal
  const [retentions, setRetentions] = useState<SubcontractorRetentionItem[]>([
    { id: 'ret-1', name: 'Performance Retention', amount: 4000, dueDate: '2026-03-31', isSelected: true },
    { id: 'ret-2', name: 'Security Deposit', amount: 2000, dueDate: '2026-06-30', isSelected: true },
  ]);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Global GST Dropdown (0%, 5%, 12%, 18%, 28%)
  const [gstRate, setGstRate] = useState<number>(0.0);

  // Additional Charges
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalChargesDesc, setAdditionalChargesDesc] = useState('');
  const [showAdditionalChargesInput, setShowAdditionalChargesInput] = useState(false);

  // Notes field (user requested)
  const [notes, setNotes] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; size?: string; type: 'image' | 'doc'; url?: string }[]>([]);

  // Initialize or Reset Form
  useEffect(() => {
    if (billToEdit) {
      setBillNumber(billToEdit.billNumber);
      setBillDate(billToEdit.billDate);
      setDueDate(billToEdit.dueDate || '');
      setSelectedVendorName(billToEdit.vendorName);
      setSelectedVendorTrade(billToEdit.vendorTrade || '');
      setSelectedVendorPhone(billToEdit.vendorPhone || '');
      setSelectedVendorGstin(billToEdit.vendorGstin || '');
      setSelectedVendorPan(billToEdit.vendorPan || '');
      setSelectedVendorBank(billToEdit.vendorBankDetails || '');
      setItemLevelTax(billToEdit.itemLevelTax || false);
      setItems(billToEdit.items || []);
      setDeductions(billToEdit.deductions || []);
      setRetentions(billToEdit.retentions || []);
      setGstRate(billToEdit.gstRate ?? 18);
      setAdditionalCharges(billToEdit.additionalCharges || 0);
      setAdditionalChargesDesc(billToEdit.additionalChargesDesc || '');
      setNotes(billToEdit.notes || '');
      setAttachments(billToEdit.attachments || []);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setBillNumber(`SB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setBillDate(today);
      setDueDate('');
      setSelectedVendorName('Apex Civil Contractors');
      setSelectedVendorTrade('Excavation, Foundation & Plinth Works');
      setSelectedVendorPhone('+91 98201 44512');
      setSelectedVendorGstin('27AABCS1429B1Z4');
      setSelectedVendorPan('AABCS1429B');
      setSelectedVendorBank('HDFC Bank A/C: 501002391024 / IFSC: HDFC0000128');
      setItemLevelTax(false);
      setItems([
        {
          id: `item-${Date.now()}`,
          name: 'Plinth work',
          unit: 'sqm',
          billedQty: 0,
          unbilledQty: 400,
          rate: 200,
          quantity: 400,
          amount: 80000,
          gstRate: 18,
        },
      ]);
      setDeductions([
        { id: 'ded-1', name: 'TDS', amount: 800, isSelected: true },
        { id: 'ded-2', name: 'Royalty', amount: 1200, isSelected: true },
        { id: 'ded-3', name: 'Stamp Duty / Registration...', amount: 0, isSelected: false },
      ]);
      setRetentions([
        { id: 'ret-1', name: 'Performance Retention', amount: 4000, dueDate: '2026-03-31', isSelected: true },
        { id: 'ret-2', name: 'Security Deposit', amount: 2000, dueDate: '2026-06-30', isSelected: true },
      ]);
      setGstRate(0.0);
      setAdditionalCharges(0);
      setAdditionalChargesDesc('');
      setNotes('Certified for plinth beam and raft casting. Subject to 28-day cube test clearance.');
      setAttachments([]);
    }
  }, [billToEdit, isOpen]);

  // Item modifications
  const handleItemChange = (index: number, field: keyof SubcontractorBillItem, value: unknown) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'rate' || field === 'quantity') {
        const rate = field === 'rate' ? Number(value) || 0 : Number(current.rate) || 0;
        const qty = field === 'quantity' ? Number(value) || 0 : Number(current.quantity) || 0;
        current.amount = Math.round(rate * qty);
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleAddItem = () => {
    const newItem: SubcontractorBillItem = {
      id: `item-${Date.now()}`,
      name: 'RCC Beam & Column Casting',
      unit: 'sqm',
      billedQty: 0,
      unbilledQty: 100,
      rate: 350,
      quantity: 100,
      amount: 35000,
      gstRate: 18,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const itemSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  const preTaxDeductionTotal = useMemo(() => {
    return deductions
      .filter((d) => d.isSelected)
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [deductions]);

  const preTaxRetentionTotal = useMemo(() => {
    return retentions
      .filter((r) => r.isSelected)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [retentions]);

  const netSubtotal = Math.max(0, itemSubtotal - preTaxDeductionTotal - preTaxRetentionTotal);

  const gstAmount = useMemo(() => {
    if (itemLevelTax) {
      return items.reduce((sum, item) => {
        const rate = item.gstRate || 0;
        return sum + Math.round((Number(item.amount || 0) * rate) / 100);
      }, 0);
    }
    return Math.round((netSubtotal * gstRate) / 100);
  }, [itemLevelTax, items, netSubtotal, gstRate]);

  const grandTotal = netSubtotal + gstAmount + Number(additionalCharges || 0);

  // File Upload Handlers (simulated + actual file reader)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'doc') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const newAtt = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type,
        url: URL.createObjectURL(file),
      };
      setAttachments((prev) => [...prev, newAtt]);
    }
  };

  // Handle Save
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();

    const savedBill: SubcontractorBill = {
      id: billToEdit?.id || `sb-${Date.now()}`,
      billNumber: billNumber.trim() || `SB-${Date.now()}`,
      billDate: billDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || undefined,
      vendorName: selectedVendorName.trim() || 'Apex Civil Contractors',
      vendorTrade: selectedVendorTrade,
      vendorPhone: selectedVendorPhone,
      vendorGstin: selectedVendorGstin,
      vendorPan: selectedVendorPan,
      vendorBankDetails: selectedVendorBank,
      itemLevelTax,
      items,
      itemSubtotal,
      deductions,
      preTaxDeductionTotal,
      retentions,
      preTaxRetentionTotal,
      netSubtotal,
      gstRate,
      gstAmount,
      additionalCharges: Number(additionalCharges) || 0,
      additionalChargesDesc,
      grandTotal,
      notes: notes.trim(),
      attachments,
      status: billToEdit?.status || 'submitted',
      createdAt: billToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(savedBill);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Main Slide-over Drawer Container */}
        <div 
          className="bg-[#F5F6F8] h-full shadow-2xl border-l border-slate-200 w-full max-w-md sm:max-w-lg md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Top Bar - Matching Screenshot 1 */}
          <div className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-indigo-900" />
              </button>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Sub-Contractor Bill
              </h2>
            </div>

            {/* Item Level Tax Switch - Matching Screenshot 1 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Item Level Tax</span>
              <button
                type="button"
                role="switch"
                aria-checked={itemLevelTax}
                onClick={() => setItemLevelTax(!itemLevelTax)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  itemLevelTax ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    itemLevelTax ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSaveBill} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
            
            {/* Card 1: Sub-Contractor Bill Details & Date - Matching Screenshot 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Sub-Contractor Bill
                  </span>
                  {!isEditingDate ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-slate-900">
                        {new Date(billDate || Date.now()).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {billNumber || 'SB-AUTO'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Bill Number"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 w-28 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingDate(!isEditingDate)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Edit Date or Bill Number"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Vendor Selection - Matching Screenshot 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Vendor
              </span>

              {!isEditingVendor ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {selectedVendorName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {selectedVendorTrade} &bull; {selectedVendorPhone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingVendor(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <select
                    value={selectedVendorName}
                    onChange={(e) => {
                      const found = defaultVendors.find((v) => v.name === e.target.value);
                      if (found) {
                        setSelectedVendorName(found.name);
                        setSelectedVendorTrade(found.trade);
                        setSelectedVendorPhone(found.phone);
                        setSelectedVendorGstin(found.gstin || '');
                        setSelectedVendorPan(found.pan || '');
                        setSelectedVendorBank(found.bank || '');
                      } else {
                        setSelectedVendorName(e.target.value);
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {defaultVendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} ({v.trade})
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or enter new vendor name..."
                      value={selectedVendorName}
                      onChange={(e) => setSelectedVendorName(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingVendor(false)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Items Header & List - Matching Screenshot 1 */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600">
                  Item ({items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>

              {/* Items Cards */}
              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3 relative group"
                  >
                    {/* Item Top Row: (X) icon, Item Title, Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="mt-0.5 text-slate-300 hover:text-rose-500 rounded-full transition-colors"
                            title="Remove item"
                          >
                            <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center hover:border-rose-400">
                              <X className="w-3 h-3" />
                            </div>
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="Enter task or item description *"
                            className="w-full text-xs font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none pb-0.5 bg-transparent"
                          />
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>Billed : {item.billedQty || 0}</span>
                            <span>|</span>
                            <div className="flex items-center gap-1">
                              <span>Un-Billed</span>
                              <input
                                type="number"
                                min="0"
                                value={item.unbilledQty || ''}
                                onChange={(e) => handleItemChange(idx, 'unbilledQty', parseFloat(e.target.value) || 0)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-14 text-center text-[11px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-700"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-700"
                              >
                                <option value="sqm">sqm</option>
                                <option value="sqft">sqft</option>
                                <option value="cum">cu.m</option>
                                <option value="nos">nos</option>
                                <option value="bags">bags</option>
                                <option value="mt">MT</option>
                                <option value="rft">Rft</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Amount */}
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          ₹ {Number(item.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Inputs Row: Unit Rate (₹) and Quantity - Matching Screenshot 1 */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Unit Rate (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate === 0 ? '' : item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="200"
                          className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="Quantity"
                          className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>

                    {/* If Item Level Tax is ON, show item GST rate */}
                    {itemLevelTax && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Item GST Rate:</span>
                        <select
                          value={item.gstRate || 0}
                          onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value))}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                        >
                          <option value="0">0.0% GST (Nil)</option>
                          <option value="5">5.0% GST</option>
                          <option value="12">12.0% GST</option>
                          <option value="18">18.0% GST</option>
                          <option value="28">28.0% GST</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown Card - Matching Screenshot 1 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              
              {/* Item Subtotal */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Item Subtotal</span>
                <span className="font-mono font-bold">
                  ₹ {itemSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* + Pre Tax Deduction (Clickable -> Opens Deduction Modal) */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsDeductionModalOpen(true)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pre Tax Deduction</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {preTaxDeductionTotal > 0 ? `- ₹ ${preTaxDeductionTotal.toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {/* + Pre Tax Retention (Clickable -> Opens Retention Modal) */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsRetentionModalOpen(true)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pre Tax Retention</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {preTaxRetentionTotal > 0 ? `- ₹ ${preTaxRetentionTotal.toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {/* Net Subtotal */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-100">
                <span>Net Subtotal</span>
                <span className="font-mono">
                  ₹ {netSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* GST Row - Matching Screenshot 1 */}
              {!itemLevelTax ? (
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">GST</span>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(parseFloat(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="0.0">0.0%</option>
                      <option value="5.0">5.0%</option>
                      <option value="12.0">12.0%</option>
                      <option value="18.0">18.0%</option>
                      <option value="28.0">28.0%</option>
                    </select>
                  </div>
                  <span className="font-mono font-semibold text-slate-700">
                    ₹ {gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-700">GST (Item Level Combined)</span>
                  <span className="font-mono font-semibold text-slate-700">
                    ₹ {gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* + Additional Charges Row - Matching Screenshot 1 */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowAdditionalChargesInput(!showAdditionalChargesInput)}
                  className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Additional Charges</span>
                </button>
                <span className="font-mono font-semibold text-slate-700">
                  {additionalCharges > 0 ? `+ ₹ ${Number(additionalCharges).toLocaleString('en-IN')}` : '₹ 0'}
                </span>
              </div>

              {showAdditionalChargesInput && (
                <div className="p-2.5 bg-slate-50 rounded-lg space-y-2 border border-slate-200 animate-in fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Charges description (e.g. Hoist / Crane / Loading)"
                      value={additionalChargesDesc}
                      onChange={(e) => setAdditionalChargesDesc(e.target.value)}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Amount"
                      value={additionalCharges === 0 ? '' : additionalCharges}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-24 text-right text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Total Net Payable</span>
                  <span className="text-[10px] text-slate-400">Includes all taxes and recoveries</span>
                </div>
                <span className="text-base font-extrabold text-purple-700 font-mono">
                  ₹ {grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Note Section (User requirement: "and we can add note also") */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Bill Notes & Engineer Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add bill notes, measurement book reference, remarks, payment instructions..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Attached Files ({attachments.length})
                </span>
                <div className="space-y-1.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
                        {att.size && <span className="text-[10px] text-slate-400">({att.size})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Bar: Camera icon, Cloud upload icon, Save button - Matching Screenshot 1 */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {/* Media upload buttons */}
              <div className="flex items-center gap-2">
                {/* Photo upload */}
                <label 
                  className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-purple-600 transition-colors cursor-pointer shadow-xs"
                  title="Take or Attach Site Measurement Photo"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'image')}
                  />
                </label>

                {/* Document upload */}
                <label 
                  className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-purple-600 transition-colors cursor-pointer shadow-xs"
                  title="Upload Bill / Work Order Document"
                >
                  <UploadCloud className="w-5 h-5" />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'doc')}
                  />
                </label>
              </div>

              {/* Solid Purple Save Button - Matching Screenshot 1 */}
              <button
                type="submit"
                className="flex-1 py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all text-center cursor-pointer"
              >
                Save
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Subcontractor Retention Modal */}
      <SubcontractorRetentionModal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
        retentions={retentions}
        onSave={(updated) => setRetentions(updated)}
      />

      {/* Subcontractor Deduction Modal */}
      <SubcontractorDeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        deductions={deductions}
        itemSubtotal={itemSubtotal}
        onSave={(updated) => setDeductions(updated)}
      />
    </>
  );
};
