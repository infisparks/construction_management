'use client';

import React, { useState, useEffect } from 'react';
import { ConstructionTask, TaskDependency } from '@/lib/construction-planning/types';
import { TaskNode } from '@/lib/construction-planning/task-utils';
import { ConstructionTaskRow } from './ConstructionTaskRow';
import { Layers, AlertCircle, FileText } from 'lucide-react';

interface ConstructionTaskTableProps {
  tasks: TaskNode[];
  allTasksCount: number;
  expandedIds: Set<string>;
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
  areAllNotesOpen?: boolean;
  onToggleAllNotes?: () => void;
}

export const ConstructionTaskTable: React.FC<ConstructionTaskTableProps> = ({
  tasks,
  allTasksCount,
  expandedIds,
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
  areAllNotesOpen = false,
  onToggleAllNotes,
}) => {
  const [openNotesTaskIds, setOpenNotesTaskIds] = useState<Set<string>>(new Set());

  // Synchronize with global areAllNotesOpen toggle
  useEffect(() => {
    if (areAllNotesOpen) {
      setOpenNotesTaskIds(new Set(tasks.map((t) => t.id)));
    } else {
      setOpenNotesTaskIds(new Set());
    }
  }, [areAllNotesOpen, tasks]);

  const handleToggleRowNotes = (taskId: string) => {
    setOpenNotesTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col w-full">
      {/* Table Subheader Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Showing <strong className="text-slate-800">{tasks.length}</strong> of{' '}
            <strong className="text-slate-800">{allTasksCount}</strong> WBS nodes
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          {onToggleAllNotes && (
            <button
              type="button"
              onClick={onToggleAllNotes}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                areAllNotesOpen
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
              title={areAllNotesOpen ? 'Close all activity notes across table' : 'Open all activity notes across table'}
            >
              <FileText className={`w-3 h-3 ${areAllNotesOpen ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>{areAllNotesOpen ? 'Close All Notes' : 'Open All Notes'}</span>
            </button>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Critical Path Border
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Actual Stamped
          </span>
        </div>
      </div>

      {/* Main Responsive Table Container with Sticky Frozen Panes */}
      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-20">
            <tr>
              {/* Sticky Frozen Left Column */}
              <th className="py-2.5 px-3 min-w-[240px] sm:min-w-[280px] lg:min-w-[320px] sticky left-0 z-20 bg-slate-50 border-r border-slate-200/90 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                WBS Activity & Phase
              </th>
              <th className="py-2.5 px-2 w-16">Type</th>
              <th className="py-2.5 px-2 w-24">Status</th>
              <th className="py-2.5 px-2 w-28 min-w-[105px]">Progress</th>
              <th className="py-2.5 px-2 min-w-[190px]">Schedule (Plan vs Actual)</th>
              <th className="py-2.5 px-2 min-w-[110px]">Forecast Finish</th>
              <th className="py-2.5 px-2 w-20 text-center">Pre / Suc</th>
              <th className="py-2.5 px-3 text-right w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length > 0 ? (
              tasks.map((node) => (
                <ConstructionTaskRow
                  key={node.id}
                  node={node}
                  isExpanded={expandedIds.has(node.id)}
                  onToggleExpand={onToggleExpand}
                  onSelectTask={onSelectTask}
                  onStartTask={onStartTask}
                  onRecordProgress={onRecordProgress}
                  onCompleteTask={onCompleteTask}
                  onRevertTaskStatus={onRevertTaskStatus}
                  onAddChildTask={onAddChildTask}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  dependencies={dependencies}
                  onOpenDependencyManager={onOpenDependencyManager}
                  isNotesOpen={openNotesTaskIds.has(node.id)}
                  onToggleRowNotes={() => handleToggleRowNotes(node.id)}
                />
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-14 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#653ef1] flex items-center justify-center border border-purple-200 shadow-2xs">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">No Construction Activities Yet</h4>
                      <p className="text-xs text-slate-500 mt-1">Start by adding your first work package or activity to build your project schedule live in Supabase.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
