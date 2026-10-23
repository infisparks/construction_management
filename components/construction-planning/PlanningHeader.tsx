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
  Wrench
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
  userEmail,
  userRole,
  userPage,
  onSignOut,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const [isSiteSwitcherOpen, setIsSiteSwitcherOpen] = useState(false);
  const siteSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (siteSwitcherRef.current && !siteSwitcherRef.current.contains(e.target as Node)) {
        setIsSiteSwitcherOpen(false);
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
  const hasAnyTools = canViewCritical || canViewRecovery || canViewSubBills || canViewStore || canViewBilling || canAddTask;

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
                <HeaderIcon className="w-5 h-5 text-purple-600 hidden sm:inline-block shrink-0" />
                <span>{headerMeta.title}</span>
              </h1>

              {/* Interactive Site Switcher Dropdown */}
              <div className="relative shrink-0" ref={siteSwitcherRef}>
                <button
                  type="button"
                  onClick={() => setIsSiteSwitcherOpen(!isSiteSwitcherOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    isSiteSwitcherOpen
                      ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100 text-purple-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                  title="Click to switch construction site / workspace"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Site:</span>
                  <span className="font-bold text-slate-900 max-w-[120px] sm:max-w-[190px] truncate">
                    {project.name}
                  </span>
                  <span className="text-[10px] text-purple-700 bg-purple-100/80 px-1 rounded font-mono font-bold">
                    {project.code || 'SITE'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${isSiteSwitcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Site Switcher Popup Menu */}
                {isSiteSwitcherOpen && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                        Switch Construction Site
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
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
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200 shadow-2xs'
                                  : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                  isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  #{p.serial_no || 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">
                                    {p.name}
                                  </div>
                                  {(p.location || p.address) && (
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {p.location || p.address}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

                    <div className="pt-1.5 mt-1 border-t border-slate-100 px-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSiteSwitcherOpen(false);
                          onOpenSitesManager?.();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
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
              
              {/* Secondary Action: Log Daily Progress */}
              {canLogProgress && (
                <button
                  type="button"
                  onClick={onRecordProgress}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title="Record daily site execution progress"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Log Progress</span>
                  <span className="sm:hidden">Log</span>
                </button>
              )}

              {/* Primary Action: Add Task */}
              {canAddTask && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer"
                  title="Add new construction WBS task"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Task</span>
                </button>
              )}

              {/* Quick Tools & Modules Dropdown */}
              {hasAnyTools && (
                <div className="relative" ref={toolsRef}>
                  <button
                    type="button"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isToolsOpen 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="Quick Tools & Special Views"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Tools</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isToolsOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Quick Tools & Modules
                      </div>
                      
                      {canViewCritical && (
                        <button
                          type="button"
                          onClick={() => {
                            onViewCriticalPath();
                            setIsToolsOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Route className="w-4 h-4 text-purple-600" />
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
                          className="w-full flex items-center justify-between px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                            <span className="font-medium">Recovery & Resequence</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1 rounded">+3d</span>
                        </button>
                      )}

                      {/* Preserved for future use: canViewSubBills */}
                      {false && canViewSubBills && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSubcontractorBills?.();
                            setIsToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">Sub-Contractor RA Bills</span>
                        </button>
                      )}

                      {canViewStore && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenMaterialStore?.();
                            setIsToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <Package className="w-4 h-4 text-indigo-600" />
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
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium">Billing Khata & Parties</span>
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
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
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

              {/* Baseline Settings Icon */}
              {canViewSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  title="Project Baseline Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* User Avatar / Sign Out */}
              {userEmail && (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
                  <div 
                    className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200 shadow-2xs"
                    title={`${userEmail} (${userRole || 'admin'})`}
                  >
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Row 2: Clean KPI Ribbon (Rendered on Planning Schedule Views) */}
        {isPlanningView && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs">
            
            {(() => {
              const dur = calculateDurationDetails(project.plannedStartDate, project.plannedCompletionDate);
              return (
                <div 
                  className="flex items-center gap-1.5" 
                  title={`Timeline: ${project.plannedStartDate} to ${project.plannedCompletionDate} (${dur.days} calendar days / ${dur.decimalMonths} months)`}
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-slate-500 text-[11px]">Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {dur.formatted}
                  </span>
                </div>
              );
            })()}

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 text-[11px]">Schedule:</span>
              <span className="font-medium text-slate-800">
                {formatDisplayDate(project.plannedStartDate)} &rarr; {formatDisplayDate(project.plannedCompletionDate)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-500 text-[11px]">Forecast:</span>
              <span className="font-semibold text-slate-800">
                {formatDisplayDate(project.forecastCompletionDate)}
              </span>
              {(() => {
                const variance = Math.round((new Date(project.forecastCompletionDate).getTime() - new Date(project.plannedCompletionDate).getTime()) / (1000 * 60 * 60 * 24));
                if (variance > 0) {
                  return (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 font-mono">
                      +{variance}d delay
                    </span>
                  );
                } else if (variance < 0) {
                  return (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                      {Math.abs(variance)}d ahead
                    </span>
                  );
                }
                return (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    On Time
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-slate-500 text-[11px]">Progress:</span>
              <span className="font-bold text-purple-700 font-mono">{project.overallProgress}%</span>
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                <div 
                  className="h-full bg-purple-600 rounded-full transition-all duration-500" 
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">GC:</span>
              <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]" title={project.generalContractor}>
                {project.generalContractor}
              </span>
            </div>

          </div>
        )}
      </div>
    </header>
  );
};
