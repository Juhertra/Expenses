import type { Expense, HouseholdSettings, Settlement, ChartDataPoint } from './types';

export interface TotalsResult {
  totalIncome: number;
  totalExpense: number;
  partner1Income: number;
  partner2Income: number;
  partner1Paid: number;
  partner2Paid: number;
  jointPaid: number;
}

export interface BalanceResult {
  partner1Balance: number;
  partner2Balance: number;
  totalSharedExpenses: number;
  partner1FairShare: number;
  partner2FairShare: number;
}

export interface InsightsData {
  largest: { amount: number; description: string; category: string };
  avgDaily: number;
  topCategory: string;
  daysWithSpending: number;
}

export interface CategoryDelta {
  category: string;
  current: number;
  previous: number;
  delta: number;
}

/**
 * Calculate all totals from expenses in a single pass for better performance
 */
export function calculateTotals(expenses: Expense[]): TotalsResult {
  return expenses.reduce(
    (acc, exp) => {
      if (exp.type === 'income') {
        acc.totalIncome += exp.amount;
        if (exp.paidBy === 'partner1') acc.partner1Income += exp.amount;
        if (exp.paidBy === 'partner2') acc.partner2Income += exp.amount;
      } else {
        acc.totalExpense += exp.amount;
        if (exp.paidBy === 'partner1') acc.partner1Paid += exp.amount;
        if (exp.paidBy === 'partner2') acc.partner2Paid += exp.amount;
        if (exp.paidBy === 'joint') acc.jointPaid += exp.amount;
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      partner1Income: 0,
      partner2Income: 0,
      partner1Paid: 0,
      partner2Paid: 0,
      jointPaid: 0,
    }
  );
}

/**
 * Calculate balance between partners considering split mode and settlements
 */
export function calculateBalance(
  expenses: Expense[],
  settings: HouseholdSettings,
  settlements: Settlement[]
): BalanceResult {
  const totals = calculateTotals(expenses);

  // Determine split ratio based on mode
  const splitRatio =
    settings.splitMode === 'equal'
      ? 0.5
      : Math.max(0.05, Math.min(0.95, settings.partner1Ratio || 0.5));

  // Calculate fair share (only personal payments, not joint)
  const totalSharedExpenses = totals.partner1Paid + totals.partner2Paid;
  const partner1FairShare = totalSharedExpenses * splitRatio;
  const partner2FairShare = totalSharedExpenses * (1 - splitRatio);

  // Calculate initial balance (what they paid minus what they should have paid)
  // Positive balance = partner is OWED money (overpaid)
  // Negative balance = partner OWES money (underpaid)
  let partner1Balance = totals.partner1Paid - partner1FairShare;
  let partner2Balance = totals.partner2Paid - partner2FairShare;

  // Apply settlements as net transfers toward partner1 (positive = partner1 received).
  const netSettlementToPartner1 = settlements.reduce((sum, settlement) => {
    const amount = Number(settlement.amount);
    if (!Number.isFinite(amount)) return sum;
    if (settlement.from === 'partner1' && settlement.to === 'partner2') return sum - amount;
    if (settlement.from === 'partner2' && settlement.to === 'partner1') return sum + amount;
    return sum;
  }, 0);

  partner1Balance -= netSettlementToPartner1;
  partner2Balance += netSettlementToPartner1;

  return {
    partner1Balance,
    partner2Balance,
    totalSharedExpenses,
    partner1FairShare,
    partner2FairShare,
  };
}

/**
 * Calculate category totals for expenses only
 */
export function calculateCategoryTotals(expenses: Expense[]): Record<string, number> {
  return expenses
    .filter(exp => exp.type === 'expense')
    .reduce((acc, exp) => {
      if (exp.splits && exp.splits.length > 0) {
        exp.splits.forEach(split => {
          acc[split.category] = (acc[split.category] || 0) + split.amount;
        });
      } else {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      }
      return acc;
    }, {} as Record<string, number>);
}

/**
 * Calculate insights for the dashboard
 */
export function calculateInsights(
  expenses: Expense[],
  categoryTotals: Record<string, number>,
  totalExpense: number
): InsightsData {
  const monthExpenses = expenses.filter(e => e.type === 'expense');

  // Largest expense
  const largest = monthExpenses.reduce(
    (max, e) => (e.amount > max.amount ? e : max),
    { amount: 0, description: 'None', category: '' }
  );

  // Days with spending (unique days)
  const daysWithSpending = new Set(
    monthExpenses.map(e => new Date(e.date).getDate())
  ).size;

  // Average daily spend (only count days with spending)
  const avgDaily = daysWithSpending > 0 ? totalExpense / daysWithSpending : 0;

  // Top category by spend
  const topCategoryEntry = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b - a
  )[0];
  const topCategory = topCategoryEntry ? topCategoryEntry[0] : 'None';

  return { largest, avgDaily, topCategory, daysWithSpending };
}

/**
 * Calculate month-over-month category deltas
 */
export function getCategoryDeltas(
  currentExpenses: Expense[],
  previousExpenses: Expense[]
): CategoryDelta[] {
  // Current month category totals
  const currentTotals = calculateCategoryTotals(currentExpenses);

  // Previous month category totals
  const prevTotals = calculateCategoryTotals(previousExpenses);

  // Calculate delta for all categories that appear in either month
  const allCategories = new Set([
    ...Object.keys(currentTotals),
    ...Object.keys(prevTotals),
  ]);

  return Array.from(allCategories)
    .map(cat => ({
      category: cat,
      current: currentTotals[cat] || 0,
      previous: prevTotals[cat] || 0,
      delta: (currentTotals[cat] || 0) - (prevTotals[cat] || 0),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Generate chart data for daily expenses and income
 */
export function getChartData(
  expenses: Expense[],
  year: number,
  month: number
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayExpenses = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getDate() === day && exp.type === 'expense';
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const dayIncome = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getDate() === day && exp.type === 'income';
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    data.push({ day, expense: dayExpenses, income: dayIncome });
  }

  return data;
}

/**
 * Calculate available years from expense data
 */
export function getAvailableYears(expenses: Expense[]): number[] {
  if (expenses.length === 0) {
    // Default range if no data: previous year, current year, next year
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);
  }

  // Get unique years from actual transactions
  const years = [...new Set(expenses.map(exp => new Date(exp.date).getFullYear()))];
  years.sort((a, b) => a - b);

  // Always include current year and next year for planning
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.push(currentYear);
  if (!years.includes(currentYear + 1)) years.push(currentYear + 1);

  return years.sort((a, b) => a - b);
}

/**
 * Get frequent expenses for quick-add widget
 * Returns the N most common transactions by exact match (description + category + amount)
 */
export function getFrequentExpenses(
  expenses: Expense[],
  limit: number = 3
): Array<{ description: string; category: string; amount: number; count: number }> {
  const counts: Record<string, number> = {};

  expenses.forEach(exp => {
    if (exp.type === 'expense') {
      // Only track expenses, not income
      const key = `${exp.description}|${exp.category}|${exp.amount}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, count]) => {
      const [description, category, amount] = key.split('|');
      return { description, category, amount: parseFloat(amount), count };
    });
}

