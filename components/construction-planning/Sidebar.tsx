'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Calendar, 
  Receipt, 
  Package, 
  FolderKanban, 
  LogOut, 
  X,
  Sparkles
} from 'lucide-react';
import { ViewMode, ProjectInfo, FileCategory } from '@/lib/construction-planning/types';
import { isModuleAllowed } from '@/lib/auth/role-access';

export type NavModuleId = 'planning' | 'execution' | 'commercial' | 'materials' | 'archive' | 'sites';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  project: ProjectInfo;
  onOpenRecoveryPlan?: () => void;
  onOpenSettings?: () => void;
  onOpenRecordProgress?: () => void;
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

// Clean core modules (Controls module hidden as requested)
const MODULES: NavModuleDef[] = [
  {
    id: 'planning',
    label: 'Timeline & Schedule',
    shortLabel: 'Timeline',
    icon: Calendar,
    description: 'WBS, Gantt timelines & CPM float',
  },
  {
    id: 'commercial',
    label: 'Commercial & Bills',
    shortLabel: 'Bills',
    icon: Receipt,
    badge: 'Live',
    badgeColor: 'bg-purple-100 text-[#653ef1]',
    description: 'Site expenses, work orders & Khata',
  },
  {
    id: 'materials',
    label: 'Material Store',
    shortLabel: 'Store',
    icon: Package,
    badge: 'Stock',
    badgeColor: 'bg-purple-100 text-[#653ef1]',
    description: 'Inventory, inward & stock vouchers',
  },
  {
    id: 'archive',
    label: 'Files & Documents Archive',
    shortLabel: 'Docs',
    icon: FolderKanban,
    badge: 'Vault',
    badgeColor: 'bg-purple-100 text-[#653ef1]',
    description: 'Central document repository',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isMobileOpen,
  onCloseMobile,
  project,
  userEmail,
  userRole,
  userPage,
  onSignOut,
  onSelectArchiveCategory,
}) => {
  const router = useRouter();

  // Filter modules based on userRole and userPage
  const visibleModules = React.useMemo(() => {
    return MODULES.filter((mod) => isModuleAllowed(mod.id, userRole, userPage));
  }, [userRole, userPage]);

  // Determine active module based on currentView
  const [activeModule, setActiveModule] = useState<NavModuleId>(() => {
    if (currentView === 'files-archive') return 'archive';
    if (currentView === 'expenses' || currentView === 'subcontractor-bills' || currentView === 'billing' || currentView === 'contractor-work-orders') return 'commercial';
    if (currentView === 'materials') return 'materials';
    return 'planning';
  });

  // Sync active module if currentView changes externally
  useEffect(() => {
    if (currentView === 'files-archive') {
      setActiveModule('archive');
    } else if (currentView === 'expenses' || currentView === 'subcontractor-bills' || currentView === 'billing' || currentView === 'contractor-work-orders') {
      setActiveModule('commercial');
    } else if (currentView === 'materials') {
      setActiveModule('materials');
    } else if (currentView === 'list' || currentView === 'gantt' || currentView === 'critical' || currentView === 'milestones' || currentView === 'progress') {
      setActiveModule('planning');
    }
  }, [currentView]);

  // Ensure activeModule is valid
  useEffect(() => {
    if (visibleModules.length > 0 && !visibleModules.some((m) => m.id === activeModule)) {
      setActiveModule(visibleModules[0].id);
    }
  }, [visibleModules, activeModule]);

  // Direct navigation on module click - NO subsidebar opens!
  const handleModuleClick = (modId: NavModuleId) => {
    if (!isModuleAllowed(modId, userRole, userPage)) return;

    setActiveModule(modId);
    onCloseMobile();

    if (modId === 'planning') {
      onViewChange('list');
    } else if (modId === 'commercial') {
      onViewChange('expenses');
    } else if (modId === 'materials') {
      onViewChange('materials');
    } else if (modId === 'archive') {
      if (onSelectArchiveCategory) {
        onSelectArchiveCategory('all');
      }
      onViewChange('files-archive');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Single Rail Sidebar (Fixed width w-[72px], WebKitX Electric Violet theme) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[72px] bg-gradient-to-b from-[#6e46f2] via-[#653ef1] to-[#592be8] border-r border-[#542be3] shadow-lg shadow-[#653ef1]/20 flex flex-col justify-between items-center py-3.5 select-none transition-transform duration-300 ${
          isMobileOpen 
            ? 'translate-x-0' 
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ======================================================== */}
        {/* TOP SECTION: Brand Logo & Navigation Icons */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center gap-3.5 w-full">
          
          {/* Brand Logo Button */}
          <button
            type="button"
            onClick={() => handleModuleClick(visibleModules[0]?.id || 'planning')}
            className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shadow-xs border border-white/25 font-bold hover:scale-105 active:scale-95 transition-all group relative cursor-pointer"
            title="Armee Enterprises PMS"
          >
            <Building2 className="w-5 h-5 group-hover:rotate-3 transition-transform text-white" />
            
            {/* Live Indicator Dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#653ef1] animate-soft-pulse" />

            {/* Hover Tooltip */}
            <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[#281760] text-white text-xs font-semibold rounded-xl shadow-2xl border border-purple-400/20 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50">
              <div className="font-bold flex items-center gap-1.5 text-white">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Armee Enterprises PMS</span>
              </div>
              <div className="text-[10px] text-purple-200/80 font-normal">Active Project Workspace</div>
            </div>
          </button>

          {/* Thin Divider */}
          <div className="w-8 h-px bg-white/20" />

          {/* Navigation Items (Direct Switch, No Sub-Sidebar) */}
          <nav className="flex flex-col items-center gap-2.5 w-full px-2" aria-label="Main Navigation">
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              const isCurrent = activeModule === mod.id;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleModuleClick(mod.id)}
                  className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group cursor-pointer ${
                    isCurrent
                      ? 'bg-white text-[#653ef1] shadow-lg shadow-black/15 font-bold scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95'
                  }`}
                  title={mod.label}
                >
                  <Icon 
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isCurrent 
                        ? 'text-[#653ef1] stroke-[2.4]' 
                        : 'text-white/85 group-hover:text-white'
                    }`} 
                  />
                  <span className={`text-[10px] tracking-tight leading-none block truncate max-w-[54px] ${
                    isCurrent ? 'font-bold text-[#653ef1]' : 'font-medium text-white/85 group-hover:text-white'
                  }`}>
                    {mod.shortLabel}
                  </span>

                  {/* Badge Pill/Dot */}
                  {mod.badge && !isCurrent && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-[#653ef1] animate-soft-pulse" />
                  )}

                  {/* Desktop Hover Flyout Tooltip */}
                  <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[#281760] text-white text-xs rounded-xl shadow-2xl border border-purple-400/20 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 text-left">
                    <div className="font-semibold flex items-center gap-1.5 text-white">
                      <span>{mod.label}</span>
                      {mod.badge && (
                        <span className="text-[10px] text-purple-200 font-mono font-bold bg-white/10 px-1.5 py-0.2 rounded-full">
                          {mod.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-purple-200/70 font-normal mt-0.5">
                      {mod.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

        </div>

        {/* ======================================================== */}
        {/* BOTTOM SECTION: Sites Switcher, User Avatar & Sign Out */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center gap-2.5 w-full px-2">
          
          {/* Sites Multi-Project Switcher Button */}
          <button
            type="button"
            onClick={() => {
              router.push('/sites');
              onCloseMobile();
            }}
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-white/80 hover:text-white hover:bg-white/15 transition-all relative group cursor-pointer border border-transparent hover:border-white/20 hover:scale-105 active:scale-95"
            title="Switch Construction Site"
          >
            <Building2 className="w-4.5 h-4.5 text-white transition-transform group-hover:scale-110" />
            <span className="text-[9px] font-semibold tracking-tight leading-none text-white/85 group-hover:text-white">
              Sites
            </span>

            {/* Hover Tooltip */}
            <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[#281760] text-white text-xs rounded-xl shadow-2xl border border-purple-400/20 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 text-left">
              <div className="font-semibold text-xs flex items-center gap-1.5 text-white">
                <Building2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Switch Construction Site</span>
              </div>
              <div className="text-[10px] text-purple-200/80 font-normal truncate max-w-[180px] mt-0.5">
                Current: {project.name}
              </div>
            </div>
          </button>

          {/* Thin Divider */}
          <div className="w-8 h-px bg-white/20" />

          {/* User Avatar Circle */}
          <div 
            className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 text-white border border-white/25 flex items-center justify-center font-bold text-xs shadow-xs group relative cursor-pointer hover:scale-105 transition-transform"
            title={userEmail || 'admin@gmail.com'}
          >
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#653ef1] animate-soft-pulse" />
            
            {/* Tooltip */}
            <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[#281760] text-white text-xs rounded-xl shadow-2xl border border-purple-400/20 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 text-left">
              <div className="font-semibold text-[11px] truncate max-w-[180px] text-white">{userEmail || 'admin@gmail.com'}</div>
              <div className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">{userRole || 'admin'}</div>
            </div>
          </div>

          {/* Sign Out Button */}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-rose-200 hover:bg-rose-500/25 transition-colors cursor-pointer group relative hover:scale-105 active:scale-95"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <div className="absolute left-[76px] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#281760] text-rose-300 text-xs rounded-lg shadow-lg border border-purple-400/20 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50">
                Sign Out
              </div>
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 mt-1 cursor-pointer"
            title="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </aside>
    </>
  );
};
