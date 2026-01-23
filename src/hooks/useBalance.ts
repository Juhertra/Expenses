import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { type BalanceResult } from '../lib/calculations';
import { selectBalance } from '../state/selectors';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Thin hook wrapper around the pure balance selector.
 */
export function useBalance(): BalanceResult {
  const { state } = useExpenseContext();
  const filteredExpenses = useFilteredExpenses();

  return useMemo(
    () => selectBalance(filteredExpenses, state.householdSettings, state.settlements),
    [filteredExpenses, state.householdSettings, state.settlements]
  );
}

