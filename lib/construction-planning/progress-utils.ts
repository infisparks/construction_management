import { ConstructionTask, DailyProgressEntry } from './types';

export interface ProgressCalculationResult {
  newProgress: number;
  completedQuantity?: number;
  remainingQuantity?: number;
  status: ConstructionTask['status'];
}

/**
 * Calculates updated progress values and determines new task status
 */
export function calculateProgressUpdate(
  task: ConstructionTask,
  todayWorkPercent: number,
  todayQuantity?: number
): ProgressCalculationResult {
  // Cap at 100%
  const newProgress = Math.min(100, Math.max(0, task.progress + todayWorkPercent));

  let completedQty = task.completedQuantity || 0;
  if (todayQuantity !== undefined) {
    completedQty = (task.completedQuantity || 0) + todayQuantity;
  }

  let remainingQty: number | undefined;
  if (task.plannedQuantity !== undefined) {
    remainingQty = Math.max(0, task.plannedQuantity - completedQty);
  }

  let status = task.status;
  if (newProgress === 100) {
    status = 'completed';
  } else if (newProgress > 0 && (task.status === 'not_started' || task.status === 'ready_to_start')) {
    status = 'in_progress';
  }

  return {
    newProgress,
    completedQuantity: completedQty,
    remainingQuantity: remainingQty,
    status,
  };
}

/**
 * Validates progress submission fields
 */
export function validateProgressEntry(
  entry: Partial<DailyProgressEntry>
): { isValid: boolean; error?: string } {
  if (!entry.taskId) {
    return { isValid: false, error: 'Please select a task.' };
  }
  if (!entry.workCompletedToday || entry.workCompletedToday.trim().length === 0) {
    return { isValid: false, error: 'Please describe the work completed today.' };
  }
  if (entry.newProgress === undefined || entry.newProgress < 0 || entry.newProgress > 100) {
    return { isValid: false, error: 'Progress percentage must be between 0% and 100%.' };
  }
  if (!entry.supervisorName || entry.supervisorName.trim().length === 0) {
    return { isValid: false, error: 'Please provide the reporting supervisor or site engineer name.' };
  }
  return { isValid: true };
}
