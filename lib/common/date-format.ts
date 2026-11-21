/**
 * Date & Time formatting utilities for 12-hour Mumbai Time Zone (Asia/Kolkata / IST, UTC+05:30)
 */

/**
 * Format timestamp in 12-hour format in Mumbai Time Zone with AM/PM
 * e.g. "21 Nov 2026, 05:45 PM" (or "15 Oct 2026" if date-only)
 */
export function formatMumbaiDateTime(timestamp?: string | null): string {
  if (!timestamp) return '—';
  try {
    const trimmed = String(timestamp).trim();
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);

    if (isDateOnly) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(utcDate);
    }

    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const datePart = dateFormatter.format(d);
    const timePart = timeFormatter.format(d).toUpperCase();

    return `${datePart}, ${timePart}`;
  } catch {
    return String(timestamp);
  }
}

/**
 * Format date-only in Mumbai Time Zone (e.g. "21 Nov 2026")
 */
export function formatMumbaiDate(timestamp?: string | null): string {
  if (!timestamp) return '—';
  try {
    const trimmed = String(timestamp).trim();
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (isDateOnly) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(utcDate);
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(timestamp);
  }
}

/**
 * Format time-only in 12-hour Mumbai Time Zone with AM/PM (e.g. "05:45 PM")
 */
export function formatMumbaiTime(timestamp?: string | null): string {
  if (!timestamp) return '';
  try {
    const trimmed = String(timestamp).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d).toUpperCase();
  } catch {
    return '';
  }
}
