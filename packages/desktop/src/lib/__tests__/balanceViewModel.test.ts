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

  it('derives obligation fields and splits rows into open-to-settle vs needs-linking buckets', () => {
    const rent = makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2', date: '2026-04-01' });
    const groceries = makeExpense({
      id: 2,
      description: 'Groceries',
      amount: 100,
      paidBy: 'partner2',
      date: '2026-04-02',
    });
    const repairs = makeExpense({ id: 3, description: 'Repairs', amount: 100, paidBy: 'partner1', date: '2026-04-03' });

    const settlements: Settlement[] = [
      makeSettlement({
        id: 20,
        date: '2026-04-10',
        from: 'partner1',
        to: 'partner2',
        amount: 70,
        allocations: [{ expenseId: 1, amount: 20 }],
      }),
      makeSettlement({
        id: 21,
        date: '2026-04-11',
        from: 'partner2',
        to: 'partner1',
        amount: 50,
        allocations: [{ expenseId: 3, amount: 30 }],
      }),
    ];

    const model = buildBalanceViewModel({
      monthExpenses: [rent, groceries, repairs],
      expenses: [rent, groceries, repairs],
      settlements,
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    const rentRow = model.obligations.allRows.find(row => row.expenseId === 1)!;
    const groceriesRow = model.obligations.allRows.find(row => row.expenseId === 2)!;
    const repairsRow = model.obligations.allRows.find(row => row.expenseId === 3)!;
    const partner1ToPartner2Budget = Math.max(-model.activeScope.partner1Balance, 0);

    expect(rentRow.owed).toBeCloseTo(100, 8);
    expect(rentRow.linkedSettled).toBeCloseTo(20, 8);
    expect(rentRow.expenseRemainingUnlinked).toBeCloseTo(80, 8);
    expect(rentRow.actionableRemaining).toBeCloseTo(
      Math.min(rentRow.expenseRemainingUnlinked, partner1ToPartner2Budget),
      8
    );
    expect(rentRow.bucket).toBe('open_to_settle');
    expect(rentRow.status).toBe('partially_settled');

    expect(groceriesRow.owed).toBeCloseTo(50, 8);
    expect(groceriesRow.linkedSettled).toBeCloseTo(0, 8);
    expect(groceriesRow.expenseRemainingUnlinked).toBeCloseTo(50, 8);
    expect(groceriesRow.actionableRemaining).toBeCloseTo(0, 8);
    expect(groceriesRow.bucket).toBe('needs_linking');
    expect(groceriesRow.status).toBe('unlinked');

    expect(repairsRow.owed).toBeCloseTo(50, 8);
    expect(repairsRow.linkedSettled).toBeCloseTo(30, 8);
    expect(repairsRow.expenseRemainingUnlinked).toBeCloseTo(20, 8);
    expect(repairsRow.actionableRemaining).toBeCloseTo(0, 8);
    expect(repairsRow.bucket).toBe('needs_linking');
    expect(repairsRow.status).toBe('partially_settled');

    expect(model.obligations.openToSettleRows.map(row => row.expenseId)).toEqual([1]);
    expect(model.obligations.needsLinkingRows.map(row => row.expenseId)).toEqual([3, 2]);
    expect(model.obligations.showBalancedNoActionState).toBe(false);
    expect(model.obligations.showTraceabilityOnlyNote).toBe(false);
  });

  it('moves unlinked rows to needs-linking when scope is balanced', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
    const settlement = makeSettlement({
      id: 22,
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
    const row = model.obligations.allRows[0];

    expect(model.topSummary.isBalanced).toBe(true);
    expect(row.expenseRemainingUnlinked).toBeCloseTo(50, 8);
    expect(row.actionableRemaining).toBeCloseTo(0, 8);
    expect(row.bucket).toBe('needs_linking');
    expect(model.obligations.openToSettleRows).toHaveLength(0);
    expect(model.obligations.needsLinkingRows).toHaveLength(1);
    expect(model.obligations.showBalancedNoActionState).toBe(false);
    expect(model.obligations.showTraceabilityOnlyNote).toBe(true);
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

  it('allocates actionable remaining oldest-first within a direction', () => {
    const olderExpense = makeExpense({ id: 1, description: 'Older', amount: 40, paidBy: 'partner2', date: '2026-04-01' });
    const newerExpense = makeExpense({ id: 2, description: 'Newer', amount: 60, paidBy: 'partner2', date: '2026-04-02' });
    const balancingSettlement = makeSettlement({
      id: 23,
      date: '2026-04-05',
      amount: 35,
      from: 'partner1',
      to: 'partner2',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [olderExpense, newerExpense],
      expenses: [olderExpense, newerExpense],
      settlements: [balancingSettlement],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const olderRow = model.obligations.allRows.find(row => row.expenseId === 1)!;
    const newerRow = model.obligations.allRows.find(row => row.expenseId === 2)!;

    expect(olderRow.expenseRemainingUnlinked).toBeCloseTo(20, 8);
    expect(newerRow.expenseRemainingUnlinked).toBeCloseTo(30, 8);
    expect(olderRow.actionableRemaining).toBeCloseTo(15, 8);
    expect(newerRow.actionableRemaining).toBeCloseTo(0, 8);
    expect(model.obligations.openToSettleRows.map(row => row.expenseId)).toEqual([1]);
    expect(model.obligations.needsLinkingRows.map(row => row.expenseId)).toEqual([2]);
  });

  it('keeps opposite reimbursement directions on separate directional budgets', () => {
    const paidByPartner1 = makeExpense({
      id: 1,
      description: 'Partner1 paid',
      amount: 200,
      paidBy: 'partner1',
      date: '2026-04-01',
    });
    const paidByPartner2 = makeExpense({
      id: 2,
      description: 'Partner2 paid',
      amount: 100,
      paidBy: 'partner2',
      date: '2026-04-02',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [paidByPartner1, paidByPartner2],
      expenses: [paidByPartner1, paidByPartner2],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const partner2OwesRow = model.obligations.allRows.find(row => row.expenseId === 1)!;
    const partner1OwesRow = model.obligations.allRows.find(row => row.expenseId === 2)!;

    expect(model.activeScope.partner1Balance).toBeGreaterThan(0);
    expect(partner2OwesRow.actionableRemaining).toBeCloseTo(50, 8);
    expect(partner2OwesRow.bucket).toBe('open_to_settle');
    expect(partner1OwesRow.actionableRemaining).toBeCloseTo(0, 8);
    expect(partner1OwesRow.bucket).toBe('needs_linking');
  });

  it('filters row buckets using epsilon and shows balanced-no-action state when all rows are below threshold', () => {
    const tinyExpense = makeExpense({
      id: 1,
      description: 'Tiny',
      amount: 0.01,
      paidBy: 'partner2',
      date: '2026-04-10',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [tinyExpense],
      expenses: [tinyExpense],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });
    const row = model.obligations.allRows[0];

    expect(row.expenseRemainingUnlinked).toBeLessThan(0.01);
    expect(row.bucket).toBeNull();
    expect(model.obligations.openToSettleRows).toHaveLength(0);
    expect(model.obligations.needsLinkingRows).toHaveLength(0);
    expect(model.obligations.showBalancedNoActionState).toBe(true);
    expect(model.obligations.showNoRowsNeedsReviewState).toBe(false);
  });

  it('does not show balanced-no-action state when sub-epsilon rows aggregate to non-zero balance', () => {
    const tinyExpenseA = makeExpense({
      id: 1,
      description: 'Tiny A',
      amount: 0.01,
      paidBy: 'partner2',
      date: '2026-04-10',
    });
    const tinyExpenseB = makeExpense({
      id: 2,
      description: 'Tiny B',
      amount: 0.01,
      paidBy: 'partner2',
      date: '2026-04-11',
    });

    const model = buildBalanceViewModel({
      monthExpenses: [tinyExpenseA, tinyExpenseB],
      expenses: [tinyExpenseA, tinyExpenseB],
      settlements: [],
      selectedYear: 2026,
      selectedMonth: 3,
      splitRatio: 0.5,
      balanceMode: 'month',
    });

    expect(model.topSummary.isBalanced).toBe(false);
    expect(Math.abs(model.topSummary.amount)).toBeCloseTo(0.01, 8);
    expect(model.obligations.openToSettleRows).toHaveLength(0);
    expect(model.obligations.needsLinkingRows).toHaveLength(0);
    expect(model.obligations.showBalancedNoActionState).toBe(false);
    expect(model.obligations.showNoRowsNeedsReviewState).toBe(true);
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
    expect(row.expenseRemainingUnlinked).toBeCloseTo(0, 8);
    expect(row.expenseRemainingUnlinked).toBeGreaterThanOrEqual(0);
  });

  it('prevents malformed over-allocation from over-crediting obligations', () => {
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
    expect(rowA.expenseRemainingUnlinked).toBeCloseTo(50, 8);
    expect(rowB.expenseRemainingUnlinked).toBeCloseTo(40, 8);
    expect(model.obligations.openToSettleRows.map(row => row.expenseId)).toEqual([1, 2]);
  });
});
