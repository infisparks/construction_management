import { ConstructionTask, ScheduleStatus, ProjectInfo } from './types';
import { calculateDaysBetween } from './schedule-utils';

export interface TaskNode extends ConstructionTask {
  children: TaskNode[];
  level: number;
}

/**
 * Builds a hierarchical tree from a flat list of tasks
 */
export function buildTaskTree(tasks: ConstructionTask[]): TaskNode[] {
  const taskMap = new Map<string, TaskNode>();
  
  // Sort tasks by sortOrder first
  const sortedTasks = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);

  // Initialize all nodes with empty children array
  sortedTasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [], level: 0 });
  });

  const roots: TaskNode[] = [];

  sortedTasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      const parent = taskMap.get(task.parentTaskId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      node.level = 0;
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Flattens a tree while preserving hierarchy order and expansion state
 */
export function flattenTaskTree(
  nodes: TaskNode[], 
  expandedIds: Set<string>
): TaskNode[] {
  const result: TaskNode[] = [];

  function traverse(node: TaskNode) {
    result.push(node);
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return result;
}

/**
 * Recalculates parent work packages' progress and date ranges based on their children.
 * Parent progress is the average of its children's progress.
 * Parent planned start is min(child start), planned end is max(child end).
 */
export function recalculateParentRollups(tasks: ConstructionTask[]): ConstructionTask[] {
  const tasksById = new Map<string, ConstructionTask>();
  tasks.forEach((t) => tasksById.set(t.id, { ...t }));

  // Find all tasks that are parents
  const parentIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.parentTaskId) {
      parentIds.add(t.parentTaskId);
    }
  });

  // Post-order calculation: process leaves upwards
  // To handle multi-level hierarchies cleanly, loop until no more changes or fixed iterations
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    parentIds.forEach((pId) => {
      const parent = tasksById.get(pId);
      if (!parent) return;

      const directChildren = Array.from(tasksById.values()).filter(
        (t) => t.parentTaskId === pId
      );
      if (directChildren.length === 0) return;

      // Aggregated progress
      const totalProgress = directChildren.reduce((acc, c) => acc + c.progress, 0);
      const avgProgress = Math.round(totalProgress / directChildren.length);

      // Determine parent status
      let newStatus: ScheduleStatus = parent.status;
      if (avgProgress === 100) {
        newStatus = 'completed';
      } else if (directChildren.some((c) => c.status === 'delayed')) {
        newStatus = 'delayed';
      } else if (directChildren.some((c) => c.status === 'at_risk')) {
        newStatus = 'at_risk';
      } else if (directChildren.some((c) => c.status === 'blocked')) {
        newStatus = 'blocked';
      } else if (directChildren.some((c) => c.status === 'in_progress' || c.progress > 0)) {
        newStatus = 'in_progress';
      } else if (directChildren.every((c) => c.status === 'not_started')) {
        newStatus = 'not_started';
      }

      // Rollup dates
      const startDates = directChildren
        .map((c) => c.plannedStartDate)
        .filter(Boolean)
        .sort();
      const endDates = directChildren
        .map((c) => c.plannedEndDate)
        .filter(Boolean)
        .sort();
      const forecastEndDates = directChildren
        .map((c) => c.forecastEndDate)
        .filter(Boolean)
        .sort();

      const newPlannedStart = startDates[0] || parent.plannedStartDate;
      const newPlannedEnd = endDates[endDates.length - 1] || parent.plannedEndDate;
      const newForecastEnd = forecastEndDates[forecastEndDates.length - 1] || parent.forecastEndDate;

      // Critical rollup: if any child is critical, parent is critical
      const isCritical = directChildren.some((c) => c.isCritical);

      if (
        parent.progress !== avgProgress ||
        parent.status !== newStatus ||
        parent.plannedStartDate !== newPlannedStart ||
        parent.plannedEndDate !== newPlannedEnd ||
        parent.forecastEndDate !== newForecastEnd ||
        parent.isCritical !== isCritical
      ) {
        parent.progress = avgProgress;
        parent.status = newStatus;
        parent.plannedStartDate = newPlannedStart;
        parent.plannedEndDate = newPlannedEnd;
        parent.forecastEndDate = newForecastEnd;
        parent.isCritical = isCritical;
        changed = true;
      }
    });
  }

  return Array.from(tasksById.values());
}

/**
 * Returns summary metrics for KPI cards
 */
export function getTaskMetrics(tasks: ConstructionTask[]) {
  const leafTasks = tasks.filter((t) => t.type !== 'work_package');
  const allTasks = tasks;

  const total = leafTasks.length;
  const completed = leafTasks.filter((t) => t.status === 'completed' || t.progress === 100).length;
  const inProgress = leafTasks.filter((t) => t.status === 'in_progress').length;
  const notStarted = leafTasks.filter((t) => t.status === 'not_started' || t.status === 'ready_to_start').length;
  const delayed = leafTasks.filter((t) => t.status === 'delayed' || (t.varianceDays > 0 && t.status !== 'completed')).length;
  const atRisk = leafTasks.filter((t) => t.status === 'at_risk').length;
  const blocked = leafTasks.filter((t) => t.status === 'blocked').length;
  const critical = leafTasks.filter((t) => t.isCritical).length;

  const totalProgress = leafTasks.reduce((sum, t) => sum + t.progress, 0);
  const overallProgress = total > 0 ? Math.round(totalProgress / total) : 0;

  return {
    total,
    allTasksCount: allTasks.length,
    completed,
    inProgress,
    notStarted,
    delayed,
    atRisk,
    blocked,
    critical,
    overallProgress,
  };
}

/**
 * Highly normalized project rollup:
 * Automatically computes project planned start, planned finish, forecast finish,
 * total duration in months/days, and overall progress directly from tasks.
 * When any task is added, edited, or removed, the project timeline recalculates dynamically!
 */
export function calculateProjectRollup(
  tasks: ConstructionTask[],
  baseProject: ProjectInfo
): ProjectInfo {
  const leafTasks = tasks.filter((t) => t.type !== 'work_package');
  if (leafTasks.length === 0) return baseProject;

  const plannedStarts = leafTasks.map((t) => t.plannedStartDate).filter(Boolean).sort();
  const plannedEnds = leafTasks.map((t) => t.plannedEndDate).filter(Boolean).sort();
  const forecastEnds = leafTasks.map((t) => t.forecastEndDate).filter(Boolean).sort();

  const minPlannedStart = plannedStarts[0] || baseProject.plannedStartDate;
  const maxPlannedEnd = plannedEnds[plannedEnds.length - 1] || baseProject.plannedCompletionDate;
  const maxForecastEnd = forecastEnds[forecastEnds.length - 1] || maxPlannedEnd;

  // Calculate duration dynamically from minPlannedStart to maxPlannedEnd
  const diffDays = Math.max(1, calculateDaysBetween(minPlannedStart, maxPlannedEnd));
  const dynamicMonths = Math.max(1, Math.round(diffDays / 30.4));

  // Overall progress is weighted average of leaf tasks
  const avgProgress = Math.round(leafTasks.reduce((acc, t) => acc + t.progress, 0) / leafTasks.length);

  return {
    ...baseProject,
    plannedStartDate: minPlannedStart,
    plannedCompletionDate: maxPlannedEnd,
    forecastCompletionDate: maxForecastEnd,
    durationMonths: dynamicMonths,
    overallProgress: avgProgress,
  };
}
