import { parseDateParts } from '@expenses/shared/calculations';
import type { Expense, Settlement } from '@expenses/shared/types';

export interface ScopedBalanceResult {
  partner1Paid: number;
  partner2Paid: number;
  totalSharedExpenses: number;
  partner1FairShare: number;
  partner2FairShare: number;
  netSettlementToPartner1: number;
  partner1Balance: number;
  partner2Balance: number;
}

export interface BalanceScopesResult {
  month: ScopedBalanceResult;
  cumulative: ScopedBalanceResult;
  settlementsInMonth: Settlement[];
  settlementsThroughMonth: Settlement[];
}

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const parts = parseDateParts(dateStr);
  return parts.year === year && parts.month === month;
}

function isOnOrBeforeMonth(dateStr: string, year: number, month: number): boolean {
  const parts = parseDateParts(dateStr);
  return parts.year < year || (parts.year === year && parts.month <= month);
}

function calculateNetSettlementToPartner1(settlements: Settlement[]): number {
  return settlements.reduce((sum, settlement) => {
    const amount = Number(settlement.amount);
    if (!Number.isFinite(amount)) return sum;
    if (settlement.from === 'partner1' && settlement.to === 'partner2') return sum - amount;
    if (settlement.from === 'partner2' && settlement.to === 'partner1') return sum + amount;
    return sum;
  }, 0);
}

function calculateScopedBalance(
  expenses: Expense[],
  splitRatio: number,
  settlements: Settlement[]
): ScopedBalanceResult {
  const partner1Paid = expenses
    .filter(exp => exp.type === 'expense' && exp.paidBy === 'partner1')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const partner2Paid = expenses
    .filter(exp => exp.type === 'expense' && exp.paidBy === 'partner2')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalSharedExpenses = partner1Paid + partner2Paid;
  const partner1FairShare = totalSharedExpenses * splitRatio;
  const partner2FairShare = totalSharedExpenses * (1 - splitRatio);

  const netSettlementToPartner1 = calculateNetSettlementToPartner1(settlements);
  const partner1Balance = partner1Paid - partner1FairShare - netSettlementToPartner1;
  const partner2Balance = partner2Paid - partner2FairShare + netSettlementToPartner1;

  return {
    partner1Paid,
    partner2Paid,
    totalSharedExpenses,
    partner1FairShare,
    partner2FairShare,
    netSettlementToPartner1,
    partner1Balance,
    partner2Balance,
  };
}

export function calculateBalanceScopes(
  monthExpenses: Expense[],
  cumulativeExpensesThroughMonth: Expense[],
  settlements: Settlement[],
  selectedYear: number,
  selectedMonth: number,
  splitRatio: number
): BalanceScopesResult {
  const settlementsThroughMonth = settlements.filter(settlement =>
    isOnOrBeforeMonth(settlement.date, selectedYear, selectedMonth)
  );
  const settlementsInMonth = settlementsThroughMonth.filter(settlement =>
    isInMonth(settlement.date, selectedYear, selectedMonth)
  );

  return {
    month: calculateScopedBalance(monthExpenses, splitRatio, settlementsInMonth),
    cumulative: calculateScopedBalance(
      cumulativeExpensesThroughMonth,
      splitRatio,
      settlementsThroughMonth
    ),
    settlementsInMonth,
    settlementsThroughMonth,
  };
}
