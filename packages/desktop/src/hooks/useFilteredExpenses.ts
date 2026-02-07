import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import type { Expense } from '../lib/types';
import { selectFilteredExpenses } from '../state/selectors';

/**
 * Thin hook wrapper around the pure selector.
 */
export function useFilteredExpenses(): Expense[] {
  const { state } = useExpenseContext();
  const { expenses, partnerNames, ui } = state;
  const { selectedMonth, selectedYear, selectedCategory, searchQuery } = ui;

  return useMemo(
    () =>
      selectFilteredExpenses({
        expenses,
        partnerNames,
        ui: { selectedMonth, selectedYear, selectedCategory, searchQuery },
      }),
    [expenses, partnerNames, selectedMonth, selectedYear, selectedCategory, searchQuery]
  );
}

