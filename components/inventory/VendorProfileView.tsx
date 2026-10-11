'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Tag,
  Receipt,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Info,
  UserPlus,
  Briefcase
} from 'lucide-react';
import {
  ProfileVendor,
  fetchProfileVendors,
  createProfileVendor,
  updateProfileVendor,
  deleteProfileVendor,
} from '@/lib/supabase/profile-services';

interface VendorProfileViewProps {
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const VendorProfileView: React.FC<VendorProfileViewProps> = ({
  showToast,
}) => {
  const [vendors, setVendors] = useState<ProfileVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'contractor' | 'client' | 'other'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ProfileVendor | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'vendor' | 'contractor' | 'client' | 'other'>('vendor');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [trade, setTrade] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load from Supabase profile_vendor table
  const loadVendors = async () => {
    setIsLoading(true);
    const data = await fetchProfileVendors();
    setVendors(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
        (v.trade && v.trade.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || v.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [vendors, searchQuery, typeFilter]);

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setName('');
    setType('vendor');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setTrade('');
    setGstin('');
    setCity('');
    setLocation('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: ProfileVendor) => {
    setEditingVendor(v);
    setName(v.name);
    setType(v.type);
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setContactPerson(v.contact_person || '');
    setTrade(v.trade || '');
    setGstin(v.gstin || '');
    setCity(v.city || '');
    setLocation(v.location || '');
    setAddress(v.address || '');
    setNotes(v.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      type,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      contact_person: contactPerson.trim() || undefined,
      trade: trade.trim() || undefined,
      gstin: gstin.trim() || undefined,
      city: city.trim() || undefined,
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingVendor) {
      const { data, error } = await updateProfileVendor(editingVendor.id, payload);
      if (!error && data) {
        setVendors((prev) =>
          prev.map((item) => (item.id === editingVendor.id ? data : item))
        );
        showToast?.('Vendor profile updated successfully!', 'success');
      } else {
        showToast?.('Failed to update vendor profile', 'error');
      }
    } else {
      const { data, error } = await createProfileVendor(payload);
      if (!error && data) {
        setVendors((prev) => [data, ...prev]);
        showToast?.('Vendor profile created successfully in Supabase!', 'success');
      } else {
        showToast?.('Failed to create vendor profile', 'error');
      }
    }

    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, vendorName: string) => {
    if (!window.confirm(`Are you sure you want to delete profile for "${vendorName}"?`)) {
      return;
    }
    const { error } = await deleteProfileVendor(id);
    if (!error) {
      setVendors((prev) => prev.filter((v) => v.id !== id));
      showToast?.('Vendor profile deleted.', 'info');
    } else {
      showToast?.('Failed to delete vendor profile', 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Card (Compact & Professional) */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Building2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Vendors & Parties Directory
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filteredVendors.length} Parties
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Supplier agencies, contractors, trade details, and contact profiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadVendors}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
              title="Refresh from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Party</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor profile by name, trade, contact person, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {(['all', 'vendor', 'contractor', 'client', 'other'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all'
                  ? 'All'
                  : t === 'vendor'
                  ? 'Suppliers'
                  : t === 'contractor'
                  ? 'Contractors'
                  : t === 'client'
                  ? 'Clients'
                  : 'Other'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Vendor / Party Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone / Email</th>
                <th className="py-3 px-4">Trade / Specialization</th>
                <th className="py-3 px-4">City / Location</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <p className="font-semibold text-slate-600">Loading vendor profiles from Supabase...</p>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No vendor or party profiles found</p>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold hover:bg-purple-100 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add your first vendor profile</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                          {v.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {v.name}
                          </div>
                          {v.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {v.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          v.type === 'vendor'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : v.type === 'contractor'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : v.type === 'client'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {v.type === 'vendor'
                          ? 'Material Supplier'
                          : v.type === 'contractor'
                          ? 'Subcontractor'
                          : v.type === 'client'
                          ? 'Client'
                          : 'Other Agency'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {v.contact_person || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {v.phone && (
                          <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{v.phone}</span>
                          </div>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{v.email}</span>
                          </div>
                        )}
                        {!v.phone && !v.email && <span className="text-slate-400 italic">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {v.trade ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 truncate inline-block max-w-[180px]">
                          {v.trade}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {v.city || v.location ? (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{v.city || v.location}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {v.gstin || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                          title="Edit profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id, v.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add / Edit Vendor Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
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
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Party Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  >
                    <option value="vendor">Material Supplier</option>
                    <option value="contractor">Subcontractor</option>
                    <option value="client">Client / Owner</option>
                    <option value="other">Other Service</option>
                  </select>
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

              {/* GSTIN & City / Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
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
      )}
    </div>
  );
};
