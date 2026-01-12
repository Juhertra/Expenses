import { useMemo } from 'react';
import { calculateCategoryTotals } from '../lib/calculations';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Custom hook to calculate category totals for expenses
 */
export function useCategoryTotals(): Record<string, number> {
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => {
    return calculateCategoryTotals(filteredExpenses);
  }, [filteredExpenses]);
}

