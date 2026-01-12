import type { FormData } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Sanitize user input by removing HTML tags and dangerous characters
 * Note: For production, consider using DOMPurify library
 */
export function sanitizeInput(input: string): string {
  // Remove HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  // Trim whitespace
  return withoutTags.trim();
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
  if (isNaN(amount) || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Recurring day validation
  if (formData.isRecurring) {
    if (formData.recurringDay < 1 || formData.recurringDay > 31) {
      errors.push('Recurring day must be between 1 and 31');
    }
  }

  // Date validation
  if (formData.date) {
    const dateObj = new Date(formData.date);
    if (isNaN(dateObj.getTime())) {
      errors.push('Invalid date format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate import data structure
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

    // Validate expenses array
    if (!Array.isArray(dataObj.expenses)) {
      errors.push('Expenses must be an array');
    }

    // Validate recurring array
    if (!Array.isArray(dataObj.recurring)) {
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

  if (isNaN(amount) || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (from === to) {
    errors.push('From and To partners must be different');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

