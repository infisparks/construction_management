'use client';

import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Search,
  ShieldCheck
} from 'lucide-react';
import { ConstructionTask, TaskDependency, DependencyType } from '@/lib/construction-planning/types';
import { willCreateCircularDependency, getPredecessorTasks, getSuccessorTasks } from '@/lib/construction-planning/dependency-utils';

interface DependencyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  task: ConstructionTask | null;
  allTasks: ConstructionTask[];
  dependencies: TaskDependency[];
  onAddDependency: (predecessorId: string, successorId: string, type: DependencyType, lagDays: number) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onNavigateToTask: (task: ConstructionTask) => void;
}

export const DependencyEditor: React.FC<DependencyEditorProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onNavigateToTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPredId, setSelectedPredId] = useState('');
  const [depType, setDepType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const predecessors = getPredecessorTasks(task.id, allTasks, dependencies);
  const successors = getSuccessorTasks(task.id, allTasks, dependencies);

  // Filter tasks that can be added as predecessor
  const existingPredIds = new Set(predecessors.map((p) => p.predecessor.id));
  const candidateTasks = allTasks.filter(
    (t) => 
      t.id !== task.id && 
      !existingPredIds.has(t.id) &&
      (searchQuery === '' || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPredId) {
      setError('Please select a predecessor activity.');
      return;
    }

    if (selectedPredId === task.id) {
      setError('A task cannot depend on itself.');
      return;
    }

    // Check circular relationship
    const isCircular = willCreateCircularDependency(selectedPredId, task.id, dependencies);
    if (isCircular) {
      setError('Circular dependency detected! This relationship would create an infinite dependency cycle in the project schedule.');
      return;
    }

    onAddDependency(selectedPredId, task.id, depType, Number(lagDays) || 0);
    setSelectedPredId('');
    setLagDays(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manage Task Dependencies
              </h3>
              <p className="text-xs text-slate-500">
                Configure predecessor & successor linkages for <strong className="text-slate-800">{task.code} {task.name}</strong>
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

        <div className="p-6 space-y-6 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Predecessor Form */}
          <form onSubmit={handleAdd} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">
                Link New Predecessor Activity
              </span>
              <span className="text-[11px] text-indigo-700">Cycle validation active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Predecessor Task *</label>
                <select
                  value={selectedPredId}
                  onChange={(e) => setSelectedPredId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">Select predecessor...</option>
                  {candidateTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Type</label>
                <select
                  value={depType}
                  onChange={(e) => setDepType(e.target.value as DependencyType)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                >
                  <option value="FS">FS (Finish to Start)</option>
                  <option value="SS">SS (Start to Start)</option>
                  <option value="FF">FF (Finish to Finish)</option>
                  <option value="SF">SF (Start to Finish)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lag (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={lagDays}
                  onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link Dependency</span>
              </button>
            </div>
          </form>

          {/* Current Predecessors */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center justify-between">
              <span>Active Predecessors ({predecessors.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">Activities that govern this task&apos;s start date</span>
            </h4>

            {predecessors.length > 0 ? (
              <div className="space-y-2">
                {predecessors.map(({ dependency, predecessor }) => (
                  <div
                    key={dependency.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                        {predecessor.code}
                      </span>
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTask(predecessor);
                        }}
                        className="font-medium text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {predecessor.name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                        {dependency.type} {dependency.lagDays > 0 ? `+${dependency.lagDays}d` : ''}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveDependency(dependency.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Unlink dependency"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                No predecessors linked. This task is free to start in parallel at any time.
              </p>
            )}
          </div>

          {/* Current Successors */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center justify-between">
              <span>Downstream Successors ({successors.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">Activities waiting on this task</span>
            </h4>

            {successors.length > 0 ? (
              <div className="space-y-2">
                {successors.map(({ dependency, successor }) => (
                  <div
                    key={dependency.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                        {successor.code}
                      </span>
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTask(successor);
                        }}
                        className="font-medium text-slate-900 hover:text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {successor.name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {dependency.type} {dependency.lagDays > 0 ? `+${dependency.lagDays}d` : ''}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveDependency(dependency.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Unlink dependency"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                No successor activities waiting on this task.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
