'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  CheckCircle2,
  RefreshCw,
  Info,
  Plus,
} from 'lucide-react';
import {
  ProfileVendor,
  createProfileVendor,
  updateProfileVendor,
} from '@/lib/supabase/profile-services';
import {
  fetchDropdownCategory,
  addCustomCategory,
} from '@/lib/supabase/category-services';
import { SearchableSelect, SearchableOption } from '@/components/common/SearchableSelect';

export const DEFAULT_PARTY_TYPES: string[] = [
  'Material Supplier',
  'Subcontractor',
  'Client / Owner',
];

export const normalizePartyTypeLabel = (rawType?: string): string => {
  if (!rawType) return 'Material Supplier';
  const lower = rawType.trim().toLowerCase();
  if (lower === 'vendor') return 'Material Supplier';
  if (lower === 'contractor') return 'Subcontractor';
  if (lower === 'client') return 'Client / Owner';
  if (lower === 'other') return 'Material Supplier';
  return rawType;
};

interface VendorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVendor?: ProfileVendor | null;
  initialName?: string;
  onSaved: (vendor: ProfileVendor, isEdit: boolean) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const VendorProfileModal: React.FC<VendorProfileModalProps> = ({
  isOpen,
  onClose,
  editingVendor = null,
  initialName = '',
  onSaved,
  showToast,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Material Supplier');
  const [partyTypes, setPartyTypes] = useState<string[]>(DEFAULT_PARTY_TYPES);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newPartyTypeInput, setNewPartyTypeInput] = useState('');
  const [isSavingPartyType, setIsSavingPartyType] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [trade, setTrade] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setIsAddingCustomType(false);
    setNewPartyTypeInput('');

    fetchDropdownCategory('party_type', DEFAULT_PARTY_TYPES).then((list) => {
      const cleaned = (list && list.length > 0 ? list : DEFAULT_PARTY_TYPES).filter(
        (t) => t.trim().toLowerCase() !== 'other' && t.trim().toLowerCase() !== 'other service'
      );
      setPartyTypes(cleaned.length > 0 ? cleaned : DEFAULT_PARTY_TYPES);
    });

    if (editingVendor) {
      setName(editingVendor.name);
      setType(normalizePartyTypeLabel(editingVendor.type));
      setPhone(editingVendor.phone || '');
      setEmail(editingVendor.email || '');
      setContactPerson(editingVendor.contact_person || '');
      setTrade(editingVendor.trade || '');
      setGstin(editingVendor.gstin || '');
      setPan(editingVendor.pan || '');
      setCity(editingVendor.city || '');
      setLocation(editingVendor.location || '');
      setAddress(editingVendor.address || '');
      setNotes(editingVendor.notes || '');
    } else {
      setName(initialName || '');
      setType('Material Supplier');
      setPhone('');
      setEmail('');
      setContactPerson('');
      setTrade('');
      setGstin('');
      setPan('');
      setCity('');
      setLocation('');
      setAddress('');
      setNotes('');
    }
  }, [isOpen, editingVendor, initialName]);

  const partyTypeOptions: SearchableOption[] = [
    ...Array.from(new Set([...partyTypes, ...(type ? [type] : [])])).map((t) => ({
      value: t,
      label: t,
    })),
    {
      value: '__create_party_type__',
      label: '+ Create Party Type...',
      isAction: true,
    },
  ];

  const handleCreatePartyType = async (customLabel?: string) => {
    const trimmed = (typeof customLabel === 'string' ? customLabel : newPartyTypeInput).trim();
    if (!trimmed) return;
    setIsSavingPartyType(true);
    try {
      const res = await addCustomCategory('party_type', trimmed, partyTypes);
      if (res.success) {
        setPartyTypes(res.categories);
        setType(trimmed);
        setNewPartyTypeInput('');
        setIsAddingCustomType(false);
        showToast?.(`Party Type "${trimmed}" saved!`, 'success');
      } else {
        setErrorMsg(res.error || 'Failed to save party type');
      }
    } finally {
      setIsSavingPartyType(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);
    const payload = {
      name: name.trim(),
      type,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      contact_person: contactPerson.trim() || undefined,
      trade: trade.trim() || undefined,
      gstin: gstin.trim() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      city: city.trim() || undefined,
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingVendor) {
        const { data, error } = await updateProfileVendor(editingVendor.id, payload);
        if (!error && data) {
          showToast?.('Vendor profile updated successfully!', 'success');
          onSaved(data, true);
          onClose();
        } else {
          const msg = error || 'Failed to update vendor profile';
          setErrorMsg(msg);
          showToast?.(msg, 'error');
        }
      } else {
        const { data, error } = await createProfileVendor(payload);
        if (!error && data) {
          showToast?.('Vendor profile created successfully in Supabase!', 'success');
          onSaved(data, false);
          onClose();
        } else {
          const msg = error || 'Failed to create vendor profile';
          setErrorMsg(msg);
          showToast?.(msg, 'error');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingVendor ? 'Edit Vendor / Party Profile' : 'New Vendor / Party Profile'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Table: profile_vendor (Profile details only, no financial amounts)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Party Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shree Cement & Building Materials Supply"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Party Type <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomType((prev) => !prev)}
                  className="text-[10px] font-bold text-[#653ef1] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create</span>
                </button>
              </div>

              {isAddingCustomType && (
                <div className="mb-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newPartyTypeInput}
                    onChange={(e) => setNewPartyTypeInput(e.target.value)}
                    placeholder="e.g. Transporter"
                    className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-purple-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreatePartyType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSavingPartyType || !newPartyTypeInput.trim()}
                    onClick={() => handleCreatePartyType()}
                    className="h-8 px-2.5 rounded-lg bg-[#653ef1] hover:bg-[#5530d9] text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isSavingPartyType ? '...' : 'Save'}
                  </button>
                </div>
              )}

              <SearchableSelect
                options={partyTypeOptions}
                value={type}
                onChange={(val) => {
                  if (val === '__create_party_type__') {
                    setIsAddingCustomType(true);
                  } else {
                    setType(val);
                  }
                }}
                onCreateOption={(newLabel) => handleCreatePartyType(newLabel)}
                placeholder="Select Party Type..."
                searchPlaceholder="Search or create party type..."
                required
              />
            </div>
          </div>

          {/* Contact Person & Trade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person / Representative
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Gupta / Ramprasad Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade / Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Ready Mix Concrete, TMT Rebar, Shuttering Gang"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98450 11982"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. sales@vendorcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          {/* GSTIN, PAN & City / Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                placeholder="e.g. 27AAECF5521R1ZW"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold uppercase text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. AAECF5521R"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold uppercase text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Operating Region
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai / Thane / Navi Mumbai"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setLocation(e.target.value);
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          {/* Office / Site Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Office / Godown Address
            </label>
            <textarea
              rows={2}
              placeholder="Street, Industrial Area, Building, Pincode..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Remarks / Profile Notes
            </label>
            <textarea
              rows={2}
              placeholder="Notes about supply reliability, working capacity, delivery terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Notice: Only profile data is stored in <code className="text-purple-700 font-bold">profile_vendor</code>. Financial rates, bill balances, and ledger payments are kept in commercial registers.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingVendor ? 'Update Profile' : 'Save Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
