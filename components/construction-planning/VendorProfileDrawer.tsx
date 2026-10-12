'use client';

import React, { useState } from 'react';
import { X, Building2, Phone, FileText, CreditCard, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { createProfileVendor, ProfileVendor } from '@/lib/supabase/profile-services';

interface VendorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: (vendor: ProfileVendor) => void;
  initialName?: string;
}

export const VendorProfileDrawer: React.FC<VendorProfileDrawerProps> = ({
  isOpen,
  onClose,
  onVendorCreated,
  initialName = '',
}) => {
  const [name, setName] = useState(initialName || '');
  const [trade, setTrade] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const vendorName = name.trim() || 'Apex Civil Contractors';
    setIsSaving(true);

    try {
      // Build combined bank details string if any bank info is entered
      let bankDetails: string | undefined = undefined;
      if (bankName.trim() || bankAccount.trim() || bankIfsc.trim()) {
        const parts = [];
        if (bankName.trim()) parts.push(bankName.trim());
        if (bankAccount.trim()) parts.push(`A/C: ${bankAccount.trim()}`);
        if (bankIfsc.trim()) parts.push(`IFSC: ${bankIfsc.trim()}`);
        bankDetails = parts.join(' / ');
      }

      const { data, error: createError } = await createProfileVendor({
        name: vendorName,
        type: 'contractor',
        trade: trade.trim() || undefined,
        phone: phone.trim() || undefined,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        bank_account: bankAccount.trim() || undefined,
        bank_ifsc: bankIfsc.trim() || undefined,
        bank_details: bankDetails,
        is_active: true,
      });

      if (createError) {
        // Fallback vendor object if database offline
        const fallbackVendor: ProfileVendor = {
          id: `ven-${Date.now()}`,
          name: vendorName,
          type: 'contractor',
          trade: trade.trim() || undefined,
          phone: phone.trim() || undefined,
          gstin: gstin.trim() || undefined,
          pan: pan.trim() || undefined,
          bank_name: bankName.trim() || undefined,
          bank_account: bankAccount.trim() || undefined,
          bank_ifsc: bankIfsc.trim() || undefined,
          bank_details: bankDetails,
          is_active: true,
        };
        onVendorCreated(fallbackVendor);
        onClose();
        return;
      }

      if (data) {
        onVendorCreated(data);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to create vendor profile:', err);
      setError(err?.message || 'Failed to save vendor profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-60 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Create Vendor Profile
              </h3>
              <p className="text-[11px] text-slate-500">
                Subcontractor details (all optional)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} id="vendor-create-form" className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-[11px] flex items-start gap-2 leading-relaxed">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              <strong>Smart Auto-Print:</strong> Any details you enter below will automatically appear on Subcontractor Bills and PDF invoices. If left empty, it will be omitted from prints.
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* 1. Vendor Name */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold text-[11px]">
              Subcontractor / Business Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apex Civil Contractors"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* 2. Trade / Work */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold text-[11px]">
              Trade / Scope of Work
            </label>
            <input
              type="text"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="Excavation, Foundation & Plinth Works"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* 3. Phone */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold text-[11px] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Phone Number</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98201 44512"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* 4. GSTIN & PAN */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold text-[11px] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>GSTIN</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AABCS1429B1Z4"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold text-[11px]">
                PAN Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                placeholder="AABCS1429B"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* 5. Bank Account Details */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
              <span>Bank Payment Details</span>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-600 text-[11px]">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-slate-600 text-[11px]">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="501002391024"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 text-[11px]">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  placeholder="HDFC0000128"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vendor-create-form"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save & Auto-Select Vendor</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
