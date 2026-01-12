import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { calculateBalance, type BalanceResult } from '../lib/calculations';
import { useFilteredExpenses } from './useFilteredExpenses';

/**
 * Custom hook to calculate balance information between partners
 */
export function useBalance(): BalanceResult {
  const { state } = useExpenseContext();
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => {
    return calculateBalance(
      filteredExpenses,
      state.householdSettings,
      state.settlements
    );
  }, [filteredExpenses, state.householdSettings, state.settlements]);
}

