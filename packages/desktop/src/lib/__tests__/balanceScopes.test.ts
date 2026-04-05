import { describe, expect, it } from 'vitest';
import type { Expense, Settlement } from '@expenses/shared/types';
import { calculateBalanceScopes } from '../balanceScopes';

describe('calculateBalanceScopes', () => {
  it('includes selected-month settlements in month mode', () => {
    const monthExpenses: Expense[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 100,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner2',
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 1,
        date: '2026-01-15',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        note: 'Half rent',
      },
    ];

    const result = calculateBalanceScopes(
      monthExpenses,
      monthExpenses,
      settlements,
      2026,
      0,
      0.5
    );

    expect(result.month.partner1Balance).toBeCloseTo(0, 8);
    expect(result.month.partner2Balance).toBeCloseTo(0, 8);
    expect(result.settlementsInMonth).toHaveLength(1);
  });

  it('excludes future settlements from both month and cumulative scopes', () => {
    const monthExpenses: Expense[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 100,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner2',
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 1,
        date: '2026-02-01',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        note: 'Future payment',
      },
    ];

    const result = calculateBalanceScopes(
      monthExpenses,
      monthExpenses,
      settlements,
      2026,
      0,
      0.5
    );

    expect(result.month.partner1Balance).toBe(-50);
    expect(result.cumulative.partner1Balance).toBe(-50);
    expect(result.settlementsThroughMonth).toHaveLength(0);
  });

  it('uses settlements through selected month for cumulative mode', () => {
    const january: Expense = {
      id: 1,
      description: 'Jan rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-10',
      paidBy: 'partner2',
    };
    const february: Expense = {
      id: 2,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlements: Settlement[] = [
      {
        id: 1,
        date: '2026-01-20',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        note: '',
      },
    ];

    const result = calculateBalanceScopes(
      [february],
      [january, february],
      settlements,
      2026,
      1,
      0.5
    );

    expect(result.month.partner1Balance).toBe(-50);
    expect(result.cumulative.partner1Balance).toBe(-50);
    expect(result.settlementsThroughMonth).toHaveLength(1);
  });

  it('does not leak next-month settlement into selected month', () => {
    const januaryExpenses: Expense[] = [
      {
        id: 1,
        description: 'Jan housing',
        amount: 2000,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner2',
      },
    ];

    const settlements: Settlement[] = [
      { id: 1, date: '2026-01-31', amount: 500, from: 'partner1', to: 'partner2', note: '' },
      { id: 2, date: '2026-02-28', amount: 500, from: 'partner1', to: 'partner2', note: '' },
    ];

    const result = calculateBalanceScopes(
      januaryExpenses,
      januaryExpenses,
      settlements,
      2026,
      0,
      0.5
    );

    // Jan debt is 1000, only Jan settlement (500) should apply in Jan view.
    expect(result.month.partner1Balance).toBe(-500);
    expect(result.cumulative.partner1Balance).toBe(-500);
  });

  it('ignores income/joint in owed balance and keeps zero-sum with proportional split', () => {
    const monthExpenses: Expense[] = [
      {
        id: 1,
        description: 'P1 expense',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-03-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'P2 expense',
        amount: 200,
        category: 'Food',
        type: 'expense',
        date: '2026-03-02',
        paidBy: 'partner2',
      },
      {
        id: 3,
        description: 'Joint expense',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-03-03',
        paidBy: 'joint',
      },
      {
        id: 4,
        description: 'Income',
        amount: 500,
        category: 'Income',
        type: 'income',
        date: '2026-03-04',
        paidBy: 'partner1',
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 1,
        date: '2026-03-10',
        amount: 20,
        from: 'partner2',
        to: 'partner1',
        note: '',
      },
    ];

    const result = calculateBalanceScopes(
      monthExpenses,
      monthExpenses,
      settlements,
      2026,
      2,
      0.6
    );

    expect(result.month.partner1Paid).toBe(100);
    expect(result.month.partner2Paid).toBe(200);
    expect(result.month.totalSharedExpenses).toBe(300);
    expect(result.month.partner1Balance).toBe(-100);
    expect(result.month.partner2Balance).toBe(100);
    expect(result.month.partner1Balance + result.month.partner2Balance).toBeCloseTo(0, 8);
  });
});
