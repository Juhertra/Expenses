import DOMPurify from 'dompurify';
import type { FormData } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Maximum allowed amount (1 trillion)
const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Sanitize user input by removing HTML tags and dangerous characters
 * Uses DOMPurify for robust XSS prevention
 */
export function sanitizeInput(input: string): string {
  // DOMPurify removes all HTML and dangerous content
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  return sanitized.trim();
}

/**
 * Validate expense/income form data
 */
export function validateExpenseForm(formData: FormData): ValidationResult {
  const errors: string[] = [];

  // Description validation
  if (!formData.description.trim()) {
    errors.push('Description is required');
  }

  // Amount validation
  const amount = parseFloat(formData.amount);
  if (Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
    errors.push('Amount must be a valid number greater than 0');
  } else if (amount > MAX_AMOUNT) {
    errors.push(`Amount cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
  }

  // Recurring day validation
  if (formData.isRecurring) {
    if (formData.recurringDay < 1 || formData.recurringDay > 31) {
      errors.push('Recurring day must be between 1 and 31');
    }
  }

  // Date validation - must be ISO 8601 format (YYYY-MM-DD)
  if (formData.date) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const isValidFormat = isoDateRegex.test(formData.date);
    if (isValidFormat) {
      const dateObj = new Date(formData.date);
      if (Number.isNaN(dateObj.getTime())) {
        errors.push('Invalid date');
      }
    } else {
      errors.push('Invalid date format (expected YYYY-MM-DD)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const VALID_PAID_BY = ['partner1', 'partner2', 'joint'] as const;
const VALID_TYPES = ['expense', 'income'] as const;

function validateExpenseItem(item: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!item || typeof item !== 'object') {
    errors.push(`Expense[${index}]: invalid item`);
    return errors;
  }
  const e = item as Record<string, unknown>;
  if (typeof e.id !== 'number') errors.push(`Expense[${index}]: id must be a number`);
  if (typeof e.description !== 'string' || !e.description.trim()) errors.push(`Expense[${index}]: description is required`);
  if (typeof e.amount !== 'number' || !Number.isFinite(e.amount) || e.amount <= 0) errors.push(`Expense[${index}]: amount must be a positive number`);
  if (typeof e.type !== 'string' || !VALID_TYPES.includes(e.type as 'expense' | 'income')) errors.push(`Expense[${index}]: invalid type`);
  if (!VALID_PAID_BY.includes(e.paidBy as 'partner1' | 'partner2' | 'joint')) errors.push(`Expense[${index}]: invalid paidBy`);
  if (typeof e.date !== 'string') errors.push(`Expense[${index}]: date must be a string`);
  return errors;
}

function validateRecurringItem(item: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!item || typeof item !== 'object') {
    errors.push(`Recurring[${index}]: invalid item`);
    return errors;
  }
  const r = item as Record<string, unknown>;
  if (typeof r.id !== 'number') errors.push(`Recurring[${index}]: id must be a number`);
  if (typeof r.description !== 'string' || !r.description.trim()) errors.push(`Recurring[${index}]: description is required`);
  if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0) errors.push(`Recurring[${index}]: amount must be a positive number`);
  if (typeof r.recurringDay !== 'number' || r.recurringDay < 1 || r.recurringDay > 31) errors.push(`Recurring[${index}]: recurringDay must be 1-31`);
  if (typeof r.type !== 'string' || !VALID_TYPES.includes(r.type as 'expense' | 'income')) errors.push(`Recurring[${index}]: invalid type`);
  if (!VALID_PAID_BY.includes(r.paidBy as 'partner1' | 'partner2' | 'joint')) errors.push(`Recurring[${index}]: invalid paidBy`);
  return errors;
}

/**
 * Validate import data structure and item contents
 */
export function validateImportData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { isValid: false, errors };
  }

  const importData = data as Record<string, unknown>;

  // Check schema version
  if (importData.schemaVersion !== 1) {
    errors.push('Invalid or unsupported schema version');
  }

  // Check data object exists
  if (!importData.data || typeof importData.data !== 'object') {
    errors.push('Missing data object');
  } else {
    const dataObj = importData.data as Record<string, unknown>;

    // Validate expenses array and each item
    if (Array.isArray(dataObj.expenses)) {
      dataObj.expenses.forEach((item: unknown, i: number) => {
        errors.push(...validateExpenseItem(item, i));
      });
    } else {
      errors.push('Expenses must be an array');
    }

    // Validate recurring array and each item
    if (Array.isArray(dataObj.recurring)) {
      dataObj.recurring.forEach((item: unknown, i: number) => {
        errors.push(...validateRecurringItem(item, i));
      });
    } else {
      errors.push('Recurring must be an array');
    }

    // Validate partner names
    if (!dataObj.partnerNames || typeof dataObj.partnerNames !== 'object') {
      errors.push('Invalid partner names');
    }

    // Validate household settings
    if (!dataObj.householdSettings || typeof dataObj.householdSettings !== 'object') {
      errors.push('Invalid household settings');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate settlement form data
 */
export function validateSettlement(
  amount: number,
  from: string,
  to: string
): ValidationResult {
  const errors: string[] = [];

  if (Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
    errors.push('Amount must be a valid number greater than 0');
  } else if (amount > MAX_AMOUNT) {
    errors.push(`Amount cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
  }

  if (from === to) {
    errors.push('From and To partners must be different');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

