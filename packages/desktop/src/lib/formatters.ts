import type { HouseholdSettings } from '@expenses/shared/types';

/**
 * Format a number as currency based on household settings
 */
export function formatCurrency(amount: number, settings: HouseholdSettings): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: settings.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${settings.currencySymbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format a date string or Date object to a user-friendly string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get a formatted month/year string for display
 */
export function getMonthYearString(month: number, year: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

/**
 * Get month name from month index (0-11)
 */
export function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month] || '';
}

