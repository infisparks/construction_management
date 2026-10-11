'use client';

import React from 'react';
import { 
  X, 
  GitBranch, 
  AlertTriangle, 
  Flame, 
  Clock, 
  ArrowRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ConstructionTask, TaskDependency, ProjectInfo } from '@/lib/construction-planning/types';
import { analyzeDelayImpact, formatDisplayDate } from '@/lib/construction-planning/schedule-utils';

interface ScheduleImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  tasks: ConstructionTask[];
  dependencies: TaskDependency[];
  project: ProjectInfo;
  onSelectTask: (task: ConstructionTask) => void;
}

export const ScheduleImpactModal: React.FC<ScheduleImpactModalProps> = ({
  isOpen,
  onClose,
  taskId,
  tasks,
  dependencies,
  project,
  onSelectTask,
}) => {
  if (!isOpen || !taskId) return null;

  const delayedTask = tasks.find((t) => t.id === taskId);
  if (!delayedTask) return null;

  const impactedItems = analyzeDelayImpact(taskId, tasks, dependencies);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-rose-50/70 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Delay Impact & Successor Cascades
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 uppercase">
                  Schedule Trace
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Downstream network propagation caused by delay in <strong className="text-slate-800">{delayedTask.code} {delayedTask.name}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Originating Delinquent Task Card */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
            <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px] block">
              Originating Delay Source
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded mr-2">
                  {delayedTask.code}
                </span>
                <strong className="text-slate-900 text-sm">{delayedTask.name}</strong>
              </div>
              <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-mono text-xs">
                +{delayedTask.varianceDays} Days Delay
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600 border-t border-rose-100">
              <div>
                Planned Finish: <strong className="text-slate-800">{formatDisplayDate(delayedTask.plannedEndDate)}</strong>
              </div>
              <div>
                Forecast Finish: <strong className="text-rose-700">{formatDisplayDate(delayedTask.forecastEndDate)}</strong>
              </div>
            </div>

            {delayedTask.notes && (
              <p className="text-slate-600 italic bg-white/70 p-2 rounded border border-rose-200/60 mt-1">
                Cause: {delayedTask.notes}
              </p>
            )}
          </div>

          {/* Project Completion Impact Box */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold text-purple-900 block text-xs">
                  Net Impact on Project Handover Date
                </span>
                <p className="text-purple-700 text-[11px]">
                  Because this task lies directly on the Critical Path with 0 float, it pushes the client completion date to <strong className="font-mono">{formatDisplayDate(project.forecastCompletionDate)}</strong>.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-bold text-purple-900 font-mono">+3 Days</span>
            </div>
          </div>

          {/* Downstream Impact Chain List */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
              <span>Downstream Affected Successor Activities ({impactedItems.length})</span>
              <span className="text-slate-400 font-normal">Propagated via dependency network</span>
            </h4>

            {impactedItems.length > 0 ? (
              <div className="space-y-2">
                {impactedItems.map(({ task, plannedEnd, forecastEnd, varianceDays, isCritical, relationship }) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onSelectTask(task);
                    }}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {task.code}
                        </span>
                        <h5 className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1">
                          {task.name}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </h5>
                      </div>

                      {isCritical && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-purple-600" />
                          Critical
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mb-1">
                      Relationship: <em>{relationship}</em>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded">
                      <span>Planned Finish: <strong>{formatDisplayDate(plannedEnd)}</strong></span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>Forecast Finish: <strong className="text-rose-700 font-mono">{formatDisplayDate(forecastEnd)}</strong></span>
                      <span className="font-bold text-rose-700 font-mono">+{varianceDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active successor activities currently linked to this node.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs"
          >
            Close Trace
          </button>
        </div>

      </div>
    </div>
  );
};
