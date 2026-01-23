import { useMemo } from 'react';
import { type TotalsResult } from '../lib/calculations';
import { selectTotals } from '../state/selectors';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Thin hook wrapper around the pure totals selector.
 */
export function useTotals(): TotalsResult {
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => selectTotals(filteredExpenses), [filteredExpenses]);
}

