'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  HardHat,
  Phone,
  MapPin,
  Mail,
  Receipt,
  UserCheck,
  FileText,
  Truck,
  Briefcase,
  CheckCircle2
} from 'lucide-react';
import { VendorProfile, VendorPartyType } from '@/lib/inventory/inventory-types';

interface VendorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVendor: (vendor: VendorProfile) => void;
  defaultType?: VendorPartyType;
}

export const VendorProfileDrawer: React.FC<VendorProfileDrawerProps> = ({
  isOpen,
  onClose,
  onSaveVendor,
  defaultType = 'vendor',
}) => {
  // Form State - ONLY name is compulsory as required by user!
  const [name, setName] = useState('');
  const [type, setType] = useState<VendorPartyType>(defaultType);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [trade, setTrade] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const newVendor: VendorProfile = {
      id: `ven-${Date.now()}`,
      name: name.trim(), // ONLY COMPULSORY FIELD
      type,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      location: location.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      trade: trade.trim() || undefined,
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveVendor(newVendor);
    setIsSubmitting(false);

    // Reset Form
    setName('');
    setType('vendor');
    setPhone('');
    setAddress('');
    setLocation('');
    setContactPerson('');
    setTrade('');
    setEmail('');
    setGstin('');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Create Vendor / Party Profile
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Global Directory
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Register vendor, contractor, or other party. Instantly selectable in all inventory dropdowns.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Party Type Switcher: Vendor / Contractor / Other */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700">
              Party Category / Classification
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setType('vendor')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'vendor'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Vendor</span>
              </button>

              <button
                type="button"
                onClick={() => setType('contractor')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'contractor'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Contractor</span>
              </button>

              <button
                type="button"
                onClick={() => setType('other')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'other'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Other</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              {type === 'vendor' && '• Material supplier: Appears in Goods Inward (GRN), Vendor Return, and Procurement dropdowns.'}
              {type === 'contractor' && '• Labour / sub-agency: Appears in Site Issue (MIN), Work Orders, and Dispatch dropdowns.'}
              {type === 'other' && '• Equipment rental / Consultant / Transporter: Selectable across all material and site actions.'}
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Section 1: Basic Identity */}
          <div className="space-y-3">
            {/* Vendor Name - ONLY COMPULSORY FIELD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-900">
                  Vendor / Agency / Company Name <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                  Only Compulsory Field
                </span>
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'vendor'
                    ? 'e.g. UltraTech Cement Agency / Shree Ram Traders'
                    : type === 'contractor'
                    ? 'e.g. M/S Sharma RCC Labour Gang / Apex Plumbing Contractors'
                    : 'e.g. Reliable Heavy Cranes & Logistics'
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium"
              />
            </div>

            {/* Trade / Specialization (Optional) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Trade / Line of Business (Optional)
              </label>
              <input
                type="text"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                placeholder="e.g. Bulk Cement & Sand Supply, Bar Bending & Formwork, RMC Logistics"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>

            {/* Contact Person / Foreman Name (Optional) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Person / Foreman Name (Optional)
              </label>
              <div className="relative">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Rajesh Kumar (Manager) / Ramprasad Sharma (Foreman)"
                  className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Contact & Location */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Contact & Address Details (Optional)</span>
            </div>

            {/* Phone & Email (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone / Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@agency.com"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* Location & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Location / City / Site Hub (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Navi Mumbai / Site North Gate"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  GSTIN / Tax ID (Optional)
                </label>
                <div className="relative">
                  <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AAECF5521R1ZW"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Full Physical Address (Optional)
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Gala #12, APMC Market Yard, Sector 19, Vashi, Navi Mumbai 400705"
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none"
              />
            </div>

            {/* Notes & Special Terms */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Notes & Terms (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 30 days credit terms, 24h notice for bulk transit mixer delivery"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-start gap-2.5 text-[11px] text-purple-900">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Instant Global Availability:</strong> Once saved, <strong>{name.trim() || 'this profile'}</strong> will immediately appear in all dropdowns for Inward Goods (+), Site Dispatches (-), Returns (-), and Invoicing.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Save Vendor Profile</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
