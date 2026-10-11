'use client';

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ConstructionTask, TaskDependency } from '@/lib/construction-planning/types';
import { checkTaskReadiness } from '@/lib/construction-planning/dependency-utils';

interface StartTaskConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ConstructionTask | null;
  allTasks: ConstructionTask[];
  dependencies: TaskDependency[];
  onConfirmStart: (taskId: string, isOverride: boolean, overrideReason?: string) => void;
  onNavigateToTask: (task: ConstructionTask) => void;
}

export const StartTaskConfirmationModal: React.FC<StartTaskConfirmationModalProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  dependencies,
  onConfirmStart,
  onNavigateToTask,
}) => {
  const [allowOverride, setAllowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const readiness = checkTaskReadiness(task.id, allTasks, dependencies);

  const handleStart = () => {
    setError(null);
    if (!readiness.canStart) {
      if (!allowOverride) {
        setError('Predecessor tasks are not completed. Check the authorized override box and provide an engineer reason to proceed.');
        return;
      }
      if (!overrideReason.trim()) {
        setError('Please state the engineering justification or site authorization reason for overriding dependencies.');
        return;
      }
      onConfirmStart(task.id, true, overrideReason.trim());
    } else {
      onConfirmStart(task.id, false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              readiness.canStart ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Start Activity On Site
              </h3>
              <p className="text-xs text-slate-500">
                Record actual site commencement date for <strong className="text-slate-800">{task.code}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <h4 className="font-bold text-sm text-slate-900">{task.name}</h4>
            <p className="text-slate-500 mt-0.5">
              Target planned start was {task.plannedStartDate}. Commencing work will stamp actual start date as today in the project record.
            </p>
          </div>

          {/* Readiness Status Alert */}
          {readiness.canStart ? (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Predecessors Satisfied</strong>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  All linked predecessor activities are satisfied or finished. This activity can proceed smoothly in parallel or as scheduled.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Incomplete Predecessor Activities</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    The following predecessor dependencies have not yet been marked completed on site:
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pl-7">
                {readiness.unmetPredecessors.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/80 p-2 rounded border border-amber-200/70 text-[11px]">
                    <div>
                      <span className="font-mono font-bold text-slate-700 mr-1.5">{p.predecessor.code}</span>
                      <strong className="text-slate-900">{p.predecessor.name}</strong>
                      <span className="text-slate-500 block text-[10px] mt-0.5">{p.reason}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToTask(p.predecessor);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>Jump</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Authorized Override Box */}
              <div className="mt-3 pt-3 border-t border-amber-200/80">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={allowOverride}
                    onChange={(e) => setAllowOverride(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Authorized Engineering Override</span>
                </label>

                {allowOverride && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[11px] text-slate-600">
                      Engineering Justification / Site Work Permit Reason *
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Approved temporary propping allows early column cage tying"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                    <span className="text-[10px] text-rose-600 block">
                      * This action will be audited and flagged as an authorized bypass in the project log.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Confirm Actual Start</span>
          </button>
        </div>

      </div>
    </div>
  );
};
