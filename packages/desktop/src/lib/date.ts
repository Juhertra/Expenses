import { parseDateParts } from '@expenses/shared/calculations';

/**
 * Return a local calendar date in ISO format (YYYY-MM-DD).
 */
export function getLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an ISO calendar date (YYYY-MM-DD) into a local Date at local midnight.
 */
export function parseISODateToLocalDate(dateStr: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  return new Date(year, month, day);
}
