'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ListTree, 
  Calendar, 
  Route, 
  ClipboardList, 
  Milestone, 
  RotateCcw, 
  CheckSquare, 
  Layers, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  HardHat, 
  FileSpreadsheet,
  Package,
  Receipt,
  X,
  LogOut,
  Sliders,
  FolderKanban,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Pin,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  AlertTriangle,
  Plus,
  Printer,
  Download,
  Clock,
  ExternalLink
} from 'lucide-react';
import { ViewMode, ProjectInfo, FileCategory } from '@/lib/construction-planning/types';
import { isModuleAllowed, isViewAllowed, isOnlyAllowRole } from '@/lib/auth/role-access';

export type NavModuleId = 'planning' | 'execution' | 'commercial' | 'materials' | 'archive' | 'controls' | 'sites';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  project: ProjectInfo;
  onOpenRecoveryPlan: () => void;
  onOpenSettings: () => void;
  onOpenRecordProgress: () => void;
  onOpenMaterialBilling?: (tab?: 'materials' | 'parties' | 'billing') => void;
  onOpenSitesManager?: () => void;
  userEmail?: string;
  userRole?: string;
  userPage?: string | null;
  onSignOut?: () => void;
  activeArchiveCategory?: FileCategory | 'all';
  onSelectArchiveCategory?: (category: FileCategory | 'all') => void;
  activeInventoryTab?: 'products' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'vendors';
  onSelectInventoryTab?: (tab: 'products' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'vendors') => void;
  onOpenMaterialAction?: (action: 'check_in' | 'check_out' | 'return' | 'damage') => void;
  onOpenExpenseAction?: (action: string) => void;
  onAddTask?: () => void;
  onAddWorkPackage?: () => void;
}

interface NavModuleDef {
  id: NavModuleId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  description: string;
}

const MODULES: NavModuleDef[] = [
  {
    id: 'planning',
    label: 'Planning & Schedule',
    shortLabel: 'Plan',
    icon: Calendar,
    description: 'WBS, Gantt timelines & CPM float',
  },
  {
    id: 'commercial',
    label: 'Commercial & Bills',
    shortLabel: 'Bills',
    icon: Receipt,
    badge: 'Live',
    badgeColor: 'bg-purple-100 text-purple-700',
    description: 'Site expenses, subcontractor bills & Khata',
  },
  {
    id: 'materials',
    label: 'Material Store',
    shortLabel: 'Store',
    icon: Package,
    badge: 'Stock',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    description: 'Inventory, inward & stock vouchers',
  },
  {
    id: 'archive',
    label: 'Files & Documents Archive',
    shortLabel: 'Docs',
    icon: FolderKanban,
    badge: 'Vault',
    badgeColor: 'bg-purple-100 text-purple-700',
    description: 'Module 3: Central document repository',
  },
  {
    id: 'controls',
    label: 'Controls & Risk',
    shortLabel: 'Controls',
    icon: Sliders,
    badge: '+3d',
    badgeColor: 'bg-amber-100 text-amber-800',
    description: 'Recovery plans & baseline configs',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  project,
  onOpenRecoveryPlan,
  onOpenSettings,
  onOpenRecordProgress,
  onOpenMaterialBilling,
  onOpenSitesManager,
  userEmail,
  userRole,
  userPage,
  onSignOut,
  activeArchiveCategory,
  onSelectArchiveCategory,
  activeInventoryTab = 'catalog',
  onSelectInventoryTab,
  onOpenMaterialAction,
  onOpenExpenseAction,
  onAddTask,
  onAddWorkPackage,
}) => {
  const router = useRouter();

  // Filter modules based on userRole and userPage (restricted for 'onlyallow' role)
  const visibleModules = React.useMemo(() => {
    return MODULES.filter((mod) => isModuleAllowed(mod.id, userRole, userPage));
  }, [userRole, userPage]);

  // Determine active module based on current view or user selection
  const [activeModule, setActiveModule] = useState<NavModuleId>(() => {
    if (currentView === 'files-archive') return 'archive';
    if (currentView === 'expenses' || currentView === 'subcontractor-bills' || currentView === 'billing') return 'commercial';
    if (currentView === 'materials') return 'materials';
    if (currentView === 'progress') return 'planning';
    return 'planning';
  });

  // State for floating flyout when collapsed
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Sync active module if currentView changes externally
  useEffect(() => {
    if (currentView === 'files-archive' && isModuleAllowed('archive', userRole, userPage)) {
      setActiveModule('archive');
    } else if ((currentView === 'expenses' || currentView === 'subcontractor-bills' || currentView === 'billing') && isModuleAllowed('commercial', userRole, userPage)) {
      setActiveModule('commercial');
    } else if (currentView === 'materials' && isModuleAllowed('materials', userRole, userPage)) {
      setActiveModule('materials');
    } else if ((currentView === 'list' || currentView === 'gantt' || currentView === 'critical' || currentView === 'milestones' || currentView === 'progress') && isModuleAllowed('planning', userRole, userPage)) {
      setActiveModule('planning');
    }
  }, [currentView, userRole, userPage]);

  // Ensure activeModule is one of the visible allowed modules
  useEffect(() => {
    if (visibleModules.length > 0 && !visibleModules.some((m) => m.id === activeModule)) {
      setActiveModule(visibleModules[0].id);
    }
  }, [visibleModules, activeModule]);

  const closeAllPanels = () => {
    onCloseMobile();
    setFlyoutOpen(false);
  };

  const handleModuleClick = (modId: NavModuleId) => {
    if (!isModuleAllowed(modId, userRole, userPage)) return;

    if (isCollapsed) {
      if (activeModule === modId && flyoutOpen) {
        setFlyoutOpen(false);
      } else {
        setActiveModule(modId);
        setFlyoutOpen(true);
      }
    } else {
      setActiveModule(modId);
    }
    // Auto switch to default view for modules
    if (modId === 'planning') {
      onViewChange('list');
    } else if (modId === 'archive') {
      if (onSelectArchiveCategory) {
        onSelectArchiveCategory('all');
      }
      onViewChange('files-archive');
    } else if (modId === 'commercial') {
      onViewChange('expenses');
    } else if (modId === 'materials') {
      onViewChange('materials');
    } else if (modId === 'execution') {
      onViewChange('progress');
    }
  };

  const isCatActive = (cat: FileCategory | 'all') => {
    if (currentView !== 'files-archive') return false;
    if (cat === 'all') {
      return !activeArchiveCategory || activeArchiveCategory === 'all';
    }
    return activeArchiveCategory === cat;
  };

  const handleArchiveCategoryClick = (cat: FileCategory | 'all') => {
    if (onSelectArchiveCategory) {
      onSelectArchiveCategory(cat);
    }
    onViewChange('files-archive');
    closeAllPanels();
  };

  const handleToggleCollapse = () => {
    setFlyoutOpen(false);
    onToggleCollapse();
  };

  // Subsidebar navigation grouped content definitions per module
  const renderSubSidebarContent = () => {
    switch (activeModule) {
      case 'archive':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Documents & Drawings
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectArchiveCategory) onSelectArchiveCategory('all');
                    onViewChange('files-archive');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'files-archive'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderKanban className={`w-4 h-4 shrink-0 ${currentView === 'files-archive' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Files & Documents Archive</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Vault
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'planning':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WBS & Schedule Views
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('list');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'list'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ListTree className={`w-4 h-4 shrink-0 ${currentView === 'list' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">WBS Task Hierarchy</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewChange('gantt');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'gantt'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Calendar className={`w-4 h-4 shrink-0 ${currentView === 'gantt' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Gantt Chart Timeline</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Live
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewChange('critical');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'critical'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Route className={`w-4 h-4 shrink-0 ${currentView === 'critical' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Critical Path (CPM)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    0d Float
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewChange('milestones');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'milestones'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Milestone className={`w-4 h-4 shrink-0 ${currentView === 'milestones' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Project Milestones</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewChange('progress');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'progress'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <HardHat className={`w-4 h-4 shrink-0 ${currentView === 'progress' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Daily Site Progress Log</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Daily
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Commercial & Bills
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('expenses');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'expenses' || currentView === 'subcontractor-bills'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Receipt className={`w-4 h-4 shrink-0 ${currentView === 'expenses' || currentView === 'subcontractor-bills' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Commercial Bills & Expenses</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Bills
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'materials':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Site Inventory & Stock
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'materials'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className={`w-4 h-4 shrink-0 ${currentView === 'materials' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Material Store & Inventory</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Store
                  </span>
                </button>
              </div>
            </div>
          </div>
        );



      case 'controls':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Controls & Governance
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenRecoveryPlan();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer border border-transparent"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Recovery & Resequence</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    +3d
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer border border-transparent"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Baseline Settings</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'sites':
        return (
          <div className="space-y-4">
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Construction Workspaces
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSitesManager?.();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Sites Multi-Project Manager</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 shrink-0">
                    Active
                  </span>
                </button>
              </div>
            </div>

            {/* Group 2 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Active Project
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-900 truncate">{project.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{project.location}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
                  <span>Code: {project.code}</span>
                  <span className="font-bold text-purple-700">{project.overallProgress}% Done</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const currentModuleDef = visibleModules.find(m => m.id === activeModule) || visibleModules[0] || MODULES[0];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Dual Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 flex select-none ${
          isMobileOpen 
            ? 'translate-x-0 w-[260px]' 
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-14' : 'lg:w-[260px]'}`}
      >
        {/* ======================================================== */}
        {/* TIER 1: PRIMARY MODULE RAIL (w-14 / 56px) */}
        {/* ======================================================== */}
        <div className="w-14 h-full bg-[#F8FAFC] border-r border-slate-200 flex flex-col justify-between items-center py-2.5 shrink-0 z-20">
          
          {/* Top: Brand Logo */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => handleModuleClick(visibleModules[0]?.id || 'planning')}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs font-bold hover:shadow-md transition-all group relative cursor-pointer"
              title="Armee Enterprises PMS"
            >
              <Building2 className="w-4 h-4 group-hover:scale-105 transition-transform" />
              {/* Tooltip */}
              <div className="absolute left-14 ml-1 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Armee Enterprises PMS
              </div>
            </button>

            <div className="w-6 h-px bg-slate-200" />

            {/* Modules Navigation Rail */}
            <div className="flex flex-col items-center gap-1 w-full px-1.5">
              {visibleModules.map((mod) => {
                const Icon = mod.icon;
                const isCurrent = activeModule === mod.id;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleModuleClick(mod.id)}
                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative group cursor-pointer ${
                      isCurrent
                        ? 'bg-purple-100/70 text-purple-700 shadow-2xs font-bold border border-purple-200/80'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={mod.label}
                  >
                    {/* Active Left Indicator Bar */}
                    {isCurrent && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-full" />
                    )}

                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-purple-600 stroke-[2.3]' : 'text-slate-500'}`} />
                    <span className="text-[9px] tracking-tight leading-none block truncate max-w-[38px]">
                      {mod.shortLabel}
                    </span>

                    {/* Badge Dot */}
                    {mod.badge && !isCurrent && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-600 ring-2 ring-white" />
                    )}

                    {/* Hover Flyout Tooltip */}
                    <div className="absolute left-14 ml-1 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      <span className="font-semibold">{mod.label}</span>
                      {mod.badge && (
                        <span className="ml-1.5 text-[10px] text-purple-300 font-mono">({mod.badge})</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Bottom Rail: Sites, Toggle, Avatar & Sign Out */}
          <div className="flex flex-col items-center gap-2 w-full px-1.5">
            
            {/* Sites Multi-Project Switcher Button (Opens separate /sites page) */}
            <button
              type="button"
              onClick={() => {
                router.push('/sites');
                closeAllPanels();
              }}
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-all relative group cursor-pointer border border-transparent hover:border-purple-200"
              title="Switch Construction Site"
            >
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-[9px] font-semibold tracking-tight leading-none text-slate-600 group-hover:text-purple-700">
                Sites
              </span>
              {/* Flyout Tooltip */}
              <div className="absolute left-14 ml-1 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-left">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Switch Construction Site</span>
                </div>
                <div className="text-[10px] text-purple-300 font-normal truncate max-w-[170px] mt-0.5">
                  Current: {project.name}
                </div>
              </div>
            </button>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer group relative"
              title={isCollapsed ? 'Expand navigation panel' : 'Collapse navigation panel'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
              <div className="absolute left-14 ml-1 px-2 py-1 bg-slate-900 text-white text-[11px] rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {isCollapsed ? 'Expand panel' : 'Collapse panel (save space)'}
              </div>
            </button>

            {/* User Avatar Circle */}
            <div 
              className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200 shadow-2xs group relative cursor-pointer"
              title={userEmail || 'admin@gmail.com'}
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              
              <div className="absolute left-14 ml-1 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-left">
                <div className="font-semibold text-[11px] truncate">{userEmail || 'admin@gmail.com'}</div>
                <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">{userRole || 'admin'}</div>
              </div>
            </div>

            {/* Sign Out Button */}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group relative"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <div className="absolute left-14 ml-1 px-2 py-1 bg-slate-900 text-rose-300 text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Sign Out
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TIER 2: DOCKED SUB-SIDEBAR PANEL (w-[204px]) */}
        {/* ======================================================== */}
        <div 
          className={`h-full bg-white flex flex-col justify-between overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'w-0 hidden lg:hidden' : 'w-[204px] flex'
          }`}
        >
          {/* Subsidebar Header: Active Module Title & Close Button */}
          <div className="h-14 px-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Module
                </span>
                {currentModuleDef.badge && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {currentModuleDef.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-xs text-slate-900 truncate">
                {currentModuleDef.label}
              </h3>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop Quick Collapse Button */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Collapse sub-panel to save space"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Active Site Quick Card */}
          <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] text-slate-800 truncate" title={project.name}>
                  {project.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push('/sites');
                  closeAllPanels();
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold border border-purple-200 transition-colors shrink-0 cursor-pointer"
                title="Switch active construction site"
              >
                Switch
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
              <span className="truncate">{project.code || 'SITE-#1'}</span>
              <span className="text-purple-700 font-semibold">{project.overallProgress}%</span>
            </div>
          </div>

          {/* Subsidebar Navigation Items (Grouped inside) */}
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {renderSubSidebarContent()}
          </div>

          {/* Bottom Widget: Overall Progress & Delay Indicator */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-slate-700">Overall Progress</span>
              <span className="font-bold text-purple-700 font-mono">{project.overallProgress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-1.5">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${project.overallProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="truncate">Finish: <strong className="text-slate-700">3 Jul 2027</strong></span>
              <span className="font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 font-mono">
                +3d
              </span>
            </div>
          </div>

        </div>
      </aside>

      {/* ======================================================== */}
      {/* FLOATING FLYOUT SUB-SIDEBAR (When Collapsed) */}
      {/* ======================================================== */}
      {isCollapsed && flyoutOpen && (
        <>
          {/* Subtle click-outside backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-2xs hidden lg:block"
            onClick={() => setFlyoutOpen(false)}
          />

          <div 
            className="fixed top-0 bottom-0 left-14 z-50 w-56 bg-white border-r border-slate-200 shadow-2xl hidden lg:flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 select-none"
          >
            {/* Flyout Header */}
            <div className="h-14 px-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0 pr-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Module
                  </span>
                  {currentModuleDef.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {currentModuleDef.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-xs text-slate-900 truncate">
                  {currentModuleDef.label}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                {/* Pin Button: Docks the sidebar */}
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="p-1 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                  title="Pin sidebar to screen"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setFlyoutOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close flyout menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Site Mini Bar */}
            <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-[11px] text-slate-800 truncate" title={project.name}>
                    {project.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    router.push('/sites');
                    closeAllPanels();
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 cursor-pointer"
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {renderSubSidebarContent()}
            </div>

            {/* Bottom Widget */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold text-slate-700">Site Progress</span>
                <span className="font-bold text-purple-700 font-mono">{project.overallProgress}%</span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
