import { supabase } from './client';
import { 
  ConstructionTask, 
  TaskDependency, 
  DailyProgressEntry, 
  TaskIssue, 
  TaskActivityLog 
} from '@/lib/construction-planning/types';

// ==========================================
// 1. MAPPERS: Supabase Database <-> TypeScript
// ==========================================

export function mapDbToConstructionTask(row: any): ConstructionTask {
  return {
    id: row.id,
    code: row.plan_code || '1.0',
    name: row.plan_name || '',
    description: row.description || '',
    type: row.plan_type || 'task',
    parentTaskId: row.parent_task_id || null,
    status: row.plan_status || 'not_started',
    progress: Number(row.plan_progress ?? 0),
    floor: row.floor || undefined,
    responsible: row.responsible || 'Site Engineer',
    isCritical: Boolean(row.is_critical),
    totalFloatDays: Number(row.total_float_days ?? 0),
    plannedStartDate: row.planned_start_date || '2026-01-05',
    plannedEndDate: row.planned_end_date || '2026-02-14',
    plannedDurationDays: Number(row.planned_duration_days ?? 1),
    actualStartDate: row.actual_start_date || null,
    actualEndDate: row.actual_end_date || null,
    actualDurationDays: row.actual_duration_days ? Number(row.actual_duration_days) : undefined,
    forecastStartDate: row.forecast_start_date || row.planned_start_date || '2026-01-05',
    forecastEndDate: row.forecast_end_date || row.planned_end_date || '2026-02-14',
    varianceDays: Number(row.variance_days ?? 0),
    plannedQuantity: row.planned_quantity ? Number(row.planned_quantity) : undefined,
    completedQuantity: row.completed_quantity ? Number(row.completed_quantity) : undefined,
    quantityUnit: row.quantity_unit || undefined,
    notes: row.notes || undefined,
    blockerReason: row.blocker_reason || undefined,
    sortOrder: Number(row.sort_order ?? 0),
    isDeleted: Boolean(row.is_deleted),
  };
}

export function mapConstructionTaskToDb(task: Partial<ConstructionTask>, projectId: string) {
  const dbObj: Record<string, any> = {
    project_id: projectId,
  };

  if (task.code !== undefined) dbObj.plan_code = task.code;
  if (task.name !== undefined) dbObj.plan_name = task.name;
  if (task.description !== undefined) dbObj.description = task.description;
  if (task.type !== undefined) dbObj.plan_type = task.type;
  if (task.parentTaskId !== undefined) dbObj.parent_task_id = task.parentTaskId;
  if (task.status !== undefined) dbObj.plan_status = task.status;
  if (task.progress !== undefined) dbObj.plan_progress = task.progress;
  if (task.floor !== undefined) dbObj.floor = task.floor;
  if (task.responsible !== undefined) dbObj.responsible = task.responsible;
  if (task.isCritical !== undefined) dbObj.is_critical = task.isCritical;
  if (task.totalFloatDays !== undefined) dbObj.total_float_days = task.totalFloatDays;
  if (task.plannedStartDate !== undefined) dbObj.planned_start_date = task.plannedStartDate;
  if (task.plannedEndDate !== undefined) dbObj.planned_end_date = task.plannedEndDate;
  if (task.plannedDurationDays !== undefined) dbObj.planned_duration_days = task.plannedDurationDays;
  if (task.actualStartDate !== undefined) dbObj.actual_start_date = task.actualStartDate;
  if (task.actualEndDate !== undefined) dbObj.actual_end_date = task.actualEndDate;
  if (task.actualDurationDays !== undefined) dbObj.actual_duration_days = task.actualDurationDays;
  if (task.forecastStartDate !== undefined) dbObj.forecast_start_date = task.forecastStartDate;
  if (task.forecastEndDate !== undefined) dbObj.forecast_end_date = task.forecastEndDate;
  if (task.varianceDays !== undefined) dbObj.variance_days = task.varianceDays;
  if (task.plannedQuantity !== undefined) dbObj.planned_quantity = task.plannedQuantity;
  if (task.completedQuantity !== undefined) dbObj.completed_quantity = task.completedQuantity;
  if (task.quantityUnit !== undefined) dbObj.quantity_unit = task.quantityUnit;
  if (task.notes !== undefined) dbObj.notes = task.notes;
  if (task.blockerReason !== undefined) dbObj.blocker_reason = task.blockerReason;
  if (task.sortOrder !== undefined) dbObj.sort_order = task.sortOrder;
  if (task.isDeleted !== undefined) dbObj.is_deleted = task.isDeleted;

  return dbObj;
}

// ==========================================
// 2. SEEDING LOGIC: INITIAL LOAD INTO SUPABASE
// ==========================================

export async function seedInitialPlanningData(projectId: string, _force: boolean = false): Promise<boolean> {
  try {
    // All tasks and planning entities are stored and maintained purely in Supabase
    const { count, error } = await supabase
      .from('plan_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (error) {
      console.error('[PlanningServices] Error checking tasks:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (err) {
    console.error('Error checking planning data:', err);
    return false;
  }
}

// ==========================================
// 3. MASTER TASKS OPERATIONS
// ==========================================

export async function fetchPlanTasks(projectId: string): Promise<ConstructionTask[]> {
  try {
    const { data, error } = await supabase
      .from('plan_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true })
      .order('plan_code', { ascending: true });

    if (error) {
      console.error('Error fetching plan tasks:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Deduplicate by ID and plan_code, ensuring soft-deleted tasks are ignored
    const seenIds = new Set<string>();
    const seenCodes = new Set<string>();
    const deduplicated = data.filter((row: any) => {
      if (!row || !row.id || row.is_deleted) return false;
      if (seenIds.has(row.id)) return false;
      seenIds.add(row.id);
      if (row.plan_code && seenCodes.has(row.plan_code)) return false;
      if (row.plan_code) seenCodes.add(row.plan_code);
      return true;
    });

    return deduplicated.map(mapDbToConstructionTask);
  } catch (err) {
    console.error('Failed to load plan tasks:', err);
    return [];
  }
}

export async function createPlanTask(
  task: Omit<ConstructionTask, 'id'>, 
  projectId: string
): Promise<ConstructionTask | null> {
  try {
    const payload = mapConstructionTaskToDb(task, projectId);
    const { data, error } = await supabase
      .from('plan_tasks')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating plan task:', error);
      return null;
    }

    return mapDbToConstructionTask(data);
  } catch (err) {
    console.error('Failed to create plan task:', err);
    return null;
  }
}

export async function updatePlanTask(
  id: string, 
  updates: Partial<ConstructionTask>,
  projectId: string
): Promise<boolean> {
  try {
    const payload = mapConstructionTaskToDb(updates, projectId);
    delete payload.project_id; // don't alter project ownership
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('plan_tasks')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Error updating plan task:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update plan task:', err);
    return false;
  }
}

/**
 * Soft Delete a Plan Task (sets is_deleted = true in Supabase)
 */
export async function deletePlanTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('plan_tasks')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error soft-deleting plan task:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete plan task:', err);
    return false;
  }
}

// ==========================================
// 4. DEPENDENCIES OPERATIONS
// ==========================================

export async function fetchPlanDependencies(projectId: string): Promise<TaskDependency[]> {
  try {
    const { data, error } = await supabase
      .from('plan_dependencies')
      .select('*')
      .eq('project_id', projectId);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      predecessorId: row.predecessor_id,
      successorId: row.successor_id,
      type: row.dependency_type as any,
      lagDays: Number(row.lag_days ?? 0),
    }));
  } catch (err) {
    console.error('Error fetching plan dependencies:', err);
    return [];
  }
}

export async function createPlanDependency(
  dep: TaskDependency, 
  projectId: string
): Promise<TaskDependency | null> {
  try {
    const { data, error } = await supabase
      .from('plan_dependencies')
      .insert({
        project_id: projectId,
        predecessor_id: dep.predecessorId,
        successor_id: dep.successorId,
        dependency_type: dep.type,
        lag_days: dep.lagDays,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating plan dependency:', error);
      return null;
    }

    return {
      id: data.id,
      predecessorId: data.predecessor_id,
      successorId: data.successor_id,
      type: data.dependency_type,
      lagDays: Number(data.lag_days ?? 0),
    };
  } catch (err) {
    console.error('Failed to create plan dependency:', err);
    return null;
  }
}

export async function deletePlanDependency(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('plan_dependencies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting plan dependency:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete plan dependency:', err);
    return false;
  }
}

// ==========================================
// 5. DAILY PROGRESS OPERATIONS
// ==========================================

export async function fetchPlanDailyProgress(projectId: string): Promise<DailyProgressEntry[]> {
  try {
    const { data, error } = await supabase
      .from('plan_daily_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('report_date', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      taskId: row.task_id,
      reportDate: row.report_date,
      workCompletedToday: row.work_completed_today,
      previousProgress: Number(row.previous_progress ?? 0),
      newProgress: Number(row.new_progress ?? 0),
      quantityCompletedToday: row.quantity_completed_today ? Number(row.quantity_completed_today) : undefined,
      quantityUnit: row.quantity_unit || undefined,
      workersCount: row.workers_count ? Number(row.workers_count) : undefined,
      materialUsage: row.material_usage || undefined,
      supervisorName: row.supervisor_name,
      status: row.plan_status as any,
      issues: row.issues || undefined,
      remarks: row.remarks || undefined,
      photos: Array.isArray(row.photos) ? row.photos : [],
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Error fetching daily progress:', err);
    return [];
  }
}

export async function createPlanDailyProgress(
  entry: Omit<DailyProgressEntry, 'id' | 'createdAt'>,
  projectId: string
): Promise<DailyProgressEntry | null> {
  try {
    const { data, error } = await supabase
      .from('plan_daily_progress')
      .insert({
        task_id: entry.taskId,
        project_id: projectId,
        report_date: entry.reportDate,
        work_completed_today: entry.workCompletedToday,
        previous_progress: entry.previousProgress,
        new_progress: entry.newProgress,
        quantity_completed_today: entry.quantityCompletedToday || null,
        quantity_unit: entry.quantityUnit || null,
        workers_count: entry.workersCount || null,
        material_usage: entry.materialUsage || null,
        supervisor_name: entry.supervisorName,
        plan_status: entry.status,
        issues: entry.issues || null,
        remarks: entry.remarks || null,
        photos: entry.photos || [],
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating daily progress log:', error);
      return null;
    }

    return {
      id: data.id,
      taskId: data.task_id,
      reportDate: data.report_date,
      workCompletedToday: data.work_completed_today,
      previousProgress: Number(data.previous_progress),
      newProgress: Number(data.new_progress),
      quantityCompletedToday: data.quantity_completed_today ? Number(data.quantity_completed_today) : undefined,
      quantityUnit: data.quantity_unit,
      workersCount: data.workers_count,
      materialUsage: data.material_usage,
      supervisorName: data.supervisor_name,
      status: data.plan_status,
      issues: data.issues,
      remarks: data.remarks,
      photos: data.photos,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('Failed to create daily progress log:', err);
    return null;
  }
}

// ==========================================
// 6. ISSUES OPERATIONS
// ==========================================

export async function fetchPlanIssues(projectId: string): Promise<TaskIssue[]> {
  try {
    const { data, error } = await supabase
      .from('plan_issues')
      .select('*')
      .eq('project_id', projectId)
      .order('reported_date', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      description: row.description,
      severity: row.severity as any,
      status: row.status as any,
      reportedBy: row.reported_by,
      reportedDate: row.reported_date,
      resolutionNotes: row.resolution_notes || undefined,
    }));
  } catch (err) {
    console.error('Error fetching plan issues:', err);
    return [];
  }
}

export async function createPlanIssue(
  issue: Omit<TaskIssue, 'id'>,
  projectId: string
): Promise<TaskIssue | null> {
  try {
    const { data, error } = await supabase
      .from('plan_issues')
      .insert({
        task_id: issue.taskId,
        project_id: projectId,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        reported_by: issue.reportedBy,
        reported_date: issue.reportedDate,
        resolution_notes: issue.resolutionNotes || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating plan issue:', error);
      return null;
    }

    return {
      id: data.id,
      taskId: data.task_id,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: data.status,
      reportedBy: data.reported_by,
      reportedDate: data.reported_date,
      resolutionNotes: data.resolution_notes,
    };
  } catch (err) {
    console.error('Failed to create plan issue:', err);
    return null;
  }
}

// ==========================================
// 7. ACTIVITY LOGS OPERATIONS
// ==========================================

export async function fetchPlanActivityLogs(projectId: string): Promise<TaskActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('plan_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      taskId: row.task_id,
      action: row.action,
      details: row.details,
      performedBy: row.performed_by,
      timestamp: row.created_at,
    }));
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    return [];
  }
}

export async function logPlanActivity(
  taskId: string,
  action: string,
  details: string,
  performedBy: string,
  projectId: string
): Promise<void> {
  try {
    await supabase.from('plan_activity_logs').insert({
      task_id: taskId,
      project_id: projectId,
      action,
      details,
      performed_by: performedBy,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export async function clearAllPlanningDataFromDb(projectId?: string): Promise<boolean> {
  try {
    if (projectId) {
      await supabase.from('plan_daily_progress').delete().eq('project_id', projectId);
      await supabase.from('plan_issues').delete().eq('project_id', projectId);
      await supabase.from('plan_activity_logs').delete().eq('project_id', projectId);
      await supabase.from('plan_dependencies').delete().eq('project_id', projectId);
      await supabase.from('plan_tasks').delete().eq('project_id', projectId);
    } else {
      await supabase.from('plan_daily_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('plan_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('plan_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('plan_dependencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('plan_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    return true;
  } catch (err) {
    console.error('Error clearing planning data from DB:', err);
    return false;
  }
}
