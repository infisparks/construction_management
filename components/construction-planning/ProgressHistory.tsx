'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  Plus, 
  Camera, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { DailyProgressEntry, ConstructionTask } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';

interface ProgressHistoryProps {
  entries: DailyProgressEntry[];
  tasks: ConstructionTask[];
  onOpenRecordDialog: () => void;
  onSelectTask: (task: ConstructionTask) => void;
}

export const ProgressHistory: React.FC<ProgressHistoryProps> = ({
  entries,
  tasks,
  onOpenRecordDialog,
  onSelectTask,
}) => {
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Distinct supervisors
  const supervisors = Array.from(new Set(entries.map((e) => e.supervisorName)));

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    if (supervisorFilter !== 'all' && entry.supervisorName !== supervisorFilter) return false;
    if (taskFilter !== 'all' && entry.taskId !== taskFilter) return false;
    if (!matchesDateFilter(entry.reportDate, dateFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const task = taskMap.get(entry.taskId);
      const matchesWork = entry.workCompletedToday.toLowerCase().includes(q);
      const matchesTask = task?.name.toLowerCase().includes(q) || task?.code.toLowerCase().includes(q);
      const matchesSupervisor = entry.supervisorName.toLowerCase().includes(q);
      if (!matchesWork && !matchesTask && !matchesSupervisor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search progress logs, descriptions, or supervisors..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
            />
          </div>

          {/* Supervisor filter */}
          <select
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Supervisors</option>
            {supervisors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Task filter */}
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium max-w-[200px] truncate"
          >
            <option value="all">All Activities</option>
            {tasks.filter((t) => t.type !== 'work_package').map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} {t.name}
              </option>
            ))}
          </select>

          {/* Universal Date Filter: Start & End Date (Range) + Particular Date */}
          <DateFilterControl
            value={dateFilter}
            onChange={setDateFilter}
            label="Log Date"
          />

          {(searchQuery || isDateFilterActive(dateFilter) || supervisorFilter !== 'all' || taskFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDateFilter(DEFAULT_DATE_FILTER);
                setSupervisorFilter('all');
                setTaskFilter('all');
              }}
              className="text-xs text-purple-700 hover:underline px-1.5 py-1 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <button
          onClick={onOpenRecordDialog}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Daily Progress</span>
        </button>
      </div>

      {/* Progress Logs Feed */}
      <div className="space-y-3">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => {
            const task = taskMap.get(entry.taskId);

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDisplayDate(entry.reportDate)}
                    </span>
                    <span className="text-slate-300">|</span>
                    {task && (
                      <button
                        onClick={() => onSelectTask(task)}
                        className="font-medium text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <span className="font-mono bg-indigo-50 px-1 py-0.2 rounded font-bold">
                          {task.code}
                        </span>
                        <span>{task.name}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {entry.supervisorName}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                      {entry.previousProgress}% &rarr; {entry.newProgress}% (+{entry.newProgress - entry.previousProgress}%)
                    </span>
                  </div>
                </div>

                {/* Body: Description */}
                <p className="text-xs text-slate-800 font-medium">
                  {entry.workCompletedToday}
                </p>

                {/* Details Footer: Quantities, workers, materials, remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Quantity Executed:</span>
                    <strong className="text-slate-800">
                      {entry.quantityCompletedToday ? `${entry.quantityCompletedToday} ${entry.quantityUnit || ''}` : 'As scheduled'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Workforce & Resources:</span>
                    <strong className="text-slate-800">
                      {entry.workersCount ? `${entry.workersCount} laborers / tradesmen` : 'Site crew active'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Material Verification:</span>
                    <strong className="text-slate-800 truncate block" title={entry.materialUsage}>
                      {entry.materialUsage || 'Standard batch release'}
                    </strong>
                  </div>
                </div>

                {entry.remarks && (
                  <p className="text-[11px] text-slate-500 italic">
                    <strong>Site Observations:</strong> {entry.remarks}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No daily reports matching selected filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the supervisor or task filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
