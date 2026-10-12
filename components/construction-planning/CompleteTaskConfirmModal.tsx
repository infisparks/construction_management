'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { ConstructionTask } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';

interface CompleteTaskConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ConstructionTask | null;
  onConfirmComplete: (
    taskId: string, 
    setProgressTo100: boolean, 
    completionDate?: string, 
    notes?: string
  ) => void;
}

export const CompleteTaskConfirmModal: React.FC<CompleteTaskConfirmModalProps> = ({
  isOpen,
  onClose,
  task,
  onConfirmComplete,
}) => {
  const [completionMode, setCompletionMode] = useState<'full_100' | 'keep_actual'>('full_100');
  const [completionDate, setCompletionDate] = useState(() => {
    return new Date().toISOString().split('T')[0] || '2026-10-12';
  });
  const [remarks, setRemarks] = useState('');

  if (!isOpen || !task) return null;

  const currentProgress = task.progress || 0;
  const isProgressPending = currentProgress < 100;

  const handleConfirm = () => {
    const setTo100 = completionMode === 'full_100';
    onConfirmComplete(task.id, setTo100, completionDate, remarks.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mark Activity as Completed?
              </h3>
              <p className="text-xs text-slate-500">
                Do you want to finalize and record completion for <strong className="text-slate-800">{task.code}</strong>?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Task Info Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-slate-900">{task.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                {task.type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400">Planned End:</span>{' '}
                <strong className="text-slate-700 font-semibold">{formatDisplayDate(task.plannedEndDate)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Current Progress:</span>{' '}
                <strong className={currentProgress < 100 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {currentProgress}%
                </strong>
              </div>
            </div>
          </div>

          {/* Pending Progress Handling Options */}
          {isProgressPending ? (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <strong className="font-semibold block text-amber-950">Pending Progress Notice ({currentProgress}%)</strong>
                  <span>
                    This task currently has only <strong>{currentProgress}%</strong> progress recorded. You can choose how progress should be stored upon completion:
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {/* Option 1: Set to 100% */}
                <label 
                  onClick={() => setCompletionMode('full_100')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    completionMode === 'full_100'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="completion_mode"
                    checked={completionMode === 'full_100'}
                    onChange={() => setCompletionMode('full_100')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block text-xs">
                      Set Progress to 100% (Fully Completed)
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Automatically completes remaining work and records full 100% progress for this activity and its WBS rollups.
                    </span>
                  </div>
                </label>

                {/* Option 2: Keep current progress (e.g. 40%) but mark completed */}
                <label 
                  onClick={() => setCompletionMode('keep_actual')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    completionMode === 'keep_actual'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="completion_mode"
                    checked={completionMode === 'keep_actual'}
                    onChange={() => setCompletionMode('keep_actual')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block text-xs">
                      Keep Recorded Progress ({currentProgress}%) & Mark Done
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Acts as completed in your project schedule and site sequence, while accurately maintaining {currentProgress}% actual logged quantity.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Activity is at <strong>100% progress</strong>. Finalizing will record the completion timestamp.</span>
            </div>
          )}

          {/* Completion Date */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Actual Completion Date:
            </label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Optional Completion Remarks */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">
              Completion Remarks / Field Notes (Optional):
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Work handed over, checked and approved on site"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Complete</span>
          </button>
        </div>

      </div>
    </div>
  );
};
