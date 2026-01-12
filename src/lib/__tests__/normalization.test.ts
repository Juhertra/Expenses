import { describe, it, expect } from 'vitest';
import { canonicalForm, normalizeDescription, checkDuplicate } from '../normalization';
import type { Expense } from '../types';

describe('canonicalForm', () => {
  it('should create canonical form correctly', () => {
    expect(canonicalForm('  Grocery  Shopping  ')).toBe('grocery shopping');
    expect(canonicalForm('RENT')).toBe('rent');
    expect(canonicalForm('  Multiple   Spaces  ')).toBe('multiple spaces');
  });

  it('should handle empty and whitespace strings', () => {
    expect(canonicalForm('')).toBe('');
    expect(canonicalForm('   ')).toBe('');
  });
});

describe('normalizeDescription', () => {
  it('should apply normalization rules', () => {
    const rules = {
      'grocery shopping': 'Groceries',
      rent: 'Monthly Rent',
    };

    expect(normalizeDescription('  Grocery  Shopping  ', rules)).toBe('Groceries');
    expect(normalizeDescription('RENT', rules)).toBe('Monthly Rent');
  });

  it('should return trimmed input if no rule matches', () => {
    const rules = {
      'grocery shopping': 'Groceries',
    };

    expect(normalizeDescription('Utilities', rules)).toBe('Utilities');
    expect(normalizeDescription('  Car Payment  ', rules)).toBe('Car Payment');
  });

  it('should handle empty rules', () => {
    expect(normalizeDescription('Test', {})).toBe('Test');
  });
});

describe('checkDuplicate', () => {
  const expenses: Expense[] = [
    {
      id: '1',
      description: 'Grocery Shopping',
      amount: 50,
      category: 'Food',
      type: 'expense',
      date: '2026-01-01',
      paidBy: 'partner1',
    },
    {
      id: '2',
      description: 'Rent Payment',
      amount: 1000,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-01',
      paidBy: 'partner1',
    },
  ];

  it('should detect duplicates by canonical form', () => {
    const duplicate = checkDuplicate(expenses, '2026-01-01', 50, '  grocery  shopping  ');

    expect(duplicate).toBeTruthy();
    expect(duplicate?.id).toBe('1');
  });

  it('should not find duplicates when amount differs', () => {
    const duplicate = checkDuplicate(expenses, '2026-01-01', 51, 'Grocery Shopping');

    expect(duplicate).toBeNull();
  });

  it('should not find duplicates when date differs', () => {
    const duplicate = checkDuplicate(expenses, '2026-01-02', 50, 'Grocery Shopping');

    expect(duplicate).toBeNull();
  });

  it('should exclude specified ID from duplicate check', () => {
    const duplicate = checkDuplicate(expenses, '2026-01-01', 50, 'Grocery Shopping', '1');

    expect(duplicate).toBeNull();
  });

  it('should handle case-insensitive matching', () => {
    const duplicate = checkDuplicate(expenses, '2026-01-01', 50, 'GROCERY SHOPPING');

    expect(duplicate).toBeTruthy();
    expect(duplicate?.id).toBe('1');
  });
});

