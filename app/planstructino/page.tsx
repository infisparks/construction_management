'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ProjectInfo, 
  ConstructionTask, 
  TaskDependency, 
  DailyProgressEntry, 
  TaskIssue, 
  TaskActivityLog, 
  RecoveryScenario,
  ViewMode, 
  ScheduleStatus, 
  TaskType, 
  DependencyType,
  Party,
  SubcontractorBill,
  FileCategory
} from '@/lib/construction-planning/types';
import { 
  buildTaskTree, 
  flattenTaskTree, 
  recalculateParentRollups, 
  deduplicateTaskList,
  getTaskMetrics, 
  calculateProjectRollup,
  TaskNode 
} from '@/lib/construction-planning/task-utils';
import { fetchProfileVendors } from '@/lib/supabase/profile-services';
import { 
  fetchSubcontractorBills, 
  createSubcontractorBill, 
  updateSubcontractorBill, 
  deleteSubcontractorBill 
} from '@/lib/supabase/subcontractor-bill-services';

import { Sidebar } from '@/components/construction-planning/Sidebar';
import { PlanningHeader } from '@/components/construction-planning/PlanningHeader';
import { ProjectSummaryCards, SummaryFilterType } from '@/components/construction-planning/ProjectSummaryCards';
import { TaskToolbar } from '@/components/construction-planning/TaskToolbar';
import { ConstructionTaskTable } from '@/components/construction-planning/ConstructionTaskTable';
import { TaskDetailsDrawer } from '@/components/construction-planning/TaskDetailsDrawer';
import { AddEditTaskDialog } from '@/components/construction-planning/AddEditTaskDialog';
import { DependencyEditor } from '@/components/construction-planning/DependencyEditor';
import { DailyProgressDialog } from '@/components/construction-planning/DailyProgressDialog';
import { ProgressHistory } from '@/components/construction-planning/ProgressHistory';
import { GanttTimeline } from '@/components/construction-planning/GanttTimeline';
import { CriticalPathView } from '@/components/construction-planning/CriticalPathView';
import { RecoveryPlanDrawer } from '@/components/construction-planning/RecoveryPlanDrawer';
import { MilestonesView } from '@/components/construction-planning/MilestonesView';
import { ScheduleImpactModal } from '@/components/construction-planning/ScheduleImpactModal';
import { ProjectSettingsModal } from '@/components/construction-planning/ProjectSettingsModal';
import { StartTaskConfirmationModal } from '@/components/construction-planning/StartTaskConfirmationModal';
import { CompleteTaskConfirmModal } from '@/components/construction-planning/CompleteTaskConfirmModal';
import { RevertTaskConfirmModal } from '@/components/construction-planning/RevertTaskConfirmModal';
import { MaterialBillingDrawer } from '@/components/construction-planning/MaterialBillingDrawer';
import { SubcontractorBillsView } from '@/components/construction-planning/SubcontractorBillsView';
import { FilesArchiveView } from '@/components/documents/FilesArchiveView';
import { SiteInventoryManagement } from '@/components/inventory/SiteInventoryManagement';
import { SiteExpensesView } from '@/components/expenses/SiteExpensesView';
import { CommercialBillsAndExpensesView } from '@/components/expenses/CommercialBillsAndExpensesView';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/auth/LoginPage';
import { SitesManagerModal } from '@/components/projects/SitesManagerModal';
import { DbProject } from '@/lib/supabase/types';
import { 
  resolveActiveSite, 
  setStoredActiveSite, 
  getStoredActiveSiteId,
  fetchAllActiveSites 
} from '@/lib/supabase/site-storage';
import { CheckCircle2, AlertTriangle, X, Building2, ShieldAlert, Menu } from 'lucide-react';
import { isViewAllowed, isOnlyAllowRole, getFirstAllowedView } from '@/lib/auth/role-access';
import { 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';
import {
  fetchPlanTasks,
  createPlanTask,
  updatePlanTask,
  deletePlanTask,
  fetchPlanDependencies,
  createPlanDependency,
  deletePlanDependency,
  fetchPlanDailyProgress,
  createPlanDailyProgress,
  fetchPlanIssues,
  createPlanIssue,
  fetchPlanActivityLogs,
  logPlanActivity,
} from '@/lib/supabase/planning-services';

export default function ConstructionPlanningPage() {
  const router = useRouter();

  // Supabase Auth Session & User Role
  const { user, userRole, isLoading: isAuthLoading, signOut } = useAuth();

  // Sites & Projects Management State (Supabase public.projects)
  const [isSitesManagerOpen, setIsSitesManagerOpen] = useState(false);
  const [activeDbProject, setActiveDbProject] = useState<DbProject | null>(null);

  // Sidebar State: Default to collapsed to maximize workspace space, persisted via localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('infibuild_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('infibuild_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Master State (populated dynamically from active site in Supabase)
  const [project, setProject] = useState<ProjectInfo>({
    id: 'active-site',
    name: 'Loading Site...',
    code: 'SITE-1',
    type: 'Construction Site',
    location: '',
    durationMonths: 12,
    plannedStartDate: '2026-01-01',
    plannedCompletionDate: '2026-12-31',
    forecastCompletionDate: '2026-12-31',
    clientName: '',
    generalContractor: '',
    overallProgress: 0,
  });

  // Resolve and persist active site from localStorage & Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function initSite() {
      try {
        const { activeProject, allProjects } = await resolveActiveSite();
        if (!isMounted) return;

        if (!activeProject || allProjects.length === 0) {
          // If no site exists, redirect to /sites and prompt user to create first site!
          router.replace('/sites?first=true');
          return;
        }

        setActiveDbProject(activeProject);
        setProject((prev) => ({
          ...prev,
          name: activeProject.name,
          code: activeProject.code || `SITE-${activeProject.serial_no}`,
          location: activeProject.location || activeProject.address || '',
          clientName: activeProject.client_name || '',
          generalContractor: activeProject.principal_contractor || (activeProject.project_person
            ? `${activeProject.project_person} (${activeProject.person_number || ''})`
            : ''),
        }));
      } catch (err) {
        console.error('Error resolving active site:', err);
      }
    }
    initSite();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectDbProject = (dbProj: DbProject) => {
    // Immediately clear previous site's state so tasks never mix or linger
    setTasks([]);
    setDependencies([]);
    setProgressEntries([]);
    setIssues([]);
    setActivityLogs([]);
    setSubcontractorBills([]);

    setActiveDbProject(dbProj);
    setStoredActiveSite(dbProj);
    setProject((prev) => ({
      ...prev,
      name: dbProj.name,
      code: dbProj.code || `SITE-${dbProj.serial_no}`,
      location: dbProj.location || dbProj.address || '',
      clientName: dbProj.client_name || '',
      generalContractor: dbProj.principal_contractor || (dbProj.project_person
        ? `${dbProj.project_person} (${dbProj.person_number || ''})`
        : ''),
    }));

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('site', dbProj.id);
        window.history.pushState({}, '', url.toString());
      } catch {}
    }

    showToast(`Switched active workspace to "${dbProj.name}"`, 'success');
  };
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [progressEntries, setProgressEntries] = useState<DailyProgressEntry[]>([]);
  const [issues, setIssues] = useState<TaskIssue[]>([]);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [recoveryScenarios, setRecoveryScenarios] = useState<RecoveryScenario[]>([]);
  const [areAllNotesOpen, setAreAllNotesOpen] = useState(false);

  const handleToggleAllNotes = () => {
    setAreAllNotesOpen((prev) => !prev);
  };

  // Active Project ID for Supabase Planning Tables (Checks state, then URL ?site=, then localStorage, then fallback)
  const activeProjectId =
    activeDbProject?.id ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('site') : null) ||
    getStoredActiveSiteId() ||
    'f0e510da-9530-468f-bb09-59920070d55e';
  const [isLoadingPlanningDb, setIsLoadingPlanningDb] = useState(false);

  // Synchronize planning data live with Supabase plan_* tables
  useEffect(() => {
    let isMounted = true;
    async function loadPlanningData() {
      setIsLoadingPlanningDb(true);
      try {
        const [dbTasks, dbDeps, dbProgress, dbIssues, dbLogs] = await Promise.all([
          fetchPlanTasks(activeProjectId),
          fetchPlanDependencies(activeProjectId),
          fetchPlanDailyProgress(activeProjectId),
          fetchPlanIssues(activeProjectId),
          fetchPlanActivityLogs(activeProjectId),
        ]);

        if (isMounted) {
          const loadedTasks = recalculateParentRollups(deduplicateTaskList(dbTasks || []));
          setTasks(loadedTasks);
          if (loadedTasks.length > 0) {
            setProject((prev) => calculateProjectRollup(loadedTasks, prev));
          }
          setDependencies(dbDeps || []);
          setProgressEntries(dbProgress || []);
          setIssues(dbIssues || []);
          setActivityLogs(dbLogs || []);
        }
      } catch (err) {
        console.error('Failed to synchronize Supabase planning data:', err);
      } finally {
        if (isMounted) {
          setIsLoadingPlanningDb(false);
        }
      }
    }

    loadPlanningData();
    return () => {
      isMounted = false;
    };
  }, [activeProjectId]);

  // Active View & Filter State (initialized SSR-safely, synced from URL on client mount)
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [hasInitializedUrl, setHasInitializedUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [floorFilter, setFloorFilter] = useState('all');
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilterType>('all');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<FileCategory | 'all'>('all');
  const [taskDateFilter, setTaskDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  // Tree Expansion State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set(['wp-1', 'wp-2', 'wp-3', 'wp-3-1', 'wp-3-2', 'wp-3-3', 'wp-3-4', 'wp-4', 'wp-5', 'wp-6', 'wp-7', 'wp-8', 'wp-9', 'wp-10']);
  });

  // Modal / Drawer Dialog States
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<ConstructionTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<ConstructionTask | null>(null);
  const [addTaskDefaultParent, setAddTaskDefaultParent] = useState<string | null>(null);
  const [addTaskDefaultType, setAddTaskDefaultType] = useState<TaskType>('task');

  const [isDailyProgressDialogOpen, setIsDailyProgressDialogOpen] = useState(false);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState<ConstructionTask | null>(null);

  const [isRecoveryPlanDrawerOpen, setIsRecoveryPlanDrawerOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

  const [impactTaskId, setImpactTaskId] = useState<string | null>(null);
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);

  const [isStartConfirmModalOpen, setIsStartConfirmModalOpen] = useState(false);
  const [taskToStart, setTaskToStart] = useState<ConstructionTask | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<ConstructionTask | null>(null);

  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertConfirmTask, setRevertConfirmTask] = useState<ConstructionTask | null>(null);
  const [revertTargetStatus, setRevertTargetStatus] = useState<'not_started' | 'in_progress' | null>(null);

  const [isDependencyEditorOpen, setIsDependencyEditorOpen] = useState(false);
  const [taskForDependencyEditor, setTaskForDependencyEditor] = useState<ConstructionTask | null>(null);

  const [deleteConfirmTask, setDeleteConfirmTask] = useState<ConstructionTask | null>(null);

  // Material Store & Billing Drawer State (Onsite / Powerplay)
  const [isMaterialBillingDrawerOpen, setIsMaterialBillingDrawerOpen] = useState(false);
  const [materialBillingTab, setMaterialBillingTab] = useState<'materials' | 'parties' | 'billing'>('materials');
  const [inventorySubTab, setInventorySubTab] = useState<'products' | 'catalog' | 'inward' | 'outward' | 'returns_damages' | 'ledger' | 'low_stock' | 'vendors'>('catalog');
  const [triggerMaterialAction, setTriggerMaterialAction] = useState<{ action: 'check_in' | 'check_out' | 'return' | 'damage'; timestamp: number } | null>(null);
  const [triggerExpenseAction, setTriggerExpenseAction] = useState<{ action: string; timestamp: number } | null>(null);

  // Initialize view and tab from URL once on client mount (SSR safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const validViews: ViewMode[] = [
        'list',
        'gantt',
        'critical',
        'progress',
        'milestones',
        'materials',
        'billing',
        'subcontractor-bills',
        'files-archive',
        'expenses',
      ];
      if (urlView && validViews.includes(urlView as ViewMode)) {
        setCurrentView(urlView as ViewMode);
      }
      const urlTab = params.get('tab');
      const validTabs = ['products', 'catalog', 'inward', 'outward', 'returns_damages', 'ledger', 'low_stock', 'vendors'];
      if (urlTab && validTabs.includes(urlTab)) {
        setInventorySubTab(urlTab as any);
      }
      const urlCat = params.get('category');
      if (urlCat) {
        setArchiveCategoryFilter(urlCat as any);
      }
    } catch {
      // ignore
    } finally {
      setHasInitializedUrl(true);
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlView = params.get('view');
        if (urlView) {
          setCurrentView(urlView as ViewMode);
        }
        const urlTab = params.get('tab');
        if (urlTab) {
          setInventorySubTab(urlTab as any);
        }
        const urlCat = params.get('category');
        if (urlCat) {
          setArchiveCategoryFilter(urlCat as any);
        }
        const urlSite = params.get('site');
        if (urlSite && activeDbProject && urlSite !== activeDbProject.id) {
          fetchAllActiveSites(false).then((allSites) => {
            const found = allSites.find((s) => s.id === urlSite);
            if (found) {
              handleSelectDbProject(found);
            }
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userRole, activeDbProject]);

  // Guard currentView against restricted role access (onlyallow)
  useEffect(() => {
    if (userRole && isOnlyAllowRole(userRole.role)) {
      if (!isViewAllowed(currentView, userRole.role, userRole.page)) {
        const first = getFirstAllowedView(userRole.role, userRole.page);
        if (first) {
          setCurrentView(first);
        }
      }
    }
  }, [userRole, currentView]);

  const handleViewChange = (newView: ViewMode) => {
    if (userRole && !isViewAllowed(newView, userRole.role, userRole.page)) {
      showToast(`Access Restricted: Your role (${userRole.role}) does not have permission to access "${newView}".`);
      return;
    }
    setCurrentView(newView);
  };

  // Sync current view & subtabs to top URL address bar only AFTER initial URL is read
  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitializedUrl) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', currentView);
      if (activeProjectId) {
        url.searchParams.set('site', activeProjectId);
      }

      if (currentView === 'materials') {
        if (inventorySubTab) {
          url.searchParams.set('tab', inventorySubTab);
        } else {
          url.searchParams.delete('tab');
        }
      } else {
        url.searchParams.delete('tab');
      }

      if (currentView === 'files-archive') {
        if (archiveCategoryFilter && archiveCategoryFilter !== 'all') {
          url.searchParams.set('category', archiveCategoryFilter);
        } else {
          url.searchParams.delete('category');
        }
      } else {
        url.searchParams.delete('category');
      }

      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, [currentView, inventorySubTab, archiveCategoryFilter, hasInitializedUrl]);

  const handleOpenMaterialDrawer = (tab: 'materials' | 'parties' | 'billing' = 'materials') => {
    if (tab === 'materials') {
      setCurrentView('materials');
      setInventorySubTab('catalog');
      return;
    }
    setMaterialBillingTab(tab);
    setIsMaterialBillingDrawerOpen(true);
  };

  // Subcontractor Bills State & Management (Persisted live to Supabase)
  const [parties, setParties] = useState<Party[]>([]);
  const [subcontractorBills, setSubcontractorBills] = useState<SubcontractorBill[]>([]);

  // Load Parties / Vendors dynamically from Supabase
  useEffect(() => {
    fetchProfileVendors().then((vendors) => {
      if (vendors && vendors.length > 0) {
        setParties(
          vendors.map((v) => ({
            id: v.id,
            name: v.name,
            category: (v.type === 'contractor' ? 'subcontractor' : v.type === 'vendor' ? 'material_supplier' : 'subcontractor') as any,
            phone: v.phone || '',
            email: v.email || undefined,
            gstin: v.gstin || undefined,
            pan: v.pan || undefined,
            trade: v.trade || 'General Works',
            bankDetails: v.bank_details || undefined,
            totalBilledAmount: 0,
            totalPaidAmount: 0,
            currentBalanceDue: 0,
            status: 'active' as const,
            createdAt: v.created_at || new Date().toISOString(),
          }))
        );
      }
    });
  }, []);

  // Load Subcontractor Bills from Supabase for active project
  useEffect(() => {
    if (!activeProjectId) return;
    fetchSubcontractorBills(activeProjectId).then((dbBills) => {
      setSubcontractorBills(dbBills || []);
    });
  }, [activeProjectId]);

  const handleSaveSubcontractorBill = async (savedBill: SubcontractorBill) => {
    setSubcontractorBills((prev) => {
      const exists = prev.some((b) => b.id === savedBill.id);
      if (exists) {
        return prev.map((b) => (b.id === savedBill.id ? savedBill : b));
      }
      return [savedBill, ...prev];
    });

    const isExisting = subcontractorBills.some((b) => b.id === savedBill.id);
    if (isExisting) {
      await updateSubcontractorBill(savedBill.id, savedBill, activeProjectId);
    } else {
      const created = await createSubcontractorBill(savedBill, activeProjectId);
      if (created) {
        setSubcontractorBills((prev) =>
          prev.map((b) => (b.id === savedBill.id ? created : b))
        );
      }
    }
  };

  const handleDeleteSubcontractorBill = async (billId: string) => {
    setSubcontractorBills((prev) => prev.filter((b) => b.id !== billId));
    await deleteSubcontractorBill(billId);
    showToast('Subcontractor Bill deleted from database.', 'info');
  };

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fully Normalized Project Rollup:
  // Dynamically recalculates project planned start, planned finish, forecast finish,
  // duration in months, and progress directly from tasks whenever any task is added, edited, or deleted!
  const refreshTasksWithRollups = (updatedTasks: ConstructionTask[]) => {
    const rolledUp = recalculateParentRollups(updatedTasks);
    setTasks(rolledUp);
    setProject((prev) => calculateProjectRollup(rolledUp, prev));
  };

  // Metrics
  const metrics = useMemo(() => getTaskMetrics(tasks), [tasks]);

  // Extract distinct floors for filter
  const availableFloors = useMemo(() => {
    const floors = new Set<string>();
    tasks.forEach((t) => {
      if (t.floor) floors.add(t.floor);
    });
    return Array.from(floors).sort();
  }, [tasks]);

  // Milestone list
  const milestones = useMemo(() => {
    return tasks.filter((t) => t.type === 'milestone');
  }, [tasks]);

  // Hierarchical Tree
  const fullTree = useMemo(() => buildTaskTree(tasks), [tasks]);

  // Filter tasks
  const filteredTree = useMemo(() => {
    let result = fullTree;

    // Filter by KPI summary selection
    if (summaryFilter !== 'all') {
      const matchesFilter = (task: ConstructionTask) => {
        if (summaryFilter === 'completed') return task.status === 'completed' || task.progress === 100;
        if (summaryFilter === 'in_progress') return task.status === 'in_progress';
        if (summaryFilter === 'not_started') return task.status === 'not_started' || task.status === 'ready_to_start';
        if (summaryFilter === 'delayed') return task.status === 'delayed' || task.varianceDays > 0;
        if (summaryFilter === 'critical') return task.isCritical;
        return true;
      };

      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            const selfMatch = matchesFilter(node);
            if (selfMatch || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    // Filter by status dropdown
    if (statusFilter !== 'all') {
      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            if (node.status === statusFilter || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    // Filter by critical only
    if (criticalOnly) {
      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            if (node.isCritical || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    // Filter by floor
    if (floorFilter !== 'all') {
      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            if (node.floor === floorFilter || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            const matches =
              node.name.toLowerCase().includes(q) ||
              node.code.toLowerCase().includes(q) ||
              node.responsible.toLowerCase().includes(q) ||
              (node.floor && node.floor.toLowerCase().includes(q));
            if (matches || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    // Filter by task schedule date (Range or Exact Particular Date)
    if (isDateFilterActive(taskDateFilter)) {
      const filterNodes = (nodes: TaskNode[]): TaskNode[] => {
        return nodes
          .map((node) => {
            const filteredChildren = filterNodes(node.children);
            const taskStart = node.actualStartDate || node.plannedStartDate;
            const taskEnd = node.forecastEndDate || node.plannedEndDate;
            const matchesStart = matchesDateFilter(taskStart, taskDateFilter);
            const matchesEnd = matchesDateFilter(taskEnd, taskDateFilter);
            let matchesRange = matchesStart || matchesEnd;
            if (taskDateFilter.mode === 'exact' && taskDateFilter.exactDate) {
              if (taskStart && taskEnd && taskStart <= taskDateFilter.exactDate && taskEnd >= taskDateFilter.exactDate) {
                matchesRange = true;
              }
            } else if (taskDateFilter.mode === 'range') {
              const rStart = taskDateFilter.startDate;
              const rEnd = taskDateFilter.endDate;
              if (rStart && rEnd && taskStart && taskEnd) {
                if (taskStart <= rEnd && taskEnd >= rStart) {
                  matchesRange = true;
                }
              }
            }
            if (matchesRange || filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          })
          .filter(Boolean) as TaskNode[];
      };
      result = filterNodes(result);
    }

    return result;
  }, [fullTree, summaryFilter, statusFilter, criticalOnly, floorFilter, searchQuery, taskDateFilter]);

  // Flattened tasks
  const displayedFlattenedTasks = useMemo(() => {
    return flattenTaskTree(filteredTree, expandedIds);
  }, [filteredTree, expandedIds]);

  // Tree expansion helpers
  const handleToggleExpand = (taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    tasks.forEach((t) => {
      if (t.type === 'work_package' || tasks.some((c) => c.parentTaskId === t.id)) {
        allIds.add(t.id);
      }
    });
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const isAllExpanded = expandedIds.size > 5;

  // Task selection & drawer opener
  const handleSelectTask = (task: ConstructionTask) => {
    setSelectedTaskForDrawer(task);
    setIsTaskDrawerOpen(true);
  };

  const handleSelectTaskById = (taskId: string) => {
    const found = tasks.find((t) => t.id === taskId);
    if (found) {
      handleSelectTask(found);
    }
  };

  // Execution Handlers: Start Task
  const handleInitiateStartTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTaskToStart(task);
    setIsStartConfirmModalOpen(true);
  };

  const handleConfirmStartTask = async (taskId: string, isOverride: boolean, overrideReason?: string) => {
    const today = new Date().toISOString().split('T')[0] || '2026-08-29';
    const task = tasks.find((t) => t.id === taskId);
    const updatedNotes = isOverride 
      ? `${task?.notes || ''} [AUTHORIZED OVERRIDE: Started despite predecessor constraints: ${overrideReason}]` 
      : task?.notes;
    const newProgress = task?.progress ?? 0;

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'in_progress' as ScheduleStatus,
          actualStartDate: today,
          progress: newProgress,
          notes: updatedNotes,
        };
      }
      return t;
    });

    refreshTasksWithRollups(updated);
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer((prev) => prev ? {
        ...prev,
        status: 'in_progress',
        actualStartDate: today,
        progress: newProgress,
        notes: updatedNotes,
      } : null);
    }

    const actionText = isOverride ? 'Task Started (Authorized Override)' : 'Task Started on Site';
    const detailsText = isOverride 
      ? `Actual start stamped as ${today}. Overrode dependencies: ${overrideReason}` 
      : `Actual start stamped as ${today}. Dependencies satisfied.`;
    const performedBy = user?.email?.split('@')[0] || 'Site Engineer';

    const newLog: TaskActivityLog = {
      id: `act-${Date.now()}`,
      taskId,
      action: actionText,
      details: detailsText,
      performedBy,
      timestamp: `${today} 08:30`,
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    showToast(`Activity "${task?.name}" marked as started on site.`);

    // Persist live to Supabase plan_* tables
    await updatePlanTask(taskId, {
      status: 'in_progress',
      actualStartDate: today,
      progress: newProgress,
      notes: updatedNotes,
    }, activeProjectId);
    await logPlanActivity(taskId, actionText, detailsText, performedBy, activeProjectId);
  };

  // Execution Handlers: Complete Task Modal Flow
  const handleInitiateCompleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTaskToComplete(task);
    setIsCompleteModalOpen(true);
  };

  const handleExecuteCompleteTask = async (
    taskId: string, 
    setProgressTo100: boolean, 
    completionDate?: string, 
    notes?: string
  ) => {
    const today = completionDate || new Date().toISOString().split('T')[0] || '2026-10-12';
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const finalProgress = setProgressTo100 ? 100 : (task.progress || 0);
    const completedQty = setProgressTo100 
      ? (task.plannedQuantity || task.completedQuantity) 
      : (task.completedQuantity || 0);

    const updatedNotes = notes 
      ? (task.notes ? `${task.notes}\n[COMPLETED: ${notes}]` : `[COMPLETED: ${notes}]`) 
      : task.notes;

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'completed' as ScheduleStatus,
          progress: finalProgress,
          actualEndDate: today,
          completedQuantity: completedQty,
          notes: updatedNotes,
        };
      }
      return t;
    });

    refreshTasksWithRollups(updated);
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer((prev) => prev ? {
        ...prev,
        status: 'completed',
        progress: finalProgress,
        actualEndDate: today,
        completedQuantity: completedQty,
        notes: updatedNotes,
      } : null);
    }

    const performedBy = user?.email?.split('@')[0] || 'Quality Inspector';
    const detailsText = setProgressTo100
      ? `Execution 100% finished. Actual completion date recorded as ${today}.`
      : `Activity closed as Completed with recorded ${finalProgress}% progress. Actual completion date recorded as ${today}.`;

    const newLog: TaskActivityLog = {
      id: `act-${Date.now()}`,
      taskId,
      action: 'Task Marked Completed',
      details: detailsText,
      performedBy,
      timestamp: `${today} 17:00`,
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    showToast(`Activity "${task.name}" marked as Completed (${finalProgress}%).`);

    // Persist live to Supabase plan_* tables
    await updatePlanTask(taskId, {
      status: 'completed',
      progress: finalProgress,
      actualEndDate: today,
      completedQuantity: completedQty,
      notes: updatedNotes,
    }, activeProjectId);
    await logPlanActivity(taskId, 'Task Marked Completed', detailsText, performedBy, activeProjectId);
  };

  // Execution Handlers: Revert Task Status Modal Flow (Requires Typing "CONFIRM")
  const handleInitiateRevertTask = (taskId: string, targetStatus: 'not_started' | 'in_progress') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setRevertConfirmTask(task);
    setRevertTargetStatus(targetStatus);
    setIsRevertModalOpen(true);
  };

  const handleExecuteRevertTask = async (taskId: string, targetStatus: 'not_started' | 'in_progress') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updatedTask: ConstructionTask;
    let updates: Partial<ConstructionTask>;
    let actionText = '';
    let detailsText = '';

    if (targetStatus === 'in_progress') {
      const prevProgress = task.progress === 100 
        ? (task.plannedQuantity && task.completedQuantity 
            ? Math.round((task.completedQuantity / task.plannedQuantity) * 100) 
            : 0)
        : task.progress;
      const newQty = task.plannedQuantity 
        ? Math.floor(task.plannedQuantity * (prevProgress / 100)) 
        : (task.completedQuantity || 0);

      updatedTask = {
        ...task,
        status: 'in_progress' as ScheduleStatus,
        actualEndDate: null,
        progress: prevProgress,
        completedQuantity: newQty,
      };

      updates = {
        status: 'in_progress',
        actualEndDate: null,
        progress: prevProgress,
        completedQuantity: newQty,
      };

      actionText = 'Task Completion Reverted';
      detailsText = `Task completion reverted back to In Progress (${prevProgress}%). Completion end date cleared.`;
    } else {
      // 'not_started'
      updatedTask = {
        ...task,
        status: 'not_started' as ScheduleStatus,
        actualStartDate: null,
        actualEndDate: null,
        progress: 0,
        completedQuantity: 0,
      };

      updates = {
        status: 'not_started',
        actualStartDate: null,
        actualEndDate: null,
        progress: 0,
        completedQuantity: 0,
      };

      actionText = 'Task Status Reset';
      detailsText = `Task reset to Not Started. Start/completion dates and progress cleared.`;
    }

    const updated = tasks.map((t) => (t.id === taskId ? updatedTask : t));
    refreshTasksWithRollups(updated);

    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer(updatedTask);
    }

    const today = new Date().toISOString().split('T')[0] || '2026-08-29';
    const performedBy = user?.email?.split('@')[0] || 'Site Supervisor';
    const newLog: TaskActivityLog = {
      id: `act-${Date.now()}`,
      taskId,
      action: actionText,
      details: detailsText,
      performedBy,
      timestamp: `${today} ${new Date().toTimeString().slice(0, 5)}`,
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    showToast(`Task "${task.name}" reverted to ${targetStatus.replace('_', ' ')}.`);

    // Persist live to Supabase plan_tasks
    await updatePlanTask(taskId, updates, activeProjectId);
    await logPlanActivity(taskId, actionText, detailsText, performedBy, activeProjectId);
  };

  // Execution Handlers: Daily Progress Submission
  const handleOpenDailyProgress = (task?: ConstructionTask) => {
    setSelectedTaskForProgress(task || null);
    setIsDailyProgressDialogOpen(true);
  };

  const handleSubmitDailyProgress = async (entry: Omit<DailyProgressEntry, 'id' | 'createdAt'>) => {
    const newEntry: DailyProgressEntry = {
      ...entry,
      id: `dp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setProgressEntries((prev) => [newEntry, ...prev]);

    const isFinished = entry.newProgress >= 100;
    const task = tasks.find((t) => t.id === entry.taskId);
    const newCompletedQty = (task?.completedQuantity || 0) + (entry.quantityCompletedToday || 0);
    const newStartDate = task?.actualStartDate || entry.reportDate;
    const newEndDate: string | null = isFinished ? entry.reportDate : (task?.actualEndDate ?? null);
    const newStatus: ScheduleStatus = isFinished ? ('completed' as ScheduleStatus) : ('in_progress' as ScheduleStatus);

    const updated = tasks.map((t) => {
      if (t.id === entry.taskId) {
        return {
          ...t,
          progress: entry.newProgress,
          status: newStatus,
          actualStartDate: newStartDate,
          actualEndDate: newEndDate,
          completedQuantity: newCompletedQty,
        };
      }
      return t;
    });

    refreshTasksWithRollups(updated);

    const newLog: TaskActivityLog = {
      id: `act-${Date.now()}`,
      taskId: entry.taskId,
      action: 'Daily Progress Logged',
      details: `Progress increased from ${entry.previousProgress}% to ${entry.newProgress}%. Reported by ${entry.supervisorName}.`,
      performedBy: entry.supervisorName,
      timestamp: `${entry.reportDate} 18:30`,
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    showToast(`Daily progress recorded: ${task?.name} updated to ${entry.newProgress}%.`);

    // Persist live to Supabase plan_* tables
    const createdProgress = await createPlanDailyProgress(entry, activeProjectId);
    if (createdProgress) {
      setProgressEntries((prev) => prev.map((p) => p.id === newEntry.id ? createdProgress : p));
    }
    await updatePlanTask(entry.taskId, {
      progress: entry.newProgress,
      status: newStatus,
      actualStartDate: newStartDate,
      actualEndDate: newEndDate,
      completedQuantity: newCompletedQty,
    }, activeProjectId);
    await logPlanActivity(
      entry.taskId, 
      'Daily Progress Logged', 
      `Progress increased from ${entry.previousProgress}% to ${entry.newProgress}%. Reported by ${entry.supervisorName}.`, 
      entry.supervisorName, 
      activeProjectId
    );
  };

  // Task Add / Edit
  const handleAddTask = () => {
    setTaskToEdit(null);
    setAddTaskDefaultParent(null);
    setAddTaskDefaultType('task');
    setIsAddTaskDialogOpen(true);
  };

  const handleAddWorkPackage = () => {
    setTaskToEdit(null);
    setAddTaskDefaultParent(null);
    setAddTaskDefaultType('work_package');
    setIsAddTaskDialogOpen(true);
  };

  const handleAddChildTask = (parentTask: ConstructionTask) => {
    setTaskToEdit(null);
    setAddTaskDefaultParent(parentTask.id);
    setAddTaskDefaultType('task');
    setIsAddTaskDialogOpen(true);
  };

  const handleEditTask = (task: ConstructionTask) => {
    setTaskToEdit(task);
    setIsAddTaskDialogOpen(true);
  };

  const handleSaveTask = async (
    taskData: Partial<ConstructionTask>,
    initialDependency?: { predecessorId: string; type: DependencyType; lagDays: number }
  ) => {
    if (taskToEdit) {
      const updated = tasks.map((t) => {
        if (t.id === taskToEdit.id) {
          return { ...t, ...taskData } as ConstructionTask;
        }
        return t;
      });
      refreshTasksWithRollups(updated);
      showToast(`Updated activity "${taskData.name}".`);

      // Persist to Supabase
      await updatePlanTask(taskToEdit.id, taskData, activeProjectId);
      await logPlanActivity(
        taskToEdit.id,
        'Task Updated',
        `Details updated for task ${taskData.name || taskToEdit.name}`,
        user?.email?.split('@')[0] || 'Site Engineer',
        activeProjectId
      );
    } else {
      const tempId = `t-user-${Date.now()}`;
      const newTask: ConstructionTask = {
        id: tempId,
        code: taskData.code || `${tasks.length + 1}`,
        name: taskData.name || 'New Activity',
        description: taskData.description,
        type: taskData.type || 'task',
        parentTaskId: taskData.parentTaskId || null,
        status: 'not_started',
        progress: 0,
        floor: taskData.floor,
        responsible: taskData.responsible || 'Site Engineer',
        isCritical: taskData.isCritical !== undefined ? taskData.isCritical : true,
        totalFloatDays: taskData.isCritical ? 0 : (taskData.totalFloatDays !== undefined ? taskData.totalFloatDays : 7),
        plannedStartDate: taskData.plannedStartDate || '2026-09-01',
        plannedEndDate: taskData.plannedEndDate || '2026-09-15',
        plannedDurationDays: taskData.plannedDurationDays || 14,
        actualStartDate: null,
        actualEndDate: null,
        forecastStartDate: taskData.plannedStartDate || '2026-09-01',
        forecastEndDate: taskData.plannedEndDate || '2026-09-15',
        varianceDays: 0,
        plannedQuantity: taskData.plannedQuantity,
        completedQuantity: 0,
        quantityUnit: taskData.quantityUnit,
        notes: taskData.notes,
        sortOrder: tasks.length + 1,
      };

      const updated = [...tasks, newTask];
      refreshTasksWithRollups(updated);

      if (taskData.parentTaskId) {
        setExpandedIds((prev) => new Set(prev).add(taskData.parentTaskId!));
      }

      showToast(`Added new activity "${newTask.name}" to WBS.`);

      // Persist to Supabase
      const dbTask = await createPlanTask(newTask, activeProjectId);
      const finalTaskId = dbTask ? dbTask.id : tempId;
      if (dbTask) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? dbTask : t)));
      }

      if (initialDependency && initialDependency.predecessorId) {
        const newDep: TaskDependency = {
          id: `dep-${Date.now()}`,
          predecessorId: initialDependency.predecessorId,
          successorId: finalTaskId,
          type: initialDependency.type,
          lagDays: initialDependency.lagDays,
        };
        setDependencies((prev) => [...prev, newDep]);

        const dbDep = await createPlanDependency(newDep, activeProjectId);
        if (dbDep) {
          setDependencies((prev) => prev.map((d) => (d.id === newDep.id ? dbDep : d)));
        }
      }

      await logPlanActivity(
        finalTaskId,
        'Task Created',
        `Created new ${newTask.type} "${newTask.name}" in WBS`,
        user?.email?.split('@')[0] || 'Site Engineer',
        activeProjectId
      );
    }
  };

  // Task Deletion
  const handleDeleteTask = (task: ConstructionTask) => {
    const hasChildren = tasks.some((t) => t.parentTaskId === task.id);
    if (hasChildren) {
      setDeleteConfirmTask(task);
    } else {
      executeDeleteTask(task.id);
    }
  };

  const executeDeleteTask = async (taskId: string) => {
    const idsToDelete = new Set<string>([taskId]);
    let added = true;
    while (added) {
      added = false;
      tasks.forEach((t) => {
        if (t.parentTaskId && idsToDelete.has(t.parentTaskId) && !idsToDelete.has(t.id)) {
          idsToDelete.add(t.id);
          added = true;
        }
      });
    }

    const updatedTasks = tasks.filter((t) => !idsToDelete.has(t.id));
    refreshTasksWithRollups(updatedTasks);

    setDependencies((prev) => prev.filter((d) => !idsToDelete.has(d.predecessorId) && !idsToDelete.has(d.successorId)));
    setDeleteConfirmTask(null);

    if (selectedTaskForDrawer && idsToDelete.has(selectedTaskForDrawer.id)) {
      setIsTaskDrawerOpen(false);
      setSelectedTaskForDrawer(null);
    }

    showToast(`Removed activity and subtasks from WBS.`);

    // Persist delete to Supabase plan_*
    const deletePromises = Array.from(idsToDelete).map((id) => deletePlanTask(id));
    await Promise.all(deletePromises);
  };

  // Dependencies Management
  const handleOpenDependencyManager = (task: ConstructionTask) => {
    setTaskForDependencyEditor(task);
    setIsDependencyEditorOpen(true);
  };

  const handleAddDependency = async (
    predecessorId: string, 
    successorId: string, 
    type: DependencyType, 
    lagDays: number
  ) => {
    const tempId = `dep-${Date.now()}`;
    const newDep: TaskDependency = {
      id: tempId,
      predecessorId,
      successorId,
      type,
      lagDays,
    };
    setDependencies((prev) => [...prev, newDep]);
    showToast(`Linked new dependency (${type}).`);

    // Persist to Supabase
    const dbDep = await createPlanDependency(newDep, activeProjectId);
    if (dbDep) {
      setDependencies((prev) => prev.map((d) => (d.id === tempId ? dbDep : d)));
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
    showToast(`Removed task dependency.`);

    // Persist to Supabase
    await deletePlanDependency(dependencyId);
  };

  // Delay Impact Trace
  const handleViewImpact = (taskId: string) => {
    setImpactTaskId(taskId);
    setIsImpactModalOpen(true);
  };

  // Recovery Scenario Application
  const handleApplyRecoveryScenario = (scenario: RecoveryScenario) => {
    const newProjectForecast = scenario.simulatedForecastDate;
    setProject((prev) => ({
      ...prev,
      forecastCompletionDate: newProjectForecast,
    }));

    const updated = tasks.map((t) => {
      if (scenario.affectedTaskCodes.includes(t.code)) {
        return {
          ...t,
          varianceDays: Math.max(0, t.varianceDays - scenario.recoveredDays),
          forecastEndDate: scenario.simulatedForecastDate,
          status: 'in_progress' as ScheduleStatus,
        };
      }
      return t;
    });

    refreshTasksWithRollups(updated);

    showToast(`Applied ${scenario.name}! Recovered ${scenario.recoveredDays} days.`);
  };

  // Issue Add Handler
  const handleAddIssue = async (
    taskId: string, 
    title: string, 
    description: string, 
    severity: TaskIssue['severity']
  ) => {
    const tempId = `iss-${Date.now()}`;
    const newIssue: TaskIssue = {
      id: tempId,
      taskId,
      title,
      description,
      severity,
      status: 'open',
      reportedBy: user?.email?.split('@')[0] || 'Site Supervisor',
      reportedDate: new Date().toISOString().split('T')[0] || '2026-08-29',
    };
    setIssues((prev) => [newIssue, ...prev]);

    if (severity === 'critical') {
      const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: 'blocked' as ScheduleStatus } : t));
      refreshTasksWithRollups(updated);
      await updatePlanTask(taskId, { status: 'blocked' }, activeProjectId);
    }

    showToast(`Logged site issue: "${title}".`, 'info');

    // Persist to Supabase
    const dbIssue = await createPlanIssue(newIssue, activeProjectId);
    if (dbIssue) {
      setIssues((prev) => prev.map((i) => (i.id === tempId ? dbIssue : i)));
    }
    await logPlanActivity(
      taskId,
      'Issue Reported',
      `Logged issue: ${title} (${severity} severity)`,
      newIssue.reportedBy,
      activeProjectId
    );
  };

  // Project Settings Save
  const handleSaveProjectSettings = (updatedProject: ProjectInfo) => {
    setProject(updatedProject);
    showToast('Updated project baseline dates and details.');
  };

  // Session Verification Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-800">Armee Enterprises PMS</h2>
          <p className="text-xs text-slate-500 mt-0.5">Verifying security session...</p>
        </div>
      </div>
    );
  }

  // Without login, software cannot be accessed!
  if (!user) {
    return <LoginPage />;
  }

  // Determine whether current view is one of the Planning Schedule views
  const isPlanningView = 
    currentView === 'list' || 
    currentView === 'gantt' || 
    currentView === 'critical' || 
    currentView === 'milestones' || 
    currentView === 'progress';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900 flex">
      
      {/* 1. Left Fixed & Collapsible Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        project={project}
        onAddTask={handleAddTask}
        onAddWorkPackage={handleAddWorkPackage}
        onOpenRecoveryPlan={() => setIsRecoveryPlanDrawerOpen(true)}
        onOpenSettings={() => setIsProjectSettingsOpen(true)}
        onOpenRecordProgress={() => handleOpenDailyProgress()}
        onOpenMaterialBilling={handleOpenMaterialDrawer}
        onOpenSitesManager={() => setIsSitesManagerOpen(true)}
        userEmail={user.email || undefined}
        userRole={userRole?.role}
        userPage={userRole?.page}
        onSignOut={signOut}
        activeArchiveCategory={archiveCategoryFilter}
        onSelectArchiveCategory={setArchiveCategoryFilter}
        activeInventoryTab={inventorySubTab}
        onSelectInventoryTab={setInventorySubTab}
        onOpenMaterialAction={(act) => {
          if (!isViewAllowed('materials', userRole?.role, userRole?.page)) {
            showToast('Access Restricted: You do not have permission to access Materials.');
            return;
          }
          setCurrentView('materials');
          setTriggerMaterialAction({ action: act, timestamp: Date.now() });
        }}
        onOpenExpenseAction={(act) => {
          if (!isViewAllowed('expenses', userRole?.role, userRole?.page)) {
            showToast('Access Restricted: You do not have permission to access Expenses.');
            return;
          }
          setCurrentView('expenses');
          setTriggerExpenseAction({ action: act, timestamp: Date.now() });
        }}
      />

      {/* 2. Main Content Area (Spans Full Chrome Width & Adapts to Sidebar) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 overflow-x-hidden transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-14' : 'lg:pl-[260px]'
        }`}
      >
        {/* Page Top Header: Rendered ONLY on Construction Planning Schedule pages */}
        {isPlanningView ? (
          <PlanningHeader
            project={project}
            onAddTask={handleAddTask}
            onAddWorkPackage={handleAddWorkPackage}
            onRecordProgress={() => handleOpenDailyProgress()}
            onViewCriticalPath={() => handleViewChange('critical')}
            onOpenRecoveryPlan={() => setIsRecoveryPlanDrawerOpen(true)}
            onOpenSettings={() => setIsProjectSettingsOpen(true)}
            onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onOpenMaterialStore={() => handleOpenMaterialDrawer('materials')}
            onOpenBilling={() => handleOpenMaterialDrawer('billing')}
            onOpenSubcontractorBills={() => handleViewChange('subcontractor-bills')}
            onOpenSitesManager={() => setIsSitesManagerOpen(true)}
            userEmail={user.email || undefined}
            userRole={userRole?.role}
            userPage={userRole?.page}
            onSignOut={signOut}
          />
        ) : (
          /* Mobile-only compact menu bar on non-planning views (Hidden on desktop) */
          <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate max-w-[180px]">{project.name}</span>
            </div>
            <div className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
              {project.code || 'SITE'}
            </div>
          </div>
        )}

        {/* Full-width Responsive Dashboard Body */}
        <main className="w-full px-3.5 sm:px-6 lg:px-8 py-5 space-y-4 sm:space-y-5 flex-1">
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
              <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Project Summary Cards (KPIs) - Full Width Grid (Only on schedule planning views) */}
          {isPlanningView && (
            <>
              <ProjectSummaryCards
                metrics={metrics}
                plannedCompletionDate={project.plannedCompletionDate}
                forecastCompletionDate={project.forecastCompletionDate}
                activeFilter={summaryFilter}
                onFilterChange={setSummaryFilter}
              />

              {/* Toolbar: Views Switcher, Search & Filters */}
              <TaskToolbar
                currentView={currentView}
                onViewChange={handleViewChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                criticalOnly={criticalOnly}
                onCriticalOnlyToggle={() => setCriticalOnly(!criticalOnly)}
                floorFilter={floorFilter}
                onFloorFilterChange={setFloorFilter}
                availableFloors={availableFloors}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                isAllExpanded={isAllExpanded}
                dateFilter={taskDateFilter}
                onDateFilterChange={setTaskDateFilter}
                areAllNotesOpen={areAllNotesOpen}
                onToggleAllNotes={handleToggleAllNotes}
              />
            </>
          )}

          {/* Active View Container */}
          <section className="transition-all duration-200 w-full">
            {userRole && isOnlyAllowRole(userRole.role) && !isViewAllowed(currentView, userRole.role, userRole.page) ? (
              <div className="bg-white rounded-2xl border border-rose-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                  Access Restricted ({userRole.role})
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Your account is restricted to designated views only ({userRole.page || 'None configured'}).
                  You do not have permission to view the <span className="font-semibold text-slate-700">"{currentView}"</span> module.
                </p>
                {getFirstAllowedView(userRole.role, userRole.page) && (
                  <button
                    type="button"
                    onClick={() => setCurrentView(getFirstAllowedView(userRole.role, userRole.page)!)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Go to Allowed Page ({getFirstAllowedView(userRole.role, userRole.page)})
                  </button>
                )}
              </div>
            ) : (
              <>
                {currentView === 'list' && (
                  <ConstructionTaskTable
                    tasks={displayedFlattenedTasks}
                    allTasksCount={tasks.length}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    onSelectTask={handleSelectTask}
                    onStartTask={handleInitiateStartTask}
                    onRecordProgress={handleOpenDailyProgress}
                    onCompleteTask={handleInitiateCompleteTask}
                    onRevertTaskStatus={handleInitiateRevertTask}
                    onAddChildTask={handleAddChildTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    dependencies={dependencies}
                    onOpenDependencyManager={handleOpenDependencyManager}
                    areAllNotesOpen={areAllNotesOpen}
                    onToggleAllNotes={handleToggleAllNotes}
                  />
                )}

                {currentView === 'gantt' && (
                  <GanttTimeline
                    tasks={displayedFlattenedTasks}
                    allTasks={tasks}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    onSelectTask={handleSelectTask}
                  />
                )}

                {currentView === 'critical' && (
                  <CriticalPathView
                    project={project}
                    tasks={tasks}
                    dependencies={dependencies}
                    onSelectTask={handleSelectTask}
                  />
                )}

                {currentView === 'progress' && (
                  <ProgressHistory
                    entries={progressEntries}
                    tasks={tasks}
                    onOpenRecordDialog={() => handleOpenDailyProgress()}
                    onSelectTask={handleSelectTask}
                  />
                )}

                {currentView === 'milestones' && (
                  <MilestonesView
                    milestones={milestones}
                    onSelectMilestone={handleSelectTask}
                  />
                )}

                {(currentView === 'expenses' || currentView === 'subcontractor-bills' || currentView === 'contractor-work-orders') && (
                  <CommercialBillsAndExpensesView
                    initialTab={
                      currentView === 'contractor-work-orders'
                        ? 'contractor-work-orders'
                        : currentView === 'subcontractor-bills'
                        ? 'subcontractor-bills'
                        : 'expenses'
                    }
                    project={project}
                    projectId={activeProjectId}
                    userEmail={user.email || undefined}
                    userRole={userRole?.role}
                    showToast={showToast}
                    externalActionTrigger={triggerExpenseAction}
                    subcontractorBills={subcontractorBills}
                    parties={parties}
                    tasks={tasks}
                    onSaveSubcontractorBill={handleSaveSubcontractorBill}
                    onDeleteSubcontractorBill={handleDeleteSubcontractorBill}
                    onTabChange={(tab) => setCurrentView(tab)}
                  />
                )}

                {currentView === 'files-archive' && (
                  <FilesArchiveView
                    project={project}
                    projectId={activeProjectId}
                    userEmail={user.email || undefined}
                    onOpenSitesManager={() => setIsSitesManagerOpen(true)}
                    initialCategory={archiveCategoryFilter}
                    onCategoryChange={setArchiveCategoryFilter}
                  />
                )}

                {currentView === 'materials' && (
                  <SiteInventoryManagement
                    allTasks={tasks}
                    project={project}
                    initialTab={inventorySubTab}
                    showToast={showToast}
                    externalActionTrigger={triggerMaterialAction}
                  />
                )}
              </>
            )}
          </section>

        </main>
      </div>

      {/* Drawers & Modals */}
      
      {/* Detailed Task Side Drawer */}
      <TaskDetailsDrawer
        task={selectedTaskForDrawer}
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        allTasks={tasks}
        dependencies={dependencies}
        progressEntries={progressEntries}
        issues={issues}
        activityLogs={activityLogs}
        onStartTask={handleInitiateStartTask}
        onCompleteTask={handleInitiateCompleteTask}
        onRevertTaskStatus={handleInitiateRevertTask}
        onRecordProgress={handleOpenDailyProgress}
        onSelectTaskById={handleSelectTaskById}
        onAddDependency={handleAddDependency}
        onRemoveDependency={handleRemoveDependency}
        onAddIssue={handleAddIssue}
      />

      {/* Add / Edit Task Form Modal */}
      <AddEditTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        onSave={handleSaveTask}
        editingTask={taskToEdit}
        defaultParentId={addTaskDefaultParent}
        defaultType={addTaskDefaultType}
        allTasks={tasks}
        dependencies={dependencies}
      />

      {/* Daily Progress Reporting Modal */}
      <DailyProgressDialog
        isOpen={isDailyProgressDialogOpen}
        onClose={() => setIsDailyProgressDialogOpen(false)}
        project={project}
        allTasks={tasks}
        selectedTask={selectedTaskForProgress}
        onSubmitProgress={handleSubmitDailyProgress}
        onOpenMaterialUsage={() => handleOpenMaterialDrawer('materials')}
      />

      {/* Dependency Manager Modal */}
      <DependencyEditor
        isOpen={isDependencyEditorOpen}
        onClose={() => setIsDependencyEditorOpen(false)}
        task={taskForDependencyEditor}
        allTasks={tasks}
        dependencies={dependencies}
        onAddDependency={handleAddDependency}
        onRemoveDependency={handleRemoveDependency}
        onNavigateToTask={handleSelectTask}
      />

      {/* Recovery Fast-Tracking Plan Drawer */}
      <RecoveryPlanDrawer
        isOpen={isRecoveryPlanDrawerOpen}
        onClose={() => setIsRecoveryPlanDrawerOpen(false)}
        scenarios={recoveryScenarios}
        project={project}
        onApplyScenario={handleApplyRecoveryScenario}
      />

      {/* Material Store & Billing Khata Drawer (Onsite / Powerplay) */}
      <MaterialBillingDrawer
        isOpen={isMaterialBillingDrawerOpen}
        onClose={() => setIsMaterialBillingDrawerOpen(false)}
        allTasks={tasks}
        initialTab={materialBillingTab}
        onOpenSubcontractorBills={() => setCurrentView('subcontractor-bills')}
      />

      {/* Delay Cascading Impact Modal */}
      <ScheduleImpactModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        taskId={impactTaskId}
        tasks={tasks}
        dependencies={dependencies}
        project={project}
        onSelectTask={handleSelectTask}
      />

      {/* Start Task Predecessor Readiness Confirmation Modal */}
      <StartTaskConfirmationModal
        isOpen={isStartConfirmModalOpen}
        onClose={() => setIsStartConfirmModalOpen(false)}
        task={taskToStart}
        allTasks={tasks}
        dependencies={dependencies}
        onConfirmStart={handleConfirmStartTask}
        onNavigateToTask={handleSelectTask}
      />

      {/* Complete Task Confirmation Modal */}
      <CompleteTaskConfirmModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        task={taskToComplete}
        onConfirmComplete={handleExecuteCompleteTask}
      />

      {/* Revert Task Confirmation Modal (Requires Typing "CONFIRM") */}
      <RevertTaskConfirmModal
        isOpen={isRevertModalOpen}
        onClose={() => setIsRevertModalOpen(false)}
        task={revertConfirmTask}
        targetStatus={revertTargetStatus}
        onConfirmRevert={handleExecuteRevertTask}
      />

      {/* Project Baseline Settings Modal */}
      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        project={project}
        onSave={handleSaveProjectSettings}
      />

      {/* Delete Confirmation Modal for Parent Tasks */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Work Package with Subtasks?
                </h3>
                <p className="text-slate-500 mt-1">
                  &ldquo;{deleteConfirmTask.name}&rdquo; contains child activities in the WBS hierarchy. Deleting it will permanently remove all nested child activities and dependencies.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTask(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteTask(deleteConfirmTask.id)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sites & Construction Projects Management Modal */}
      <SitesManagerModal
        isOpen={isSitesManagerOpen}
        onClose={() => setIsSitesManagerOpen(false)}
        activeProjectId={activeDbProject?.id}
        onSelectProject={handleSelectDbProject}
        showToast={showToast}
      />

    </div>
  );
}
