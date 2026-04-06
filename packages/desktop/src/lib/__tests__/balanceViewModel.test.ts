import { describe, expect, it } from 'vitest';
import type { Expense, Settlement } from '@expenses/shared/types';
import { buildBalanceViewModel } from '../balanceViewModel';

function makeExpense(overrides: Partial<Expense> & { id: number }): Expense {
  const { id, ...rest } = overrides;
  return {
    id,
    description: 'Expense',
    amount: 100,
    category: 'Housing',
    type: 'expense',
    date: '2026-04-10',
    paidBy: 'partner2',
    ...rest,
  };
}

function makeSettlement(overrides: Partial<Settlement> & { id: number }): Settlement {
  const { id, ...rest } = overrides;
  return {
    id,
    date: '2026-04-20',
    amount: 10,
    from: 'partner1',
    to: 'partner2',
    ...rest,
  };
}

describe('buildBalanceViewModel', () => {
  it('returns different month vs cumulative top summary values', () => {
    const aprilExpense = makeExpense({ id: 1, amount: 100, date: '2026-04-10', paidBy: 'partner2' });
    const febExpense = makeExpense({ id: 2, amount: 60, date: '2026-02-10', paidBy: 'partner1' });
    const settlements: Settlement[] = [
      makeSettlement({ id: 11, amount: 30, from: 'partner1', to: 'partner2', date: '2026-04-20' }),
    ];

    const monthModel = buildBalanceViewModel({
      monthExpenses: [aprilExpense],
      expenses: [febExpense, aprilExpense],
      settlements,
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const cumulativeModel = buildBalanceViewModel({
      monthExpenses: [aprilExpense],
      expenses: [febExpense, aprilExpense],
      settlements,
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'cumulative',
    });

    expect(monthModel.topSummary.amount).toBeCloseTo(20, 8);
    expect(monthModel.topSummary.from).toBe('partner1');
    expect(monthModel.topSummary.to).toBe('partner2');

    expect(cumulativeModel.topSummary.amount).toBeCloseTo(10, 8);
    expect(cumulativeModel.topSummary.from).toBe('partner2');
    expect(cumulativeModel.topSummary.to).toBe('partner1');
  });

  it('uses balanced threshold for UI state', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 12,
      amount: 99.995,
      from: 'partner1',
      to: 'partner2',
      date: '2026-04-12',
      allocations: [{ expenseId: 1, amount: 50 }],
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.topSummary.isBalanced).toBe(true);
    expect(Math.abs(model.topSummary.partner1Balance)).toBeLessThan(0.01);
    expect(Math.abs(model.topSummary.partner2Balance)).toBeLessThan(0.01);
  });

  it('computes cash flow and fair split result values', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 13,
      amount: 30,
      from: 'partner1',
      to: 'partner2',
      date: '2026-04-12',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.cashFlow.partner1).toBeCloseTo(30, 8);
    expect(model.cashFlow.partner2).toBeCloseTo(70, 8);
    expect(model.fairSplitResult.partner1).toBeCloseTo(-50, 8);
    expect(model.fairSplitResult.partner2).toBeCloseTo(50, 8);
  });

  it('applies explanation equation final = expense delta + paid settlements - received settlements', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 14,
      amount: 30,
      from: 'partner1',
      to: 'partner2',
      date: '2026-04-12',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    const p1 = model.explanation.partner1;
    const p2 = model.explanation.partner2;
    expect(p1.finalBalance).toBeCloseTo(p1.expenseDelta + p1.settlementsPaid - p1.settlementsReceived, 8);
    expect(p2.finalBalance).toBeCloseTo(p2.expenseDelta + p2.settlementsPaid - p2.settlementsReceived, 8);
  });

  it('uses reconciliation warning predicate abs(netMismatch) >= 0.01', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 15,
      amount: 99.8,
      from: 'partner1',
      to: 'partner2',
      date: '2026-04-12',
      allocations: [{ expenseId: 1, amount: 50 }],
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.reconciliation.showWarning).toBe(
      Math.abs(model.reconciliation.netMismatch) >= 0.01
    );
  });

  it('keeps balances symmetric for clean scenarios', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 16,
      amount: 30,
      from: 'partner1',
      to: 'partner2',
      date: '2026-04-12',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.topSummary.partner1Balance + model.topSummary.partner2Balance).toBeCloseTo(0, 8);
  });

  it('derives obligation owed/linked/remaining and status transitions', () => {
    const rent = makeExpense({ id: 1, description: 'Rent', amount: 700, paidBy: 'partner2', date: '2026-03-05' });
    const food = makeExpense({ id: 2, description: 'Food', amount: 100, paidBy: 'partner1', date: '2026-03-07' });
    const electric = makeExpense({ id: 3, description: 'Electric', amount: 40, paidBy: 'partner2', date: '2026-03-08' });

    const settlements: Settlement[] = [
      makeSettlement({
        id: 20,
        date: '2026-04-10',
        from: 'partner1',
        to: 'partner2',
        amount: 200,
        allocations: [{ expenseId: 1, amount: 200 }],
      }),
      makeSettlement({
        id: 21,
        date: '2026-04-11',
        from: 'partner1',
        to: 'partner2',
        amount: 100,
      }),
      makeSettlement({
        id: 22,
        date: '2026-04-12',
        from: 'partner1',
        to: 'partner2',
        amount: 20,
        allocations: [{ expenseId: 3, amount: 20 }],
      }),
    ];

    const model = buildBalanceViewModel({
      monthExpenses: [rent, food, electric],
      expenses: [rent, food, electric],
      settlements,
      selectedYear: 2026,
      selectedMonth: 2,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    const all = model.obligations.allRows;
    const rentRow = all.find(row => row.expenseId === 1)!;
    const foodRow = all.find(row => row.expenseId === 2)!;
    const electricRow = all.find(row => row.expenseId === 3)!;

    expect(rentRow.owed).toBeCloseTo(350, 8);
    expect(rentRow.linkedSettled).toBeCloseTo(200, 8);
    expect(rentRow.remaining).toBeCloseTo(150, 8);
    expect(rentRow.status).toBe('partially_settled');

    expect(foodRow.owed).toBeCloseTo(50, 8);
    expect(foodRow.linkedSettled).toBeCloseTo(0, 8);
    expect(foodRow.remaining).toBeCloseTo(50, 8);
    expect(foodRow.status).toBe('unlinked');

    expect(electricRow.owed).toBeCloseTo(20, 8);
    expect(electricRow.linkedSettled).toBeCloseTo(20, 8);
    expect(electricRow.remaining).toBeCloseTo(0, 8);
    expect(electricRow.status).toBe('settled');

    // Outstanding obligations section should omit fully settled rows.
    expect(model.obligations.openRows.some(row => row.expenseId === 3)).toBe(false);
  });

  it('filters obligation row universe by month vs cumulative scope', () => {
    const marchExpense = makeExpense({ id: 1, description: 'March rent', date: '2026-03-10', amount: 200, paidBy: 'partner2' });
    const aprilExpense = makeExpense({ id: 2, description: 'April rent', date: '2026-04-10', amount: 100, paidBy: 'partner2' });

    const monthModel = buildBalanceViewModel({
      monthExpenses: [aprilExpense],
      expenses: [marchExpense, aprilExpense],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const cumulativeModel = buildBalanceViewModel({
      monthExpenses: [aprilExpense],
      expenses: [marchExpense, aprilExpense],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'cumulative',
    });

    expect(monthModel.obligations.allRows).toHaveLength(1);
    expect(monthModel.obligations.allRows[0].expenseId).toBe(2);

    expect(cumulativeModel.obligations.allRows).toHaveLength(2);
    expect(cumulativeModel.obligations.allRows.map(row => row.expenseId)).toEqual([2, 1]);
  });

  it('caps linked settled at owed and never returns negative remaining', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
    const settlement = makeSettlement({
      id: 23,
      from: 'partner1',
      to: 'partner2',
      amount: 500,
      allocations: [{ expenseId: 1, amount: 500 }],
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const row = model.obligations.allRows[0];

    expect(row.owed).toBeCloseTo(50, 8);
    expect(row.linkedSettled).toBeCloseTo(50, 8);
    expect(row.remaining).toBeCloseTo(0, 8);
    expect(row.remaining).toBeGreaterThanOrEqual(0);
  });

  it('caps linked obligation allocations by settlement amount', () => {
    const expenseA = makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2', date: '2026-04-10' });
    const expenseB = makeExpense({ id: 2, description: 'Bills', amount: 100, paidBy: 'partner2', date: '2026-04-12' });
    const settlement = makeSettlement({
      id: 24,
      date: '2026-04-15',
      amount: 60,
      from: 'partner1',
      to: 'partner2',
      allocations: [
        { expenseId: 1, amount: 50 },
        { expenseId: 2, amount: 50 },
      ],
    });

    const model = buildBalanceViewModel({
      monthExpenses: [expenseA, expenseB],
      expenses: [expenseA, expenseB],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    const rowA = model.obligations.allRows.find(row => row.expenseId === 1)!;
    const rowB = model.obligations.allRows.find(row => row.expenseId === 2)!;

    // Allocation semantics consume settlement amount in-order: 50 to expenseA, 10 to expenseB.
    expect(rowA.linkedSettled).toBeCloseTo(50, 8);
    expect(rowB.linkedSettled).toBeCloseTo(10, 8);
    expect(rowA.remaining).toBeCloseTo(50, 8);
    expect(rowB.remaining).toBeCloseTo(40, 8);
  });
});
