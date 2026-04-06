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

  it('applies a future-dated linked settlement to the linked expense month', () => {
    const februaryExpense: Expense = {
      id: 1,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlements: Settlement[] = [
      {
        id: 10,
        date: '2026-03-05',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        note: 'Paid in March for February rent',
        allocations: [{ expenseId: 1, amount: 50 }],
      },
    ];

    const result = calculateBalanceScopes(
      [februaryExpense],
      [februaryExpense],
      settlements,
      2026,
      1,
      0.5
    );

    // Month-only should include linked settlement for Feb, even though payment date is in Mar.
    expect(result.month.partner1Balance).toBeCloseTo(0, 8);
    expect(result.month.partner2Balance).toBeCloseTo(0, 8);
    expect(result.settlementsAffectingMonth).toHaveLength(1);

    // Cumulative through Feb should include linked settlement amount for Feb expense,
    // even though payment date is in March.
    expect(result.cumulative.partner1Balance).toBeCloseTo(0, 8);
    expect(result.cumulative.partner2Balance).toBeCloseTo(0, 8);
    expect(result.settlementsThroughMonth).toHaveLength(0);
    expect(result.settlementsAffectingThroughMonth).toHaveLength(1);
  });

  it('keeps future payment-month remainder out of cumulative scope until payment month', () => {
    const februaryExpense: Expense = {
      id: 1,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlements: Settlement[] = [
      {
        id: 11,
        date: '2026-03-05',
        amount: 70,
        from: 'partner1',
        to: 'partner2',
        note: 'Partial link to Feb',
        allocations: [{ expenseId: 1, amount: 50 }],
      },
    ];

    const throughFebruary = calculateBalanceScopes(
      [februaryExpense],
      [februaryExpense],
      settlements,
      2026,
      1,
      0.5
    );
    expect(throughFebruary.cumulative.partner1Balance).toBeCloseTo(0, 8);

    const throughMarch = calculateBalanceScopes(
      [],
      [februaryExpense],
      settlements,
      2026,
      2,
      0.5
    );
    // Feb obligation is already settled; remainder cannot flip direction when there is no open March debt.
    expect(throughMarch.cumulative.partner1Balance).toBeCloseTo(0, 8);
    expect(throughMarch.cumulative.partner2Balance).toBeCloseTo(0, 8);
  });

  it('applies specific-month remainder only to the chosen month and caps by open debt', () => {
    const januaryExpense: Expense = {
      id: 1,
      description: 'Jan rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-10',
      paidBy: 'partner2',
    };
    const februaryExpense: Expense = {
      id: 2,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlement: Settlement = {
      id: 12,
      date: '2026-03-05',
      amount: 70,
      from: 'partner1',
      to: 'partner2',
      note: '',
      allocations: [{ expenseId: 2, amount: 50 }],
      remainderMode: 'specific_month',
      remainderMonth: '2026-01',
    };

    const januaryResult = calculateBalanceScopes(
      [januaryExpense],
      [januaryExpense],
      [settlement],
      2026,
      0,
      0.5
    );
    // Jan debt is 50; specific-month remainder contributes only 20 there.
    expect(januaryResult.month.partner1Balance).toBeCloseTo(-30, 8);

    const februaryResult = calculateBalanceScopes(
      [februaryExpense],
      [januaryExpense, februaryExpense],
      [settlement],
      2026,
      1,
      0.5
    );
    expect(februaryResult.month.partner1Balance).toBeCloseTo(0, 8);
  });

  it('applies oldest-open-debt remainder to earliest matching debt month', () => {
    const januaryExpense: Expense = {
      id: 1,
      description: 'Jan rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-10',
      paidBy: 'partner2',
    };
    const februaryExpense: Expense = {
      id: 2,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlement: Settlement = {
      id: 13,
      date: '2026-03-05',
      amount: 110,
      from: 'partner1',
      to: 'partner2',
      note: '',
      allocations: [{ expenseId: 2, amount: 50 }],
      remainderMode: 'oldest_open_debt',
    };

    const januaryResult = calculateBalanceScopes(
      [januaryExpense],
      [januaryExpense],
      [settlement],
      2026,
      0,
      0.5
    );
    // Oldest debt (Jan 50) is fully cleared first.
    expect(januaryResult.month.partner1Balance).toBeCloseTo(0, 8);

    const februaryResult = calculateBalanceScopes(
      [februaryExpense],
      [januaryExpense, februaryExpense],
      [settlement],
      2026,
      1,
      0.5
    );
    // Feb linked 50 clears Feb debt; leftover 10 is unapplied (cannot flip debt).
    expect(februaryResult.month.partner1Balance).toBeCloseTo(0, 8);
    expect(februaryResult.cumulative.partner1Balance).toBeCloseTo(0, 8);
  });

  it('does not apply payment-month remainder when same-direction debt is already zero', () => {
    const marchExpense: Expense = {
      id: 30,
      description: 'March groceries',
      amount: 100,
      category: 'Food',
      type: 'expense',
      date: '2026-03-10',
      paidBy: 'partner1',
    };

    const settlement: Settlement = {
      id: 31,
      date: '2026-03-20',
      amount: 40,
      from: 'partner1',
      to: 'partner2',
      note: 'Should remain unapplied',
      remainderMode: 'payment_month',
    };

    const result = calculateBalanceScopes(
      [marchExpense],
      [marchExpense],
      [settlement],
      2026,
      2,
      0.5
    );

    // In March, partner2 owes partner1 (partner1Balance positive). A p1->p2 remainder must not flip direction.
    expect(result.month.partner1Balance).toBeCloseTo(50, 8);
    expect(result.cumulative.partner1Balance).toBeCloseTo(50, 8);
    expect(result.settlementsAffectingMonth).toHaveLength(0);
  });

  it('falls back to payment month when specific-month value is invalid', () => {
    const marchExpense: Expense = {
      id: 40,
      description: 'March rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-03-10',
      paidBy: 'partner2',
    };

    const settlement: Settlement = {
      id: 41,
      date: '2026-03-15',
      amount: 20,
      from: 'partner1',
      to: 'partner2',
      note: '',
      remainderMode: 'specific_month',
      remainderMonth: 'invalid',
    };

    const result = calculateBalanceScopes(
      [marchExpense],
      [marchExpense],
      [settlement],
      2026,
      2,
      0.5
    );

    // Fallback applies in payment month (March), reducing debt from 50 to 30.
    expect(result.month.partner1Balance).toBeCloseTo(-30, 8);
    expect(result.settlementsAffectingMonth).toHaveLength(1);
  });

  it('keeps linked settlement off payment month when fully allocated to a prior expense month', () => {
    const februaryExpense: Expense = {
      id: 1,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlements: Settlement[] = [
      {
        id: 10,
        date: '2026-03-05',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        note: '',
        allocations: [{ expenseId: 1, amount: 50 }],
      },
    ];

    const result = calculateBalanceScopes(
      [],
      [februaryExpense],
      settlements,
      2026,
      2,
      0.5
    );

    expect(result.settlementsAffectingMonth).toHaveLength(0);
    expect(result.month.partner1Balance).toBe(0);
    expect(result.month.partner2Balance).toBe(0);
  });

  it('supports one settlement linked to multiple expense months', () => {
    const januaryExpense: Expense = {
      id: 1,
      description: 'Jan rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-10',
      paidBy: 'partner2',
    };
    const februaryExpense: Expense = {
      id: 2,
      description: 'Feb utilities',
      amount: 100,
      category: 'Utilities',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };
    const marchExpense: Expense = {
      id: 3,
      description: 'Mar groceries',
      amount: 80,
      category: 'Food',
      type: 'expense',
      date: '2026-03-10',
      paidBy: 'partner2',
    };

    const settlement: Settlement = {
      id: 20,
      date: '2026-03-20',
      amount: 120,
      from: 'partner1',
      to: 'partner2',
      note: '',
      allocations: [
        { expenseId: 1, amount: 50 },
        { expenseId: 2, amount: 30 },
      ],
    };

    const januaryResult = calculateBalanceScopes(
      [januaryExpense],
      [januaryExpense],
      [settlement],
      2026,
      0,
      0.5
    );
    expect(januaryResult.month.partner1Balance).toBeCloseTo(0, 8);

    const februaryResult = calculateBalanceScopes(
      [februaryExpense],
      [januaryExpense, februaryExpense],
      [settlement],
      2026,
      1,
      0.5
    );
    expect(februaryResult.month.partner1Balance).toBeCloseTo(-20, 8);

    const marchResult = calculateBalanceScopes(
      [marchExpense],
      [januaryExpense, februaryExpense, marchExpense],
      [settlement],
      2026,
      2,
      0.5
    );
    // Remainder 40 applies in payment month (March), clearing March fair share 40.
    expect(marchResult.month.partner1Balance).toBeCloseTo(0, 8);
  });

  it('caps linked allocations to settlement amount when links exceed transfer total', () => {
    const januaryExpense: Expense = {
      id: 1,
      description: 'Jan rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-01-10',
      paidBy: 'partner2',
    };
    const februaryExpense: Expense = {
      id: 2,
      description: 'Feb rent',
      amount: 100,
      category: 'Housing',
      type: 'expense',
      date: '2026-02-10',
      paidBy: 'partner2',
    };

    const settlement: Settlement = {
      id: 21,
      date: '2026-03-10',
      amount: 60,
      from: 'partner1',
      to: 'partner2',
      note: '',
      allocations: [
        { expenseId: 1, amount: 50 },
        { expenseId: 2, amount: 50 }, // only 10 should remain for this allocation
      ],
    };

    const januaryResult = calculateBalanceScopes(
      [januaryExpense],
      [januaryExpense],
      [settlement],
      2026,
      0,
      0.5
    );
    expect(januaryResult.month.partner1Balance).toBeCloseTo(0, 8);

    const februaryResult = calculateBalanceScopes(
      [februaryExpense],
      [januaryExpense, februaryExpense],
      [settlement],
      2026,
      1,
      0.5
    );
    expect(februaryResult.month.partner1Balance).toBeCloseTo(-40, 8);
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
    // Settlement direction (partner2 -> partner1) is capped because partner2 has no open debt here.
    expect(result.month.partner1Balance).toBe(-80);
    expect(result.month.partner2Balance).toBe(80);
    expect(result.month.partner1Balance + result.month.partner2Balance).toBeCloseTo(0, 8);
  });

  it('tracks scoped linked and unallocated applied amounts for partially allocated settlements', () => {
    const monthExpenses: Expense[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 200,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner2',
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 2,
        date: '2026-01-15',
        amount: 70,
        from: 'partner1',
        to: 'partner2',
        allocations: [{ expenseId: 1, amount: 50 }],
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

    expect(result.settlementsAffectingMonth).toHaveLength(1);
    expect(result.settlementsAffectingMonth[0].linkedAppliedAmount).toBeCloseTo(50, 8);
    expect(result.settlementsAffectingMonth[0].unallocatedAppliedAmount).toBeCloseTo(20, 8);
    expect(result.settlementsAffectingMonth[0].allocationStatus).toBe('partially_allocated');
  });

  it('marks legacy settlements without allocations as unallocated in scope', () => {
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
        id: 3,
        date: '2026-01-15',
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        allocations: [],
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

    expect(result.settlementsAffectingMonth).toHaveLength(1);
    expect(result.settlementsAffectingMonth[0].linkedAppliedAmount).toBeCloseTo(0, 8);
    expect(result.settlementsAffectingMonth[0].unallocatedAppliedAmount).toBeCloseTo(50, 8);
    expect(result.settlementsAffectingMonth[0].allocationStatus).toBe('unallocated');
  });
});
