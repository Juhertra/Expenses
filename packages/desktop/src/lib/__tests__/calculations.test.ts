import {
  calculateTotals,
  calculateBalance,
  calculateCategoryTotals,
  calculateInsights,
  getFrequentExpenses,
  getExpensesThroughMonth,
  getSettlementsThroughMonth,
  isOnOrBeforeMonth,
  getAvailableYears,
  getChartData,
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

  it('should not include income in balance even when cumulative data spans multiple months', () => {
    // Regression test for the BalanceView cumulative-income bug:
    // BalanceView now receives getExpensesThroughMonth (all months), which includes
    // recurring income entries from every prior month. Income must never affect
    // what partners owe each other.
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'January rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'January rental income',
        amount: 2000,
        category: 'Income',
        type: 'income',
        date: '2026-01-01',
        paidBy: 'partner1',
      },
      {
        id: 3,
        description: 'February rental income',
        amount: 2000,
        category: 'Income',
        type: 'income',
        date: '2026-02-01',
        paidBy: 'partner1',
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

    // Simulate what BalanceView does: pass cumulative data through Feb
    const result = calculateBalance(
      getExpensesThroughMonth(expenses, 2026, 1),
      settings,
      getSettlementsThroughMonth([], 2026, 1)
    );

    // Only the $1500 expense matters — $4000 income across two months must not affect balances
    expect(result.totalSharedExpenses).toBe(1500);
    expect(result.partner1Balance).toBe(750);   // paid $1500, owed $750 → owed +$750
    expect(result.partner2Balance).toBe(-750);  // paid $0, owed $750 → owes -$750
  });

  it('should carry an unpaid balance into the next month until settled', () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: 'January rent',
        amount: 100,
        category: 'Housing',
        type: 'expense',
        date: '2026-01-10',
        paidBy: 'partner1',
      },
      {
        id: 2,
        description: 'February groceries',
        amount: 40,
        category: 'Food',
        type: 'expense',
        date: '2026-02-03',
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

    const januaryBalance = calculateBalance(
      getExpensesThroughMonth(expenses, 2026, 0),
      settings,
      getSettlementsThroughMonth([], 2026, 0)
    );

    const februaryBalance = calculateBalance(
      getExpensesThroughMonth(expenses, 2026, 1),
      settings,
      getSettlementsThroughMonth([], 2026, 1)
    );

    expect(januaryBalance.partner1Balance).toBe(50);
    expect(januaryBalance.partner2Balance).toBe(-50);
    expect(februaryBalance.partner1Balance).toBe(30);
    expect(februaryBalance.partner2Balance).toBe(-30);
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

describe('isOnOrBeforeMonth', () => {
  it('should return true for a date strictly before the target year', () => {
    expect(isOnOrBeforeMonth('2025-12-31', 2026, 0)).toBe(true);
  });

  it('should return true for a date in the same year but an earlier month', () => {
    expect(isOnOrBeforeMonth('2026-01-15', 2026, 2)).toBe(true); // Jan ≤ March
  });

  it('should return true for a date in exactly the target month', () => {
    expect(isOnOrBeforeMonth('2026-03-01', 2026, 2)).toBe(true); // March = March
  });

  it('should return false for a date in the same year but a later month', () => {
    expect(isOnOrBeforeMonth('2026-04-01', 2026, 2)).toBe(false); // April > March
  });

  it('should return false for a date in a future year', () => {
    expect(isOnOrBeforeMonth('2027-01-01', 2026, 11)).toBe(false);
  });
});

describe('getAvailableYears', () => {
  it('should return a 3-year window centred on the current year when given no expenses', () => {
    const currentYear = new Date().getFullYear();
    const years = getAvailableYears([]);
    expect(years).toEqual([currentYear - 1, currentYear, currentYear + 1]);
  });

  it('should include years from the data plus always current and next year', () => {
    const currentYear = new Date().getFullYear();
    const expenses: Expense[] = [
      { id: 1, description: 'Old rent', amount: 500, category: 'Housing', type: 'expense', date: '2020-06-01', paidBy: 'partner1' },
    ];
    const years = getAvailableYears(expenses);
    expect(years).toContain(2020);
    expect(years).toContain(currentYear);
    expect(years).toContain(currentYear + 1);
    expect(years).toEqual([...years].sort((a, b) => a - b)); // sorted ascending
  });

  it('should not duplicate years that appear multiple times in the data', () => {
    const expenses: Expense[] = [
      { id: 1, description: 'Jan', amount: 100, category: 'Food', type: 'expense', date: '2026-01-01', paidBy: 'partner1' },
      { id: 2, description: 'Feb', amount: 100, category: 'Food', type: 'expense', date: '2026-02-01', paidBy: 'partner1' },
      { id: 3, description: 'Mar', amount: 100, category: 'Food', type: 'expense', date: '2026-03-01', paidBy: 'partner1' },
    ];
    const years = getAvailableYears(expenses);
    const count2026 = years.filter(y => y === 2026).length;
    expect(count2026).toBe(1);
  });
});

describe('getChartData', () => {
  it('should return one entry per day in the given month', () => {
    const data = getChartData([], 2026, 1); // February 2026 = 28 days
    expect(data).toHaveLength(28);
    expect(data[0].day).toBe(1);
    expect(data[27].day).toBe(28);
  });

  it('should correctly bucket expense and income amounts by day', () => {
    const expenses: Expense[] = [
      { id: 1, description: 'Groceries', amount: 80, category: 'Food', type: 'expense', date: '2026-03-10', paidBy: 'partner1' },
      { id: 2, description: 'More food',  amount: 20, category: 'Food', type: 'expense', date: '2026-03-10', paidBy: 'partner2' },
      { id: 3, description: 'Rent income', amount: 500, category: 'Income', type: 'income', date: '2026-03-01', paidBy: 'partner1' },
    ];
    const data = getChartData(expenses, 2026, 2); // March 2026 (month index 2)
    const day10 = data.find(d => d.day === 10)!;
    const day1  = data.find(d => d.day === 1)!;
    expect(day10.expense).toBe(100);  // 80 + 20
    expect(day10.income).toBe(0);
    expect(day1.income).toBe(500);
    expect(day1.expense).toBe(0);
  });

  it('should give expense: 0 and income: 0 for days with no transactions', () => {
    const data = getChartData([], 2026, 0); // January — 31 days, all empty
    expect(data).toHaveLength(31);
    data.forEach(point => {
      expect(point.expense).toBe(0);
      expect(point.income).toBe(0);
    });
  });
});

