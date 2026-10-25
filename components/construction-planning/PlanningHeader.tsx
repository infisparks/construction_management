'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Plus, 
  ClipboardList, 
  Route, 
  RotateCcw, 
  Settings, 
  TrendingUp, 
  Layers,
  ChevronDown,
  Menu,
  Package,
  Receipt,
  FileSpreadsheet,
  LogOut,
  Sliders,
  FolderKanban,
  Milestone,
  Wrench,
  User,
  ShieldCheck,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { ProjectInfo, ViewMode } from '@/lib/construction-planning/types';
import { formatDisplayDate, calculateDurationDetails } from '@/lib/construction-planning/schedule-utils';
import { SoftwareManualSearch } from './SoftwareManualSearch';

import { DbProject } from '@/lib/supabase/types';
import { isViewAllowed, isModuleAllowed } from '@/lib/auth/role-access';

const VIEW_HEADER_CONFIG: Record<ViewMode, { title: string; icon: React.ElementType }> = {
  list: { title: 'Armee Enterprises', icon: Building2 },
  gantt: { title: 'Gantt Schedule Timeline', icon: Calendar },
  critical: { title: 'Critical Path (CPM)', icon: Route },
  progress: { title: 'Daily Site Progress', icon: ClipboardList },
  milestones: { title: 'Project Milestones', icon: Milestone },
  materials: { title: 'Store & Site Inventory', icon: Package },
  billing: { title: 'Billing Khata & Parties', icon: Receipt },
  'subcontractor-bills': { title: 'Sub-Contractor RA Bills', icon: FileSpreadsheet },
  'files-archive': { title: 'Files & Documents Archive', icon: FolderKanban },
  expenses: { title: 'Commercial Bills & Expenses', icon: Receipt },
  'contractor-work-orders': { title: 'Contractor Work Orders', icon: Wrench },
};

interface PlanningHeaderProps {
  project: ProjectInfo;
  currentView?: ViewMode;
  allProjects?: DbProject[];
  activeProjectId?: string;
  onSelectProject?: (project: DbProject) => void;
  isPlanningView?: boolean;
  onAddTask: () => void;
  onAddWorkPackage: () => void;
  onRecordProgress: () => void;
  onViewCriticalPath: () => void;
  onOpenRecoveryPlan: () => void;
  onOpenSettings: () => void;
  onToggleMobileMenu?: () => void;
  onOpenMaterialStore?: () => void;
  onOpenBilling?: () => void;
  onOpenSubcontractorBills?: () => void;
  onOpenSitesManager?: () => void;
  onShareTimelineWhatsApp?: () => void;
  onOpenRestoreActivities?: () => void;
  deletedActivitiesCount?: number;
  userEmail?: string;
  userRole?: string;
  userPage?: string | null;
  onSignOut?: () => void;
}

export const PlanningHeader: React.FC<PlanningHeaderProps> = ({
  project,
  currentView = 'list',
  allProjects = [],
  activeProjectId,
  onSelectProject,
  isPlanningView = true,
  onAddTask,
  onAddWorkPackage,
  onRecordProgress,
  onViewCriticalPath,
  onOpenRecoveryPlan,
  onOpenSettings,
  onToggleMobileMenu,
  onOpenMaterialStore,
  onOpenBilling,
  onOpenSubcontractorBills,
  onOpenSitesManager,
  onShareTimelineWhatsApp,
  onOpenRestoreActivities,
  deletedActivitiesCount = 0,
  userEmail,
  userRole,
  userPage,
  onSignOut,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const [isSiteSwitcherOpen, setIsSiteSwitcherOpen] = useState(false);
  const siteSwitcherRef = useRef<HTMLDivElement>(null);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (siteSwitcherRef.current && !siteSwitcherRef.current.contains(e.target as Node)) {
        setIsSiteSwitcherOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canLogProgress = isViewAllowed('progress', userRole, userPage);
  const canAddTask = isViewAllowed('list', userRole, userPage);
  const canViewCritical = isViewAllowed('critical', userRole, userPage);
  const canViewRecovery = isModuleAllowed('controls', userRole, userPage);
  const canViewSubBills = isViewAllowed('subcontractor-bills', userRole, userPage);
  const canViewStore = isViewAllowed('materials', userRole, userPage);
  const canViewBilling = isViewAllowed('billing', userRole, userPage);
  const canViewSettings = isModuleAllowed('controls', userRole, userPage);
  const hasAnyTools = canViewCritical || canViewRecovery || canViewSubBills || canViewStore || canViewBilling || canAddTask || Boolean(onOpenRestoreActivities);

  // Only show planning timeline actions (Log Progress, Add Task, Quick Tools) on the Timeline & Schedule views
  const isTimelineView = Boolean(isPlanningView) && (
    currentView === 'list' ||
    currentView === 'gantt' ||
    currentView === 'critical' ||
    currentView === 'milestones' ||
    currentView === 'progress'
  );

  const headerMeta = currentView && VIEW_HEADER_CONFIG[currentView]
    ? VIEW_HEADER_CONFIG[currentView]
    : { title: 'Armee Enterprises', icon: Building2 };
  const HeaderIcon = headerMeta.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
        {/* Row 1: Unified Clean Header Bar with Global Site Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Left: Mobile Toggle, Title & Interactive Active Site Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title="Toggle Navigation"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight shrink-0 flex items-center gap-1.5">
                <HeaderIcon className="w-5 h-5 text-[#653ef1] hidden sm:inline-block shrink-0" />
                <span>{headerMeta.title}</span>
              </h1>

              {/* Interactive Site Switcher Dropdown */}
              <div className="relative shrink-0" ref={siteSwitcherRef}>
                <button
                  type="button"
                  onClick={() => setIsSiteSwitcherOpen(!isSiteSwitcherOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                    isSiteSwitcherOpen
                      ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100 text-[#653ef1] shadow-xs'
                      : 'bg-white hover:bg-purple-50/50 border-slate-200/90 text-slate-800 hover:border-purple-200'
                  }`}
                  title="Click to switch construction site / workspace"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Site:</span>
                  <span className="font-bold text-slate-900 max-w-[120px] sm:max-w-[190px] truncate">
                    {project.name}
                  </span>
                  <span className="text-[10px] text-[#653ef1] bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    {project.code || 'SITE'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isSiteSwitcherOpen ? 'rotate-180 text-[#653ef1]' : ''}`} />
                </button>

                {/* Site Switcher Popup Menu */}
                {isSiteSwitcherOpen && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#653ef1]">
                        Switch Construction Site
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {allProjects.length} {allProjects.length === 1 ? 'Site' : 'Sites'}
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                      {allProjects.length > 0 ? (
                        allProjects.map((p) => {
                          const isCurrent = p.id === (activeProjectId || project.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectProject?.(p);
                                setIsSiteSwitcherOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-purple-50 text-[#653ef1] font-bold border border-purple-200 shadow-2xs'
                                  : 'hover:bg-purple-50/50 text-slate-700 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                  isCurrent ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  #{p.serial_no || 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">
                                    {p.name}
                                  </div>
                                  {(p.location || p.address) && (
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {p.location || p.address}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-3 text-center text-xs text-slate-500">
                          {project.name} (Current Active Site)
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSiteSwitcherOpen(false);
                          onOpenSitesManager?.();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#653ef1] hover:bg-purple-50 rounded-xl transition-colors cursor-pointer border border-purple-200"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Manage / Add New Construction Site</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Manual Search + Clean Unified Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap md:flex-nowrap justify-between md:justify-end">
            
            {/* Quick Search */}
            <div className="w-full sm:w-60 md:w-64">
              <SoftwareManualSearch />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Timeline Actions: Log Progress, Add Task, Tools - ONLY rendered on Timeline views */}
              {isTimelineView && (
                <>
                  {/* Secondary Action: Log Daily Progress */}
                  {canLogProgress && (
                    <button
                      type="button"
                      onClick={onRecordProgress}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-purple-50 hover:text-[#653ef1] hover:border-purple-200 text-slate-700 border border-slate-200 transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      title="Record daily site execution progress"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-[#653ef1]" />
                      <span className="hidden sm:inline">Log Progress</span>
                      <span className="sm:hidden">Log</span>
                    </button>
                  )}

                  {/* Primary Action: Add Task */}
                  {canAddTask && (
                    <button
                      type="button"
                      onClick={onAddTask}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] text-white shadow-sm shadow-[#653ef1]/35 transition-all hover:shadow-md hover:shadow-[#653ef1]/45 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      title="Add new construction WBS task"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Task</span>
                    </button>
                  )}

                  {/* Quick WhatsApp Timeline Share Button */}
                  {onShareTimelineWhatsApp && (
                    <button
                      type="button"
                      onClick={onShareTimelineWhatsApp}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer shadow-2xs"
                      title="Share project timeline & milestones via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                      <span className="hidden md:inline">WhatsApp</span>
                    </button>
                  )}

                  {/* Quick Tools & Modules Dropdown */}
                  {hasAnyTools && (
                    <div className="relative" ref={toolsRef}>
                      <button
                        type="button"
                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          isToolsOpen 
                            ? 'bg-purple-50 text-[#653ef1] border-purple-200 ring-2 ring-purple-100' 
                            : 'bg-white hover:bg-purple-50/50 text-slate-700 border-slate-200 hover:border-purple-200'
                        }`}
                        title="Quick Tools & Special Views"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Tools</span>
                        {deletedActivitiesCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-purple-100 text-purple-700 border border-purple-200">
                            {deletedActivitiesCount}
                          </span>
                        )}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {isToolsOpen && (
                        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Quick Tools & Modules
                          </div>
                          
                          {/* 1. Restore Activities (On Top) */}
                          {onOpenRestoreActivities && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenRestoreActivities();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] transition-colors text-left cursor-pointer border-b border-slate-100 mb-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-[#653ef1]" />
                                <span className="font-semibold text-slate-800 hover:text-[#653ef1]">Restore Activities</span>
                              </div>
                              {deletedActivitiesCount > 0 ? (
                                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                  {deletedActivitiesCount}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-400">0</span>
                              )}
                            </button>
                          )}

                          {canViewCritical && (
                            <button
                              type="button"
                              onClick={() => {
                                onViewCriticalPath();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Route className="w-4 h-4 text-amber-600" />
                                <span className="font-medium">Critical Path (CPM)</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">0d float</span>
                            </button>
                          )}

                          {canViewRecovery && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenRecoveryPlan();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-amber-600" />
                                <span className="font-medium">Recovery & Resequence</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1 rounded">+3d</span>
                            </button>
                          )}

                          {canViewStore && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenMaterialStore?.();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] transition-colors text-left cursor-pointer"
                            >
                              <Package className="w-4 h-4 text-[#653ef1]" />
                              <span className="font-medium">Material Store & Inventory</span>
                            </button>
                          )}

                          {canViewBilling && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenBilling?.();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] transition-colors text-left cursor-pointer"
                            >
                              <Receipt className="w-4 h-4 text-emerald-600" />
                              <span className="font-medium">Billing Khata & Parties</span>
                            </button>
                          )}

                          {onShareTimelineWhatsApp && (
                            <button
                              type="button"
                              onClick={() => {
                                onShareTimelineWhatsApp();
                                setIsToolsOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <span className="font-medium">Share Timeline (WhatsApp)</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Quick</span>
                            </button>
                          )}

                          {canAddTask && (
                            <>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  onAddWorkPackage();
                                  setIsToolsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] transition-colors text-left cursor-pointer"
                              >
                                <Layers className="w-4 h-4 text-slate-500" />
                                <span className="font-medium">+ Add Work Package</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Modern Executive User Profile Pill & Dropdown Card */}
              {userEmail && (
                <div className="relative shrink-0 pl-1 border-l border-slate-200" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
                      isProfileMenuOpen
                        ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100 text-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:border-slate-300'
                    }`}
                    title="User Account & Session"
                  >
                    {/* Avatar with gradient & online dot */}
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center font-bold text-xs shadow-2xs shadow-[#653ef1]/25">
                        {userEmail.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    {/* User display details (hidden on small screens, clean on medium/large) */}
                    <div className="hidden lg:flex flex-col text-left leading-tight min-w-0 max-w-[130px]">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {userEmail.split('@')[0]}
                      </span>
                      <span className="text-[10px] font-semibold text-[#653ef1] uppercase tracking-wider">
                        {userRole || 'Admin'}
                      </span>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${isProfileMenuOpen ? 'rotate-180 text-[#653ef1]' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu Card */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                      
                      {/* User Header Info Card */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#653ef1]/25 shrink-0">
                            {userEmail.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {userEmail}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#653ef1] border border-purple-200 capitalize">
                                <ShieldCheck className="w-3 h-3 text-[#653ef1]" />
                                <span>{userRole || 'Administrator'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Current Active Workspace Info */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Active Site:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                            {project.name}
                          </span>
                        </div>
                      </div>

                      {/* Navigation & Action Links */}
                      <div className="p-1.5 space-y-0.5">
                        {canViewSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              onOpenSettings();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer text-left"
                          >
                            <Settings className="w-4 h-4 text-slate-500" />
                            <span>Project Baseline Settings</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSiteSwitcherOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Building2 className="w-4 h-4 text-[#653ef1]" />
                          <span>Switch Construction Site</span>
                        </button>
                      </div>

                      {/* Sign Out Option */}
                      {onSignOut && (
                        <div className="pt-1.5 mt-1 border-t border-slate-100 px-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              onSignOut();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left group"
                          >
                            <LogOut className="w-4 h-4 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                            <span>Sign Out of Software</span>
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Row 2: Clean Executive KPI Ribbon (Rendered on Planning Schedule Views) */}
        {isPlanningView && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            
            {/* Metric 1: Duration */}
            {(() => {
              const dur = calculateDurationDetails(project.plannedStartDate, project.plannedCompletionDate);
              return (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs transition-all hover:bg-slate-100/70" 
                  title={`Timeline: ${project.plannedStartDate} to ${project.plannedCompletionDate} (${dur.days} calendar days / ${dur.decimalMonths} months)`}
                >
                  <div className="w-5 h-5 rounded-lg bg-purple-50 text-[#653ef1] flex items-center justify-center shrink-0">
                    <Clock className="w-3 h-3" />
                  </div>
                  <span className="text-slate-500 text-[11px] font-medium">Duration:</span>
                  <span className="font-bold text-slate-900 font-numeric">
                    {dur.formatted}
                  </span>
                </div>
              );
            })()}

            {/* Metric 2: Schedule Plan */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs transition-all hover:bg-slate-100/70">
              <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-3 h-3" />
              </div>
              <span className="text-slate-500 text-[11px] font-medium">Schedule:</span>
              <span className="font-semibold text-slate-800 font-numeric">
                {formatDisplayDate(project.plannedStartDate)} &rarr; {formatDisplayDate(project.plannedCompletionDate)}
              </span>
            </div>

            {/* Metric 3: Forecast & Variance */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs transition-all hover:bg-slate-100/70">
              <div className="w-5 h-5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="w-3 h-3" />
              </div>
              <span className="text-slate-500 text-[11px] font-medium">Forecast:</span>
              <span className="font-bold text-slate-900 font-numeric">
                {formatDisplayDate(project.forecastCompletionDate)}
              </span>
              {(() => {
                const variance = Math.round((new Date(project.forecastCompletionDate).getTime() - new Date(project.plannedCompletionDate).getTime()) / (1000 * 60 * 60 * 24));
                if (variance > 0) {
                  return (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200 font-numeric">
                      +{variance}d delay
                    </span>
                  );
                } else if (variance < 0) {
                  return (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 font-numeric">
                      {Math.abs(variance)}d ahead
                    </span>
                  );
                }
                return (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 font-numeric">
                    On Time
                  </span>
                );
              })()}
            </div>

            {/* Metric 4: Progress Bar */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200/80 shadow-2xs transition-all hover:bg-purple-50">
              <div className="w-5 h-5 rounded-lg bg-purple-100 text-[#653ef1] flex items-center justify-center shrink-0">
                <TrendingUp className="w-3 h-3" />
              </div>
              <span className="text-slate-500 text-[11px] font-medium">Progress:</span>
              <span className="font-extrabold text-[#653ef1] font-numeric">{project.overallProgress}%</span>
              <div className="w-20 h-2 bg-slate-200/80 rounded-full overflow-hidden shrink-0">
                <div 
                  className="h-full bg-gradient-to-r from-[#653ef1] to-[#8b5cf6] rounded-full transition-all duration-500" 
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
            </div>

            {/* Metric 5: General Contractor */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">GC:</span>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={project.generalContractor}>
                {project.generalContractor || 'Primary Contractor'}
              </span>
            </div>

          </div>
        )}
      </div>
    </header>
  );
};
