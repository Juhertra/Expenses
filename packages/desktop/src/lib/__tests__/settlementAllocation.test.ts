import { describe, expect, it } from 'vitest';
import type { Expense, Settlement } from '@expenses/shared/types';
import {
  getCappedSettlementAllocations,
  getCappedLinkedAmountsByExpenseId,
  getLinkableExpenseAvailabilities,
  getReimbursementDirectionForExpense,
} from '../settlementAllocation';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 1,
    description: 'Expense',
    amount: 100,
    category: 'Housing',
    type: 'expense',
    date: '2026-03-10',
    paidBy: 'partner2',
    ...overrides,
  };
}

describe('settlementAllocation', () => {
  it('returns reimbursement direction based on payer and split ratio', () => {
    const paidByPartner2 = makeExpense({ paidBy: 'partner2', amount: 7000 });
    const paidByPartner1 = makeExpense({ id: 2, paidBy: 'partner1', amount: 1000 });

    const p2Direction = getReimbursementDirectionForExpense(paidByPartner2, 0.5);
    const p1Direction = getReimbursementDirectionForExpense(paidByPartner1, 0.5);

    expect(p2Direction).toEqual({
      from: 'partner1',
      to: 'partner2',
      recommendedAmount: 3500,
    });
    expect(p1Direction).toEqual({
      from: 'partner2',
      to: 'partner1',
      recommendedAmount: 500,
    });
  });

  it('caps linked allocations by settlement amount using allocation order', () => {
    const settlements: Settlement[] = [
      {
        id: 30,
        date: '2026-03-15',
        amount: 60,
        from: 'partner1',
        to: 'partner2',
        allocations: [
          { expenseId: 1, amount: 50 },
          { expenseId: 2, amount: 50 },
        ],
      },
    ];

    const linked = getCappedLinkedAmountsByExpenseId(settlements);
    expect(linked.get(1)).toBeCloseTo(50, 8);
    expect(linked.get(2)).toBeCloseTo(10, 8);
  });

  it('returns capped settlement allocations for shared callers', () => {
    const settlement: Settlement = {
      id: 31,
      date: '2026-03-15',
      amount: 60,
      from: 'partner1',
      to: 'partner2',
      allocations: [
        { expenseId: 1, amount: 50 },
        { expenseId: 2, amount: 50 },
        { expenseId: 3, amount: -5 },
      ],
    };

    expect(getCappedSettlementAllocations(settlement)).toEqual([
      { expenseId: 1, amount: 50 },
      { expenseId: 2, amount: 10 },
    ]);
  });

  it('supports excluding a settlement and ignores invalid or non-positive values', () => {
    const settlements: Settlement[] = [
      {
        id: 40,
        date: '2026-03-15',
        amount: 25,
        from: 'partner1',
        to: 'partner2',
        allocations: [
          { expenseId: 1, amount: 10 },
          { expenseId: 2, amount: 15 },
          { expenseId: 3, amount: 5 },
        ],
      },
      {
        id: 41,
        date: '2026-03-16',
        amount: 20,
        from: 'partner1',
        to: 'partner2',
        allocations: [
          { expenseId: 4, amount: -5 },
          { expenseId: 4, amount: 10 },
          { expenseId: Number.NaN, amount: 10 },
          { expenseId: 5, amount: 0 },
        ],
      },
      {
        id: 42,
        date: '2026-03-17',
        amount: 0,
        from: 'partner1',
        to: 'partner2',
        allocations: [{ expenseId: 6, amount: 10 }],
      },
    ];

    const included = getCappedLinkedAmountsByExpenseId(settlements);
    expect(included.get(1)).toBeCloseTo(10, 8);
    expect(included.get(2)).toBeCloseTo(15, 8);
    expect(included.get(3)).toBeUndefined();
    expect(included.get(4)).toBeCloseTo(10, 8);
    expect(included.get(5)).toBeUndefined();
    expect(included.get(6)).toBeUndefined();

    const excluded = getCappedLinkedAmountsByExpenseId(settlements, 40);
    expect(excluded.get(1)).toBeUndefined();
    expect(excluded.get(2)).toBeUndefined();
    expect(excluded.get(4)).toBeCloseTo(10, 8);
  });

  it('marks fully linked expenses as unavailable and keeps partially linked expenses available', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 1, description: 'Rent', amount: 7000, paidBy: 'partner2' }),
      makeExpense({ id: 2, description: 'Utilities', amount: 1000, paidBy: 'partner2' }),
    ];
    const settlements: Settlement[] = [
      {
        id: 11,
        date: '2026-03-15',
        amount: 3900,
        from: 'partner1',
        to: 'partner2',
        allocations: [
          { expenseId: 1, amount: 3500 },
          { expenseId: 2, amount: 400 },
        ],
      },
    ];

    const availabilities = getLinkableExpenseAvailabilities(expenses, settlements, 0.5);
    const rent = availabilities.find(item => item.expense.id === 1)!;
    const utilities = availabilities.find(item => item.expense.id === 2)!;

    expect(rent.maxReimbursable).toBe(3500);
    expect(rent.remaining).toBe(0);
    expect(rent.isFullyLinked).toBe(true);

    expect(utilities.maxReimbursable).toBe(500);
    expect(utilities.alreadyAllocated).toBe(400);
    expect(utilities.remaining).toBe(100);
    expect(utilities.isFullyLinked).toBe(false);
  });

  it('uses the same capped allocation semantics for linkable expense availability', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 1, description: 'Rent', amount: 200, paidBy: 'partner2' }),
      makeExpense({ id: 2, description: 'Bills', amount: 100, paidBy: 'partner2' }),
    ];
    const settlements: Settlement[] = [
      {
        id: 50,
        date: '2026-03-20',
        amount: 60,
        from: 'partner1',
        to: 'partner2',
        allocations: [
          { expenseId: 1, amount: 50 },
          { expenseId: 2, amount: 50 },
        ],
      },
    ];

    const availabilities = getLinkableExpenseAvailabilities(expenses, settlements, 0.5);
    const rent = availabilities.find(item => item.expense.id === 1)!;
    const bills = availabilities.find(item => item.expense.id === 2)!;

    expect(rent.maxReimbursable).toBeCloseTo(100, 8);
    expect(rent.alreadyAllocated).toBeCloseTo(50, 8);
    expect(rent.remaining).toBeCloseTo(50, 8);

    expect(bills.maxReimbursable).toBeCloseTo(50, 8);
    expect(bills.alreadyAllocated).toBeCloseTo(10, 8);
    expect(bills.remaining).toBeCloseTo(40, 8);
  });

  it('ignores the edited settlement when computing remaining allocation', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 1, description: 'Rent', amount: 7000, paidBy: 'partner2' }),
    ];
    const settlements: Settlement[] = [
      {
        id: 20,
        date: '2026-03-01',
        amount: 3500,
        from: 'partner1',
        to: 'partner2',
        allocations: [{ expenseId: 1, amount: 3500 }],
      },
    ];

    const forNewSettlement = getLinkableExpenseAvailabilities(expenses, settlements, 0.5, null);
    const forEditingSameSettlement = getLinkableExpenseAvailabilities(expenses, settlements, 0.5, 20);

    expect(forNewSettlement[0].remaining).toBe(0);
    expect(forEditingSameSettlement[0].remaining).toBe(3500);
  });

  it('ignores non-personal expenses for linking', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 1, paidBy: 'joint' }),
      makeExpense({ id: 2, type: 'income', paidBy: 'partner1' }),
      makeExpense({ id: 3, paidBy: 'partner2' }),
    ];

    const availabilities = getLinkableExpenseAvailabilities(expenses, [], 0.5);
    expect(availabilities).toHaveLength(1);
    expect(availabilities[0].expense.id).toBe(3);
  });
});
