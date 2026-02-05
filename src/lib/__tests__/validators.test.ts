import {
  sanitizeInput,
  validateExpenseForm,
  validateImportData,
  validateSettlement,
} from '../validators.ts';
import type { FormData } from '../types.ts';

describe('sanitizeInput', () => {
  it('should remove HTML tags', () => {
    // DOMPurify strips script elements entirely (content + tags)
    expect(sanitizeInput('<script>alert("xss")</script>Food')).toBe('Food');
    expect(sanitizeInput('<b>Bold</b> text')).toBe('Bold text');
    expect(sanitizeInput('<div><p>Nested</p></div>')).toBe('Nested');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  Text  ')).toBe('Text');
    expect(sanitizeInput('  Multiple   Spaces  ')).toBe('Multiple   Spaces');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput('   ')).toBe('');
  });
});

describe('validateExpenseForm', () => {
  const validForm: FormData = {
    description: 'Rent',
    amount: '1500',
    category: 'Housing',
    type: 'expense',
    date: '2026-01-01',
    paidBy: 'partner1',
    isRecurring: false,
    recurringDay: 1,
  };

  it('should validate correct form data', () => {
    const result = validateExpenseForm(validForm);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty description', () => {
    const result = validateExpenseForm({
      ...validForm,
      description: '   ',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Description is required');
  });

  it('should reject invalid amounts', () => {
    const result1 = validateExpenseForm({
      ...validForm,
      amount: '-50',
    });
    expect(result1.isValid).toBe(false);
    expect(result1.errors).toContain('Amount must be a valid number greater than 0');

    const result2 = validateExpenseForm({
      ...validForm,
      amount: '0',
    });
    expect(result2.isValid).toBe(false);

    const result3 = validateExpenseForm({
      ...validForm,
      amount: 'invalid',
    });
    expect(result3.isValid).toBe(false);
  });

  it('should validate recurring day range', () => {
    const result1 = validateExpenseForm({
      ...validForm,
      isRecurring: true,
      recurringDay: 0,
    });
    expect(result1.isValid).toBe(false);
    expect(result1.errors).toContain('Recurring day must be between 1 and 31');

    const result2 = validateExpenseForm({
      ...validForm,
      isRecurring: true,
      recurringDay: 32,
    });
    expect(result2.isValid).toBe(false);

    const result3 = validateExpenseForm({
      ...validForm,
      isRecurring: true,
      recurringDay: 15,
    });
    expect(result3.isValid).toBe(true);
  });
});

describe('validateSettlement', () => {
  it('should validate correct settlement data', () => {
    const result = validateSettlement(100, 'partner1', 'partner2');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid amounts', () => {
    const result1 = validateSettlement(0, 'partner1', 'partner2');
    expect(result1.isValid).toBe(false);
    expect(result1.errors).toContain('Amount must be a valid number greater than 0');

    const result2 = validateSettlement(-50, 'partner1', 'partner2');
    expect(result2.isValid).toBe(false);
  });

  it('should reject same from and to partners', () => {
    const result = validateSettlement(100, 'partner1', 'partner1');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('From and To partners must be different');
  });
});

describe('validateImportData', () => {
  const validData = {
    schemaVersion: 1,
    exportDate: '2026-01-01T00:00:00.000Z',
    data: {
      expenses: [],
      recurring: [],
      partnerNames: { partner1: 'Partner 1', partner2: 'Partner 2' },
      householdSettings: {
        currencyCode: 'USD',
        currencySymbol: '$',
        splitMode: 'equal',
        partner1Ratio: 0.5,
        budgets: {},
        normalizationRules: {},
        categories: {},
      },
      settlements: [],
    },
  };

  it('should validate correct import data', () => {
    const result = validateImportData(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid schema version', () => {
    const result = validateImportData({
      ...validData,
      schemaVersion: 2,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid or unsupported schema version');
  });

  it('should reject missing data object', () => {
    const result = validateImportData({
      schemaVersion: 1,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Missing data object');
  });

  it('should reject non-array expenses', () => {
    const result = validateImportData({
      ...validData,
      data: {
        ...validData.data,
        expenses: 'not an array',
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Expenses must be an array');
  });
});

