import { describe, expect, it } from 'vitest';
import type { Expense, RecurringTransaction } from '@expenses/shared/types';
import {
  buildRecurringDraftFromExpense,
  getRecurringProcessedMonthIso,
  resolveRecurringRuleLink,
} from '../recurringRules';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 1,
    description: 'Rent',
    amount: 7000,
    category: 'Housing',
    type: 'expense',
    date: '2026-04-10',
    paidBy: 'partner2',
    ...overrides,
  };
}

function makeRecurring(overrides: Partial<RecurringTransaction>): RecurringTransaction {
  return {
    id: 7,
    description: 'Rent',
    amount: 7000,
    category: 'Housing',
    type: 'expense',
    paidBy: 'partner2',
    recurringDay: 10,
    lastProcessed: '2026-04-05T10:57:19.550Z',
    ...overrides,
  };
}

describe('recurringRules', () => {
  it('uses an explicit recurringId when present', () => {
    const rule = makeRecurring({ id: 42 });
    const expense = makeExpense({ recurringId: 42 });

    const result = resolveRecurringRuleLink(expense, [rule]);

    expect(result.isRecurringOccurrence).toBe(true);
    expect(result.canEditRule).toBe(true);
    expect(result.recurring).toEqual(rule);
  });

  it('resolves a unique legacy auto-generated occurrence by rule fields', () => {
    const rule = makeRecurring({ id: 99 });
    const expense = makeExpense({ id: 2, isAuto: true });

    const result = resolveRecurringRuleLink(expense, [rule]);

    expect(result.isRecurringOccurrence).toBe(true);
    expect(result.canEditRule).toBe(true);
    expect(result.resolvedRecurringId).toBe(99);
  });

  it('marks ambiguous legacy matches as occurrence-only', () => {
    const expense = makeExpense({ id: 3, isAuto: true });
    const result = resolveRecurringRuleLink(expense, [
      makeRecurring({ id: 1 }),
      makeRecurring({ id: 2 }),
    ]);

    expect(result.isRecurringOccurrence).toBe(true);
    expect(result.canEditRule).toBe(false);
    expect(result.isAmbiguousLegacyMatch).toBe(true);
  });

  it('returns non-recurring status for normal expenses with no link', () => {
    const result = resolveRecurringRuleLink(makeExpense({ id: 4 }), [makeRecurring({ id: 8 })]);

    expect(result.isRecurringOccurrence).toBe(false);
    expect(result.canEditRule).toBe(false);
    expect(result.recurring).toBeNull();
  });

  it('builds recurring drafts from the expense date day-of-month', () => {
    const draft = buildRecurringDraftFromExpense(
      makeExpense({
        date: '2026-04-28',
        amount: 120,
        description: 'Gym',
        category: 'Health',
        paidBy: 'partner1',
      })
    );

    expect(draft.description).toBe('Gym');
    expect(draft.amount).toBe('120');
    expect(draft.recurringDay).toBe(28);
  });

  it('creates a processed marker inside the occurrence month', () => {
    const processedAt = getRecurringProcessedMonthIso('2026-04-03');
    const date = new Date(processedAt);

    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(3);
  });
});
