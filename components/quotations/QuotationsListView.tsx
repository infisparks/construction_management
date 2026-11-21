'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  MessageCircle,
  Copy,
  Trash2,
  Edit3,
  Filter,
  DollarSign,
  User,
  ArrowUpDown,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FolderKanban
} from 'lucide-react';
import {
  QuotationRecord,
  fetchQuotations,
  deleteQuotation,
  duplicateQuotation,
  createQuotation
} from '@/lib/supabase/quotations-services';
import { QuotationWordEditor } from './QuotationWordEditor';
import { formatMumbaiDateTime } from '@/lib/common/date-format';
import { WhatsAppShareModal, WhatsAppSharePayload } from '@/components/whatsapp/WhatsAppShareModal';

interface QuotationsListViewProps {
  userEmail?: string;
  userRole?: string;
  availableProjects?: { id: string; name: string }[];
  activeProjectId?: string;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const QuotationsListView: React.FC<QuotationsListViewProps> = ({
  userEmail,
  userRole,
  availableProjects = [],
  activeProjectId,
  showToast,
}) => {
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>(activeProjectId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeQuotation, setActiveQuotation] = useState<QuotationRecord | null>(null);

  // WhatsApp Share Modal
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppSharePayload | null>(null);

  // Load Quotations
  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchQuotations(siteFilter === 'all' ? undefined : siteFilter, searchQuery);
      setQuotations(data);
    } catch (err) {
      console.error('Error loading quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [siteFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const totalAmount = quotations.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
    const approvedQuotes = quotations.filter((q) => q.status === 'approved');
    const approvedCount = approvedQuotes.length;
    const approvedAmount = approvedQuotes.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
    const draftCount = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

    return {
      totalCount,
      totalAmount,
      approvedCount,
      approvedAmount,
      draftCount,
    };
  }, [quotations]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [quotations, statusFilter]);

  // Handle New Quotation Creation
  const handleCreateNew = async () => {
    try {
      const selectedProj = availableProjects.find((p) => p.id === siteFilter);
      const newQuote = await createQuotation({
        title: 'New Commercial Quotation',
        project_id: selectedProj ? selectedProj.id : (activeProjectId || null),
        project_name: selectedProj ? selectedProj.name : undefined,
        created_by_email: userEmail || 'admin@gmail.com',
        letterhead_enabled: false,
        letterhead_image_url: '',
        margin_top: 40,
      });
      setActiveQuotation(newQuote);
      if (showToast) showToast(`Created ${newQuote.quotation_number}`, 'success');
    } catch (err: any) {
      if (showToast) showToast('Failed to create quotation: ' + err.message, 'error');
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, qNo: string) => {
    if (!confirm(`Are you sure you want to delete quotation "${qNo}"?`)) return;
    await deleteQuotation(id);
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    if (showToast) showToast(`Deleted quotation ${qNo}`, 'info');
  };

  // Handle Duplicate
  const handleDuplicate = async (id: string) => {
    const dup = await duplicateQuotation(id, userEmail);
    if (dup) {
      setQuotations((prev) => [dup, ...prev]);
      if (showToast) showToast(`Duplicated quotation as ${dup.quotation_number}`, 'success');
    }
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = (q: QuotationRecord) => {
    setWhatsAppPayload({
      title: `${q.title} (${q.quotation_number})`,
      documentNo: q.quotation_number,
      category: 'Commercial Quotation',
      projectName: q.project_name || 'Construction Site',
      customSummary: [
        `📄 *COMMERCIAL QUOTATION*`,
        `🔖 Ref: *${q.quotation_number}*`,
        `🏢 Site: *${q.project_name || 'Main Site'}*`,
        `👤 Client: *${q.client_name || 'Valued Client'}*`,
        `📅 Date: *${q.quotation_date}*`,
        `💰 Total Quoted: *Rs. ${Number(q.total_amount).toLocaleString('en-IN')}*`,
        ``,
        `_Generated via Armee Enterprises Construction ERP Letterhead Builder_`
      ].join('\n'),
    });
    setIsWhatsAppOpen(true);
  };

  // If in Word-like editor mode
  if (activeQuotation) {
    return (
      <QuotationWordEditor
        quotation={activeQuotation}
        availableProjects={availableProjects}
        userEmail={userEmail}
        onBack={() => {
          setActiveQuotation(null);
          loadQuotations();
        }}
        onSaved={(updated) => {
          setActiveQuotation(updated);
          setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 bg-[#F5F6F8] min-h-screen">
      {/* 1. TOP HERO HEADER & METRICS BANNER */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-[#653ef1] shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quotation Builder</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-[#653ef1] border border-purple-200/60">
                  Letterhead & Word Canvas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Draft professional quotations on Armee letterhead with configurable margins, Word styling & instant WhatsApp sharing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadQuotations}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Quotations"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNew}
              className="h-9 px-4 rounded-xl bg-[#653ef1] hover:bg-[#542de3] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Quotation</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">Total Quotations</span>
            <div className="text-lg md:text-xl font-bold text-slate-900 mt-1">{metrics.totalCount} Quotes</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded in database</span>
          </div>

          <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-700 block uppercase tracking-wider">Total Quoted Value</span>
            <div className="text-lg md:text-xl font-bold text-[#653ef1] mt-1 whitespace-nowrap">
              Rs.&nbsp;{metrics.totalAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-purple-500/80 mt-0.5 block">Cumulative proposal value</span>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">Approved Quotes</span>
            <div className="text-lg md:text-xl font-bold text-emerald-700 mt-1 whitespace-nowrap">
              Rs.&nbsp;{metrics.approvedAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">{metrics.approvedCount} client contracts won</span>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 block uppercase tracking-wider">Pending / Drafts</span>
            <div className="text-lg md:text-xl font-bold text-amber-700 mt-1">{metrics.draftCount} Quotes</div>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Under preparation or negotiation</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotation #, client, title or user..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#653ef1]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Construction Site Filter */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-[#653ef1] flex-1 md:flex-initial"
          >
            <option value="all">🏢 All Construction Sites</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-[#653ef1]"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* 3. A1 MODERN QUOTATIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80">
                <th className="py-3 px-3.5 w-12 text-center">S.No</th>
                <th className="py-3 px-3.5">Quotation # & Date</th>
                <th className="py-3 px-3.5">Title & Subject</th>
                <th className="py-3 px-3.5">Client / Recipient</th>
                <th className="py-3 px-3.5">Site / Project</th>
                <th className="py-3 px-3.5 text-right">Quoted Value</th>
                <th className="py-3 px-3.5">Created By</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">No Quotations Found</span>
                      <p className="text-xs text-slate-400">
                        Create your first letterhead quotation with custom margins and Word-like typography.
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        className="mt-2 px-4 py-2 rounded-xl bg-[#653ef1] hover:bg-[#542de3] text-white text-xs font-bold cursor-pointer"
                      >
                        + Create First Quotation
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q, idx) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => setActiveQuotation(q)}
                  >
                    {/* S.No */}
                    <td className="py-3 px-3.5 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    {/* Quotation No & Date */}
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-[#653ef1]">{q.quotation_number}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{q.quotation_date}</span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3.5 font-semibold text-slate-800 max-w-[220px] truncate">
                      {q.title}
                    </td>

                    {/* Client */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800">{q.client_name || '—'}</div>
                      {q.client_phone && (
                        <div className="text-[11px] text-slate-400 font-mono">{q.client_phone}</div>
                      )}
                    </td>

                    {/* Site */}
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-[#653ef1] border border-purple-100">
                        <Building2 className="w-3 h-3" />
                        <span>{q.project_name || 'General'}</span>
                      </span>
                    </td>

                    {/* Total Quoted Value */}
                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      Rs.&nbsp;{Number(q.total_amount).toLocaleString('en-IN')}
                    </td>

                    {/* Created By & Mumbai Time */}
                    <td className="py-3 px-3.5 text-[11px]">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{q.created_by_email || 'admin@gmail.com'}</span>
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        {formatMumbaiDateTime(q.created_at)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          q.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : q.status === 'sent'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : q.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit in Word Builder */}
                        <button
                          type="button"
                          onClick={() => setActiveQuotation(q)}
                          className="p-1.5 text-slate-500 hover:text-[#653ef1] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Open in Word Builder"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Share */}
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(q)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(q.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Quotation"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(q.id, q.quotation_number)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Quotation"
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

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setWhatsAppPayload(null);
        }}
        payload={whatsAppPayload}
        onSuccessToast={(msg) => {
          if (showToast) showToast(msg, 'success');
        }}
      />
    </div>
  );
};
