'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  Search, 
  Lock, 
  FolderKanban, 
  Milestone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CornerDownRight, 
  ChevronRight, 
  Info,
  Check
} from 'lucide-react';
import { ConstructionTask } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';
import { fetchDeletedPlanTasks, restorePlanTask, fetchPlanTasks } from '@/lib/supabase/planning-services';

interface RestoreTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  activeTasks?: ConstructionTask[];
  onTaskRestored: () => void;
}

export const RestoreTasksModal: React.FC<RestoreTasksModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  activeTasks = [],
  onTaskRestored,
}) => {
  const [deletedTasks, setDeletedTasks] = useState<ConstructionTask[]>([]);
  const [liveActiveTasks, setLiveActiveTasks] = useState<ConstructionTask[]>(activeTasks || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (activeTasks && activeTasks.length > 0) {
      setLiveActiveTasks(activeTasks);
    }
  }, [activeTasks]);

  // Load both deleted and active tasks fresh from Supabase
  const loadFreshData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [deleted, active] = await Promise.all([
        fetchDeletedPlanTasks(projectId),
        fetchPlanTasks(projectId),
      ]);
      setDeletedTasks(deleted || []);
      if (active && active.length > 0) {
        setLiveActiveTasks(active);
      }
    } catch (err) {
      console.error('Failed to load tasks for restore modal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFreshData();
      setSearchQuery('');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, projectId]);

  // Active tasks map by ID
  const activeMap = useMemo(() => {
    const map = new Map<string, ConstructionTask>();
    liveActiveTasks.forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });
    return map;
  }, [liveActiveTasks]);

  // Deleted tasks map by ID
  const deletedMap = useMemo(() => {
    const map = new Map<string, ConstructionTask>();
    deletedTasks.forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });
    return map;
  }, [deletedTasks]);

  // Code-to-task lookup map (for dotted code hierarchy fallback like 1.0.3.1 -> 1.0.3)
  const codeToTaskMap = useMemo(() => {
    const map = new Map<string, ConstructionTask>();
    liveActiveTasks.forEach((t) => {
      if (t?.code) map.set(t.code.trim(), t);
    });
    deletedTasks.forEach((t) => {
      if (t?.code) map.set(t.code.trim(), t);
    });
    return map;
  }, [liveActiveTasks, deletedTasks]);

  /**
   * Helper: Find parent of a task.
   * 1. By task.parentTaskId in activeMap or deletedMap.
   * 2. Fallback: by dotted plan_code prefix (e.g. '1.0.3.1' -> '1.0.3').
   */
  const findParent = (curr: ConstructionTask): ConstructionTask | null => {
    if (curr.parentTaskId) {
      if (activeMap.has(curr.parentTaskId)) return activeMap.get(curr.parentTaskId)!;
      if (deletedMap.has(curr.parentTaskId)) return deletedMap.get(curr.parentTaskId)!;
    }

    if (curr.code && curr.code.includes('.')) {
      const parts = curr.code.trim().split('.');
      if (parts.length > 2) {
        const parentCode = parts.slice(0, -1).join('.');
        const parentByCode = codeToTaskMap.get(parentCode);
        if (parentByCode && parentByCode.id !== curr.id) {
          return parentByCode;
        }
      }
    }

    return null;
  };

  /**
   * Build complete ancestor chain from Root down to immediate parent:
   * e.g. [Grandparent, Parent]
   */
  const getAncestorChain = (task: ConstructionTask): ConstructionTask[] => {
    const chain: ConstructionTask[] = [];
    const visited = new Set<string>([task.id]);
    let curr = task;

    while (true) {
      const parent = findParent(curr);
      if (!parent || visited.has(parent.id)) break;
      visited.add(parent.id);
      chain.unshift(parent); // Root will be at index 0, immediate parent at the end
      curr = parent;
    }

    return chain;
  };

  /**
   * Strict Hierarchical Parent-First Restore Check:
   * 1. If task has no ancestors, it is a root package -> canRestore = true.
   * 2. If task has ancestors:
   *    Walk chain from Root down to Immediate Parent.
   *    The FIRST ancestor in this chain that is still deleted is the blockingParent.
   *    - If any ancestor is deleted: canRestore = false (must restore that ancestor first).
   *    - If all ancestors are active: canRestore = true.
   */
  const getTaskHierarchyInfo = (task: ConstructionTask) => {
    const ancestors = getAncestorChain(task);
    const breadcrumb = [
      ...ancestors.map((a) => `${a.code ? a.code + ' ' : ''}${a.name}`),
      `${task.code ? task.code + ' ' : ''}${task.name}`,
    ];

    let blockingParent: ConstructionTask | null = null;

    // Check from Root down to Immediate Parent
    for (const ancestor of ancestors) {
      // If ancestor is in deletedMap, it has NOT been restored yet!
      if (deletedMap.has(ancestor.id)) {
        blockingParent = ancestor;
        break; // Top-most un-restored ancestor must be restored first
      }
    }

    const canRestore = !blockingParent;
    const depth = ancestors.length;

    return {
      canRestore,
      blockingParent,
      breadcrumb,
      depth,
      ancestors,
    };
  };

  const handleRestoreSingle = async (task: ConstructionTask) => {
    const { canRestore, blockingParent } = getTaskHierarchyInfo(task);

    if (!canRestore && blockingParent) {
      setErrorMsg(
        `Cannot restore "${task.name}" directly! You must first restore parent folder "${blockingParent.code ? blockingParent.code + ' ' : ''}${blockingParent.name}".`
      );
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    setRestoringId(task.id);
    setErrorMsg(null);

    try {
      const ok = await restorePlanTask(task.id);
      if (ok) {
        setSuccessMsg(`Restored "${task.code ? task.code + ' ' : ''}${task.name}" to the schedule!`);
        // Remove from deleted list and immediately add to live active tasks so nested children unlock instantly
        setDeletedTasks((prev) => prev.filter((t) => t.id !== task.id));
        setLiveActiveTasks((prev) => [...prev, { ...task, isDeleted: false }]);
        onTaskRestored();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(`Failed to restore "${task.name}". Please try again.`);
      }
    } catch (err) {
      console.error('Error restoring task:', err);
      setErrorMsg('An unexpected error occurred while restoring the activity.');
    } finally {
      setRestoringId(null);
    }
  };

  // Sort tasks hierarchically by plan_code (1.0, 1.0.1, 1.0.2, 1.0.3, 1.0.3.1, etc.)
  const sortedTasks = useMemo(() => {
    return [...deletedTasks].sort((a, b) => {
      const aParts = (a.code || '').split('.').map((p) => parseInt(p, 10) || 0);
      const bParts = (b.code || '').split('.').map((p) => parseInt(p, 10) || 0);
      const maxLen = Math.max(aParts.length, bParts.length);

      for (let i = 0; i < maxLen; i++) {
        const aVal = aParts[i] ?? -1;
        const bVal = bParts[i] ?? -1;
        if (aVal !== bVal) return aVal - bVal;
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [deletedTasks]);

  const filteredTasks = sortedTasks.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#653ef1] flex items-center justify-center font-bold shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Restore Schedule Activities
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-100 text-purple-700 border border-purple-200">
                  {deletedTasks.length} {deletedTasks.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {projectName ? `Workspace: ${projectName}` : 'Soft-deleted items'} • Parent folders must be restored before nested subtasks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Hierarchy Banner */}
        <div className="px-5 py-2.5 bg-purple-50/80 border-b border-purple-100 flex items-center gap-2 text-xs text-purple-900 shrink-0">
          <Info className="w-4 h-4 text-[#653ef1] shrink-0" />
          <span className="leading-relaxed">
            <strong>Hierarchical Restore Rule:</strong> You cannot restore a task directly if its parent package is deleted. If a parent folder has an ancestor, restore the topmost parent folder first, then child folders, then child tasks.
          </span>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-800 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by activity name or code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={loadFreshData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tasks List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#653ef1]" />
              <p className="text-xs">Loading deleted activities from Supabase...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-white rounded-xl border border-dashed border-slate-200 p-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No Deleted Activities Found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchQuery
                    ? 'No deleted tasks match your search filter.'
                    : 'The Recycle Bin for this project is clean. All activities are active on the timeline.'}
                </p>
              </div>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const { canRestore, blockingParent, breadcrumb, depth } = getTaskHierarchyInfo(task);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all ${
                    canRestore 
                      ? 'border-purple-200 hover:border-purple-300 ring-1 ring-purple-50' 
                      : 'border-slate-200 opacity-80 bg-slate-50/60'
                  }`}
                  style={{
                    marginLeft: depth > 0 ? `${Math.min(depth * 16, 48)}px` : '0px',
                  }}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Depth Tree Marker */}
                    {depth > 0 && (
                      <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                    )}

                    {/* Task Type Badge */}
                    <div className="shrink-0 mt-0.5 sm:mt-0">
                      {task.type === 'work_package' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200">
                          <FolderKanban className="w-3 h-3" />
                          PKG
                        </span>
                      ) : task.type === 'milestone' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                          <Milestone className="w-3 h-3" />
                          MILESTONE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                          TASK
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {task.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={task.name}>
                          {task.name}
                        </h4>
                      </div>

                      {/* Breadcrumb Path if nested */}
                      {breadcrumb.length > 1 && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                          <span>Path:</span>
                          {breadcrumb.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                              <span className={idx === breadcrumb.length - 1 ? 'font-bold text-slate-700' : ''}>
                                {crumb}
                              </span>
                              {idx < breadcrumb.length - 1 && <ChevronRight className="w-2.5 h-2.5 shrink-0" />}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span>
                          Schedule: {formatDisplayDate(task.plannedStartDate)} ➔ {formatDisplayDate(task.plannedEndDate)} ({task.plannedDurationDays}d)
                        </span>
                        {task.floor && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{task.floor}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Restore Action Button / Locked Notice */}
                  <div className="self-end sm:self-center shrink-0">
                    {canRestore ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreSingle(task)}
                        disabled={restoringId === task.id}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#653ef1] hover:bg-purple-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Parent package is active on timeline. Click to restore!"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${restoringId === task.id ? 'animate-spin' : ''}`} />
                        <span>{restoringId === task.id ? 'Restoring...' : `Restore ${task.type === 'work_package' ? 'Package' : 'Task'}`}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(
                            `Cannot restore "${task.name}" directly! You must first restore parent folder "${blockingParent?.code ? blockingParent.code + ' ' : ''}${blockingParent?.name}".`
                          );
                          setTimeout(() => setErrorMsg(null), 5000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        title={`Click to view requirement: Must restore parent "${blockingParent?.name}" first`}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Restore parent <strong>{blockingParent?.code ? blockingParent.code + ' ' : ''}{blockingParent?.name}</strong> first</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Parent-first restore preserves timeline structure and avoids orphaned schedule tasks.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
