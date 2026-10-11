'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ClipboardList, 
  UploadCloud, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Users, 
  Layers 
} from 'lucide-react';
import { ConstructionTask, DailyProgressEntry, ScheduleStatus, ProjectInfo } from '@/lib/construction-planning/types';
import { validateProgressEntry } from '@/lib/construction-planning/progress-utils';

interface DailyProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectInfo;
  allTasks: ConstructionTask[];
  selectedTask?: ConstructionTask | null;
  onSubmitProgress: (entry: Omit<DailyProgressEntry, 'id' | 'createdAt'>) => void;
  onOpenMaterialUsage?: () => void;
}

export const DailyProgressDialog: React.FC<DailyProgressDialogProps> = ({
  isOpen,
  onClose,
  project,
  allTasks,
  selectedTask,
  onSubmitProgress,
  onOpenMaterialUsage,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('2026-08-29');
  const [workCompletedToday, setWorkCompletedToday] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [newProgress, setNewProgress] = useState<number>(0);
  
  // Quantities
  const [quantityCompletedToday, setQuantityCompletedToday] = useState<number | undefined>(undefined);
  const [quantityUnit, setQuantityUnit] = useState<string>('');
  
  // Site resources
  const [workersCount, setWorkersCount] = useState<number>(12);
  const [materialUsage, setMaterialUsage] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('Er. Amit Verma');
  const [status, setStatus] = useState<ScheduleStatus>('in_progress');
  const [issues, setIssues] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [validationError, setValidationError] = useState<string | null>(null);

  // When selected task changes or dialog opens
  useEffect(() => {
    const task = selectedTask || allTasks.find((t) => t.id === selectedTaskId) || allTasks.find((t) => t.status === 'in_progress');
    if (task) {
      setSelectedTaskId(task.id);
      setCurrentProgress(task.progress);
      setNewProgress(Math.min(100, task.progress + 15));
      setQuantityUnit(task.quantityUnit || 'cu.m');
      setSupervisorName(task.responsible || 'Er. Amit Verma');
      setStatus(task.status === 'completed' ? 'completed' : 'in_progress');
    }
    setReportDate(new Date().toISOString().split('T')[0] || '2026-08-29');
    setWorkCompletedToday('');
    setQuantityCompletedToday(undefined);
    setMaterialUsage('');
    setIssues('');
    setRemarks('');
    setPhotos([]);
    setValidationError(null);
  }, [isOpen, selectedTask]);

  const activeTask = allTasks.find((t) => t.id === selectedTaskId);
  const parentPackage = activeTask?.parentTaskId 
    ? allTasks.find((t) => t.id === activeTask.parentTaskId) 
    : null;

  const handleTaskSelectionChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = allTasks.find((t) => t.id === taskId);
    if (task) {
      setCurrentProgress(task.progress);
      setNewProgress(Math.min(100, task.progress + 10));
      setQuantityUnit(task.quantityUnit || '');
      setSupervisorName(task.responsible);
    }
  };

  const handlePhotoUploadSim = () => {
    setPhotos((prev) => [...prev, `site_inspection_photo_${prev.length + 1}.jpg`]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const payload = {
      taskId: selectedTaskId,
      reportDate,
      workCompletedToday: workCompletedToday.trim(),
      previousProgress: currentProgress,
      newProgress: Number(newProgress),
      quantityCompletedToday: quantityCompletedToday ? Number(quantityCompletedToday) : undefined,
      quantityUnit: quantityUnit.trim() || undefined,
      workersCount: Number(workersCount) || undefined,
      materialUsage: materialUsage.trim() || undefined,
      supervisorName: supervisorName.trim(),
      status: newProgress >= 100 ? 'completed' : status,
      issues: issues.trim() || undefined,
      remarks: remarks.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    };

    const validation = validateProgressEntry(payload);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please correct errors in form.');
      return;
    }

    onSubmitProgress(payload);
    onClose();
  };

  if (!isOpen) return null;

  // Filter out pure work packages from direct progress reporting
  const leafTasks = allTasks.filter((t) => t.type !== 'work_package');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Compact Header (Fixed at top) */}
        <div className="px-5 py-3.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Record Daily Construction Progress
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Log actual progress %, executed BOQ units, labor, and photo proof.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="progress-dialog-form" className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Row 1: Project & Work Package Readonly Context */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-slate-600">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Project:</span>
              <strong className="text-slate-900">{project.name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Work Package:</span>
              <strong className="text-slate-900">{parentPackage ? `${parentPackage.code} ${parentPackage.name}` : 'General Site Phase'}</strong>
            </div>
          </div>

          {/* Row 2: Select Task & Report Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Select Activity *
              </label>
              <select
                required
                value={selectedTaskId}
                onChange={(e) => handleTaskSelectionChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {leafTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name} (Now: {t.progress}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Reporting Date *
              </label>
              <input
                type="date"
                required
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
              />
            </div>
          </div>

          {/* Row 3: Description of Work Done Today */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Work Completed Today *
            </label>
            <textarea
              required
              rows={2}
              value={workCompletedToday}
              onChange={(e) => setWorkCompletedToday(e.target.value)}
              placeholder="e.g. Bound top rebar mesh for slabs B10 to B14. Placed concrete cover blocks at 1m spacing."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Row 4: Progress Percentage Calculator */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px] uppercase tracking-wider">
              <span>Progress Percentage Update</span>
              <span>Must not exceed 100%</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Progress Before Today:</span>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-700">
                  {currentProgress}%
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Progress After Update *
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={currentProgress}
                    max={100}
                    required
                    value={newProgress}
                    onChange={(e) => setNewProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-emerald-800"
                  />
                  <span className="font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[11px] mb-1">Delta Today:</span>
                <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                  +{Math.max(0, newProgress - currentProgress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Row 5: Quantities & BOQ Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Quantity Completed Today
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={quantityCompletedToday !== undefined ? quantityCompletedToday : ''}
                onChange={(e) => setQuantityCompletedToday(e.target.value ? parseFloat(e.target.value) : undefined)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="e.g. 15.5"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Quantity Unit
              </label>
              <input
                type="text"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                placeholder="sq.ft, cu.m, MT, nos"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Active Workers on Site
              </label>
              <input
                type="number"
                min={0}
                value={workersCount}
                onChange={(e) => setWorkersCount(parseInt(e.target.value) || 0)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Number of masons/laborers"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Row 6: Supervisor & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Reporting Site Engineer *
              </label>
              <input
                type="text"
                required
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="Er. Amit Verma"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Supervisor Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Workmanship verified as per drawing spec"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* Row 7: Site Blockers & Issues */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Site Issues / Blockers (if any)
            </label>
            <input
              type="text"
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              placeholder="e.g. Minor rain in afternoon, delayed crane access"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
            />
          </div>

          {/* Row 8: Site Photo Attachments Mock */}
          <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800">Attach Site Progress Photos</span>
                <p className="text-[11px] text-slate-500">
                  {photos.length === 0 ? 'No photos attached yet' : `${photos.length} photo(s) attached for demonstration`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePhotoUploadSim}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Attach Photo</span>
            </button>
          </div>

        </form>

        {/* Compact Fixed Footer (Always visible without scrolling) */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="progress-dialog-form"
            className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Submit Daily Progress</span>
          </button>
        </div>

      </div>
    </div>
  );
};
