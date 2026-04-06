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

  it('surfaces fully unallocated legacy settlements in unallocatedSettlements', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 20,
      date: '2026-04-11',
      amount: 50,
      from: 'partner1',
      to: 'partner2',
      allocations: [],
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

    expect(model.displayedSettlements).toHaveLength(1);
    expect(model.displayedSettlements[0].allocationStatus).toBe('unallocated');
    expect(model.displayedSettlements[0].linkedAppliedAmount).toBeCloseTo(0, 8);
    expect(model.displayedSettlements[0].unallocatedAppliedAmount).toBeCloseTo(50, 8);
    expect(model.unallocatedSettlements).toHaveLength(1);
  });

  it('surfaces partially allocated settlements with scoped linked and unallocated amounts', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 21,
      date: '2026-04-11',
      amount: 70,
      from: 'partner1',
      to: 'partner2',
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

    expect(model.displayedSettlements).toHaveLength(1);
    expect(model.displayedSettlements[0].allocationStatus).toBe('partially_allocated');
    expect(model.displayedSettlements[0].linkedAppliedAmount).toBeCloseTo(50, 8);
    expect(model.displayedSettlements[0].unallocatedAppliedAmount).toBeCloseTo(20, 8);
    expect(model.unallocatedSettlements).toHaveLength(1);
  });

  it('excludes fully allocated settlements from unallocatedSettlements', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 22,
      date: '2026-04-11',
      amount: 50,
      from: 'partner1',
      to: 'partner2',
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

    expect(model.displayedSettlements[0].allocationStatus).toBe('fully_allocated');
    expect(model.unallocatedSettlements).toHaveLength(0);
  });

  it('differs between month and cumulative settlement status when cumulative includes older unallocated settlements', () => {
    const febExpense = makeExpense({ id: 1, description: 'February rent', amount: 100, paidBy: 'partner2', date: '2026-02-10' });
    const aprilExpense = makeExpense({ id: 2, description: 'April rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
    const settlements: Settlement[] = [
      makeSettlement({ id: 30, date: '2026-02-11', amount: 50, from: 'partner1', to: 'partner2', allocations: [] }),
      makeSettlement({ id: 31, date: '2026-04-11', amount: 20, from: 'partner1', to: 'partner2', allocations: [] }),
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

    expect(monthModel.unallocatedSettlements.map(item => item.settlement.id)).toEqual([31]);
    expect(cumulativeModel.unallocatedSettlements.map(item => item.settlement.id).sort((a, b) => a - b)).toEqual([30, 31]);
  });

  it('keeps future-dated linked settlements visible on the linked expense month', () => {
    const febExpense = makeExpense({ id: 1, description: 'February rent', amount: 100, paidBy: 'partner2', date: '2026-02-10' });
    const settlement = makeSettlement({
      id: 40,
      date: '2026-03-05',
      amount: 50,
      from: 'partner1',
      to: 'partner2',
      allocations: [{ expenseId: 1, amount: 50 }],
    });

    const model = buildBalanceViewModel({
      monthExpenses: [febExpense],
      expenses: [febExpense],
      settlements: [settlement],
      selectedYear: 2026,
      selectedMonth: 1,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.displayedSettlements).toHaveLength(1);
    expect(model.displayedSettlements[0].linkedAppliedAmount).toBeCloseTo(50, 8);
    expect(model.displayedSettlements[0].unallocatedAppliedAmount).toBeCloseTo(0, 8);
    expect(model.displayedSettlements[0].allocationStatus).toBe('fully_allocated');
  });

  it('does not manufacture unallocated settlements from opposite-direction expenses alone', () => {
    const partner2Expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const partner1Expense = makeExpense({ id: 2, description: 'Groceries', amount: 100, paidBy: 'partner1', date: '2026-04-11' });

    const model = buildBalanceViewModel({
      monthExpenses: [partner2Expense, partner1Expense],
      expenses: [partner2Expense, partner1Expense],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.topSummary.isBalanced).toBe(true);
    expect(model.displayedSettlements).toHaveLength(0);
    expect(model.unallocatedSettlements).toHaveLength(0);
  });

  it('caps malformed over-allocation consistently in settlement display', () => {
    const expenseA = makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2', date: '2026-04-10' });
    const expenseB = makeExpense({ id: 2, description: 'Bills', amount: 100, paidBy: 'partner2', date: '2026-04-12' });
    const settlement = makeSettlement({
      id: 50,
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

    expect(model.displayedSettlements).toHaveLength(1);
    expect(model.displayedSettlements[0].linkedAppliedAmount).toBeCloseTo(60, 8);
    expect(model.displayedSettlements[0].unallocatedAppliedAmount).toBeCloseTo(0, 8);
    expect(model.displayedSettlements[0].linkedExpenseIds.sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
