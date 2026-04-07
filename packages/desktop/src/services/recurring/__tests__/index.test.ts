import { processRecurringTransactions } from '../../../../../shared/src/services/recurring/index';
import type { RecurringTransaction, Expense } from '@expenses/shared/types';

describe('processRecurringTransactions', () => {
  it('should create expense for unprocessed recurring transaction', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Monthly Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: undefined,
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 15); // January 15, 2026

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(true);
    expect(result.updatedExpenses).toHaveLength(1);
    expect(result.updatedExpenses[0].description).toBe('Monthly Rent');
    expect(result.updatedExpenses[0].amount).toBe(1500);
    expect(result.updatedExpenses[0].date).toBe('2026-01-01');
    expect(result.updatedExpenses[0].isAuto).toBe(true);
    expect(result.updatedExpenses[0].recurringId).toBe(1);
    expect(result.updatedRecurring[0].lastProcessed).toBeDefined();
  });

  it('should not process recurring transaction already processed this month', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Monthly Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: '2026-01-01T00:00:00.000Z',
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 15); // January 15, 2026

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(false);
    expect(result.updatedExpenses).toHaveLength(0);
  });

  it('should process recurring transaction from previous month', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Monthly Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: '2025-12-01T00:00:00.000Z',
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 15); // January 15, 2026

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(true);
    expect(result.updatedExpenses).toHaveLength(1);
    expect(result.updatedExpenses[0].date).toBe('2026-01-01');
  });

  it('should clamp recurring day to last day of month', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 31, // February only has 28/29 days
        lastProcessed: '2026-01-01T00:00:00.000Z',
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 1, 15); // February 15, 2026

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(true);
    expect(result.updatedExpenses).toHaveLength(1);
    expect(result.updatedExpenses[0].date).toBe('2026-02-28'); // Clamped to Feb 28
  });

  it('should handle multiple recurring transactions', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: '2025-12-01T00:00:00.000Z',
      },
      {
        id: 2,
        description: 'Utilities',
        amount: 200,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner2',
        recurringDay: 15,
        lastProcessed: '2025-12-15T00:00:00.000Z',
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 20); // January 20, 2026

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(true);
    expect(result.updatedExpenses).toHaveLength(2);
    expect(result.updatedExpenses[0].description).toBe('Rent');
    expect(result.updatedExpenses[1].description).toBe('Utilities');
  });

  it('should not mutate input arrays', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: undefined,
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 15);

    const originalRecurringLength = recurring.length;
    const originalExpensesLength = expenses.length;

    processRecurringTransactions(recurring, expenses, today);

    // Original arrays should not be modified
    expect(recurring).toHaveLength(originalRecurringLength);
    expect(expenses).toHaveLength(originalExpensesLength);
    expect(recurring[0].lastProcessed).toBeUndefined();
  });

  it('should handle income recurring transactions', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        description: 'Monthly Salary',
        amount: 5000,
        category: 'Income',
        type: 'income',
        paidBy: 'partner1',
        recurringDay: 1,
        lastProcessed: undefined,
      },
    ];
    const expenses: Expense[] = [];
    const today = new Date(2026, 0, 15);

    const result = processRecurringTransactions(recurring, expenses, today);

    expect(result.changed).toBe(true);
    expect(result.updatedExpenses).toHaveLength(1);
    expect(result.updatedExpenses[0].type).toBe('income');
    expect(result.updatedExpenses[0].amount).toBe(5000);
  });
});
