'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  RotateCcw,
  KeyRound,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  FolderOpen,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { DbProject } from '@/lib/supabase/types';
import { useAuth } from '@/lib/supabase/auth-context';

interface SitesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  onSelectProject: (project: DbProject) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  initialShowCreateForm?: boolean;
  zIndexClassName?: string;
}

export const SitesManagerModal: React.FC<SitesManagerModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectProject,
  showToast,
  initialShowCreateForm = false,
  zIndexClassName = 'z-50',
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(initialShowCreateForm);

  // Form State for New Site
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [projectPerson, setProjectPerson] = useState('');
  const [personNumber, setPersonNumber] = useState('');
  const [safetyKey, setSafetyKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Projects from Supabase
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('serial_no', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
      } else if (data) {
        setProjects(data as DbProject[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (initialShowCreateForm) {
        setShowCreateForm(true);
      }
    }
  }, [isOpen, initialShowCreateForm]);

  // Handle Create New Site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const genSafetyKey = safetyKey.trim() || `KEY-${name.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name: name.trim(),
            address: address.trim() || null,
            project_person: projectPerson.trim() || null,
            person_number: personNumber.trim() || null,
            safety_key: genSafetyKey,
            user_id: user?.id || null,
            is_deleted: false,
          },
        ])
        .select()
        .single();

      if (error) {
        showToast?.(error.message || 'Error creating site', 'error');
      } else if (data) {
        const newProj = data as DbProject;
        setProjects((prev) => [...prev, newProj]);
        onSelectProject(newProj);
        showToast?.(`Site "${newProj.name}" created successfully!`, 'success');
        
        // Reset form
        setName('');
        setAddress('');
        setProjectPerson('');
        setPersonNumber('');
        setSafetyKey('');
        setShowCreateForm(false);
      }
    } catch (err: unknown) {
      showToast?.((err as Error).message || 'Failed to create site', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Soft Delete (never delete permanently)
  const handleSoftDelete = async (project: DbProject) => {
    if (!window.confirm(`Archive site "${project.name}"? It will be soft-deleted and can be restored anytime.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) {
        showToast?.(error.message || 'Error archiving site', 'error');
      } else {
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, is_deleted: true } : p))
        );
        showToast?.(`Site "${project.name}" safely archived (soft-deleted).`, 'info');
      }
    } catch (err: unknown) {
      showToast?.((err as Error).message || 'Failed to archive site', 'error');
    }
  };

  // Handle Restore Soft-Deleted Project
  const handleRestore = async (project: DbProject) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) {
        showToast?.(error.message || 'Error restoring site', 'error');
      } else {
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, is_deleted: false } : p))
        );
        showToast?.(`Site "${project.name}" restored!`, 'success');
      }
    } catch (err: unknown) {
      showToast?.((err as Error).message || 'Failed to restore site', 'error');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.project_person && p.project_person.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = showDeleted ? p.is_deleted : !p.is_deleted;
    return matchesSearch && matchesStatus;
  });

  if (!isOpen) return null;

  return (
    /* Slide-over Right Sidebar Drawer Container */
    <div 
      className={`fixed inset-0 ${zIndexClassName || 'z-50'} overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header - Sleek Executive Navbar */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-100 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  Sites & Projects
                </h2>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                  {projects.filter(p => !p.is_deleted).length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Supabase RLS database synchronized &bull; Multi-site workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!showCreateForm && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Site</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-[#F8FAFC]">
          
          {/* Create New Site Form Box */}
          {showCreateForm && (
            <form onSubmit={handleCreateSite} className="bg-white border-2 border-purple-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Add New Project / Site (e.g. Noori Crust)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Form Inputs (2-column on tablet/desktop, 1-column on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Project / Site Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noori Crust Site, Apex Heights"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Site Location / Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 12, Industrial Area, Sector 74"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Project In-Charge Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mohammad Tariq, Er. Amit"
                    value={projectPerson}
                    onChange={(e) => setProjectPerson(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Person Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98201 55410"
                    value={personNumber}
                    onChange={(e) => setPersonNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Safety Key 2 (Security & Verification Token)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if left empty (e.g. NC-SITE-SECURE-88)"
                    value={safetyKey}
                    onChange={(e) => setSafetyKey(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSaving ? 'Creating...' : 'Save Site to Supabase'}
                </button>
              </div>
            </form>
          )}

          {/* Search Bar & Archive Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sites by name, location, or person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600 shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                showDeleted
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {showDeleted ? 'Showing Archived' : 'Archived Sites'}
            </button>
          </div>

          {/* Projects List */}
          {isLoading ? (
            <div className="py-14 text-center text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading construction sites from Supabase...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No {showDeleted ? 'archived' : 'active'} sites found.</p>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-xs text-purple-600 hover:underline font-bold cursor-pointer"
                >
                  + Create Your Site Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((p) => {
                const isActive = p.id === activeProjectId || p.name === 'Noori Crust Site';
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-purple-400 bg-white shadow-md ring-2 ring-purple-100'
                        : 'border-slate-200 hover:border-slate-300 bg-white shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          #{p.serial_no}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {p.name}
                            </h3>
                            {isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Workspace
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-slate-500">
                            {p.address && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{p.address}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                              {p.project_person && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <strong className="text-slate-700">{p.project_person}</strong>
                                </span>
                              )}
                              {p.person_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{p.person_number}</span>
                                </span>
                              )}
                            </div>

                            {p.safety_key && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  <KeyRound className="w-3 h-3 text-purple-500" />
                                  <span>Safety Key: {p.safety_key}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {!p.is_deleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(p);
                                onClose();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700'
                              }`}
                              title="Switch to this site"
                            >
                              {isActive ? 'Current Site' : 'Switch Site'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSoftDelete(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Archive site (soft delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
                            title="Restore site"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Drawer Footer Bar */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Supabase RLS Protected</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Soft Delete: Archived sites are never lost
          </span>
        </div>

      </div>
    </div>
  );
};

// Also export as SitesManagerDrawer for semantic naming
export const SitesManagerDrawer = SitesManagerModal;
