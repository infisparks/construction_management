'use client';

import React from 'react';
import { 
  ListTree, 
  BarChart2, 
  Route, 
  ClipboardList, 
  Milestone, 
  Search, 
  Filter, 
  ChevronsUpDown, 
  Flame, 
  X,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  RotateCcw
} from 'lucide-react';
import { ViewMode, ScheduleStatus } from '@/lib/construction-planning/types';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';

interface TaskToolbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ScheduleStatus | 'all';
  onStatusFilterChange: (status: ScheduleStatus | 'all') => void;
  criticalOnly: boolean;
  onCriticalOnlyToggle: () => void;
  floorFilter: string;
  onFloorFilterChange: (floor: string) => void;
  availableFloors: string[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isAllExpanded: boolean;
  dateFilter?: DateFilterState;
  onDateFilterChange?: (filter: DateFilterState) => void;
  areAllNotesOpen?: boolean;
  onToggleAllNotes?: () => void;
  onOpenRestoreModal?: () => void;
  deletedTasksCount?: number;
}

export const TaskToolbar: React.FC<TaskToolbarProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  criticalOnly,
  onCriticalOnlyToggle,
  floorFilter,
  onFloorFilterChange,
  availableFloors,
  onExpandAll,
  onCollapseAll,
  isAllExpanded,
  dateFilter,
  onDateFilterChange,
  areAllNotesOpen,
  onToggleAllNotes,
  onOpenRestoreModal,
  deletedTasksCount = 0,
}) => {
  const views: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'list', label: 'Task List', icon: ListTree },
    { id: 'gantt', label: 'Gantt Chart', icon: BarChart2 },
    { id: 'critical', label: 'Critical Path', icon: Route },
    { id: 'progress', label: 'Daily Progress', icon: ClipboardList },
    { id: 'milestones', label: 'Milestones', icon: Milestone },
    // Preserved for future use:
    // { id: 'subcontractor-bills', label: 'Sub-Contractor Bills', icon: FileSpreadsheet },
  ];

  const hasActiveFilters = 
    searchQuery !== '' || 
    statusFilter !== 'all' || 
    criticalOnly || 
    floorFilter !== 'all' ||
    (dateFilter ? isDateFilterActive(dateFilter) : false);

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    if (criticalOnly) onCriticalOnlyToggle();
    onFloorFilterChange('all');
    if (onDateFilterChange) onDateFilterChange(DEFAULT_DATE_FILTER);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs space-y-3">
      {/* Top row: View Switcher and Expand/Collapse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* View Switcher Tabs */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 overflow-x-auto max-w-full">
          {views.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#653ef1] shadow-2xs font-bold border border-[#653ef1]/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#653ef1]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tree Expand / Collapse & Open / Close All Notes controls for List & Gantt views */}
        {(currentView === 'list' || currentView === 'gantt') && (
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {onToggleAllNotes && currentView === 'list' && (
              <button
                type="button"
                onClick={onToggleAllNotes}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                  areAllNotesOpen
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                    : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
                }`}
                title={areAllNotesOpen ? 'Close all activity notes across table' : 'Open and view all activity notes'}
              >
                <FileText className={`w-3.5 h-3.5 ${areAllNotesOpen ? 'text-amber-600' : 'text-slate-500'}`} />
                <span>{areAllNotesOpen ? 'Close All Notes' : 'Open All Notes'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={isAllExpanded ? onCollapseAll : onExpandAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom row: Search & Filters */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-slate-100">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, codes (e.g. 3.4), or supervisor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] transition-all text-slate-900 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as ScheduleStatus | 'all')}
            className="py-1.5 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="ready_to_start">Ready to Start</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
            <option value="blocked">Blocked</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>

        {/* Floor Filter */}
        {availableFloors.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={floorFilter}
              onChange={(e) => onFloorFilterChange(e.target.value)}
              className="py-1.5 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="all">All Locations / Floors</option>
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>{fl}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter: Range + Particular Date */}
        {dateFilter && onDateFilterChange && (
          <DateFilterControl
            value={dateFilter}
            onChange={onDateFilterChange}
            label="Schedule Date"
          />
        )}

        {/* Critical Path Toggle */}
        <button
          onClick={onCriticalOnlyToggle}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            criticalOnly
              ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-100 font-bold shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${criticalOnly ? 'text-amber-600 animate-soft-pulse' : 'text-slate-400'}`} />
          <span>Critical Path Only</span>
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
