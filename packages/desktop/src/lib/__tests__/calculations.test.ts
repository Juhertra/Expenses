import {
  calculateTotals,
  calculateBalance,
  calculateCategoryTotals,
  calculateInsights,
  getFrequentExpenses,
} from '@expenses/shared/calculations';
import type { Expense, HouseholdSettings, Settlement } from '@expenses/shared/types';

describe('calculateTotals', () => {
  it('should calculate totals correctly for mixed transactions', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Expense 1',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Income 1',
        amount: 500,
        category: 'Other',
        type: 'income',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 3,
        description: 'Expense 2',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner2',
      },
    ];

    const result = calculateTotals(expenses);

    expect(result.totalIncome).toBe(500);
    expect(result.totalExpense).toBe(150);
    expect(result.partner1Income).toBe(500);
    expect(result.partner1Paid).toBe(100);
    expect(result.partner2Paid).toBe(50);
  });
});

describe('calculateBalance', () => {
  it('should split expenses equally in equal mode', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Expense 1',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Expense 2',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner2',
      },
    ];

    const settings: HouseholdSettings = {
      currencyCode: 'USD',
      currencySymbol: '$',
      splitMode: 'equal',
      partner1Ratio: 0.5,
      budgets: {},
      normalizationRules: {},
      categories: {},
    };

    const result = calculateBalance(expenses, settings, []);

    // Partner1 paid 100, should pay 75 -> balance +25
    expect(result.partner1Balance).toBe(25);
    // Partner2 paid 50, should pay 75 -> balance -25
    expect(result.partner2Balance).toBe(-25);
    expect(result.totalSharedExpenses).toBe(150);
    expect(result.partner1FairShare).toBe(75);
    expect(result.partner2FairShare).toBe(75);
  });

  it('should handle proportional split correctly', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Expense 1',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
    ];

    const settings: HouseholdSettings = {
      currencyCode: 'USD',
      currencySymbol: '$',
      splitMode: 'proportional',
      partner1Ratio: 0.6,
      budgets: {},
      normalizationRules: {},
      categories: {},
    };

    const result = calculateBalance(expenses, settings, []);

    // Partner1 paid 100, should pay 60 -> balance +40
    expect(result.partner1Balance).toBe(40);
    // Partner2 paid 0, should pay 40 -> balance -40
    expect(result.partner2Balance).toBe(-40);
  });

  it('should exclude joint expenses from balance calculation', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Personal Expense',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Joint Expense',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'joint',
      },
    ];

    const settings: HouseholdSettings = {
      currencyCode: 'USD',
      currencySymbol: '$',
      splitMode: 'equal',
      partner1Ratio: 0.5,
      budgets: {},
      normalizationRules: {},
      categories: {},
    };

    const result = calculateBalance(expenses, settings, []);

    // Joint expenses don't affect balance
    expect(result.totalSharedExpenses).toBe(100);
    expect(result.partner1Balance).toBe(50); // Paid 100, should pay 50
    expect(result.partner2Balance).toBe(-50); // Paid 0, should pay 50
  });

  it('should apply settlements by moving payer up and receiver down', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Rent',
        amount: 7000,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Groceries',
        amount: 1000,
        category: 'Food',
        type: 'expense',
        date: '2026-01-02',
        paidBy: 'partner2',
      },
    ];

    const settings: HouseholdSettings = {
      currencyCode: 'USD',
      currencySymbol: '$',
      splitMode: 'equal',
      partner1Ratio: 0.5,
      budgets: {},
      normalizationRules: {},
      categories: {},
    };

    const settlements: Settlement[] = [
      {
        id: 1,
        date: '2026-01-03',
        amount: 3500,
        from: 'partner2',
        to: 'partner1',
        note: 'Rent split',
      },
    ];

    const result = calculateBalance(expenses, settings, settlements);

    // After settlement, partner1 should owe partner2 500.
    expect(result.partner1Balance).toBe(-500);
    expect(result.partner2Balance).toBe(500);
  });
});

describe('calculateCategoryTotals', () => {
  it('should aggregate expenses by category', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Food 1',
        amount: 100,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Food 2',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner2',
      },
      {
        id: 3,
        description: 'Housing 1',
        amount: 200,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
    ];

    const totals = calculateCategoryTotals(expenses);

    expect(totals.Food).toBe(150);
    expect(totals.Housing).toBe(200);
  });

  it('should ignore income in category totals', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Income',
        amount: 100,
        category: 'Other',
        type: 'income',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Expense',
        amount: 50,
        category: 'Other',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
    ];

    const totals = calculateCategoryTotals(expenses);

    expect(totals.Other).toBe(50);
  });
});

describe('calculateInsights', () => {
  it('should calculate insights correctly', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Largest',
        amount: 200,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Small',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: '2026-01-02',
        paidBy: 'partner1',
      },
      {
        id: 3,
        description: 'Housing',
        amount: 100,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-03',
        paidBy: 'partner1',
      },
    ];

    const categoryTotals = { Food: 250, Housing: 100 };
    const insights = calculateInsights(expenses, categoryTotals, 350);

    expect(insights.largest.amount).toBe(200);
    expect(insights.largest.description).toBe('Largest');
    expect(insights.daysWithSpending).toBe(3);
    expect(insights.avgDaily).toBeCloseTo(116.67, 1);
    expect(insights.topCategory).toBe('Food');
  });
});

describe('getFrequentExpenses', () => {
  it('should return most frequent expenses', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'Coffee',
        amount: 5,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'Coffee',
        amount: 5,
        category: 'Food',
        type: 'expense',
        date: '2026-01-02',
        paidBy: 'partner1',
      },
      {
        id: 3,
        description: 'Coffee',
        amount: 5,
        category: 'Food',
        type: 'expense',
        date: '2026-01-03',
        paidBy: 'partner1',
      },
      {
        id: 4,
        description: 'Lunch',
        amount: 15,
        category: 'Food',
        type: 'expense',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
    ];

    const frequent = getFrequentExpenses(expenses, 2);

    expect(frequent).toHaveLength(2);
    expect(frequent[0].description).toBe('Coffee');
    expect(frequent[0].count).toBe(3);
    expect(frequent[1].description).toBe('Lunch');
    expect(frequent[1].count).toBe(1);
  });
});

