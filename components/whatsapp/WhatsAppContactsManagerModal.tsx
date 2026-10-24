'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Phone,
  User,
  Star,
  Trash2,
  Search,
  ShieldCheck,
  Check,
  Building2,
  HardHat,
  MessageCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  WhatsAppContact,
  fetchWhatsAppContacts,
  createWhatsAppContact,
  deleteWhatsAppContact,
  updateWhatsAppContact,
  formatPhoneDisplay,
  cleanWhatsAppNumber
} from '@/lib/supabase/whatsapp-contacts';

interface WhatsAppContactsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: WhatsAppContact) => void;
}

const COMMON_ROLES = [
  'Admin',
  'Project Manager',
  'Site Engineer',
  'Architect / Consultant',
  'Principal Contractor',
  'Subcontractor',
  'Client / Owner',
  'Material Vendor',
  'Other'
];

export const WhatsAppContactsManagerModal: React.FC<WhatsAppContactsManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectContact
}) => {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add contact form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Admin');
  const [email, setEmail] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWhatsAppContacts();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Contact name is required');
      return;
    }

    const cleaned = cleanWhatsAppNumber(phone);
    if (!cleaned || cleaned.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number with or without country code.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await createWhatsAppContact({
        name,
        phone: cleaned,
        role,
        email: email.trim() || undefined,
        is_favorite: isFavorite
      });

      if (created) {
        setContacts(prev => [created, ...prev]);
        setName('');
        setPhone('');
        setEmail('');
        setIsFavorite(false);
        setIsAddingNew(false);
        if (onSelectContact) {
          onSelectContact(created);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    if (!window.confirm(`Delete contact "${contactName}"?`)) return;
    setContacts(prev => prev.filter(c => c.id !== id));
    await deleteWhatsAppContact(id);
  };

  const handleToggleFavorite = async (contact: WhatsAppContact) => {
    const nextFav = !contact.is_favorite;
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: nextFav } : c));
    await updateWhatsAppContact(contact.id, { is_favorite: nextFav });
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-50/80 via-white to-purple-50/60 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/25">
              <MessageCircle className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  WhatsApp Contacts Directory
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Evolution API
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Save team members, admins, clients, and contractors to send reports in 1-click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Top Bar: Search & Add Contact Button */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, phone number..."
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isAddingNew
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] text-white shadow-[#653ef1]/25'
              }`}
            >
              {isAddingNew ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Cancel Form</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Contact</span>
                </>
              )}
            </button>
          </div>

          {/* Inline Add Contact Form */}
          {isAddingNew && (
            <form
              onSubmit={handleCreateContact}
              className="p-4.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#653ef1] uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save New WhatsApp Recipient</span>
                </span>
                <span className="text-[10px] text-slate-400">Stored in Supabase database</span>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mudassir (Admin)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    WhatsApp Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 919958399157"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    10-digit mobile number (e.g. 9958399157) or with country code (919958399157).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role / Department</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] cursor-pointer"
                  >
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="w-4 h-4 rounded text-[#653ef1] focus:ring-[#653ef1]"
                  />
                  <span className="text-slate-700 font-semibold">Mark as Favorite / Priority Contact</span>
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          )}

          {/* Contacts List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Saved Contacts ({filteredContacts.length})</span>
              <span>1-Click Select</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-6 h-6 border-2 border-[#653ef1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading saved WhatsApp contacts...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                <User className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-semibold">No contacts found</p>
                <p className="text-slate-400 text-[11px]">
                  Click "+ Add New Contact" to save your first recipient.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-purple-50/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 truncate" title={contact.name}>
                            {contact.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {contact.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{formatPhoneDisplay(contact.phone)}</span>
                          {contact.email && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px] font-sans">{contact.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(contact)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          contact.is_favorite
                            ? 'text-amber-500 bg-amber-50 border-amber-200'
                            : 'text-slate-300 hover:text-slate-600 border-transparent hover:border-slate-200'
                        }`}
                        title="Favorite"
                      >
                        <Star className={`w-3.5 h-3.5 ${contact.is_favorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      {onSelectContact && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectContact(contact);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#653ef1]/10 hover:bg-[#653ef1] text-[#653ef1] hover:text-white font-bold text-xs border border-[#653ef1]/20 transition-all cursor-pointer shadow-2xs"
                        >
                          Select
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id, contact.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Connected to Evolution API (mudassir)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
