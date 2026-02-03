import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { type BalanceResult, type TotalsResult } from '../lib/calculations';
import { selectBalance } from '../state/selectors';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Thin hook wrapper around the pure balance selector.
 * @param precomputedTotals - Optional pre-computed totals to avoid duplicate calculation
 */
export function useBalance(precomputedTotals?: TotalsResult): BalanceResult {
  const { state } = useExpenseContext();
  const filteredExpenses = useFilteredExpenses();

  return useMemo(
    () => selectBalance(filteredExpenses, state.householdSettings, state.settlements, precomputedTotals),
    [filteredExpenses, state.householdSettings, state.settlements, precomputedTotals]
  );
}

