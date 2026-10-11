'use client';

import React from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Flame, 
  GitBranch, 
  Info, 
  RotateCcw, 
  ShieldAlert 
} from 'lucide-react';
import { ProjectInfo, ConstructionTask } from '@/lib/construction-planning/types';
import { formatDisplayDate, calculateDaysBetween, formatDelayReadable } from '@/lib/construction-planning/schedule-utils';

interface ScheduleHealthProps {
  project: ProjectInfo;
  tasks: ConstructionTask[];
  onViewImpact: (taskId: string) => void;
  onOpenRecoveryPlan: () => void;
}

export const ScheduleHealth: React.FC<ScheduleHealthProps> = ({
  project,
  tasks,
  onViewImpact,
  onOpenRecoveryPlan,
}) => {
  // Identify key delayed task (3rd Floor slab concreting or similar)
  const delayedTasks = tasks.filter(
    (t) => t.type !== 'work_package' && (t.status === 'delayed' || (t.varianceDays > 0 && t.status !== 'completed'))
  );
  const primaryDelayedTask = delayedTasks.find((t) => t.isCritical) || delayedTasks[0];

  const upcomingMilestones = tasks.filter(
    (t) => t.type === 'milestone' && t.status !== 'completed'
  ).slice(0, 3);

  const varianceDays = calculateDaysBetween(project.plannedCompletionDate, project.forecastCompletionDate);
  const delayLabel = formatDelayReadable(varianceDays);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Schedule Health & Critical Path Analysis
              </h2>
              {varianceDays > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  {delayLabel} Behind Schedule
                </span>
              ) : varianceDays < 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  {delayLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  100% On Schedule
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target completion: <strong className="text-slate-700">{formatDisplayDate(project.plannedCompletionDate)}</strong> &bull; Current forecast: <strong className={varianceDays > 0 ? 'text-amber-800' : 'text-emerald-700'}>{formatDisplayDate(project.forecastCompletionDate)}</strong>
            </p>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2 shrink-0">
          {primaryDelayedTask && (
            <button
              onClick={() => onViewImpact(primaryDelayedTask.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Trace Delay Impact</span>
            </button>
          )}

          <button
            onClick={onOpenRecoveryPlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Simulate Recovery Plan</span>
          </button>
        </div>
      </div>

      {/* Health Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        
        {/* Active Delay Warning */}
        <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-rose-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Critical Path Bottleneck
              </span>
              <span className="text-[11px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                Code: 3.4.5
              </span>
            </div>
            <p className="text-xs text-rose-800 font-medium">
              &ldquo;3rd Floor Slab Concreting&rdquo; is forecast to finish 3 days later than planned.
            </p>
            <p className="text-[11px] text-rose-600/90 mt-1">
              RMC boom pump breakdown delayed pour. Successor milestone <em>3.4.6</em> and <em>4th Floor RCC</em> directly delayed.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
            <span className="text-rose-700">Affected Successors: <strong>5 tasks</strong></span>
            <button 
              onClick={() => primaryDelayedTask && onViewImpact(primaryDelayedTask.id)}
              className="text-rose-900 font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              View details &rarr;
            </button>
          </div>
        </div>

        {/* Float & Parallel Execution Health */}
        <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                Parallel Execution Buffer
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                14d Float Safe
              </span>
            </div>
            <p className="text-xs text-indigo-900 font-medium">
              Masonry & MEP services proceeding concurrently on 1st & 2nd floors.
            </p>
            <p className="text-[11px] text-indigo-700 mt-1">
              Because block work is independent of 3rd floor slab casting, interior activities maintain positive float buffer.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px]">
            <span className="text-indigo-800">Parallel tracks active: <strong>3 floors</strong></span>
            <span className="text-emerald-700 font-medium">No secondary delay</span>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Upcoming Milestones
              </span>
              <span className="text-[11px] text-slate-500">Next 90 Days</span>
            </div>

            <div className="space-y-1.5">
              {upcomingMilestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate pr-2" title={m.name}>
                    &bull; {m.name}
                  </span>
                  <span className={`text-[11px] font-mono shrink-0 ${m.varianceDays > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                    {formatDisplayDate(m.forecastEndDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Critical CPM chain locked</span>
            <span className="text-indigo-600 font-medium">Total Milestones: 6</span>
          </div>
        </div>

      </div>
    </div>
  );
};
