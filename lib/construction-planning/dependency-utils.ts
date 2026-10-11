import { ConstructionTask, TaskDependency, DependencyType } from './types';

export interface PredecessorStatusInfo {
  dependency: TaskDependency;
  predecessor: ConstructionTask;
  isSatisfied: boolean;
  reason: string;
}

export interface TaskReadinessResult {
  canStart: boolean;
  unmetPredecessors: PredecessorStatusInfo[];
  allPredecessors: PredecessorStatusInfo[];
}

/**
 * Checks whether a task is eligible to start based on its predecessor dependencies
 */
export function checkTaskReadiness(
  taskId: string,
  tasks: ConstructionTask[],
  dependencies: TaskDependency[]
): TaskReadinessResult {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const taskPredecessors = dependencies.filter((d) => d.successorId === taskId);

  const allPredecessors: PredecessorStatusInfo[] = [];
  const unmetPredecessors: PredecessorStatusInfo[] = [];

  for (const dep of taskPredecessors) {
    const pred = taskMap.get(dep.predecessorId);
    if (!pred) continue;

    let isSatisfied = false;
    let reason = '';

    switch (dep.type) {
      case 'FS':
        // Finish-to-Start: Predecessor must be finished
        isSatisfied = pred.status === 'completed' || pred.progress === 100;
        reason = isSatisfied 
          ? `Predecessor "${pred.name}" is completed.`
          : `Predecessor "${pred.name}" (${pred.code}) must finish first (Current progress: ${pred.progress}%).`;
        break;

      case 'SS':
        // Start-to-Start: Predecessor must have started
        isSatisfied = pred.status === 'in_progress' || pred.status === 'completed' || pred.progress > 0;
        reason = isSatisfied
          ? `Predecessor "${pred.name}" has already started.`
          : `Predecessor "${pred.name}" (${pred.code}) must start before this task can begin.`;
        break;

      case 'FF':
        // Finish-to-Finish: Predecessor must finish before this finishes
        isSatisfied = pred.status === 'completed' || pred.progress === 100;
        reason = isSatisfied
          ? `Predecessor "${pred.name}" is finished.`
          : `Predecessor "${pred.name}" must finish before this can finish.`;
        break;

      case 'SF':
        // Start-to-Finish: Predecessor must start
        isSatisfied = pred.status === 'in_progress' || pred.status === 'completed' || pred.progress > 0;
        reason = isSatisfied
          ? `Predecessor "${pred.name}" has started.`
          : `Predecessor "${pred.name}" must start.`;
        break;
    }

    const info: PredecessorStatusInfo = {
      dependency: dep,
      predecessor: pred,
      isSatisfied,
      reason,
    };

    allPredecessors.push(info);
    if (!isSatisfied) {
      unmetPredecessors.push(info);
    }
  }

  return {
    canStart: unmetPredecessors.length === 0,
    unmetPredecessors,
    allPredecessors,
  };
}

/**
 * Detects if adding a dependency from predecessorId to successorId will create a cycle
 */
export function willCreateCircularDependency(
  predecessorId: string,
  successorId: string,
  dependencies: TaskDependency[]
): boolean {
  if (predecessorId === successorId) return true;

  // DFS search from successorId to see if we can reach predecessorId
  const adjList = new Map<string, string[]>();
  dependencies.forEach((d) => {
    if (!adjList.has(d.predecessorId)) {
      adjList.set(d.predecessorId, []);
    }
    adjList.get(d.predecessorId)!.push(d.successorId);
  });

  // Temporarily add edge predecessorId -> successorId
  if (!adjList.has(predecessorId)) {
    adjList.set(predecessorId, []);
  }
  adjList.get(predecessorId)!.push(successorId);

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of adjList.keys()) {
    if (!visited.has(node)) {
      if (hasCycle(node)) return true;
    }
  }

  return false;
}

/**
 * Gets all direct successors for a task
 */
export function getSuccessorTasks(
  taskId: string,
  tasks: ConstructionTask[],
  dependencies: TaskDependency[]
): { dependency: TaskDependency; successor: ConstructionTask }[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  return dependencies
    .filter((d) => d.predecessorId === taskId)
    .map((d) => ({
      dependency: d,
      successor: taskMap.get(d.successorId)!,
    }))
    .filter((item) => Boolean(item.successor));
}

/**
 * Gets all direct predecessors for a task
 */
export function getPredecessorTasks(
  taskId: string,
  tasks: ConstructionTask[],
  dependencies: TaskDependency[]
): { dependency: TaskDependency; predecessor: ConstructionTask }[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  return dependencies
    .filter((d) => d.successorId === taskId)
    .map((d) => ({
      dependency: d,
      predecessor: taskMap.get(d.predecessorId)!,
    }))
    .filter((item) => Boolean(item.predecessor));
}
