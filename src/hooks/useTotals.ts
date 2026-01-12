import { useMemo } from 'react';
import { calculateTotals, type TotalsResult } from '../lib/calculations';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Custom hook to calculate all totals (income, expenses, by partner)
 */
export function useTotals(): TotalsResult {
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => {
    return calculateTotals(filteredExpenses);
  }, [filteredExpenses]);
}

