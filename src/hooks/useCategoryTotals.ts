import { useMemo } from 'react';
import { selectCategoryTotals } from '../state/selectors';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Thin hook wrapper around the pure category totals selector.
 */
export function useCategoryTotals(): Record<string, number> {
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => selectCategoryTotals(filteredExpenses), [filteredExpenses]);
}

