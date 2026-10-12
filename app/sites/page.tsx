'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Check,
  RotateCcw,
  Trash2,
  MapPin,
  User,
  Phone,
  KeyRound,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HardHat,
  X,
  Calendar,
  Layers,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DbProject } from '@/lib/supabase/types';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  getStoredActiveSiteId,
  setStoredActiveSite,
  fetchAllActiveSites,
} from '@/lib/supabase/site-storage';

function SitesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userRole, signOut } = useAuth();

  const [projects, setProjects] = useState<DbProject[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DbProject | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [principalContractor, setPrincipalContractor] = useState('');
  const [projectPerson, setProjectPerson] = useState('');
  const [personNumber, setPersonNumber] = useState('');
  const [safetyKey, setSafetyKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all projects and determine active site
  const loadSites = async () => {
    setIsLoading(true);
    try {
      const all = await fetchAllActiveSites(true);
      setProjects(all);

      const storedId = getStoredActiveSiteId();
      const nonDeleted = all.filter((p) => !p.is_deleted);

      if (storedId && nonDeleted.some((p) => p.id === storedId)) {
        setActiveSiteId(storedId);
      } else if (nonDeleted.length > 0) {
        // Fall back to first non-deleted project
        setActiveSiteId(nonDeleted[0].id);
        setStoredActiveSite(nonDeleted[0]);
      } else {
        setActiveSiteId(null);
      }

      // Check URL params for first time site creation request
      const action = searchParams.get('action');
      const first = searchParams.get('first');
      if (action === 'create' || first === 'true' || nonDeleted.length === 0) {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Error loading sites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, [searchParams]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setName('');
    setCode(`SITE-${projects.length + 1}`);
    setAddress('');
    setClientName('');
    setPrincipalContractor('');
    setProjectPerson('');
    setPersonNumber('');
    setSafetyKey(`KEY-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (proj: DbProject) => {
    setEditingProject(proj);
    setName(proj.name);
    setCode(proj.code || `SITE-${proj.serial_no}`);
    setAddress(proj.location || proj.address || '');
    setClientName(proj.client_name || '');
    setPrincipalContractor(proj.principal_contractor || '');
    setProjectPerson(proj.project_person || '');
    setPersonNumber(proj.person_number || '');
    setSafetyKey(proj.safety_key || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Switch Active Site and redirect to Planning
  const handleSwitchSite = (proj: DbProject, andRedirect: boolean = true) => {
    if (proj.is_deleted) {
      showToast('Cannot switch to an archived site. Please restore it first.', 'error');
      return;
    }

    setActiveSiteId(proj.id);
    setStoredActiveSite(proj);
    showToast(`Switched active workspace to "${proj.name}". Saved to storage!`, 'success');

    if (andRedirect) {
      setTimeout(() => {
        router.push('/planstructino?view=list');
      }, 400);
    }
  };

  // Handle Form Submit (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Site Name is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingProject) {
        // Update existing site
        const { data, error } = await supabase
          .from('projects')
          .update({
            name: name.trim(),
            code: code.trim() || null,
            location: address.trim() || null,
            address: address.trim() || null,
            client_name: clientName.trim() || null,
            principal_contractor: principalContractor.trim() || null,
            project_person: projectPerson.trim() || null,
            person_number: personNumber.trim() || null,
            safety_key: safetyKey.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProject.id)
          .select()
          .single();

        if (error) throw error;

        const updated = data as DbProject;
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        if (activeSiteId === updated.id) {
          setStoredActiveSite(updated);
        }
        showToast(`Site "${updated.name}" updated successfully!`, 'success');
        setIsModalOpen(false);
      } else {
        // Create new site
        const genKey = safetyKey.trim() || `KEY-${name.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data, error } = await supabase
          .from('projects')
          .insert([
            {
              name: name.trim(),
              code: code.trim() || null,
              location: address.trim() || null,
              address: address.trim() || null,
              client_name: clientName.trim() || null,
              principal_contractor: principalContractor.trim() || null,
              project_person: projectPerson.trim() || null,
              person_number: personNumber.trim() || null,
              safety_key: genKey,
              user_id: user?.id || null,
              is_deleted: false,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const newProj = data as DbProject;
        setProjects((prev) => [...prev, newProj]);
        // Automatically set this newly created site as active in localStorage!
        handleSwitchSite(newProj, true);
        setIsModalOpen(false);
      }
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to save site.');
    } finally {
      setIsSaving(false);
    }
  };

  // Soft Delete / Archive Site
  const handleToggleArchive = async (proj: DbProject) => {
    const willArchive = !proj.is_deleted;
    const confirmText = willArchive
      ? `Archive site "${proj.name}"? You can restore it anytime.`
      : `Restore site "${proj.name}" to active list?`;

    if (!window.confirm(confirmText)) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_deleted: willArchive, updated_at: new Date().toISOString() })
        .eq('id', proj.id)
        .select()
        .single();

      if (error) throw error;

      const updated = data as DbProject;
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      // If active site was archived, switch to next available non-deleted site
      if (willArchive && activeSiteId === updated.id) {
        const remaining = projects.filter((p) => p.id !== updated.id && !p.is_deleted);
        if (remaining.length > 0) {
          handleSwitchSite(remaining[0], false);
        } else {
          setActiveSiteId(null);
        }
      }

      showToast(willArchive ? `Site "${proj.name}" archived.` : `Site "${proj.name}" restored!`, 'info');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Action failed', 'error');
    }
  };

  const filteredProjects = projects.filter((proj) => {
    if (!showArchived && proj.is_deleted) return false;
    if (showArchived && !proj.is_deleted) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      proj.name.toLowerCase().includes(q) ||
      (proj.address && proj.address.toLowerCase().includes(q)) ||
      (proj.project_person && proj.project_person.toLowerCase().includes(q)) ||
      (proj.serial_no && `site-${proj.serial_no}`.includes(q))
    );
  });

  const activeProjectsCount = projects.filter((p) => !p.is_deleted).length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111827] flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-purple-600 text-white border-purple-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/planstructino?view=list')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Planning & WBS</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  Armee Enterprises PMS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  Site Switcher
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">Multi-Project Workspace Hub</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeProjectsCount > 0 && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Site</span>
            </button>
          )}

          {user && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="font-medium text-[11px] text-slate-700 truncate max-w-[140px]">
                {user.email}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* First Site Welcome Alert (when 0 sites exist) */}
        {!isLoading && activeProjectsCount === 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border-2 border-purple-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-purple-950">
                  Welcome to Armee Enterprises! You don't have any construction sites yet.
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Please create your first construction site first to begin managing Work Breakdown Structure (WBS),
                  Critical Path Method (CPM) timelines, daily site execution logs, and material store bills.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Your First Site</span>
            </button>
          </div>
        )}

        {/* Page Title & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Select or Switch Active Site
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Switching a site instantly updates your schedule, tasks, documents, and expenses. Saved in local storage.
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sites..."
                className="pl-9 pr-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-48 sm:w-64"
              />
            </div>

            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  !showArchived ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({projects.filter((p) => !p.is_deleted).length})
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  showArchived ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Archived ({projects.filter((p) => p.is_deleted).length})
              </button>
            </div>
          </div>
        </div>

        {/* Sites Cards Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading construction sites from Supabase...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No sites found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {showArchived
                ? 'No archived sites match your search.'
                : 'No active sites match your search. Create a new site to get started.'}
            </p>
            {!showArchived && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Site</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => {
              const isActive = activeSiteId === proj.id && !proj.is_deleted;

              return (
                <div
                  key={proj.id}
                  className={`bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                    isActive
                      ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                      : 'border-[#E5E7EB] hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  {/* Active Site Top Ribbon */}
                  {isActive && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 text-[10px] font-bold tracking-wider uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Current Active Site (Saved in Local Storage)
                      </span>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        {proj.code || `SITE-#${proj.serial_no}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {proj.is_deleted ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Archived
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Site Title & Location */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1" title={proj.name}>
                        {proj.name}
                      </h3>
                      {(proj.location || proj.address) ? (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1" title={proj.location || proj.address || ''}>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{proj.location || proj.address}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-1">No address specified</p>
                      )}
                    </div>

                    {/* Key Details */}
                    <div className="p-2.5 rounded-lg bg-[#F5F6F8] space-y-1.5 text-xs text-slate-600">
                      {proj.client_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Client:</span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[170px]" title={proj.client_name}>
                            {proj.client_name}
                          </span>
                        </div>
                      )}

                      {proj.principal_contractor && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Principal Contractor:</span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[170px]" title={proj.principal_contractor}>
                            {proj.principal_contractor}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-purple-600" /> Site Incharge:
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[150px]">
                          {proj.project_person || 'Unassigned'}
                        </span>
                      </div>

                      {proj.person_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-purple-600" /> Contact:
                          </span>
                          <span className="font-mono text-slate-700 text-[11px]">
                            {proj.person_number}
                          </span>
                        </div>
                      )}

                      {proj.safety_key && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-purple-600" /> Site Key:
                          </span>
                          <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            {proj.safety_key}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(proj)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer text-xs"
                        title="Edit site details"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchive(proj)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={proj.is_deleted ? 'Restore site' : 'Archive site'}
                      >
                        {proj.is_deleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {proj.is_deleted ? (
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(proj)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Restore Site
                      </button>
                    ) : isActive ? (
                      <button
                        type="button"
                        onClick={() => router.push('/planstructino?view=list')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold hover:bg-purple-200 transition-colors cursor-pointer"
                      >
                        <span>Open Workspace</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchSite(proj, true)}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        Switch to This Site
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* Create / Edit Site Modal */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (activeProjectsCount > 0) setIsModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingProject
                      ? 'Edit Construction Site'
                      : activeProjectsCount === 0
                      ? 'Create Your First Site'
                      : 'Create New Construction Site'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeProjectsCount === 0
                      ? 'Set up your project details to unlock planning, documents & bills.'
                      : 'Add a new building, tower, or infrastructure jobsite.'}
                  </p>
                </div>
              </div>

              {activeProjectsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Group 1: PROJECT & SITE DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    Project & Site Details (Prints on Bills & Vault)
                  </span>
                </div>

                {/* Site Name */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Site / Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Noori Crust Site"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>

                {/* 2-column: Project Code & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Project Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. SITE-1"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Location / Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Plot 12, Industrial Area, Phase 2"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* 2-column: Client & Principal Contractor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Client / Owner Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Noori Developers & Properties Ltd."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Principal Contractor (Optional)
                    </label>
                    <input
                      type="text"
                      value={principalContractor}
                      onChange={(e) => setPrincipalContractor(e.target.value)}
                      placeholder="e.g. Mohammad Tariq (+91 98201 55410)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Operational Team & Safety Passcode */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Site Operations & Security (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Project Incharge / Engineer
                    </label>
                    <input
                      type="text"
                      value={projectPerson}
                      onChange={(e) => setProjectPerson(e.target.value)}
                      placeholder="e.g. Er. Amit Verma"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={personNumber}
                      onChange={(e) => setPersonNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Site Safety / Passcode Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={safetyKey}
                    onChange={(e) => setSafetyKey(e.target.value)}
                    placeholder="e.g. KEY-HOR-7821"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Used for engineer verification and subcontractor authorization on site.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                {activeProjectsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Site...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingProject ? 'Save Changes' : 'Create & Select Site'}</span>
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
}

export default function SitesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center text-xs text-slate-500">
          Loading Armee Enterprises Sites...
        </div>
      }
    >
      <SitesPageContent />
    </Suspense>
  );
}
