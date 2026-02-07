import { useMemo } from 'react';
import { useExpenseContext } from '../contexts/ExpenseContext';
import { type TotalsResult, type BalanceResult } from '../lib/calculations';
import { selectTotals, selectBalance } from '../state/selectors';
import { useFilteredExpenses } from './useFilteredExpenses';

interface TotalsAndBalanceResult {
  totals: TotalsResult;
  balance: BalanceResult;
}

/**
 * Combined hook for components that need both totals and balance.
 * Efficiently computes totals once and reuses them for balance calculation.
 */
export function useTotalsAndBalance(): TotalsAndBalanceResult {
  const { state } = useExpenseContext();
  const filteredExpenses = useFilteredExpenses();

  return useMemo(() => {
    const totals = selectTotals(filteredExpenses);
    const balance = selectBalance(
      filteredExpenses,
      state.householdSettings,
      state.settlements,
      totals // Pass precomputed totals to avoid duplicate calculation
    );
    return { totals, balance };
  }, [filteredExpenses, state.householdSettings, state.settlements]);
}
