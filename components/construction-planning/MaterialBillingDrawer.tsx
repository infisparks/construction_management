'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Receipt,
  Users2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Building,
  Phone,
  FileText,
  DollarSign,
  Search,
  Filter,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Calculator,
  HardHat,
  Truck,
  Check
} from 'lucide-react';
import { 
  MaterialItem, 
  MaterialTransaction, 
  Party, 
  Bill, 
  ConstructionTask 
} from '@/lib/construction-planning/types';
import { 
  INITIAL_MATERIALS, 
  INITIAL_PARTIES, 
  INITIAL_BILLS, 
  INITIAL_TRANSACTIONS 
} from '@/lib/construction-planning/mock-materials-billing';

interface MaterialBillingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: ConstructionTask[];
  initialTab?: 'materials' | 'parties' | 'billing';
  onOpenSubcontractorBills?: () => void;
}

export const MaterialBillingDrawer: React.FC<MaterialBillingDrawerProps> = ({
  isOpen,
  onClose,
  allTasks,
  initialTab = 'materials',
  onOpenSubcontractorBills,
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'parties' | 'billing'>(initialTab);

  // Live state
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>(INITIAL_TRANSACTIONS);
  const [parties, setParties] = useState<Party[]>(INITIAL_PARTIES);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);

  // Sub-view forms
  const [showIssueMaterialForm, setShowIssueMaterialForm] = useState(false);
  const [showInwardForm, setShowInwardForm] = useState(false);
  const [showAddPartyForm, setShowAddPartyForm] = useState(false);
  const [showAddBillForm, setShowAddBillForm] = useState(false);

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Material Issue Form state
  const [issueMaterialId, setIssueMaterialId] = useState(materials[0]?.id || '');
  const [issueQty, setIssueQty] = useState<number>(50);
  const [issueTaskId, setIssueTaskId] = useState(allTasks[0]?.id || '');
  const [issueContractorId, setIssueContractorId] = useState(parties.find(p => p.category === 'subcontractor')?.id || '');
  const [issueNotes, setIssueNotes] = useState('Issued for 3rd floor casting');

  // Goods Inward Form state
  const [inwardMaterialId, setInwardMaterialId] = useState(materials[0]?.id || '');
  const [inwardQty, setInwardQty] = useState<number>(200);
  const [inwardSupplierId, setInwardSupplierId] = useState(parties.find(p => p.category === 'material_supplier')?.id || '');
  const [inwardChallan, setInwardChallan] = useState('MH-04-CH-9921');
  const [inwardRate, setInwardRate] = useState<number>(385);

  // New Party Form state
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyCategory, setNewPartyCategory] = useState<'subcontractor' | 'material_supplier' | 'equipment_rental'>('subcontractor');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyTrade, setNewPartyTrade] = useState('');
  const [newPartyOpeningBal, setNewPartyOpeningBal] = useState<number>(0);

  // New Bill Form state
  const [billPartyId, setBillPartyId] = useState(parties[0]?.id || '');
  const [billNumber, setBillNumber] = useState(`BILL-2026-${bills.length + 10}`);
  const [billType, setBillType] = useState<'ra_bill_labour' | 'material_purchase' | 'equipment_hire'>('ra_bill_labour');
  const [billDesc, setBillDesc] = useState('');
  const [billBaseAmount, setBillBaseAmount] = useState<number>(100000);
  const [billGstRate, setBillGstRate] = useState<0 | 5 | 12 | 18 | 28>(18);
  const [billTdsPercent, setBillTdsPercent] = useState<number>(1);
  const [billPaidNow, setBillPaidNow] = useState<number>(50000);
  const [billPaymentMode, setBillPaymentMode] = useState<'neft_rtgs' | 'upi' | 'cheque' | 'cash'>('neft_rtgs');
  const [billDirectPartyName, setBillDirectPartyName] = useState('');
  const [isCreatingPartyDirectly, setIsCreatingPartyDirectly] = useState(false);

  // Calculations for active bill form
  const billGstAmount = Math.round((billBaseAmount * billGstRate) / 100);
  const billTotalWithGst = billBaseAmount + billGstAmount;
  const billTdsAmount = Math.round((billBaseAmount * billTdsPercent) / 100);
  const billNetPayable = billTotalWithGst - billTdsAmount;
  const billBalanceDue = Math.max(0, billNetPayable - billPaidNow);

  // Summary Metrics
  const totalStockValue = useMemo(() => {
    return materials.reduce((acc, m) => acc + (m.currentStock * m.averageUnitRate), 0);
  }, [materials]);

  const lowStockCount = useMemo(() => {
    return materials.filter(m => m.currentStock <= m.minimumAlertStock).length;
  }, [materials]);

  const totalBilled = useMemo(() => {
    return bills.reduce((acc, b) => acc + b.totalAmountWithGst, 0);
  }, [bills]);

  const totalPaid = useMemo(() => {
    return bills.reduce((acc, b) => acc + b.amountPaid, 0);
  }, [bills]);

  const totalOutstandingDue = useMemo(() => {
    return bills.reduce((acc, b) => acc + b.balanceDue, 0);
  }, [bills]);

  if (!isOpen) return null;

  // Handlers
  const handleIssueMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find(m => m.id === issueMaterialId);
    if (!mat) return;
    if (mat.currentStock < issueQty) {
      alert(`Insufficient stock! Available: ${mat.currentStock} ${mat.unit}`);
      return;
    }

    const task = allTasks.find(t => t.id === issueTaskId);
    const contractor = parties.find(p => p.id === issueContractorId);

    const newTx: MaterialTransaction = {
      id: `tx-${Date.now()}`,
      type: 'outward',
      materialId: mat.id,
      materialName: mat.name,
      quantity: issueQty,
      unit: mat.unit,
      date: new Date().toISOString().split('T')[0],
      taskId: task?.id,
      taskCode: task?.code,
      taskName: task?.name,
      floor: task?.floor,
      contractorPartyId: contractor?.id,
      contractorPartyName: contractor?.name,
      recordedBy: 'Site Engineer (Active)',
      notes: issueNotes,
    };

    // Deduct stock
    setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, currentStock: m.currentStock - issueQty } : m));
    setTransactions(prev => [newTx, ...prev]);
    setShowIssueMaterialForm(false);
  };

  const handleInwardMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find(m => m.id === inwardMaterialId);
    if (!mat) return;
    const supplier = parties.find(p => p.id === inwardSupplierId);

    const newTx: MaterialTransaction = {
      id: `tx-${Date.now()}`,
      type: 'inward',
      materialId: mat.id,
      materialName: mat.name,
      quantity: inwardQty,
      unit: mat.unit,
      date: new Date().toISOString().split('T')[0],
      supplierPartyId: supplier?.id,
      supplierPartyName: supplier?.name,
      vehicleChallanNo: inwardChallan,
      unitRate: inwardRate,
      totalAmount: inwardQty * inwardRate,
      recordedBy: 'Storekeeper (Site GRN)',
      notes: 'Received into site godown.',
    };

    // Add stock
    setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, currentStock: m.currentStock + inwardQty } : m));
    setTransactions(prev => [newTx, ...prev]);
    setShowInwardForm(false);
  };

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    const newPty: Party = {
      id: `pty-${Date.now()}`,
      name: newPartyName.trim(),
      category: newPartyCategory,
      phone: newPartyPhone.trim() || 'N/A',
      gstin: newPartyGstin.trim(),
      trade: newPartyTrade.trim() || 'General Contractor',
      totalBilledAmount: newPartyOpeningBal,
      totalPaidAmount: 0,
      currentBalanceDue: newPartyOpeningBal,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setParties(prev => [...prev, newPty]);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
    setNewPartyTrade('');
    setShowAddPartyForm(false);
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    let selectedParty = parties.find(p => p.id === billPartyId);

    // Direct party creation on the fly
    if (isCreatingPartyDirectly && billDirectPartyName.trim()) {
      const directParty: Party = {
        id: `pty-${Date.now()}`,
        name: billDirectPartyName.trim(),
        category: billType === 'material_purchase' ? 'material_supplier' : 'subcontractor',
        phone: 'N/A',
        trade: 'Direct Created Party',
        totalBilledAmount: 0,
        totalPaidAmount: 0,
        currentBalanceDue: 0,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setParties(prev => [...prev, directParty]);
      selectedParty = directParty;
    }

    if (!selectedParty) return;

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      billNumber: billNumber.trim(),
      billDate: new Date().toISOString().split('T')[0],
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyCategory: selectedParty.category,
      billType,
      description: billDesc.trim() || `${selectedParty.name} - Billing Entry`,
      baseAmount: billBaseAmount,
      gstRate: billGstRate,
      gstAmount: billGstAmount,
      totalAmountWithGst: billTotalWithGst,
      tdsDeduction: billTdsAmount,
      netPayable: billNetPayable,
      amountPaid: billPaidNow,
      balanceDue: billBalanceDue,
      paymentStatus: billBalanceDue === 0 ? 'paid' : billPaidNow > 0 ? 'partial' : 'unpaid',
      paymentMode: billPaymentMode,
      paymentDate: billPaidNow > 0 ? new Date().toISOString().split('T')[0] : undefined,
      notes: `Generated with ${billGstRate}% GST. Certified by site manager.`,
    };

    // Update bills and party balance
    setBills(prev => [newBill, ...prev]);
    setParties(prev => prev.map(p => {
      if (p.id === selectedParty?.id) {
        return {
          ...p,
          totalBilledAmount: p.totalBilledAmount + billTotalWithGst,
          totalPaidAmount: p.totalPaidAmount + billPaidNow,
          currentBalanceDue: p.currentBalanceDue + billBalanceDue,
        };
      }
      return p;
    }));

    setShowAddBillForm(false);
    setIsCreatingPartyDirectly(false);
    setBillDirectPartyName('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Site Materials, Parties & Billing
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Powerplay / Onsite Standard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track site stock consumption, manage vendor & labour khata, and generate bills with multi-tier GST (0% to 28%).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Analysis Callout */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => {
                setActiveTab('materials');
                setShowIssueMaterialForm(false);
                setShowInwardForm(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'materials'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Material Store & Stock ({materials.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('parties');
                setShowAddPartyForm(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'parties'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Parties & Khata ({parties.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('billing');
                setShowAddBillForm(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'billing'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bills & GST ({bills.length})</span>
            </button>

            {onOpenSubcontractorBills && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubcontractorBills();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer"
                title="Open Subcontractor RA Bills"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Sub-Contractor Bills</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden md:inline-flex items-center gap-1 font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Direct Khata & GST 0% to 28%
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: MATERIALS STORE & CONSUMPTION */}
          {/* ========================================================================= */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Godown Stock Value</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    ₹{(totalStockValue / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Catalog Items</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    {materials.length} Materials
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-800 block">Low Stock Alert</span>
                  <span className="text-base sm:text-lg font-bold text-amber-900 font-mono">
                    {lowStockCount} Items Below Threshold
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Total Issued to Date</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
                    {transactions.filter(t => t.type === 'outward').length} Outward Logs
                  </span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Site Store Actions:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowIssueMaterialForm(true);
                      setShowInwardForm(false);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Issue Material to Work</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowInwardForm(true);
                      setShowIssueMaterialForm(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Receive Goods (GRN Inward)</span>
                  </button>
                </div>
              </div>

              {/* Issue Material Form Slide-down */}
              {showIssueMaterialForm && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                        Issue Material / Record Outward Consumption
                      </h4>
                    </div>
                    <button onClick={() => setShowIssueMaterialForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleIssueMaterial} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Material *</label>
                      <select
                        value={issueMaterialId}
                        onChange={(e) => setIssueMaterialId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.currentStock} {m.unit} in store)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Quantity to Issue *</label>
                      <input
                        type="number"
                        min={1}
                        value={issueQty}
                        onChange={(e) => setIssueQty(parseFloat(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Link to WBS Task *</label>
                      <select
                        value={issueTaskId}
                        onChange={(e) => setIssueTaskId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {allTasks.filter(t => t.type !== 'work_package').map(t => (
                          <option key={t.id} value={t.id}>
                            {t.code} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Contractor / Gang</label>
                      <select
                        value={issueContractorId}
                        onChange={(e) => setIssueContractorId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {parties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.trade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-700 font-semibold mb-1">Site Location / Notes</label>
                      <input
                        type="text"
                        value={issueNotes}
                        onChange={(e) => setIssueNotes(e.target.value)}
                        placeholder="e.g. 3rd floor column casting, mixer shift #1"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-2xs"
                      >
                        Confirm & Deduct Stock
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Goods Inward GRN Form */}
              {showInwardForm && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Goods Inward / Receive Delivery from Supplier (GRN)
                      </h4>
                    </div>
                    <button onClick={() => setShowInwardForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleInwardMaterial} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Material *</label>
                      <select
                        value={inwardMaterialId}
                        onChange={(e) => setInwardMaterialId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Supplier Party *</label>
                      <select
                        value={inwardSupplierId}
                        onChange={(e) => setInwardSupplierId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {parties.filter(p => p.category === 'material_supplier').map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Quantity Received *</label>
                      <input
                        type="number"
                        min={1}
                        value={inwardQty}
                        onChange={(e) => setInwardQty(parseFloat(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Vehicle / Challan No.</label>
                      <input
                        type="text"
                        value={inwardChallan}
                        onChange={(e) => setInwardChallan(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="flex items-end sm:col-span-4 justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInwardForm(false)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-2xs"
                      >
                        Add to Site Stock (GRN Entry)
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Current Site Stock Catalog Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-800">Current Site Godown Stock</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Live balance across all bays
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item Code & Name</th>
                        <th className="py-2.5 px-2">Category</th>
                        <th className="py-2.5 px-2 text-right">Current Stock</th>
                        <th className="py-2.5 px-2 text-right">Avg Rate (₹)</th>
                        <th className="py-2.5 px-2 text-right">Stock Value (₹)</th>
                        <th className="py-2.5 px-2 text-center">GST Rate</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.map((m) => {
                        const isLow = m.currentStock <= m.minimumAlertStock;
                        const stockValue = m.currentStock * m.averageUnitRate;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[10px] text-slate-400 block">{m.code}</span>
                              <strong className="text-slate-800">{m.name}</strong>
                            </td>
                            <td className="py-2.5 px-2 text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium border border-slate-200">
                                {m.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                              {m.currentStock.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{m.unit}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                              ₹{m.averageUnitRate.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">
                              ₹{Math.round(stockValue).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                                {m.gstRate}%
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                                  Healthy
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Movement Ledger */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Site Stock Movement Ledger (Inward & Outward)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Chronological site entries</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          tx.type === 'inward' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {tx.type === 'inward' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{tx.materialName}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                              tx.type === 'inward' ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-800'
                            }`}>
                              {tx.type === 'inward' ? 'Received (GRN)' : 'Issued to Work'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {tx.type === 'inward' ? `Supplier: ${tx.supplierPartyName || 'Local Supplier'} • Challan: ${tx.vehicleChallanNo || 'N/A'}` : `Task: ${tx.taskName || 'General Site'} • Contractor: ${tx.contractorPartyName || 'Site Gang'}`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold ${tx.type === 'inward' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                          {tx.type === 'inward' ? '+' : '-'}{tx.quantity} {tx.unit}
                        </span>
                        <span className="block text-[10px] text-slate-400">{tx.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PARTIES & KHATA PROFILE */}
          {/* ========================================================================= */}
          {activeTab === 'parties' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Active Parties</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    {parties.length} Vendors & Labour
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Billed Khata</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    ₹{(parties.reduce((a, b) => a + b.totalBilledAmount, 0) / 100000).toFixed(2)} L
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Total Payments Paid</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
                    ₹{(parties.reduce((a, b) => a + b.totalPaidAmount, 0) / 100000).toFixed(2)} L
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[11px] font-semibold text-rose-800 block">Total Outstanding Balance</span>
                  <span className="text-base sm:text-lg font-bold text-rose-700 font-mono">
                    ₹{(parties.reduce((a, b) => a + b.currentBalanceDue, 0) / 100000).toFixed(2)} L
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Parties Master Directory:</span>
                </div>
                <button
                  onClick={() => setShowAddPartyForm(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Party</span>
                </button>
              </div>

              {/* Add Party Form */}
              {showAddPartyForm && (
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                      Create Party Profile (Subcontractor / Supplier / Rental)
                    </h4>
                    <button onClick={() => setShowAddPartyForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddParty} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Party Name / Agency *</label>
                      <input
                        type="text"
                        required
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        placeholder="e.g. M/S Ali Electrical Contractors"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Party Category *</label>
                      <select
                        value={newPartyCategory}
                        onChange={(e) => setNewPartyCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="subcontractor">Subcontractor (Labour Gang)</option>
                        <option value="material_supplier">Material Supplier (Vendor)</option>
                        <option value="equipment_rental">Equipment / Plant Rental</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={newPartyPhone}
                        onChange={(e) => setNewPartyPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Trade / Specialization</label>
                      <input
                        type="text"
                        value={newPartyTrade}
                        onChange={(e) => setNewPartyTrade(e.target.value)}
                        placeholder="e.g. Brickwork & AAC Blocks"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">GSTIN (Optional / Blank for 0% Labour)</label>
                      <input
                        type="text"
                        value={newPartyGstin}
                        onChange={(e) => setNewPartyGstin(e.target.value)}
                        placeholder="27AABCS1429B1Z4"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Opening Balance (₹)</label>
                      <input
                        type="number"
                        value={newPartyOpeningBal}
                        onChange={(e) => setNewPartyOpeningBal(parseFloat(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPartyForm(false)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-2xs"
                      >
                        Save Party Profile
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Parties Directory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {parties.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</h4>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{p.trade}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.category === 'subcontractor' 
                          ? 'bg-purple-100 text-purple-800' 
                          : p.category === 'material_supplier' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Billed</span>
                        <strong className="text-slate-800 font-mono">₹{p.totalBilledAmount.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Paid</span>
                        <strong className="text-emerald-700 font-mono">₹{p.totalPaidAmount.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Balance Due</span>
                        <strong className={`font-mono font-bold ${p.currentBalanceDue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          ₹{p.currentBalanceDue.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone}</span>
                        {p.gstin && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 border border-slate-200">
                            GST: {p.gstin}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setBillPartyId(p.id);
                          setActiveTab('billing');
                          setShowAddBillForm(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>+ New Bill</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BILLING & INVOICES WITH 0% TO 28% GST */}
          {/* ========================================================================= */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Bills Raised</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    ₹{(totalBilled / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Total Paid Out</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
                    ₹{(totalPaid / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[11px] font-semibold text-rose-800 block">Pending Outstanding</span>
                  <span className="text-base sm:text-lg font-bold text-rose-700 font-mono">
                    ₹{(totalOutstandingDue / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[11px] font-semibold text-indigo-800 block">GST Input / Claim</span>
                  <span className="text-base sm:text-lg font-bold text-indigo-900 font-mono">
                    ₹{(bills.reduce((a, b) => a + b.gstAmount, 0) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Invoices & Payment Vouchers:</span>
                </div>
                <button
                  onClick={() => setShowAddBillForm(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create New Bill (With GST)</span>
                </button>
              </div>

              {/* Create Bill Form with All GST options (0% to 28%) and Direct Party creation */}
              {showAddBillForm && (
                <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 shadow-sm animate-in fade-in duration-150 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-indigo-700" />
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                        Create Bill / RA Voucher (Supports 0%, 5%, 12%, 18%, 28% GST)
                      </h4>
                    </div>
                    <button onClick={() => setShowAddBillForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
                    {/* Row 1: Party Selection OR Direct Create Party */}
                    <div className="p-3 rounded-xl bg-white border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-800 font-bold">Party / Payee Details *</label>
                        <button
                          type="button"
                          onClick={() => setIsCreatingPartyDirectly(!isCreatingPartyDirectly)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] hover:underline"
                        >
                          {isCreatingPartyDirectly ? '← Select Existing Party' : '+ Create Party Directly Here'}
                        </button>
                      </div>

                      {isCreatingPartyDirectly ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            value={billDirectPartyName}
                            onChange={(e) => setBillDirectPartyName(e.target.value)}
                            placeholder="Type new party / contractor name directly..."
                            className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50/40 text-slate-800 font-medium"
                          />
                          <span className="text-[10px] text-slate-500 self-center">
                            A new profile will be auto-saved into your Parties Directory immediately upon saving this bill.
                          </span>
                        </div>
                      ) : (
                        <select
                          value={billPartyId}
                          onChange={(e) => setBillPartyId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                        >
                          {parties.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.trade}) {p.gstin ? `• GST: ${p.gstin}` : '• No GST (0% Labour)'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Row 2: Bill Number, Type & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Invoice / Voucher No. *</label>
                        <input
                          type="text"
                          required
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Bill Nature *</label>
                        <select
                          value={billType}
                          onChange={(e) => setBillType(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="ra_bill_labour">Subcontractor Labour RA Bill</option>
                          <option value="material_purchase">Material Purchase Invoice</option>
                          <option value="equipment_hire">Machinery & Plant Hire</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Description / Measurement</label>
                        <input
                          type="text"
                          value={billDesc}
                          onChange={(e) => setBillDesc(e.target.value)}
                          placeholder="e.g. 3rd floor slab shuttering measurement"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    {/* Row 3: Base Amount, GST Rate (All tiers), and TDS */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Base Amount (₹) *</label>
                        <input
                          type="number"
                          min={0}
                          value={billBaseAmount}
                          onChange={(e) => setBillBaseAmount(parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          GST Rate (All Types Supported) *
                        </label>
                        <select
                          value={billGstRate}
                          onChange={(e) => setBillGstRate(parseInt(e.target.value) as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-indigo-700"
                        >
                          <option value={0}>0% (Nil Rated / Exempt / RCM Labour)</option>
                          <option value={5}>5% (Sand, Aggregates, Freight)</option>
                          <option value={12}>12% (AAC Blocks / Select Works)</option>
                          <option value={18}>18% (Standard Works Contract / Steel / MEP)</option>
                          <option value={28}>28% (Cement Standard GST Rate)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">TDS Contractor Deduction</label>
                        <select
                          value={billTdsPercent}
                          onChange={(e) => setBillTdsPercent(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <option value={0}>0% No TDS</option>
                          <option value={1}>1% TDS (Individual Contractor)</option>
                          <option value={2}>2% TDS (Company / LLP)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Calculation Preview Card */}
                    <div className="p-3.5 rounded-xl bg-indigo-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Base Value:</span>
                        <span className="font-mono font-bold text-sm">₹{billBaseAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">GST ({billGstRate}%):</span>
                        <span className="font-mono font-bold text-sm text-indigo-300">+₹{billGstAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">TDS Deduction:</span>
                        <span className="font-mono font-bold text-sm text-rose-300">-₹{billTdsAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Net Payable:</span>
                        <span className="font-mono font-bold text-sm text-emerald-400">₹{billNetPayable.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Row 4: Payment Recording */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Amount Paid Now (₹)</label>
                        <input
                          type="number"
                          min={0}
                          max={billNetPayable}
                          value={billPaidNow}
                          onChange={(e) => setBillPaidNow(parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Payment Mode</label>
                        <select
                          value={billPaymentMode}
                          onChange={(e) => setBillPaymentMode(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="neft_rtgs">NEFT / RTGS Bank Transfer</option>
                          <option value="upi">UPI / Instant Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Site Cash Petty</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Remaining Balance Due</label>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-rose-600">
                          ₹{billBalanceDue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                      <button
                        type="button"
                        onClick={() => setShowAddBillForm(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                      >
                        Submit & Save Bill
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bills Master Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-800">All Site Invoices & Vouchers</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    With GST compliance & balance tracking
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Voucher # & Date</th>
                        <th className="py-2.5 px-2">Party / Payee</th>
                        <th className="py-2.5 px-2 text-right">Base (₹)</th>
                        <th className="py-2.5 px-2 text-center">GST Rate</th>
                        <th className="py-2.5 px-2 text-right">Total with GST (₹)</th>
                        <th className="py-2.5 px-2 text-right">Paid (₹)</th>
                        <th className="py-2.5 px-2 text-right">Balance Due (₹)</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-900 font-mono block">{bill.billNumber}</strong>
                            <span className="text-[10px] text-slate-400">{bill.billDate}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="font-semibold text-slate-800 block">{bill.partyName}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-xs block">{bill.description}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            ₹{bill.baseAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              bill.gstRate === 0 
                                ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                                : bill.gstRate === 28 
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {bill.gstRate}% {bill.gstRate === 0 ? 'Exempt' : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            ₹{bill.totalAmountWithGst.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-700 font-semibold">
                            ₹{bill.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            {bill.balanceDue > 0 ? (
                              <span className="text-rose-600">₹{bill.balanceDue.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {bill.paymentStatus === 'paid' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                Fully Paid
                              </span>
                            )}
                            {bill.paymentStatus === 'partial' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Partial Due
                              </span>
                            )}
                            {bill.paymentStatus === 'unpaid' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>Powerplay / Onsite Architecture: Materials and Subcontractor Billing are decoupled from task progress logs.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
};
