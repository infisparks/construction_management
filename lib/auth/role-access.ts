import { ViewMode } from '@/lib/construction-planning/types';

/**
 * Checks if the given role represents a restricted "onlyallow" role.
 * Matches "onlyallow", "only_allow", "only-allow", case-insensitively.
 */
export function isOnlyAllowRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase().replace(/[\s\-_]/g, '');
  return normalized === 'onlyallow';
}

/**
 * Parses the raw string or JSON representation of the allowed page(s).
 * Supports comma/semicolon/newline-delimited values, e.g. "files-archive" or "files-archive, materials"
 * or JSON string arrays like '["files-archive"]'.
 */
export function parseAllowedPages(pageValue?: string | null): string[] {
  if (!pageValue) return [];
  const trimmed = pageValue.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // Fallback to regular delimiter split below
    }
  }

  return trimmed
    .split(/[,;\n|]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Determines whether a specific ViewMode (e.g. 'files-archive', 'materials') is allowed.
 * If the role is NOT onlyallow, always returns true.
 * If the role IS onlyallow, checks the user's page column against allowed views.
 */
export function isViewAllowed(
  view: ViewMode | string,
  role?: string | null,
  pageValue?: string | null
): boolean {
  if (!isOnlyAllowRole(role)) return true;

  const allowedList = parseAllowedPages(pageValue);
  if (allowedList.length === 0) return false;

  const target = view.toLowerCase().trim();

  return allowedList.some((allowed) => {
    if (allowed === '*' || allowed === 'all') return true;
    if (allowed === target) return true;

    // View & Module alias resolution
    if (
      (allowed === 'files-archive' || allowed === 'archive' || allowed === 'docs' || allowed === 'documents' || allowed === 'files') &&
      target === 'files-archive'
    ) {
      return true;
    }

    if (
      (allowed === 'materials' || allowed === 'store' || allowed === 'inventory') &&
      target === 'materials'
    ) {
      return true;
    }

    if (
      (allowed === 'subcontractor-bills' || allowed === 'bills' || allowed === 'commercial') &&
      target === 'subcontractor-bills'
    ) {
      return true;
    }

    if (
      (allowed === 'billing' || allowed === 'commercial' || allowed === 'bills') &&
      target === 'billing'
    ) {
      return true;
    }

    if (
      (allowed === 'expenses' || allowed === 'expense' || allowed === 'commercial' || allowed === 'bills' || allowed === 'petty-cash') &&
      target === 'expenses'
    ) {
      return true;
    }

    if (
      (allowed === 'progress' || allowed === 'execution' || allowed === 'site') &&
      target === 'progress'
    ) {
      return true;
    }

    if (
      (allowed === 'planning' || allowed === 'plan' || allowed === 'schedule') &&
      (target === 'list' || target === 'gantt' || target === 'critical' || target === 'milestones')
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Determines whether a sidebar rail module is allowed for the user.
 * Hides unauthorized modules when role is 'onlyallow'.
 */
export function isModuleAllowed(
  moduleId: string,
  role?: string | null,
  pageValue?: string | null
): boolean {
  if (!isOnlyAllowRole(role)) return true;

  const allowedList = parseAllowedPages(pageValue);
  if (allowedList.length === 0) return false;

  const mod = moduleId.toLowerCase().trim();

  return allowedList.some((allowed) => {
    if (allowed === '*' || allowed === 'all') return true;
    if (allowed === mod) return true;

    if (mod === 'archive') {
      return (
        allowed === 'files-archive' ||
        allowed === 'archive' ||
        allowed === 'docs' ||
        allowed === 'documents' ||
        allowed === 'files'
      );
    }

    if (mod === 'materials') {
      return allowed === 'materials' || allowed === 'store' || allowed === 'inventory';
    }

    if (mod === 'commercial') {
      return (
        allowed === 'subcontractor-bills' ||
        allowed === 'billing' ||
        allowed === 'bills' ||
        allowed === 'expenses' ||
        allowed === 'commercial'
      );
    }

    if (mod === 'expenses') {
      return (
        allowed === 'expenses' ||
        allowed === 'expense' ||
        allowed === 'bills' ||
        allowed === 'commercial' ||
        allowed === 'petty-cash'
      );
    }

    if (mod === 'execution') {
      return allowed === 'progress' || allowed === 'execution' || allowed === 'site';
    }

    if (mod === 'planning') {
      return (
        allowed === 'planning' ||
        allowed === 'plan' ||
        allowed === 'schedule' ||
        allowed === 'list' ||
        allowed === 'gantt' ||
        allowed === 'critical' ||
        allowed === 'milestones'
      );
    }

    if (mod === 'controls') {
      return allowed === 'controls' || allowed === 'risk';
    }

    if (mod === 'sites') {
      return allowed === 'sites' || allowed === 'projects';
    }

    return false;
  });
}

/**
 * Returns the primary allowed ViewMode to navigate to if user lands on an unauthorized view.
 */
export function getFirstAllowedView(
  role?: string | null,
  pageValue?: string | null
): ViewMode | null {
  const allowedList = parseAllowedPages(pageValue);

  for (const item of allowedList) {
    if (
      item === 'files-archive' ||
      item === 'archive' ||
      item === 'docs' ||
      item === 'documents' ||
      item === 'files'
    ) {
      return 'files-archive';
    }
    if (item === 'materials' || item === 'store' || item === 'inventory') {
      return 'materials';
    }
    if (item === 'subcontractor-bills' || item === 'commercial' || item === 'bills') {
      return 'subcontractor-bills';
    }
    if (item === 'billing') {
      return 'billing';
    }
    if (item === 'expenses' || item === 'expense' || item === 'petty-cash') {
      return 'expenses';
    }
    if (item === 'progress' || item === 'execution' || item === 'site') {
      return 'progress';
    }
    if (item === 'list' || item === 'planning' || item === 'plan' || item === 'schedule') {
      return 'list';
    }
    if (item === 'gantt') return 'gantt';
    if (item === 'critical') return 'critical';
    if (item === 'milestones') return 'milestones';
  }

  return allowedList.length > 0 ? 'files-archive' : null;
}
