'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Layers, 
  User, 
  Plus, 
  AlertCircle, 
  Flame, 
  ShieldCheck 
} from 'lucide-react';
import { ConstructionTask, TaskType, DependencyType } from '@/lib/construction-planning/types';
import { calculateDaysBetween, addDaysToDate } from '@/lib/construction-planning/schedule-utils';

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<ConstructionTask>, initialDependency?: { predecessorId: string; type: DependencyType; lagDays: number }) => void;
  editingTask: ConstructionTask | null;
  defaultParentId?: string | null;
  defaultType?: TaskType;
  allTasks: ConstructionTask[];
}

export const AddEditTaskDialog: React.FC<AddEditTaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultParentId = null,
  defaultType = 'task',
  allTasks,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<TaskType>('task');
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [floor, setFloor] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('Er. Amit Verma');
  
  // Schedule baseline dates
  const [plannedStartDate, setPlannedStartDate] = useState('2026-09-01');
  const [plannedEndDate, setPlannedEndDate] = useState('2026-09-15');
  const [plannedDurationDays, setPlannedDurationDays] = useState(14);

  // Critical path & float
  const [isCritical, setIsCritical] = useState<boolean>(true);
  const [totalFloatDays, setTotalFloatDays] = useState<number>(0);

  // Initial dependency link (for new tasks only)
  const [selectedPredecessorId, setSelectedPredecessorId] = useState<string>('');
  const [depType, setDepType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState<number>(0);

  // Quantities
  const [plannedQuantity, setPlannedQuantity] = useState<number | undefined>(undefined);
  const [quantityUnit, setQuantityUnit] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Validation
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name);
      setCode(editingTask.code);
      setType(editingTask.type);
      setParentTaskId(editingTask.parentTaskId);
      setFloor(editingTask.floor || '');
      setDescription(editingTask.description || '');
      setResponsible(editingTask.responsible);
      setPlannedStartDate(editingTask.plannedStartDate);
      setPlannedEndDate(editingTask.plannedEndDate);
      setPlannedDurationDays(editingTask.plannedDurationDays);
      setPlannedQuantity(editingTask.plannedQuantity);
      setQuantityUnit(editingTask.quantityUnit || '');
      setNotes(editingTask.notes || '');
      setIsCritical(editingTask.isCritical);
      setTotalFloatDays(editingTask.totalFloatDays);
    } else {
      setName('');
      setCode(`3.${allTasks.length + 1}`);
      setType(defaultType);
      setParentTaskId(defaultParentId);
      setFloor('');
      setDescription('');
      setResponsible('Er. Amit Verma');
      setPlannedStartDate('2026-09-01');
      setPlannedEndDate('2026-09-15');
      setPlannedDurationDays(14);
      setPlannedQuantity(undefined);
      setQuantityUnit('');
      setSelectedPredecessorId('');
      setNotes('');
      setIsCritical(true);
      setTotalFloatDays(0);
    }
    setError(null);
  }, [editingTask, defaultParentId, defaultType, allTasks.length, isOpen]);

  // Handle start date change and auto-adjust end date by duration
  const handleStartDateChange = (newStart: string) => {
    setPlannedStartDate(newStart);
    if (type === 'milestone') {
      setPlannedEndDate(newStart);
      setPlannedDurationDays(0);
    } else {
      setPlannedEndDate(addDaysToDate(newStart, plannedDurationDays));
    }
  };

  // Handle duration change
  const handleDurationChange = (days: number) => {
    const validDays = Math.max(1, days);
    setPlannedDurationDays(validDays);
    setPlannedEndDate(addDaysToDate(plannedStartDate, validDays));
  };

  // Handle end date change
  const handleEndDateChange = (newEnd: string) => {
    setPlannedEndDate(newEnd);
    const diff = calculateDaysBetween(plannedStartDate, newEnd);
    if (diff >= 0) {
      setPlannedDurationDays(diff);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Task Name is required.');
      return;
    }
    if (!code.trim()) {
      setError('Task WBS Code is required.');
      return;
    }
    if (type !== 'milestone' && plannedStartDate > plannedEndDate) {
      setError('Planned End Date cannot be earlier than Planned Start Date.');
      return;
    }
    if (selectedPredecessorId && editingTask && selectedPredecessorId === editingTask.id) {
      setError('A task cannot depend on itself.');
      return;
    }

    const taskPayload: Partial<ConstructionTask> = {
      name: name.trim(),
      code: code.trim(),
      type,
      parentTaskId: parentTaskId || null,
      floor: floor.trim() || undefined,
      description: description.trim() || undefined,
      responsible: responsible.trim(),
      plannedStartDate,
      plannedEndDate: type === 'milestone' ? plannedStartDate : plannedEndDate,
      plannedDurationDays: type === 'milestone' ? 0 : plannedDurationDays,
      forecastStartDate: plannedStartDate,
      forecastEndDate: type === 'milestone' ? plannedStartDate : plannedEndDate,
      varianceDays: 0,
      isCritical,
      totalFloatDays: isCritical ? 0 : totalFloatDays,
      plannedQuantity: plannedQuantity ? Number(plannedQuantity) : undefined,
      quantityUnit: quantityUnit.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    let initialDep;
    if (selectedPredecessorId) {
      initialDep = {
        predecessorId: selectedPredecessorId,
        type: depType,
        lagDays: Number(lagDays) || 0,
      };
    }

    onSave(taskPayload, initialDep);
    onClose();
  };

  if (!isOpen) return null;

  // Filter possible parents (only work packages)
  const workPackageOptions = allTasks.filter(
    (t) => t.type === 'work_package' && (!editingTask || t.id !== editingTask.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Compact Modal Header (Fixed at top) */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {editingTask ? 'Edit Activity Details' : 'Add New Activity'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set WBS code, dates, dependencies, and critical path priority.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body (Compact layout with elegant spacing) */}
        <form onSubmit={handleSubmit} id="task-dialog-form" className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Activity Name (70%) + WBS Code (30%) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Activity Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 4th Floor Slab Concreting"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                WBS Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 3.5.1"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Row 2: Type, Parent Package, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as TaskType;
                  setType(newType);
                  if (newType === 'milestone') {
                    setPlannedDurationDays(0);
                    setPlannedEndDate(plannedStartDate);
                  } else if (plannedDurationDays === 0) {
                    setPlannedDurationDays(7);
                    setPlannedEndDate(addDaysToDate(plannedStartDate, 7));
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium"
              >
                <option value="task">Standard Activity (Task)</option>
                <option value="work_package">Work Package (PKG Folder)</option>
                <option value="milestone">Milestone (MS - 0 Days)</option>
                <option value="inspection">QC / Inspection (Approval)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Parent Work Package
              </label>
              <select
                value={parentTaskId || ''}
                onChange={(e) => setParentTaskId(e.target.value || null)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-700"
              >
                <option value="">None (Top-Level Phase)</option>
                {workPackageOptions.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.code} {wp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Location / Floor
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 3rd Floor, Basement"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* Row 3: Target Baseline Schedule (Compact 3-column inline box) */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
              Target Baseline Schedule (Planned Dates)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-1 text-[11px]">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={plannedStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                />
              </div>

              {type !== 'milestone' ? (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">
                      Duration (Days) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={plannedDurationDays}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={plannedEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 flex items-center pt-3 text-indigo-700 text-xs font-semibold">
                  Milestones are zero-duration contractual target dates.
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Initial Predecessor Dependency (Compact 2-column inline box) */}
          {!editingTask && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                Initial Predecessor Dependency (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1 text-[11px]">Predecessor Task</label>
                  <select
                    value={selectedPredecessorId}
                    onChange={(e) => setSelectedPredecessorId(e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs truncate"
                  >
                    <option value="">No Predecessor (Independent Parallel Task)</option>
                    {allTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 text-[11px]">Relationship</label>
                  <select
                    value={depType}
                    onChange={(e) => setDepType(e.target.value as DependencyType)}
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <option value="FS">FS (Finish to Start)</option>
                    <option value="SS">SS (Start to Start)</option>
                    <option value="FF">FF (Finish to Finish)</option>
                    <option value="SF">SF (Start to Finish)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Row 5: Critical Path & Float Buffer Selection (Compact Segmented Selector) */}
          <div className="p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-purple-600" />
                Critical Path Priority (Controls Purple Flame 🔥 Icon)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Critical Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCritical(true);
                  setTotalFloatDays(0);
                }}
                className={`py-2 px-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  isCritical
                    ? 'bg-purple-100/90 border-purple-400 text-purple-950 font-bold ring-1 ring-purple-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className={`w-3.5 h-3.5 ${isCritical ? 'text-purple-700 fill-purple-600' : 'text-slate-400'}`} />
                  <span className="text-xs">Critical (0d Float)</span>
                </div>
                {isCritical && <span className="w-2 h-2 rounded-full bg-purple-600" />}
              </button>

              {/* Non-Critical Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCritical(false);
                  if (totalFloatDays === 0) setTotalFloatDays(7);
                }}
                className={`py-2 px-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  !isCritical
                    ? 'bg-indigo-100/90 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-3.5 h-3.5 ${!isCritical ? 'text-indigo-700' : 'text-slate-400'}`} />
                  <span className="text-xs">Non-Critical (Buffer)</span>
                </div>
                {!isCritical && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
              </button>
            </div>

            {/* Float days inline input if non-critical */}
            {!isCritical && (
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 text-[11px]">Safety Buffer Free Float:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={totalFloatDays}
                    onChange={(e) => setTotalFloatDays(Math.max(1, parseInt(e.target.value) || 1))}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-16 px-2 py-0.5 text-xs border border-slate-200 rounded-md bg-white font-mono font-bold text-center"
                  />
                  <span className="text-slate-500 text-[11px]">days</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 6: Responsible Incharge & BOQ Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Site Incharge *
              </label>
              <input
                type="text"
                required
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Er. Amit Verma"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Target BOQ Quantity
              </label>
              <input
                type="number"
                min={0}
                value={plannedQuantity !== undefined ? plannedQuantity : ''}
                onChange={(e) => setPlannedQuantity(e.target.value ? parseFloat(e.target.value) : undefined)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="e.g. 520"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                Unit
              </label>
              <input
                type="text"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                placeholder="cu.m, MT, nos"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* Row 7: Field Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
              Notes / Technical Specs
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. M30 grade RMC with silica fume. Requires cube testing."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
            />
          </div>
        </form>

        {/* Compact Fixed Footer (Always visible without scrolling!) */}
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
            form="task-dialog-form"
            className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors"
          >
            {editingTask ? 'Save Changes' : 'Add Activity to WBS'}
          </button>
        </div>

      </div>
    </div>
  );
};
