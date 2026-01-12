import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import type { Expense } from '../lib/types';

/**
 * Custom hook to get filtered expenses based on current UI state
 * (month, year, search query, category filter)
 */
export function useFilteredExpenses(): Expense[] {
  const { state } = useExpenseContext();
  const { expenses, partnerNames, ui } = state;

  return useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const matchesDate =
        expDate.getMonth() === ui.selectedMonth &&
        expDate.getFullYear() === ui.selectedYear;

      if (!matchesDate) return false;

      // Apply category filter
      if (ui.selectedCategory && exp.category !== ui.selectedCategory) {
        return false;
      }

      // Apply search filter
      if (ui.searchQuery === '') return true;

      const query = ui.searchQuery.toLowerCase();
      return (
        exp.description.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query) ||
        exp.paidBy.toLowerCase().includes(query) ||
        (exp.paidBy === 'partner1' &&
          partnerNames.partner1.toLowerCase().includes(query)) ||
        (exp.paidBy === 'partner2' &&
          partnerNames.partner2.toLowerCase().includes(query))
      );
    });
  }, [
    expenses,
    partnerNames,
    ui.selectedMonth,
    ui.selectedYear,
    ui.selectedCategory,
    ui.searchQuery,
  ]);
}

