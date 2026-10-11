import { ConstructionTask, TaskDependency, ProjectInfo, RecoveryScenario } from './types';
import { getSuccessorTasks } from './dependency-utils';

/**
 * Format ISO date string (YYYY-MM-DD) to readable format (e.g. "28 Aug 2026")
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculates day difference between two YYYY-MM-DD dates
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Formats day delay into friendly human readable string:
 * e.g., 4 -> "4 Days Delay"
 * e.g., 40 -> "1 Month 10 Days Delay"
 * e.g., 65 -> "2 Months 5 Days Delay"
 */
export function formatDelayReadable(varianceDays: number): string {
  if (varianceDays === 0) return 'On Schedule';
  if (varianceDays < 0) {
    const aheadDays = Math.abs(varianceDays);
    if (aheadDays < 30) return `${aheadDays} Days Ahead`;
    const months = Math.floor(aheadDays / 30);
    const rem = aheadDays % 30;
    return rem === 0 
      ? `${months} Month${months > 1 ? 's' : ''} Ahead` 
      : `${months}m ${rem}d Ahead`;
  }

  if (varianceDays < 30) {
    return `${varianceDays} Days Delay`;
  }

  const months = Math.floor(varianceDays / 30);
  const remainingDays = varianceDays % 30;
  if (remainingDays === 0) {
    return `${months} Month${months > 1 ? 's' : ''} Delay`;
  }
  return `${months} Month${months > 1 ? 's' : ''} ${remainingDays} Day${remainingDays > 1 ? 's' : ''} Delay`;
}

/**
 * Adds days to a YYYY-MM-DD date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

/**
 * Calculates actual elapsed duration in days from actual start to actual end (or today)
 */
export function calculateElapsedDuration(
  actualStart?: string | null,
  actualEnd?: string | null
): number | null {
  if (!actualStart) return null;
  const end = actualEnd || new Date().toISOString().split('T')[0];
  return Math.max(1, calculateDaysBetween(actualStart, end));
}

export interface DownstreamImpactItem {
  task: ConstructionTask;
  plannedEnd: string;
  forecastEnd: string;
  varianceDays: number;
  isCritical: boolean;
  relationship: string;
}

/**
 * Finds all downstream tasks affected by a delay in a specific task
 */
export function analyzeDelayImpact(
  delayedTaskId: string,
  tasks: ConstructionTask[],
  dependencies: TaskDependency[]
): DownstreamImpactItem[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const delayedTask = taskMap.get(delayedTaskId);
  if (!delayedTask) return [];

  const impactList: DownstreamImpactItem[] = [];
  const visited = new Set<string>();
  const queue: { taskId: string; relationship: string }[] = [{ taskId: delayedTaskId, relationship: 'Originating Delay' }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.taskId)) continue;
    visited.add(current.taskId);

    const task = taskMap.get(current.taskId);
    if (task && current.taskId !== delayedTaskId) {
      impactList.push({
        task,
        plannedEnd: task.plannedEndDate,
        forecastEnd: task.forecastEndDate,
        varianceDays: Math.max(task.varianceDays, delayedTask.varianceDays),
        isCritical: task.isCritical,
        relationship: current.relationship,
      });
    }

    const successors = getSuccessorTasks(current.taskId, tasks, dependencies);
    for (const succ of successors) {
      if (!visited.has(succ.successor.id)) {
        queue.push({
          taskId: succ.successor.id,
          relationship: `Successor of ${task?.code || 'Task'} (${succ.dependency.type})`,
        });
      }
    }
  }

  return impactList;
}

/**
 * Calculates overall schedule health indicators
 */
export function calculateScheduleHealth(
  project: ProjectInfo,
  tasks: ConstructionTask[]
) {
  const delayedTasks = tasks.filter((t) => t.type !== 'work_package' && (t.status === 'delayed' || t.varianceDays > 0));
  const criticalAtRisk = tasks.filter((t) => t.isCritical && (t.status === 'at_risk' || t.status === 'delayed' || t.varianceDays > 0));

  const projectVarianceDays = calculateDaysBetween(
    project.plannedCompletionDate,
    project.forecastCompletionDate
  );

  return {
    plannedCompletion: project.plannedCompletionDate,
    forecastCompletion: project.forecastCompletionDate,
    varianceDays: projectVarianceDays,
    isDelayed: projectVarianceDays > 0,
    delayedTasksCount: delayedTasks.length,
    criticalAtRiskCount: criticalAtRisk.length,
    delayLabel: formatDelayReadable(projectVarianceDays),
  };
}
