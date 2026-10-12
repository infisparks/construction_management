'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  RotateCcw, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ConstructionTask } from '@/lib/construction-planning/types';

interface RevertTaskConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ConstructionTask | null;
  targetStatus: 'not_started' | 'in_progress' | null;
  onConfirmRevert: (taskId: string, targetStatus: 'not_started' | 'in_progress') => void;
}

export const RevertTaskConfirmModal: React.FC<RevertTaskConfirmModalProps> = ({
  isOpen,
  onClose,
  task,
  targetStatus,
  onConfirmRevert,
}) => {
  const [typedConfirm, setTypedConfirm] = useState('');

  // Reset input when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setTypedConfirm('');
    }
  }, [isOpen]);

  if (!isOpen || !task || !targetStatus) return null;

  const isResetToNotStarted = targetStatus === 'not_started';
  const isInputValid = typedConfirm.trim().toUpperCase() === 'CONFIRM';

  const handleProceed = () => {
    if (!isInputValid) return;
    onConfirmRevert(task.id, targetStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Warning Header */}
        <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Warning: Undo Task Status
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                {isResetToNotStarted ? 'Reset activity to Not Started' : 'Revert completion back to In Progress'}
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
          
          {/* Target Activity Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-sm text-slate-900 block">
              {task.code} - {task.name}
            </span>
            <p className="text-slate-500 text-[11px]">
              Current Status: <strong className="text-slate-800 capitalize">{task.status.replace('_', ' ')}</strong> &bull; Current Progress: <strong className="text-indigo-600">{task.progress}%</strong>
            </p>
          </div>

          {/* Action Consequences Explanation */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-900 text-[11px] leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-950">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>What this action will do:</span>
            </div>
            {isResetToNotStarted ? (
              <ul className="list-disc list-inside space-y-1 text-rose-800">
                <li>Clears <strong>actual start date</strong> and <strong>actual end date</strong>.</li>
                <li>Resets task progress back to <strong>0%</strong>.</li>
                <li>Changes schedule status back to <strong>Not Started</strong>.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-rose-800">
                <li>Clears recorded <strong>actual completion end date</strong>.</li>
                <li>Reopens the task into <strong>In Progress</strong> status.</li>
                <li>Restores task execution tracking on site.</li>
              </ul>
            )}
          </div>

          {/* Type CONFIRM Input Verification */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-800 block">
              To proceed, please type <span className="text-rose-600 font-mono font-black">CONFIRM</span> below:
            </label>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="Type CONFIRM to proceed"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isInputValid) {
                  handleProceed();
                }
              }}
            />
            {!isInputValid && typedConfirm.length > 0 && (
              <span className="text-[10px] text-rose-600 block">
                Text must match &ldquo;CONFIRM&rdquo; exactly.
              </span>
            )}
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
            onClick={handleProceed}
            disabled={!isInputValid}
            className={`px-5 py-2 rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 ${
              isInputValid
                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Confirm & Revert</span>
          </button>
        </div>

      </div>
    </div>
  );
};
