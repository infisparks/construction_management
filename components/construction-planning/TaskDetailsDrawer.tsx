'use client';

import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Flame, 
  Link2, 
  AlertCircle, 
  FileText, 
  History, 
  Play, 
  CheckCircle2, 
  User, 
  Layers, 
  Plus, 
  Trash2,
  ExternalLink,
  ShieldCheck,
  Package,
  RotateCcw
} from 'lucide-react';
import { 
  ConstructionTask, 
  TaskDependency, 
  DailyProgressEntry, 
  TaskIssue, 
  TaskActivityLog,
  DependencyType,
  MaterialTransaction
} from '@/lib/construction-planning/types';
import { formatDisplayDate, calculateElapsedDuration } from '@/lib/construction-planning/schedule-utils';
import { checkTaskReadiness, getPredecessorTasks, getSuccessorTasks } from '@/lib/construction-planning/dependency-utils';
import { LogMaterialModal } from './LogMaterialModal';

interface TaskDetailsDrawerProps {
  task: ConstructionTask | null;
  isOpen: boolean;
  onClose: () => void;
  allTasks: ConstructionTask[];
  dependencies: TaskDependency[];
  progressEntries: DailyProgressEntry[];
  issues: TaskIssue[];
  activityLogs: TaskActivityLog[];
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onRevertTaskStatus?: (taskId: string, targetStatus: 'not_started' | 'in_progress') => void;
  onRecordProgress: (task: ConstructionTask) => void;
  onSelectTaskById: (taskId: string) => void;
  onAddDependency: (predecessorId: string, successorId: string, type: DependencyType, lagDays: number) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onAddIssue: (taskId: string, title: string, description: string, severity: TaskIssue['severity']) => void;
  onDeleteTask?: (task: ConstructionTask) => void;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  task,
  isOpen,
  onClose,
  allTasks,
  dependencies,
  progressEntries,
  issues,
  activityLogs,
  onStartTask,
  onCompleteTask,
  onRevertTaskStatus,
  onRecordProgress,
  onSelectTaskById,
  onAddDependency,
  onRemoveDependency,
  onAddIssue,
  onDeleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'dependencies' | 'progress' | 'materials' | 'issues' | 'history'>('overview');
  
  // New issue form state
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [newIssueSeverity, setNewIssueSeverity] = useState<TaskIssue['severity']>('medium');

  // Material Consumption state
  const [taskTransactions, setTaskTransactions] = useState<MaterialTransaction[]>([]);
  const [isLogMaterialModalOpen, setIsLogMaterialModalOpen] = useState(false);
  const [materialSuccessMsg, setMaterialSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const parentTask = task.parentTaskId ? taskMap.get(task.parentTaskId) : null;

  // Filter entities specific to this task
  const taskProgress = progressEntries.filter((p) => p.taskId === task.id);
  const taskIssues = issues.filter((i) => i.taskId === task.id);
  const taskLogs = activityLogs.filter((a) => a.taskId === task.id);
  const taskSpecificTx = taskTransactions.filter(
    (t) => t.type === 'outward' && (t.taskId === task.id || t.taskCode === task.code)
  );
  const taskTotalMaterialCost = taskSpecificTx.reduce((acc, t) => acc + (t.totalAmount || 0), 0);

  // Predecessors and Successors
  const predecessors = getPredecessorTasks(task.id, allTasks, dependencies);
  const successors = getSuccessorTasks(task.id, allTasks, dependencies);

  // Readiness evaluation
  const readiness = checkTaskReadiness(task.id, allTasks, dependencies);
  const elapsedDays = calculateElapsedDuration(task.actualStartDate, task.actualEndDate);

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;
    onAddIssue(task.id, newIssueTitle, newIssueDesc, newIssueSeverity);
    setNewIssueTitle('');
    setNewIssueDesc('');
    setShowIssueForm(false);
  };

  const handleSaveMaterialTx = (newTx: MaterialTransaction) => {
    setTaskTransactions((prev) => [newTx, ...prev]);
    setMaterialSuccessMsg(`Successfully recorded ${newTx.quantity} ${newTx.unit} of ${newTx.materialName}.`);
    setTimeout(() => setMaterialSuccessMsg(null), 3500);
  };

  const handleDeleteMaterialTx = (txId: string) => {
    setTaskTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {task.code}
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                {task.type.replace('_', ' ')}
              </span>
              {task.isCritical && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Flame className="w-3 h-3 text-amber-600" />
                  Critical Path (0d Float)
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">
              {task.name}
            </h2>
            {parentTask && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Package: <strong className="text-slate-700">{parentTask.name}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDeleteTask && (
              <button
                type="button"
                onClick={() => onDeleteTask(task)}
                title="Delete this activity"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Execution Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            <span className="font-semibold text-slate-800 capitalize">{task.status.replace('_', ' ')}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Progress:</span>
            <span className="font-bold text-[#653ef1] font-numeric">{task.progress}%</span>
          </div>

          <div className="flex items-center gap-2">
            {!task.actualStartDate && task.status !== 'completed' && (
              <button
                onClick={() => onStartTask(task.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6e46f2] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] text-white font-semibold shadow-xs shadow-[#653ef1]/25 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Start Task</span>
              </button>
            )}

            {task.actualStartDate && (
              <button
                onClick={() => onRecordProgress(task)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Record Progress</span>
              </button>
            )}

            {task.actualStartDate && task.progress < 100 && (
              <button
                onClick={() => onCompleteTask(task.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Mark Done</span>
              </button>
            )}

            {/* Revert Completed Task */}
            {task.status === 'completed' && onRevertTaskStatus && (
              <button
                onClick={() => onRevertTaskStatus(task.id, 'in_progress')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium border border-amber-200 transition-all shadow-xs cursor-pointer"
                title="Undo completion and resume task as In Progress"
              >
                <RotateCcw className="w-3 h-3 text-amber-600" />
                <span>Revert to In Progress</span>
              </button>
            )}

            {/* Reset accidentally started or completed task back to Not Started */}
            {(task.actualStartDate || task.status === 'in_progress' || task.status === 'completed') && onRevertTaskStatus && (
              <button
                onClick={() => onRevertTaskStatus(task.id, 'not_started')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-medium border border-slate-200 transition-all shadow-xs cursor-pointer"
                title="Reset actual dates and progress back to Not Started"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset to Not Started</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 px-4 bg-slate-50/60 overflow-x-auto text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'dependencies', label: `Dependencies (${predecessors.length + successors.length})` },
            { id: 'progress', label: `Daily Progress (${taskProgress.length})` },
            { id: 'materials', label: `Materials Used (${taskSpecificTx.length})` },
            { id: 'issues', label: `Issues (${taskIssues.length})` },
            { id: 'history', label: 'Activity Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2.5 px-3.5 border-b-2 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#653ef1] text-[#653ef1] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Planned vs Actual Comparison Panel */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Planned Schedule vs Actual Site Execution
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                  {/* Planned Column */}
                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-2">
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider block">
                      Target Baseline Schedule
                    </span>
                    <div>
                      <span className="text-slate-500">Planned Start:</span>
                      <p className="font-semibold text-slate-800">{formatDisplayDate(task.plannedStartDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Planned Finish:</span>
                      <p className="font-semibold text-slate-800">{formatDisplayDate(task.plannedEndDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Planned Duration:</span>
                      <p className="font-semibold text-slate-800">{task.plannedDurationDays} Days</p>
                    </div>
                  </div>

                  {/* Actual Column */}
                  <div className="p-3 rounded-lg bg-indigo-50/40 border border-indigo-100 space-y-2">
                    <span className="font-semibold text-indigo-700 uppercase text-[10px] tracking-wider block">
                      Actual Execution On Site
                    </span>
                    <div>
                      <span className="text-slate-500">Actual Start:</span>
                      <p className="font-semibold text-emerald-700">
                        {task.actualStartDate ? formatDisplayDate(task.actualStartDate) : 'Not started yet'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Actual Finish:</span>
                      <p className="font-semibold text-emerald-800">
                        {task.actualEndDate ? formatDisplayDate(task.actualEndDate) : 'In progress'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Elapsed Time:</span>
                      <p className="font-semibold text-indigo-900">
                        {elapsedDays ? `${elapsedDays} Days elapsed` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Forecast Finish & Float Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Current Forecast Finish:</span>
                    <strong className={task.varianceDays > 0 ? 'text-rose-700' : 'text-slate-800'}>
                      {formatDisplayDate(task.forecastEndDate)} ({task.varianceDays > 0 ? `+${task.varianceDays}d delay` : 'on schedule'})
                    </strong>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Total Float: <strong className="text-slate-800">{task.totalFloatDays} Days</strong>
                  </div>
                </div>
              </div>

              {/* Quantities & Supervisor Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-700 block">Quantity Tracking</span>
                  {task.plannedQuantity ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Planned Scope:</span>
                        <strong className="text-slate-800">{task.plannedQuantity} {task.quantityUnit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Executed To Date:</span>
                        <strong className="text-emerald-700">{task.completedQuantity || 0} {task.quantityUnit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Remaining:</span>
                        <strong className="text-slate-700">
                          {Math.max(0, task.plannedQuantity - (task.completedQuantity || 0))} {task.quantityUnit}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No bill of quantities attached to this work item.</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-700 block">Engineering Responsibility</span>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Site Engineer / Supervisor:</span>
                      <strong className="text-slate-800">{task.responsible}</strong>
                    </div>
                  </div>
                  {task.floor && (
                    <div className="pt-2 border-t border-slate-100 text-slate-500">
                      Location / Floor: <strong className="text-slate-700">{task.floor}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Description / Notes */}
              {task.notes && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">Field Notes & Observations</span>
                  <p className="text-amber-800">{task.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEPENDENCIES */}
          {activeTab === 'dependencies' && (
            <div className="space-y-5 text-xs">
              {/* Readiness summary banner */}
              <div className={`p-3.5 rounded-xl border ${readiness.canStart ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Execution Readiness Status</span>
                </div>
                {readiness.canStart ? (
                  <p className="text-emerald-800 text-[11px]">
                    All predecessor activities are completed or satisfied. This activity is technically ready for on-site execution.
                  </p>
                ) : (
                  <div>
                    <p className="text-amber-800 font-medium text-[11px]">
                      This task has unmet predecessor requirements:
                    </p>
                    <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5">
                      {readiness.unmetPredecessors.map((p, idx) => (
                        <li key={idx}>
                          <strong>{p.predecessor.code} {p.predecessor.name}</strong>: {p.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Predecessors List */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Predecessor Activities (Must finish/start prior)</span>
                  <span className="text-slate-400 font-normal">{predecessors.length} linked</span>
                </h3>
                {predecessors.length > 0 ? (
                  <div className="space-y-2">
                    {predecessors.map(({ dependency, predecessor }) => (
                      <div 
                        key={dependency.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {predecessor.code}
                            </span>
                            <button
                              onClick={() => onSelectTaskById(predecessor.id)}
                              className="font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                            >
                              {predecessor.name}
                            </button>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {dependency.type} {dependency.lagDays > 0 ? `+${dependency.lagDays}d` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <span>Status: <strong className="capitalize">{predecessor.status.replace('_', ' ')}</strong></span>
                            <span>&bull;</span>
                            <span>Progress: <strong>{predecessor.progress}%</strong></span>
                          </div>
                        </div>

                        <button
                          onClick={() => onRemoveDependency(dependency.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No predecessor constraints. This activity can proceed independently.
                  </p>
                )}
              </div>

              {/* Successors List */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Successor Activities (Waiting on this task)</span>
                  <span className="text-slate-400 font-normal">{successors.length} linked</span>
                </h3>
                {successors.length > 0 ? (
                  <div className="space-y-2">
                    {successors.map(({ dependency, successor }) => (
                      <div 
                        key={dependency.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {successor.code}
                            </span>
                            <button
                              onClick={() => onSelectTaskById(successor.id)}
                              className="font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                            >
                              {successor.name}
                            </button>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {dependency.type} {dependency.lagDays > 0 ? `+${dependency.lagDays}d` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <span>Status: <strong className="capitalize">{successor.status.replace('_', ' ')}</strong></span>
                          </div>
                        </div>

                        <button
                          onClick={() => onRemoveDependency(dependency.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No successor activities linked.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DAILY PROGRESS */}
          {activeTab === 'progress' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Site Daily Progress Logs</h3>
                <button
                  onClick={() => onRecordProgress(task)}
                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New Entry</span>
                </button>
              </div>

              {taskProgress.length > 0 ? (
                <div className="space-y-3">
                  {taskProgress.map((entry) => (
                    <div key={entry.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatDisplayDate(entry.reportDate)}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            By {entry.supervisorName}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {entry.previousProgress}% &rarr; {entry.newProgress}%
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium">
                        {entry.workCompletedToday}
                      </p>

                      {entry.quantityCompletedToday && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                          Quantity completed today: <strong>{entry.quantityCompletedToday} {entry.quantityUnit}</strong>
                          {entry.workersCount && <span className="ml-3">Workers: <strong>{entry.workersCount}</strong></span>}
                          {entry.materialUsage && <p className="mt-1 text-slate-500">Materials: {entry.materialUsage}</p>}
                        </div>
                      )}

                      {entry.remarks && (
                        <p className="text-[11px] text-slate-500 italic">
                          Remarks: {entry.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No daily progress entries recorded yet for this task.
                </p>
              )}
            </div>
          )}

          {/* TAB 3.5: MATERIALS USED (RECORDED VIA MODAL) */}
          {activeTab === 'materials' && (
            <div className="space-y-4 text-xs">
              {/* Header Action Bar */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>Materials Used in this Activity</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Track site consumption, contractor issue, and live inventory godown balance
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogMaterialModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Material</span>
                </button>
              </div>

              {/* Toast / Alert if any */}
              {materialSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between font-medium text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{materialSuccessMsg}</span>
                  </div>
                  <button onClick={() => setMaterialSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Executive Metrics Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Total Material Value
                  </span>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    ₹{Math.round(taskTotalMaterialCost).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-indigo-600 font-medium">Direct site outward cost</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Consumption Logs
                  </span>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {taskSpecificTx.length} Entries
                  </div>
                  <span className="text-[10px] text-slate-500">Recorded for this task</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Godown Status
                  </span>
                  <div className="text-base font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Live Synced</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Deducted from site store</span>
                </div>
              </div>

              {/* Material Logs List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                    Activity Material Usage History ({taskSpecificTx.length})
                  </h4>
                  {taskSpecificTx.length > 0 && (
                    <button
                      onClick={() => setIsLogMaterialModalOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Entry</span>
                    </button>
                  )}
                </div>

                {taskSpecificTx.length > 0 ? (
                  <div className="space-y-2">
                    {taskSpecificTx.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{tx.materialName}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                {tx.date}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Contractor: <strong className="text-slate-700">{tx.contractorPartyName || 'Site Gang'}</strong>
                              {tx.notes && <span className="text-slate-600"> • {tx.notes}</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-indigo-700 block text-xs">
                              {tx.quantity} {tx.unit}
                            </span>
                            {tx.totalAmount && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                ₹{Math.round(tx.totalAmount).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialTx(tx.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                            title="Remove entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 border border-indigo-150">
                      <Package className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800 text-xs">No materials logged for this activity yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5 mb-3">
                      Record cement bags, rebar, RMC concrete, or masonry blocks consumed during this task.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsLogMaterialModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Material Consumption</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ISSUES */}
          {activeTab === 'issues' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Site Blockers & Quality Issues</h3>
                <button
                  onClick={() => setShowIssueForm(!showIssueForm)}
                  className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Report Blocker</span>
                </button>
              </div>

              {/* Add Issue Form */}
              {showIssueForm && (
                <form onSubmit={handleCreateIssue} className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                  <h4 className="font-bold text-rose-900">Report Site Obstacle / Blocker</h4>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Issue Title *</label>
                    <input
                      type="text"
                      required
                      value={newIssueTitle}
                      onChange={(e) => setNewIssueTitle(e.target.value)}
                      placeholder="e.g. Pump breakdown, rebar spacing issue"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newIssueDesc}
                      onChange={(e) => setNewIssueDesc(e.target.value)}
                      placeholder="Details of the obstruction..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <select
                      value={newIssueSeverity}
                      onChange={(e) => setNewIssueSeverity(e.target.value as TaskIssue['severity'])}
                      className="px-2 py-1 rounded border border-slate-300 bg-white"
                    >
                      <option value="low">Low Severity</option>
                      <option value="medium">Medium Severity</option>
                      <option value="high">High Severity</option>
                      <option value="critical">Critical Blocker</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowIssueForm(false)}
                        className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700"
                      >
                        Save Issue
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {taskIssues.length > 0 ? (
                <div className="space-y-3">
                  {taskIssues.map((issue) => (
                    <div key={issue.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          issue.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                          issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {issue.severity}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          Reported by {issue.reportedBy} ({formatDisplayDate(issue.reportedDate)})
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900">{issue.title}</h4>
                      <p className="text-slate-600">{issue.description}</p>
                      {issue.resolutionNotes && (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded">
                          <strong>Resolution:</strong> {issue.resolutionNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No blockers or open issues logged for this task.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 mb-2">Audit Trail</h3>
              {taskLogs.length > 0 ? (
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200">
                  {taskLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="text-[11px] text-slate-400 font-mono">{log.timestamp} &bull; {log.performedBy}</div>
                      <p className="font-bold text-slate-800 mt-0.5">{log.action}</p>
                      <p className="text-slate-600 mt-0.5">{log.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative pl-6 space-y-3 border-l-2 border-slate-200">
                  <div className="relative">
                    <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-400 ring-4 ring-white" />
                    <div className="text-[11px] text-slate-400 font-mono">Master Schedule Baseline</div>
                    <p className="font-bold text-slate-800 mt-0.5">Task initialized in WBS</p>
                    <p className="text-slate-600 mt-0.5">Planned schedule configured from master baseline.</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Dedicated Professional Log Material Modal */}
      <LogMaterialModal
        isOpen={isLogMaterialModalOpen}
        onClose={() => setIsLogMaterialModalOpen(false)}
        task={task}
        onSave={handleSaveMaterialTx}
      />
    </div>
  );
};
