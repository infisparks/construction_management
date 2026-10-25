'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Flame, 
  Milestone as MilestoneIcon, 
  ClipboardCheck, 
  FolderKanban, 
  Play, 
  CheckCircle2, 
  MoreVertical, 
  Plus, 
  Link2, 
  FileText, 
  Trash2, 
  Edit2,
  RotateCcw 
} from 'lucide-react';
import { ConstructionTask, TaskDependency, ScheduleStatus, TaskType } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';
import { TaskNode } from '@/lib/construction-planning/task-utils';

interface ConstructionTaskRowProps {
  node: TaskNode;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  onSelectTask: (task: ConstructionTask) => void;
  onStartTask: (taskId: string) => void;
  onRecordProgress: (task: ConstructionTask) => void;
  onCompleteTask: (taskId: string) => void;
  onRevertTaskStatus?: (taskId: string, targetStatus: 'not_started' | 'in_progress') => void;
  onAddChildTask: (parentTask: ConstructionTask) => void;
  onEditTask: (task: ConstructionTask) => void;
  onDeleteTask: (task: ConstructionTask) => void;
  dependencies: TaskDependency[];
  onOpenDependencyManager: (task: ConstructionTask) => void;
  isNotesOpen?: boolean;
  onToggleRowNotes?: () => void;
}

export const ConstructionTaskRow: React.FC<ConstructionTaskRowProps> = ({
  node,
  isExpanded,
  onToggleExpand,
  onSelectTask,
  onStartTask,
  onRecordProgress,
  onCompleteTask,
  onRevertTaskStatus,
  onAddChildTask,
  onEditTask,
  onDeleteTask,
  dependencies,
  onOpenDependencyManager,
  isNotesOpen = false,
  onToggleRowNotes,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number; openUpwards: boolean } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleScrollOrResize = () => setShowMenu(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showMenu]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 230;
      setMenuCoords({
        top: openUpwards ? rect.top - 6 : rect.bottom + 6,
        right: Math.max(16, window.innerWidth - rect.right),
        openUpwards,
      });
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  const hasChildren = node.children && node.children.length > 0;
  const isWorkPackage = node.type === 'work_package';
  const isMilestone = node.type === 'milestone';

  const taskPredecessors = dependencies.filter((d) => d.successorId === node.id);
  const taskSuccessors = dependencies.filter((d) => d.predecessorId === node.id);

  // Status badge styling
  const getStatusBadge = (status: ScheduleStatus) => {
    const effectiveStatus = (node.varianceDays > 0 && status !== 'completed' && status !== 'blocked') 
      ? 'delayed' 
      : status;
    switch (effectiveStatus) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#653ef1] border border-purple-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#653ef1] animate-soft-pulse" />
            In Progress
          </span>
        );
      case 'ready_to_start':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Ready
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-soft-pulse" />
            Delayed
          </span>
        );
      case 'at_risk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            At Risk
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Blocked
          </span>
        );
      case 'on_hold':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
            On Hold
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Not Started
          </span>
        );
    }
  };

  // Task type icon / indicator
  const getTypeBadge = (type: TaskType) => {
    switch (type) {
      case 'work_package':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
            <FolderKanban className="w-3 h-3 text-slate-600" />
            PKG
          </span>
        );
      case 'milestone':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
            <MilestoneIcon className="w-3 h-3 text-amber-700" />
            MS
          </span>
        );
      case 'inspection':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-300">
            <ClipboardCheck className="w-3 h-3 text-sky-700" />
            QC
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Task
          </span>
        );
    }
  };

  const indentPadding = Math.min(node.level * 20, 80);

  return (
    <React.Fragment>
      <tr 
        className={`group border-b border-slate-200/80 hover:bg-slate-50/90 transition-colors ${
        isWorkPackage ? 'bg-slate-50/70 font-medium' : 'bg-white'
      } ${node.isCritical ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}`}
    >
      {/* 1. Hierarchy & Task Name (STICKY FROZEN LEFT) */}
      <td 
        className={`py-2 px-3 text-xs sticky left-0 z-10 border-r border-slate-200/90 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] transition-colors ${
          isWorkPackage ? 'bg-slate-50 group-hover:bg-slate-100' : 'bg-white group-hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${indentPadding}px` }}>
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(node.id)}
              className="p-1 rounded hover:bg-slate-200/80 text-slate-600 transition-colors shrink-0"
              title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-800" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-800" />
              )}
            </button>
          ) : (
            <span className="w-5 shrink-0 inline-block" />
          )}

          {/* Critical Path flame indicator */}
          {node.isCritical && (
            <span 
              className="shrink-0 text-amber-800 bg-amber-100 p-0.5 rounded border border-amber-300" 
              title="Critical Path Activity (Zero float)"
            >
              <Flame className="w-3 h-3 text-amber-600" />
            </span>
          )}

          {/* Task Code */}
          <span className="font-mono text-[11px] text-slate-600 font-bold shrink-0">
            {node.code}
          </span>

          {/* Task Name Link */}
          <button
            onClick={() => onSelectTask(node)}
            className={`text-left text-xs truncate max-w-[200px] sm:max-w-[260px] lg:max-w-[320px] hover:text-indigo-600 hover:underline transition-colors ${
              isWorkPackage ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
            }`}
            title={node.name}
          >
            {node.name}
          </button>

          {node.floor && (
            <span className="hidden 2xl:inline-block text-[9px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded shrink-0 border border-slate-200">
              {node.floor}
            </span>
          )}

          {/* Activity Note Indicator & Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRowNotes?.();
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 cursor-pointer ${
              isNotesOpen
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                : node.notes || node.description
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200'
            }`}
            title={node.notes || node.description ? (isNotesOpen ? 'Close note' : 'View note') : 'Add note'}
          >
            <FileText className="w-2.5 h-2.5 text-amber-600" />
            <span className="hidden sm:inline">{node.notes || node.description ? (isNotesOpen ? 'Hide' : 'Note') : '+Note'}</span>
          </button>
        </div>
      </td>

      {/* 2. Type */}
      <td className="py-2 px-2 text-xs text-center whitespace-nowrap">
        {getTypeBadge(node.type)}
      </td>

      {/* 3. Status */}
      <td className="py-2 px-2 text-xs text-center whitespace-nowrap">
        {getStatusBadge(node.status)}
      </td>

      {/* 4. Progress */}
      <td className="py-2 px-2 text-xs min-w-[105px]">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                node.status === 'completed' || node.progress === 100 
                  ? 'bg-emerald-500' 
                  : node.status === 'delayed' 
                    ? 'bg-rose-500' 
                    : node.status === 'at_risk'
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[#653ef1] to-[#8b5cf6]'
              }`}
              style={{ width: `${node.progress}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold w-8 text-right font-mono ${
            node.status === 'completed' ? 'text-emerald-800' : 'text-slate-800'
          }`}>
            {node.progress}%
          </span>
        </div>
      </td>

      {/* 5. Schedule (Plan vs Actual) - Fixed Bullet Entity */}
      <td className="py-2 px-2.5 text-xs whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-slate-800">
            <span className="text-slate-500 text-[10px] font-bold">PLAN:</span>
            <span className="font-semibold text-[11px] text-slate-900">
              {formatDisplayDate(node.plannedStartDate)} &rarr; {formatDisplayDate(node.plannedEndDate)}
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-medium">({node.plannedDurationDays}d)</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-slate-500 font-bold">ACTUAL:</span>
            {node.actualStartDate ? (
              <span className="text-emerald-800 font-semibold">
                Started {formatDisplayDate(node.actualStartDate)}
                {node.actualEndDate ? ` • Finished ${formatDisplayDate(node.actualEndDate)}` : ' • In progress on site'}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not started on site</span>
            )}
          </div>
        </div>
      </td>

      {/* 6. Forecast Finish & Variance (Clear High-Contrast Colors) */}
      <td className="py-2 px-2 text-xs whitespace-nowrap font-mono">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold ${node.varianceDays > 0 ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
            {formatDisplayDate(node.forecastEndDate)}
          </span>
          {node.varianceDays > 0 && (
            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
              +{node.varianceDays}d
            </span>
          )}
          {node.varianceDays < 0 && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
              {node.varianceDays}d
            </span>
          )}
        </div>
      </td>

      {/* 7. Dependencies (Predecessors & Successors) - Highlight in RED if linked in this project */}
      <td className="py-2 px-2 text-xs text-center whitespace-nowrap">
        <button
          onClick={() => onOpenDependencyManager(node)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-all shadow-2xs cursor-pointer ${
            taskPredecessors.length > 0
              ? 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 font-bold'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300'
          }`}
          title={
            taskPredecessors.length > 0
              ? `Linked in this project: ${taskPredecessors.length} Predecessor(s), ${taskSuccessors.length} Successor(s). Click to inspect & edit.`
              : 'No predecessor dependencies. Independent parallel task.'
          }
        >
          <Link2 className={`w-3 h-3 ${taskPredecessors.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>{taskPredecessors.length > 0 ? `Linked (${taskPredecessors.length})` : 'Independent'}</span>
        </button>
      </td>

      {/* 8. Actions (Clean Non-Overlapping Column) */}
      <td className="py-2 px-3 text-xs text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 relative">
          
          {/* Quick Execution Buttons */}
          {!isWorkPackage && (
            <>
              {node.status !== 'completed' && (
                <>
                  {!node.actualStartDate && (
                    <button
                      onClick={() => onStartTask(node.id)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                      title="Record actual start date"
                    >
                      <Play className="w-2.5 h-2.5 fill-indigo-600 text-indigo-600" />
                      <span>Start</span>
                    </button>
                  )}

                  {node.actualStartDate && (
                    <button
                      onClick={() => onRecordProgress(node)}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                      title="Record daily progress"
                    >
                      <FileText className="w-2.5 h-2.5 text-emerald-700" />
                      <span>Log</span>
                    </button>
                  )}

                  {node.actualStartDate && node.progress < 100 && (
                    <button
                      onClick={() => onCompleteTask(node.id)}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors inline-flex items-center gap-1"
                      title="Mark 100% completed"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Done</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* 3-Dots Dropdown with Fixed Floating Position */}
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={handleToggleMenu}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-300"
              title="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && menuCoords && (
              <>
                <div 
                  className="fixed inset-0 z-[9990]" 
                  onClick={() => setShowMenu(false)} 
                />
                <div 
                  style={{
                    position: 'fixed',
                    ...(menuCoords.openUpwards 
                      ? { bottom: `${window.innerHeight - menuCoords.top}px` } 
                      : { top: `${menuCoords.top}px` }),
                    right: `${menuCoords.right}px`,
                  }}
                  className="w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[9999] text-left text-xs font-medium whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSelectTask(node);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Task Details</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditTask(node);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Activity</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onAddChildTask(node);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Add Subtask</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenDependencyManager(node);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manage Dependencies</span>
                  </button>

                  {/* Revert Actions */}
                  {onRevertTaskStatus && (node.status === 'completed' || node.actualEndDate) && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRevertTaskStatus(node.id, 'in_progress');
                      }}
                      className="w-full px-3.5 py-2 text-left text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Revert to In Progress</span>
                    </button>
                  )}

                  {onRevertTaskStatus && (node.actualStartDate || node.status === 'in_progress' || node.status === 'completed') && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRevertTaskStatus(node.id, 'not_started');
                      }}
                      className="w-full px-3.5 py-2 text-left text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reset to Not Started</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteTask(node);
                    }}
                    className="w-full px-3.5 py-2 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Activity</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>

      {/* Expandable Activity Notes Sub-Row */}
      {isNotesOpen && (
        <tr className="bg-amber-50/40 border-b border-amber-200/80 transition-colors">
          <td colSpan={8} className="py-2.5 px-4 sm:px-6">
            <div className="flex items-start gap-2.5 max-w-4xl">
              <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200 shadow-2xs">
                <FileText className="w-3 h-3 text-amber-600" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Activity Notes & Field Remarks ({node.code} - {node.name})
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditTask(node)}
                    className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    Edit Note
                  </button>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                  {node.notes || node.description || (
                    <span className="text-slate-400 italic">No notes recorded yet for this activity. Click &quot;Edit Note&quot; to add notes, technical specs, or site instructions.</span>
                  )}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
