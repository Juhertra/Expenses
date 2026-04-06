import { describe, expect, it } from 'vitest';
import type { Expense, Settlement } from '@expenses/shared/types';
import {
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
