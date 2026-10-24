'use client';

import React from 'react';
import { 
  Flame, 
  ArrowRight, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  ShieldAlert,
  GitCommit
} from 'lucide-react';
import { ConstructionTask, TaskDependency, ProjectInfo } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';

interface CriticalPathViewProps {
  project: ProjectInfo;
  tasks: ConstructionTask[];
  dependencies: TaskDependency[];
  onSelectTask: (task: ConstructionTask) => void;
}

export const CriticalPathView: React.FC<CriticalPathViewProps> = ({
  project,
  tasks,
  dependencies,
  onSelectTask,
}) => {
  // Filter all critical tasks ordered by sortOrder/schedule
  const criticalTasks = tasks
    .filter((t) => t.isCritical && t.type !== 'work_package')
    .sort((a, b) => a.plannedStartDate.localeCompare(b.plannedStartDate));

  const totalCriticalCount = criticalTasks.length;
  const completedCritical = criticalTasks.filter((t) => t.status === 'completed').length;
  const inProgressCritical = criticalTasks.filter((t) => t.status === 'in_progress').length;
  const delayedCritical = criticalTasks.filter((t) => t.status === 'delayed' || t.status === 'at_risk').length;

  return (
    <div className="space-y-6">
      
      {/* Top Critical Path Health Summary Banner */}
      <div className="bg-gradient-to-r from-[#1c0d45] via-[#2a1361] to-[#140833] border border-[#653ef1]/30 rounded-2xl p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-purple-300">
                <Flame className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase font-bold tracking-widest text-purple-200">
                Critical Path Method (CPM) Schedule Network
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Zero-Float Driving Sequence for Project Handover
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl">
              Any delay in these activities directly pushes back the final client handover date of{' '}
              <strong className="text-white underline">{formatDisplayDate(project.plannedCompletionDate)}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/10 p-3 rounded-xl border border-white/10 text-center shrink-0">
            <div>
              <span className="text-[10px] uppercase text-purple-200 block">Critical Chain</span>
              <strong className="text-lg font-bold">{totalCriticalCount} Tasks</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-emerald-300 block">Completed</span>
              <strong className="text-lg font-bold text-emerald-400">{completedCritical}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-rose-300 block">At Risk</span>
              <strong className="text-lg font-bold text-rose-400">{delayedCritical}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Critical Path Flow Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Deterministic Critical Activity Sequence
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Click any task card to inspect details and dependencies
          </span>
        </div>

        {/* Step-by-step Flow List */}
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-purple-100 before:z-0">
          {criticalTasks.map((t, idx) => {
            const isCompleted = t.status === 'completed';
            const isDelayed = t.status === 'delayed' || t.status === 'at_risk';
            const isInProgress = t.status === 'in_progress';

            return (
              <div 
                key={t.id}
                onClick={() => onSelectTask(t)}
                className={`relative z-10 rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-md ${
                  isDelayed 
                    ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400' 
                    : isInProgress
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-100'
                      : isCompleted
                        ? 'bg-white border-slate-200 opacity-80'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : isDelayed
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-purple-100 text-purple-800'
                    }`}>
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                          {t.code}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600">
                          {t.name}
                        </h4>
                        {t.type === 'milestone' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 uppercase">
                            Milestone
                          </span>
                        )}
                        {t.type === 'inspection' && (
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 uppercase">
                            Hold Point
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Planned: <strong className="text-slate-700">{formatDisplayDate(t.plannedStartDate)} &rarr; {formatDisplayDate(t.plannedEndDate)}</strong></span>
                        <span>&bull;</span>
                        <span>Duration: <strong className="text-slate-700">{t.plannedDurationDays}d</strong></span>
                        <span>&bull;</span>
                        <span>Lead: <strong className="text-slate-700">{t.responsible}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 text-xs">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Forecast Finish</span>
                      <strong className={`font-mono ${t.varianceDays > 0 ? 'text-rose-700 font-bold' : 'text-slate-800'}`}>
                        {formatDisplayDate(t.forecastEndDate)}
                        {t.varianceDays > 0 && ` (+${t.varianceDays}d)`}
                      </strong>
                    </div>

                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          isCompleted ? 'bg-emerald-500' : isDelayed ? 'bg-rose-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>

                    <span className="font-mono font-bold text-slate-700 w-9 text-right">
                      {t.progress}%
                    </span>
                  </div>
                </div>

                {/* Delay Warning callout if applicable */}
                {isDelayed && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center justify-between text-xs text-rose-800 font-medium">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Active delay on critical path! Cascades {t.varianceDays} days to all downstream successors.
                    </span>
                    <span className="text-rose-900 font-bold hover:underline">
                      Inspect downstream impact &rarr;
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
