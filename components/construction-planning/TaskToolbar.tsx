'use client';

import React from 'react';
import { 
  ListTree, 
  BarChart2, 
  Route, 
  ClipboardList, 
  Milestone, 
  Search, 
  ChevronsUpDown, 
  Flame, 
  X,
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
    <div className="w-full space-y-3">
      {/* Row 1: Sub-View Navigation Tabs (Left) & Quick Action Pills (Right) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Sub-view Navigation Pill Bar */}
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200/90 rounded-full shadow-2xs overflow-x-auto max-w-full scrollbar-none">
          {views.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6e46f2] to-[#592be8] text-white shadow-md shadow-purple-500/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tree Expand / Collapse & Open / Close All Notes controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Open / Close All Notes (List View Only) */}
          {onToggleAllNotes && currentView === 'list' && (
            <button
              type="button"
              onClick={onToggleAllNotes}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-2xs ${
                areAllNotesOpen
                  ? 'bg-purple-50 text-[#6e46f2] border-purple-200 font-bold ring-2 ring-purple-500/20'
                  : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200/90'
              }`}
              title={areAllNotesOpen ? 'Close all activity notes across table' : 'Open and view all activity notes'}
            >
              <FileText className={`w-3.5 h-3.5 ${areAllNotesOpen ? 'text-[#6e46f2]' : 'text-slate-500'}`} />
              <span>{areAllNotesOpen ? 'Close All Notes' : 'Open All Notes'}</span>
            </button>
          )}

          {/* Expand / Collapse All (List & Gantt View) */}
          {(currentView === 'list' || currentView === 'gantt') && (
            <button
              type="button"
              onClick={isAllExpanded ? onCollapseAll : onExpandAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-full border border-slate-200/90 transition-all cursor-pointer shadow-2xs"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}

          {/* Restore Deleted Tasks (if any) */}
          {deletedTasksCount > 0 && onOpenRestoreModal && (
            <button
              type="button"
              onClick={onOpenRestoreModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/80 rounded-full border border-amber-200/90 transition-all cursor-pointer shadow-2xs"
              title="Restore recently deleted activities"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Restore ({deletedTasksCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Search & Filter Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, codes (e.g. 3.4), or supervisor..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#6e46f2]/20 focus:border-[#6e46f2] transition-all text-slate-900 placeholder-slate-400 font-medium"
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

        {/* Status Dropdown */}
        <div className="flex items-center">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as ScheduleStatus | 'all')}
            className="py-2 px-3 text-xs font-semibold bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6e46f2]/20 cursor-pointer transition-colors"
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

        {/* Floor Filter Dropdown */}
        {availableFloors.length > 0 && (
          <div className="flex items-center">
            <select
              value={floorFilter}
              onChange={(e) => onFloorFilterChange(e.target.value)}
              className="py-2 px-3 text-xs font-semibold bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6e46f2]/20 cursor-pointer transition-colors"
            >
              <option value="all">All Locations / Floors</option>
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>{fl}</option>
              ))}
            </select>
          </div>
        )}

        {/* Schedule Date Filter */}
        {dateFilter && onDateFilterChange && (
          <DateFilterControl
            value={dateFilter}
            onChange={onDateFilterChange}
            label="Schedule Date"
          />
        )}

        {/* Critical Path Toggle Button */}
        <button
          type="button"
          onClick={onCriticalOnlyToggle}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
            criticalOnly
              ? 'bg-[#6e46f2] text-white border-[#6e46f2] shadow-xs ring-2 ring-purple-500/25'
              : 'bg-white hover:bg-purple-50 text-[#6e46f2] border-purple-200/90 shadow-2xs'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${criticalOnly ? 'text-amber-300 animate-soft-pulse' : 'text-[#6e46f2]'}`} />
          <span>Critical Path Only</span>
        </button>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
