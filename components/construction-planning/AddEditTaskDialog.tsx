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
  ShieldCheck,
  HelpCircle,
  Info,
  Sparkles 
} from 'lucide-react';
import { ConstructionTask, TaskType, DependencyType, TaskDependency } from '@/lib/construction-planning/types';
import { calculateDaysBetween, addDaysToDate } from '@/lib/construction-planning/schedule-utils';
import { FIELD_GUIDES, FieldGuideCard } from './TaskFieldGuides';

interface AddEditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<ConstructionTask>, initialDependency?: { predecessorId: string; type: DependencyType; lagDays: number }) => void;
  editingTask: ConstructionTask | null;
  defaultParentId?: string | null;
  defaultType?: TaskType;
  allTasks: ConstructionTask[];
  dependencies?: TaskDependency[];
}

export const AddEditTaskDialog: React.FC<AddEditTaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultParentId = null,
  defaultType = 'task',
  allTasks,
  dependencies = [],
}) => {
  // Interactive Field Guidance state
  const [isInfoGuideEnabled, setIsInfoGuideEnabled] = useState(false);
  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);
  const [pinnedGuideId, setPinnedGuideId] = useState<string | null>(null);

  const isGuideActiveFor = (fieldId: string) => {
    return pinnedGuideId === fieldId || (isInfoGuideEnabled && hoveredGuideId === fieldId);
  };

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

      // Check if this task is linked to any predecessor in this project
      const existingPred = dependencies.find((d) => d.successorId === editingTask.id);
      if (existingPred) {
        setSelectedPredecessorId(existingPred.predecessorId);
        setDepType(existingPred.type);
        setLagDays(existingPred.lagDays);
      } else {
        setSelectedPredecessorId('');
        setDepType('FS');
        setLagDays(0);
      }
    } else {
      setName('');
      let nextCode = '1.0';
      if (defaultParentId) {
        const parent = allTasks.find((t) => t.id === defaultParentId);
        const children = allTasks.filter((t) => t.parentTaskId === defaultParentId);
        if (parent) {
          nextCode = `${parent.code}.${children.length + 1}`;
        } else {
          nextCode = `${allTasks.length + 1}.0`;
        }
      } else {
        const rootTasks = allTasks.filter((t) => !t.parentTaskId);
        const rootNums = rootTasks.map((t) => {
          const m = t.code.match(/^(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        });
        const maxNum = rootNums.length > 0 ? Math.max(...rootNums) : 0;
        nextCode = `${maxNum + 1}.0`;
      }
      setCode(nextCode);
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
      setDepType('FS');
      setLagDays(0);
      setNotes('');
      setIsCritical(true);
      setTotalFloatDays(0);
    }
    setError(null);
  }, [editingTask, defaultParentId, defaultType, allTasks.length, isOpen, dependencies]);

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
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sidebar Drawer Header (Fixed at top) */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {editingTask ? 'Edit Activity Details' : 'Add New Activity'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                  Sidebar Panel
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set WBS code, dates, dependencies, and critical path priority.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Info Icon / Field Guide Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsInfoGuideEnabled((prev) => !prev);
                if (isInfoGuideEnabled) setPinnedGuideId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isInfoGuideEnabled
                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
              title="Click Info icon to toggle interactive guidance for all inputs"
            >
              <Info className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline">
                {isInfoGuideEnabled ? 'Info Guide: ON' : 'Info Guide: OFF'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isInfoGuideEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`} />
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="task-dialog-form" className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          {/* Active Field Guide Hint Banner */}
          {isInfoGuideEnabled && (
            <div className="p-2.5 rounded-xl bg-purple-100/70 border border-purple-300 text-purple-950 flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Interactive Field Guide Active:</strong> Hover over any input field or click ℹ️ to see what to write, what happens in the schedule, and 4 practical examples!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoGuideEnabled(false)}
                className="text-[11px] font-semibold text-purple-700 hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Turn Off
              </button>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Activity Identification & Scope
            </div>

            {/* Activity Name (70%) + WBS Code (30%) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div 
                className="sm:col-span-2"
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('name')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'name' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Activity Name *
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'name' ? null : 'name');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('name') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('name')}
                  placeholder="e.g. 4th Floor Slab Concreting"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs font-medium"
                />
              </div>

              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('code')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'code' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    WBS Code *
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'code' ? null : 'code');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('code') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('code')}
                  placeholder="e.g. 3.5.1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Full-width Field Guide for Activity Name or WBS Code */}
            {isGuideActiveFor('name') && (
              <FieldGuideCard guide={FIELD_GUIDES.name} onClose={() => setPinnedGuideId(null)} />
            )}
            {isGuideActiveFor('code') && (
              <FieldGuideCard guide={FIELD_GUIDES.code} onClose={() => setPinnedGuideId(null)} />
            )}

            {/* Type, Parent Package, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('type')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'type' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Type *
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'type' ? null : 'type');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('type') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={type}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('type')}
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
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="task">Standard Activity (Task)</option>
                  <option value="work_package">Work Package (PKG Folder)</option>
                  <option value="milestone">Milestone (MS - 0 Days)</option>
                  <option value="inspection">QC / Inspection (Approval)</option>
                </select>
              </div>

              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('parentTaskId')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'parentTaskId' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Parent Work Package
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'parentTaskId' ? null : 'parentTaskId');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('parentTaskId') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={parentTaskId || ''}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('parentTaskId')}
                  onChange={(e) => {
                    const newParentId = e.target.value || null;
                    setParentTaskId(newParentId);
                    if (!editingTask) {
                      if (newParentId) {
                        const parent = allTasks.find((t) => t.id === newParentId);
                        const children = allTasks.filter((t) => t.parentTaskId === newParentId);
                        setCode(parent ? `${parent.code}.${children.length + 1}` : `${allTasks.length + 1}.0`);
                      } else {
                        const rootTasks = allTasks.filter((t) => !t.parentTaskId);
                        const rootNums = rootTasks.map((t) => {
                          const m = t.code.match(/^(\d+)/);
                          return m ? parseInt(m[1], 10) : 0;
                        });
                        const maxNum = rootNums.length > 0 ? Math.max(...rootNums) : 0;
                        setCode(`${maxNum + 1}.0`);
                      }
                    }
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">None (Top-Level Phase)</option>
                  {workPackageOptions.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.code} {wp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('floor')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'floor' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Location / Floor
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'floor' ? null : 'floor');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('floor') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={floor}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('floor')}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 3rd Floor, Basement"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Full-width Field Guide for Type, Parent Package, or Floor */}
            {isGuideActiveFor('type') && (
              <FieldGuideCard guide={FIELD_GUIDES.type} onClose={() => setPinnedGuideId(null)} />
            )}
            {isGuideActiveFor('parentTaskId') && (
              <FieldGuideCard guide={FIELD_GUIDES.parentTaskId} onClose={() => setPinnedGuideId(null)} />
            )}
            {isGuideActiveFor('floor') && (
              <FieldGuideCard guide={FIELD_GUIDES.floor} onClose={() => setPinnedGuideId(null)} />
            )}
          </div>

          {/* Section 2: Target Baseline Schedule */}
          <div 
            className="space-y-2"
            onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('dates')}
            onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'dates' ? null : c)}
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Target Baseline Schedule (Planned Dates)
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPinnedGuideId((prev) => prev === 'dates' ? null : 'dates');
                }}
                className={`p-0.5 rounded cursor-pointer transition-colors ${
                  isGuideActiveFor('dates') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                }`}
                title="Click for schedule guide & 4 examples"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-600 mb-1 text-[11px]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={plannedStartDate}
                    onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dates')}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                        onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dates')}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                        onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dates')}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 flex items-center pt-3 text-purple-700 text-xs font-semibold">
                    Milestones are zero-duration contractual target dates.
                  </div>
                )}
              </div>
            </div>
            {isGuideActiveFor('dates') && (
              <FieldGuideCard guide={FIELD_GUIDES.dates} onClose={() => setPinnedGuideId(null)} />
            )}
          </div>

          {/* Section 3: Predecessor Dependency (Linked tasks highlighted in RED) */}
          {(() => {
            const selectedPredTask = allTasks.find((t) => t.id === selectedPredecessorId);
            return (
              <div 
                className="space-y-2"
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('dependency')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'dependency' ? null : c)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    3. Predecessor Dependency & Schedule Links
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'dependency' ? null : 'dependency');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('dependency') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for dependency guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 mb-1 text-[11px] font-semibold">
                        Predecessor Activity (Linked in this Project)
                      </label>
                      <select
                        value={selectedPredecessorId}
                        onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dependency')}
                        onChange={(e) => setSelectedPredecessorId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs truncate focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      >
                        <option value="">No Predecessor (Independent Parallel Task)</option>
                        {allTasks
                          .filter((t) => !editingTask || t.id !== editingTask.id)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.code} — {t.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 text-[11px] font-semibold">Relationship</label>
                      <select
                        value={depType}
                        onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dependency')}
                        onChange={(e) => setDepType(e.target.value as DependencyType)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      >
                        <option value="FS">FS (Finish to Start)</option>
                        <option value="SS">SS (Start to Start)</option>
                        <option value="FF">FF (Finish to Finish)</option>
                        <option value="SF">SF (Start to Finish)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 text-[11px] font-semibold">Lag (Days)</label>
                      <input
                        type="number"
                        min={0}
                        value={lagDays}
                        onFocus={() => isInfoGuideEnabled && setHoveredGuideId('dependency')}
                        onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Red Linked Indicator Alert Box */}
                  {selectedPredTask && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs animate-in fade-in duration-150">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded">
                              Linked in this Project
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-700">
                              {depType} Logic ({lagDays}d lag)
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-rose-950 mt-0.5 truncate">
                            🔗 Predecessor: <strong className="font-mono text-rose-900">{selectedPredTask.code}</strong> — {selectedPredTask.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-700 bg-white px-2 py-1 rounded-md border border-rose-300 font-bold shrink-0 self-start sm:self-auto font-mono">
                        CPM LINKED
                      </span>
                    </div>
                  )}
                </div>

                {isGuideActiveFor('dependency') && (
                  <FieldGuideCard guide={FIELD_GUIDES.dependency} onClose={() => setPinnedGuideId(null)} />
                )}
              </div>
            );
          })()}

          {/* Section 4: Critical Path & Float */}
          <div 
            className="space-y-2"
            onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('critical')}
            onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'critical' ? null : c)}
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                4. Critical Path & Float Priority
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPinnedGuideId((prev) => prev === 'critical' ? null : 'critical');
                }}
                className={`p-0.5 rounded cursor-pointer transition-colors ${
                  isGuideActiveFor('critical') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                }`}
                title="Click for critical path guide & 4 examples"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-purple-600" />
                  Priority Setting (Controls Purple Flame 🔥 Icon)
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
                  className={`py-2 px-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
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
                  className={`py-2 px-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
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
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 text-[11px]">Safety Buffer Free Float:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={totalFloatDays}
                      onChange={(e) => setTotalFloatDays(Math.max(1, parseInt(e.target.value) || 1))}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-16 px-2 py-0.5 text-xs border border-slate-200 rounded-md bg-white font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <span className="text-slate-500 text-[11px]">days</span>
                  </div>
                </div>
              )}
            </div>
            {isGuideActiveFor('critical') && (
              <FieldGuideCard guide={FIELD_GUIDES.critical} onClose={() => setPinnedGuideId(null)} />
            )}
          </div>

          {/* Section 5: Responsible Incharge & BOQ Quantities */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              5. Site Incharge & BOQ Quantities
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('responsible')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'responsible' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Site Incharge *
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'responsible' ? null : 'responsible');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('responsible') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={responsible}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('responsible')}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Er. Amit Verma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('boq')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'boq' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Target BOQ Quantity
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'boq' ? null : 'boq');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('boq') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={plannedQuantity !== undefined ? plannedQuantity : ''}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('boq')}
                  onChange={(e) => setPlannedQuantity(e.target.value ? parseFloat(e.target.value) : undefined)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 520"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div
                onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('boq')}
                onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'boq' ? null : c)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold text-[11px]">
                    Unit
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPinnedGuideId((prev) => prev === 'boq' ? null : 'boq');
                    }}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${
                      isGuideActiveFor('boq') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                    }`}
                    title="Click for guide & 4 examples"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={quantityUnit}
                  onFocus={() => isInfoGuideEnabled && setHoveredGuideId('boq')}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  placeholder="cu.m, MT, nos"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Full-width Field Guide for Incharge or BOQ */}
            {isGuideActiveFor('responsible') && (
              <FieldGuideCard guide={FIELD_GUIDES.responsible} onClose={() => setPinnedGuideId(null)} />
            )}
            {isGuideActiveFor('boq') && (
              <FieldGuideCard guide={FIELD_GUIDES.boq} onClose={() => setPinnedGuideId(null)} />
            )}

            {/* Field Notes */}
            <div
              onMouseEnter={() => isInfoGuideEnabled && setHoveredGuideId('notes')}
              onMouseLeave={() => isInfoGuideEnabled && setHoveredGuideId((c) => c === 'notes' ? null : c)}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold text-[11px]">
                  Notes / Technical Specs
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPinnedGuideId((prev) => prev === 'notes' ? null : 'notes');
                  }}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${
                    isGuideActiveFor('notes') ? 'text-purple-700 bg-purple-100' : 'text-slate-400 hover:text-purple-600'
                  }`}
                  title="Click for guide & 4 examples"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={notes}
                onFocus={() => isInfoGuideEnabled && setHoveredGuideId('notes')}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. M30 grade RMC with silica fume. Requires cube testing."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              {isGuideActiveFor('notes') && (
                <FieldGuideCard guide={FIELD_GUIDES.notes} onClose={() => setPinnedGuideId(null)} />
              )}
            </div>
          </div>
        </form>

        {/* Fixed Footer (Always visible without scrolling!) */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-dialog-form"
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            {editingTask ? 'Save Changes' : 'Add Activity to WBS'}
          </button>
        </div>

      </div>
    </div>
  );
};
