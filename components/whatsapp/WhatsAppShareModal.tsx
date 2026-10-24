'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageCircle,
  User,
  Phone,
  FileText,
  Image as ImageIcon,
  Building2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Star,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import {
  WhatsAppContact,
  fetchWhatsAppContacts,
  cleanWhatsAppNumber,
  formatPhoneDisplay
} from '@/lib/supabase/whatsapp-contacts';
import { WhatsAppContactsManagerModal } from './WhatsAppContactsManagerModal';

export interface WhatsAppSharePayload {
  title: string;
  documentNo?: string;
  category?: string;
  projectName?: string;
  mediaUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  customSummary?: string;
}

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: WhatsAppSharePayload | null;
  onSuccessToast?: (msg: string) => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  payload,
  onSuccessToast
}) => {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isContactsManagerOpen, setIsContactsManagerOpen] = useState(false);

  // Recipient selection: either a saved contact ID or 'custom'
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');

  // Caption state
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load contacts
  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const list = await fetchWhatsAppContacts();
      setContacts(list);
      // Default to first favorite contact or first contact in list
      if (list.length > 0) {
        const defaultContact = list.find((c) => c.is_favorite) || list[0];
        setSelectedContactId(defaultContact.id);
      } else {
        setSelectedContactId('custom');
      }
    } catch (err) {
      console.error('Failed to load whatsapp contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Construct clean, concise caption whenever payload changes
  useEffect(() => {
    if (payload) {
      // 1. If media / PDF document is attached: keep caption crisp & minimal (the PDF has all details!)
      if (payload.mediaUrl) {
        const lines: string[] = [`📄 *${payload.title}*`];
        if (payload.customSummary && payload.customSummary.trim()) {
          lines.push(payload.customSummary.trim());
        }
        if (payload.projectName) {
          lines.push(`🏢 ${payload.projectName}`);
        }
        setCaption(lines.join('\n'));
        return;
      }

      // 2. If no media attached and customSummary is provided (e.g. status report text):
      if (payload.customSummary && payload.customSummary.trim()) {
        setCaption(payload.customSummary.trim());
        return;
      }

      // 3. Fallback brief text message:
      const lines: string[] = [`📄 *${payload.title}*`];
      if (payload.documentNo) lines.push(`🔖 Ref: ${payload.documentNo}`);
      if (payload.projectName) lines.push(`🏢 Site: ${payload.projectName}`);
      setCaption(lines.join('\n'));
    }
  }, [payload]);

  const activeContact = contacts.find((c) => c.id === selectedContactId);

  const getRecipientNumber = (): string => {
    if (selectedContactId === 'custom') {
      return cleanWhatsAppNumber(customPhone);
    }
    return activeContact ? activeContact.phone : cleanWhatsAppNumber(customPhone);
  };

  const getRecipientName = (): string => {
    if (selectedContactId === 'custom') {
      return customName.trim() || customPhone;
    }
    return activeContact ? activeContact.name : 'Recipient';
  };

  const handleSend = async () => {
    if (!payload) return;
    setStatusMessage(null);

    const recipientNumber = getRecipientNumber();
    if (!recipientNumber || recipientNumber.length < 10) {
      setStatusMessage({
        type: 'error',
        text: 'Please select a contact or enter a valid mobile number (e.g. 919958399157).'
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: recipientNumber,
          media: payload.mediaUrl || undefined,
          fileName: payload.fileName || `${payload.title.replace(/\s+/g, '_')}.pdf`,
          mediatype: payload.fileType === 'image' ? 'image' : 'document',
          mimetype: payload.fileType === 'image' ? 'image/jpeg' : 'application/pdf',
          caption: caption,
          text: caption
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send WhatsApp message.');
      }

      const successText = `Sent to ${getRecipientName()} (${formatPhoneDisplay(recipientNumber)}) via WhatsApp!`;
      setStatusMessage({
        type: 'success',
        text: successText
      });

      if (onSuccessToast) {
        onSuccessToast(`✅ ${successText}`);
      }

      // Auto close after 2.5s on success
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('WhatsApp send error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error communicating with WhatsApp Evolution API.'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !payload) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-[#128C7E] to-teal-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center font-bold shadow-2xs border border-white/25">
                <MessageCircle className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Share via WhatsApp</span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/20 text-white border border-white/30">
                    Instant 1-Click
                  </span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Send directly to admin, engineer, client, or custom number.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Status Alert Banner */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-150 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Document Being Shared Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Item to Send
                </span>
                {payload.documentNo && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20">
                    {payload.documentNo}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#653ef1] border border-purple-100 flex items-center justify-center shrink-0">
                  {payload.fileType === 'image' ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 truncate text-xs sm:text-sm" title={payload.title}>
                    {payload.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {payload.category && <span>{payload.category}</span>}
                    {payload.projectName && (
                      <>
                        <span>•</span>
                        <span>{payload.projectName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {payload.mediaUrl ? (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[280px] font-mono text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <span>📎</span>
                    <span>{payload.fileName || 'Attached PDF Document'}</span>
                  </span>
                  <a
                    href={payload.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#653ef1] hover:underline font-semibold flex items-center gap-1 shrink-0 text-[11px]"
                  >
                    <span>Preview PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-400">
                  <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Preparing official PDF bill attachment for WhatsApp...</span>
                </div>
              )}
            </div>

            {/* Recipient Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-bold block">
                  Select WhatsApp Contact
                </label>
                <button
                  type="button"
                  onClick={() => setIsContactsManagerOpen(true)}
                  className="text-xs font-bold text-[#653ef1] hover:text-[#5022e3] flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Manage / Add Contacts</span>
                </button>
              </div>

              {/* Saved Contacts Dropdown */}
              <div className="relative">
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer text-xs"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role}) — {formatPhoneDisplay(c.phone)} {c.is_favorite ? '⭐' : ''}
                    </option>
                  ))}
                  <option value="custom">✏️ Enter custom number manually...</option>
                </select>
              </div>

              {/* Custom Number Entry if selected */}
              {selectedContactId === 'custom' && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5 animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-[#653ef1] uppercase tracking-wider block">
                    Direct Recipient Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Recipient Name (e.g. Er. Shakir)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1]"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="Phone (e.g. 919958399157)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Message Caption */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-bold block">
                  WhatsApp Caption & Message
                </label>
                <span className="text-[10px] text-slate-400">Markdown supported (*bold*, _italic_)</span>
              </div>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sending via Evolution API (instance: mudassir)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSend}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm shadow-emerald-500/25 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending to WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to {getRecipientName().split(' ')[0]}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded WhatsApp Contacts Manager Modal */}
      <WhatsAppContactsManagerModal
        isOpen={isContactsManagerOpen}
        onClose={() => setIsContactsManagerOpen(false)}
        onSelectContact={(c) => {
          setSelectedContactId(c.id);
          setIsContactsManagerOpen(false);
          loadContacts();
        }}
      />
    </>
  );
};
