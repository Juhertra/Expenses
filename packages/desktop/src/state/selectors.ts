import {
  calculateTotals,
  calculateBalance,
  calculateCategoryTotals,
  calculateInsights,
  getChartData,
  getAvailableYears,
  getCategoryDeltas,
  parseDateParts,
  type TotalsResult,
} from '../lib/calculations';
import type { Expense, HouseholdSettings, Settlement, PartnerNames } from '../lib/types';

export interface FilterState {
  expenses: Expense[];
  partnerNames: PartnerNames;
  ui: {
    selectedMonth: number;
    selectedYear: number;
    selectedCategory: string | null;
    searchQuery: string;
  };
}

export function selectFilteredExpenses(state: FilterState): Expense[] {
  const { expenses, partnerNames, ui } = state;

  return expenses.filter(exp => {
    const { year, month } = parseDateParts(exp.date);
    const matchesDate =
      month === ui.selectedMonth &&
      year === ui.selectedYear;

    if (!matchesDate) return false;

    if (ui.selectedCategory) {
      const matchesCategory = exp.splits?.length
        ? exp.splits.some(split => split.category === ui.selectedCategory)
        : exp.category === ui.selectedCategory;
      if (!matchesCategory) return false;
    }

    if (ui.searchQuery === '') return true;

    const query = ui.searchQuery.toLowerCase();
    return (
      exp.description.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      (exp.splits?.some(split => split.category.toLowerCase().includes(query)) ?? false) ||
      exp.date.toLowerCase().includes(query) ||
      exp.paidBy.toLowerCase().includes(query) ||
      (exp.paidBy === 'partner1' && partnerNames.partner1.toLowerCase().includes(query)) ||
      (exp.paidBy === 'partner2' && partnerNames.partner2.toLowerCase().includes(query))
    );
  });
}

export const selectTotals = (filtered: Expense[]) => calculateTotals(filtered);

export const selectCategoryTotals = (filtered: Expense[]) => calculateCategoryTotals(filtered);

export const selectBalance = (
  filtered: Expense[],
  settings: HouseholdSettings,
  settlements: Settlement[],
  precomputedTotals?: TotalsResult
) => calculateBalance(filtered, settings, settlements, precomputedTotals);

export const selectInsights = (
  filtered: Expense[],
  categoryTotals: Record<string, number>,
  totalExpense: number
) => calculateInsights(filtered, categoryTotals, totalExpense);

export const selectChartData = (filtered: Expense[], year: number, month: number) =>
  getChartData(filtered, year, month);

export const selectAvailableYears = (expenses: Expense[]) => getAvailableYears(expenses);

export const selectCategoryDeltas = (current: Expense[], previous: Expense[]) =>
  getCategoryDeltas(current, previous);
