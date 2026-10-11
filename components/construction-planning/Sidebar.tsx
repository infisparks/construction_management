'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { ViewMode, ProjectInfo, FileCategory } from '@/lib/construction-planning/types';

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
  onSignOut?: () => void;
  activeArchiveCategory?: FileCategory | 'all';
  onSelectArchiveCategory?: (category: FileCategory | 'all') => void;
  activeInventoryTab?: 'products' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'vendors';
  onSelectInventoryTab?: (tab: 'products' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'vendors') => void;
  onOpenMaterialAction?: (action: 'check_in' | 'check_out' | 'return' | 'damage') => void;
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
    id: 'execution',
    label: 'Site Execution',
    shortLabel: 'Site',
    icon: HardHat,
    description: 'Daily logs & progress reporting',
  },
  {
    id: 'commercial',
    label: 'Commercial & Bills',
    shortLabel: 'Bills',
    icon: FileSpreadsheet,
    badge: 'RA Bills',
    badgeColor: 'bg-purple-100 text-purple-700',
    description: 'Sub-contractor bills & Khata',
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
  {
    id: 'sites',
    label: 'Sites & Multi-Project',
    shortLabel: 'Sites',
    icon: Building2,
    badge: 'Cloud',
    badgeColor: 'bg-purple-100 text-purple-700',
    description: 'Switch sites & Supabase workspaces',
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
  onSignOut,
  activeArchiveCategory,
  onSelectArchiveCategory,
  activeInventoryTab = 'catalog',
  onSelectInventoryTab,
  onOpenMaterialAction,
}) => {
  // Determine active module based on current view or user selection
  const [activeModule, setActiveModule] = useState<NavModuleId>(() => {
    if (currentView === 'files-archive') return 'archive';
    if (currentView === 'subcontractor-bills' || currentView === 'billing') return 'commercial';
    if (currentView === 'materials') return 'materials';
    if (currentView === 'progress') return 'execution';
    return 'planning';
  });

  // State for floating flyout when collapsed
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Sync active module if currentView changes externally
  useEffect(() => {
    if (currentView === 'files-archive') {
      setActiveModule('archive');
    } else if (currentView === 'subcontractor-bills' || currentView === 'billing') {
      setActiveModule('commercial');
    } else if (currentView === 'materials') {
      setActiveModule('materials');
    } else if (currentView === 'progress') {
      setActiveModule('execution');
    } else if (currentView === 'list' || currentView === 'gantt' || currentView === 'critical' || currentView === 'milestones') {
      setActiveModule('planning');
    }
  }, [currentView]);

  const closeAllPanels = () => {
    onCloseMobile();
    setFlyoutOpen(false);
  };

  const handleModuleClick = (modId: NavModuleId) => {
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
    // Auto switch to default view for certain single-view modules
    if (modId === 'archive') {
      if (onSelectArchiveCategory) {
        onSelectArchiveCategory('all');
      }
      onViewChange('files-archive');
    } else if (modId === 'materials') {
      if (onSelectInventoryTab) {
        onSelectInventoryTab('catalog');
      }
      onViewChange('materials');
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
          <div className="space-y-5">
            {/* Group 1: All Files & Drawings */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Drawings & Engineering (Vault)
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCatActive('all')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderKanban className={`w-4 h-4 shrink-0 ${isCatActive('all') ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">All Project Documents</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Vault
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('Architectural drawings')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('Architectural drawings')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className={`w-4 h-4 shrink-0 ${isCatActive('Architectural drawings') ? 'text-purple-600' : 'text-rose-500'}`} />
                    <span className="truncate">Architectural Drawings</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('Structural and RCC drawings')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('Structural and RCC drawings')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className={`w-4 h-4 shrink-0 ${isCatActive('Structural and RCC drawings') ? 'text-purple-600' : 'text-purple-500'}`} />
                    <span className="truncate">Structural & RCC Plans</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('MEP drawings')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('MEP drawings')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Layers className={`w-4 h-4 shrink-0 ${isCatActive('MEP drawings') ? 'text-purple-600' : 'text-amber-500'}`} />
                    <span className="truncate">MEP Drawings</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Group 2: Contracts, BOQs & Reports */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Commercial & Site Reports
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('BOQs and cost estimates')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('BOQs and cost estimates')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isCatActive('BOQs and cost estimates') ? 'text-purple-600' : 'text-emerald-600'}`} />
                    <span className="truncate">BOQs & Cost Estimates</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('Contracts and agreements')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('Contracts and agreements')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Receipt className={`w-4 h-4 shrink-0 ${isCatActive('Contracts and agreements') ? 'text-purple-600' : 'text-indigo-500'}`} />
                    <span className="truncate">Contracts & Legal</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('Site photographs and reports')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('Site photographs and reports')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ImageIcon className={`w-4 h-4 shrink-0 ${isCatActive('Site photographs and reports') ? 'text-purple-600' : 'text-purple-500'}`} />
                    <span className="truncate">Site Photos Gallery</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveCategoryClick('Quality, safety and handover documents')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isCatActive('Quality, safety and handover documents')
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${isCatActive('Quality, safety and handover documents') ? 'text-purple-600' : 'text-emerald-600'}`} />
                    <span className="truncate">Quality & Safety Reports</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'planning':
        return (
          <div className="space-y-5">
            {/* Group 1 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WBS & Schedule Timeline
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('list');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'list'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'gantt'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'critical'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'milestones'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Milestone className={`w-4 h-4 shrink-0 ${currentView === 'milestones' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Project Milestones</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Group 2 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Baseline Controls
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenRecoveryPlan();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Recovery & Resequence</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    +3d
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
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

      case 'execution':
        return (
          <div className="space-y-5">
            {/* Group 1 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Site Operations & Logs
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('progress');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'progress'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ClipboardList className={`w-4 h-4 shrink-0 ${currentView === 'progress' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Daily Progress Log</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenRecordProgress();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <HardHat className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Record Site Progress</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 shrink-0">
                    + Log
                  </span>
                </button>
              </div>
            </div>

            {/* Group 2 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Execution Intelligence
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('critical');
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Route className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Critical Activities</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    Focus
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenRecoveryPlan();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Delay Impact & Catch-Up</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-5">
            {/* Group 1 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sub-Contractor Bills (RA)
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('subcontractor-bills');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'subcontractor-bills'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileSpreadsheet className={`w-4 h-4 shrink-0 ${currentView === 'subcontractor-bills' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Sub-Contractor Bills</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    RA Bills
                  </span>
                </button>
              </div>
            </div>

            {/* Group 2 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Financial Khata & Parties
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialBilling?.('billing');
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Parties & Billing Khata</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    GST
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialBilling?.('parties');
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Parties & Contractor List</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'materials':
        return (
          <div className="space-y-4">
            {/* Quick Movement & Action Popup in Sidebar */}
            <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                  Quick Action Popup
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 font-bold">
                  Live Stock
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialAction?.('check_in');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Open Check-In Goods Modal"
                >
                  <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                  <span>+ In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialAction?.('check_out');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Open Check-Out & View Full History"
                >
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                  <span>- Out</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialAction?.('return');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Open Vendor Return Modal"
                >
                  <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                  <span>- Return</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialAction?.('damage');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Open Damage / Scrap Modal"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>- Damaged</span>
                </button>
              </div>
            </div>

            {/* Group 0: Master Profiles (Database Tables) */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
                <span>Master Profiles (Supabase)</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                  2 Tables
                </span>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('products');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'products'
                      ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'products' ? 'text-purple-700' : 'text-purple-600'}`} />
                    <span className="truncate">Product Profiles</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    profile_product
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('vendors');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'vendors'
                      ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'vendors' ? 'text-purple-700' : 'text-purple-600'}`} />
                    <span className="truncate">Vendor & Parties Profiles</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    profile_vendor
                  </span>
                </button>
              </div>
            </div>

            {/* Group 1: Store & Receipts */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Site Inventory & Stock
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('catalog');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'catalog'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'catalog' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Material Store & Stock</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Stock
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('inward');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'inward'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ArrowDownLeft className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'inward' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Inward Goods Register (GRN)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    + In
                  </span>
                </button>
              </div>
            </div>

            {/* Group 2: Issues, Dispatches & Returns */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Site Requisition & Usage
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('outward');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'outward'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ArrowUpRight className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'outward' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Material Issue & Dispatch (MIN)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    - Out
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('returns_damages');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'returns_damages'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <RotateCcw className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'returns_damages' ? 'text-purple-600' : 'text-amber-600'}`} />
                    <span className="truncate">Returns & Damaged Register</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    Ret/Dmg
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('ledger');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'ledger'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <History className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'ledger' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="truncate">Stock History & Ledger</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('low_stock');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'low_stock'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'low_stock' ? 'text-amber-600' : 'text-amber-500'}`} />
                    <span className="truncate">Low Stock Alerts</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    Alert
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectInventoryTab?.('vendors');
                    onViewChange('materials');
                    closeAllPanels();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    currentView === 'materials' && activeInventoryTab === 'vendors'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className={`w-4 h-4 shrink-0 ${currentView === 'materials' && activeInventoryTab === 'vendors' ? 'text-purple-600' : 'text-purple-500'}`} />
                    <span className="truncate">Vendors & Contractors</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    Profiles
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'controls':
        return (
          <div className="space-y-5">
            {/* Group 1 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Fast-Tracking & Recovery
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenRecoveryPlan();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Recovery & Resequence</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    +3d
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewChange('critical');
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Route className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Critical Float Analysis</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Group 2 */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Workspace Configuration
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Baseline Settings</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSitesManager?.();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Sites Multi-Project</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                    Supabase
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'sites':
        return (
          <div className="space-y-5">
            {/* Group 1 */}
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">Sites Manager (Supabase)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 shrink-0">
                    Active
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSitesManager?.();
                    closeAllPanels();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Switch Active Site</span>
                  </div>
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

  const currentModuleDef = MODULES.find(m => m.id === activeModule) || MODULES[0];

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
              onClick={() => handleModuleClick('planning')}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs font-bold hover:shadow-md transition-all group relative cursor-pointer"
              title="InfiBuild PMS"
            >
              <Building2 className="w-4 h-4 group-hover:scale-105 transition-transform" />
              {/* Tooltip */}
              <div className="absolute left-14 ml-1 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                InfiBuild PMS
              </div>
            </button>

            <div className="w-6 h-px bg-slate-200" />

            {/* Modules Navigation Rail */}
            <div className="flex flex-col items-center gap-1 w-full px-1.5">
              {MODULES.map((mod) => {
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

          {/* Bottom Rail: Toggle, Avatar & Sign Out */}
          <div className="flex flex-col items-center gap-2 w-full px-1.5">
            
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
                  onOpenSitesManager?.();
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
                    onOpenSitesManager?.();
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
