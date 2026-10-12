'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  ChevronDown, 
  Clock, 
  Target, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export type DateFilterMode = 'all' | 'range' | 'exact';

export interface DateFilterState {
  mode: DateFilterMode;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  exactDate: string; // 'YYYY-MM-DD'
}

export const DEFAULT_DATE_FILTER: DateFilterState = {
  mode: 'all',
  startDate: '',
  endDate: '',
  exactDate: '',
};

/**
 * Helper to check if any date filter is actively restricting items
 */
export function isDateFilterActive(filter: DateFilterState): boolean {
  if (filter.mode === 'range') {
    return Boolean(filter.startDate || filter.endDate);
  }
  if (filter.mode === 'exact') {
    return Boolean(filter.exactDate);
  }
  return false;
}

/**
 * Universal date matching helper for arrays of items with a date field
 */
export function matchesDateFilter(
  itemDate: string | undefined | null,
  filter: DateFilterState
): boolean {
  if (!isDateFilterActive(filter)) return true;
  if (!itemDate) return false;

  // Extract 'YYYY-MM-DD' portion safely (supports ISO strings or simple date strings)
  const normalizedDate = itemDate.length >= 10 ? itemDate.substring(0, 10) : itemDate;

  if (filter.mode === 'exact') {
    if (!filter.exactDate) return true;
    return normalizedDate === filter.exactDate;
  }

  if (filter.mode === 'range') {
    if (filter.startDate && normalizedDate < filter.startDate) {
      return false;
    }
    if (filter.endDate && normalizedDate > filter.endDate) {
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Format YYYY-MM-DD to readable "12 Oct 2026"
 */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeekString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

function getStartOfMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

interface DateFilterControlProps {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
  label?: string;
  className?: string;
  align?: 'left' | 'right';
}

export const DateFilterControl: React.FC<DateFilterControlProps> = ({
  value,
  onChange,
  label = 'Date Filter',
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local draft state inside popover so user can edit cleanly
  const [draftMode, setDraftMode] = useState<DateFilterMode>(value.mode === 'all' ? 'range' : value.mode);
  const [draftStart, setDraftStart] = useState<string>(value.startDate || '');
  const [draftEnd, setDraftEnd] = useState<string>(value.endDate || '');
  const [draftExact, setDraftExact] = useState<string>(value.exactDate || '');

  // Keep draft in sync when popover opens or value changes
  useEffect(() => {
    if (isOpen) {
      setDraftMode(value.mode === 'all' ? 'range' : value.mode);
      setDraftStart(value.startDate || '');
      setDraftEnd(value.endDate || '');
      setDraftExact(value.exactDate || '');
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const active = isDateFilterActive(value);

  const handleApply = () => {
    if (draftMode === 'range') {
      if (!draftStart && !draftEnd) {
        onChange(DEFAULT_DATE_FILTER);
      } else {
        onChange({
          mode: 'range',
          startDate: draftStart,
          endDate: draftEnd,
          exactDate: '',
        });
      }
    } else if (draftMode === 'exact') {
      if (!draftExact) {
        onChange(DEFAULT_DATE_FILTER);
      } else {
        onChange({
          mode: 'exact',
          startDate: '',
          endDate: '',
          exactDate: draftExact,
        });
      }
    }
    setIsOpen(false);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(DEFAULT_DATE_FILTER);
    setDraftStart('');
    setDraftEnd('');
    setDraftExact('');
    setDraftMode('range');
    setIsOpen(false);
  };

  // Quick Preset Actions
  const applyPresetToday = () => {
    const today = getTodayString();
    setDraftMode('exact');
    setDraftExact(today);
    onChange({
      mode: 'exact',
      startDate: '',
      endDate: '',
      exactDate: today,
    });
    setIsOpen(false);
  };

  const applyPresetYesterday = () => {
    const yesterday = getYesterdayString();
    setDraftMode('exact');
    setDraftExact(yesterday);
    onChange({
      mode: 'exact',
      startDate: '',
      endDate: '',
      exactDate: yesterday,
    });
    setIsOpen(false);
  };

  const applyPresetThisWeek = () => {
    const startOfWeek = getStartOfWeekString();
    const today = getTodayString();
    setDraftMode('range');
    setDraftStart(startOfWeek);
    setDraftEnd(today);
    onChange({
      mode: 'range',
      startDate: startOfWeek,
      endDate: today,
      exactDate: '',
    });
    setIsOpen(false);
  };

  const applyPresetThisMonth = () => {
    const startOfMonth = getStartOfMonthString();
    const today = getTodayString();
    setDraftMode('range');
    setDraftStart(startOfMonth);
    setDraftEnd(today);
    onChange({
      mode: 'range',
      startDate: startOfMonth,
      endDate: today,
      exactDate: '',
    });
    setIsOpen(false);
  };

  // Button Label Display
  let badgeLabel = label;
  if (active) {
    if (value.mode === 'range') {
      if (value.startDate && value.endDate) {
        badgeLabel = `${formatShortDate(value.startDate)} – ${formatShortDate(value.endDate)}`;
      } else if (value.startDate) {
        badgeLabel = `From ${formatShortDate(value.startDate)}`;
      } else if (value.endDate) {
        badgeLabel = `Until ${formatShortDate(value.endDate)}`;
      }
    } else if (value.mode === 'exact') {
      badgeLabel = `Date: ${formatShortDate(value.exactDate)}`;
    }
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
          active
            ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100/70'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
        title={active ? 'Click to change or reset date filter' : 'Filter by Start & End date range or specific date'}
      >
        <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-purple-600' : 'text-slate-500'}`} />
        <span className="truncate max-w-[170px] sm:max-w-[220px]">{badgeLabel}</span>

        {active ? (
          <span
            onClick={handleReset}
            role="button"
            title="Clear date filter"
            className="ml-1 p-0.5 rounded-full hover:bg-purple-200 text-purple-600 hover:text-purple-900 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-[320px] sm:w-[350px] bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-900">Date Filter</span>
            </div>
            {active && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear Filter
              </button>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-3 p-1 bg-slate-100 rounded-lg grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setDraftMode('range')}
              className={`py-1.5 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                draftMode === 'range'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>1. Date Range</span>
            </button>
            <button
              type="button"
              onClick={() => setDraftMode('exact')}
              className={`py-1.5 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                draftMode === 'exact'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>2. Particular Date</span>
            </button>
          </div>

          {/* Form Controls */}
          <div className="mt-3 space-y-2.5">
            {draftMode === 'range' ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-purple-600 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    End Date (To)
                  </label>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-purple-600 text-slate-800"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Specific Exact Date
                </label>
                <input
                  type="date"
                  value={draftExact}
                  onChange={(e) => setDraftExact(e.target.value)}
                  className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-purple-600 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Filters records matching only this single selected date.
                </p>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={applyPresetToday}
                className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={applyPresetYesterday}
                className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={applyPresetThisWeek}
                className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 transition-colors"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={applyPresetThisMonth}
                className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 transition-colors"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
