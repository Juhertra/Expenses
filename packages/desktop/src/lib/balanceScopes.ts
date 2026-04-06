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

export interface ScopedSettlementEntry {
  settlement: Settlement;
  appliedAmount: number;
  linkedExpenseIds: number[];
  includesPaymentMonthRemainder: boolean;
}

export interface BalanceScopesResult {
  month: ScopedBalanceResult;
  cumulative: ScopedBalanceResult;
  settlementsAffectingMonth: ScopedSettlementEntry[];
  settlementsAffectingThroughMonth: ScopedSettlementEntry[];
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

interface SettlementTransfer {
  amount: number;
  from: Settlement['from'];
  to: Settlement['to'];
}

function parsePositiveAmount(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function isPersonalSharedExpense(expense: Expense): boolean {
  return expense.type === 'expense' && (expense.paidBy === 'partner1' || expense.paidBy === 'partner2');
}

function toSettlementTransfer(settlement: Settlement, amount: number): SettlementTransfer | null {
  const parsedAmount = parsePositiveAmount(amount);
  if (parsedAmount === null) return null;
  return {
    amount: parsedAmount,
    from: settlement.from,
    to: settlement.to,
  };
}

function calculateNetSettlementToPartner1(settlements: SettlementTransfer[]): number {
  return settlements.reduce((sum, settlement) => {
    if (settlement.from === 'partner1' && settlement.to === 'partner2') return sum - settlement.amount;
    if (settlement.from === 'partner2' && settlement.to === 'partner1') return sum + settlement.amount;
    return sum;
  }, 0);
}

function calculateScopedBalance(
  expenses: Expense[],
  splitRatio: number,
  settlements: SettlementTransfer[]
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

function buildScopedSettlementEntries(
  settlements: Settlement[],
  expenseById: Map<number, Expense>,
  shouldApplyLinkedExpense: (expenseDate: string) => boolean,
  shouldApplyPaymentRemainder: (settlementDate: string) => boolean
): ScopedSettlementEntry[] {
  const entries: ScopedSettlementEntry[] = [];

  for (const settlement of settlements) {
    const settlementAmount = parsePositiveAmount(settlement.amount);
    if (settlementAmount === null) continue;

    let remaining = settlementAmount;
    let appliedAmount = 0;
    let includesPaymentMonthRemainder = false;
    const linkedExpenseIds: number[] = [];

    const allocations = Array.isArray(settlement.allocations) ? settlement.allocations : [];
    for (const allocation of allocations) {
      if (remaining <= 0) break;

      const expenseId = Number(allocation?.expenseId);
      const allocationAmount = parsePositiveAmount(allocation?.amount);
      if (!Number.isFinite(expenseId) || allocationAmount === null) continue;

      const consumedAmount = Math.min(allocationAmount, remaining);
      remaining -= consumedAmount;

      const linkedExpense = expenseById.get(expenseId);
      if (!linkedExpense || !isPersonalSharedExpense(linkedExpense)) {
        continue;
      }

      if (shouldApplyLinkedExpense(linkedExpense.date)) {
        appliedAmount += consumedAmount;
        linkedExpenseIds.push(expenseId);
      }
    }

    if (remaining > 0 && shouldApplyPaymentRemainder(settlement.date)) {
      appliedAmount += remaining;
      includesPaymentMonthRemainder = true;
    }

    if (appliedAmount > 0) {
      entries.push({
        settlement,
        appliedAmount,
        linkedExpenseIds: [...new Set(linkedExpenseIds)],
        includesPaymentMonthRemainder,
      });
    }
  }

  return entries;
}

export function calculateBalanceScopes(
  monthExpenses: Expense[],
  cumulativeExpensesThroughMonth: Expense[],
  settlements: Settlement[],
  selectedYear: number,
  selectedMonth: number,
  splitRatio: number
): BalanceScopesResult {
  const expenseById = new Map<number, Expense>();
  for (const expense of cumulativeExpensesThroughMonth) {
    expenseById.set(expense.id, expense);
  }
  for (const expense of monthExpenses) {
    expenseById.set(expense.id, expense);
  }

  const settlementsAffectingMonth = buildScopedSettlementEntries(
    settlements,
    expenseById,
    expenseDate => isInMonth(expenseDate, selectedYear, selectedMonth),
    settlementDate => isInMonth(settlementDate, selectedYear, selectedMonth)
  );
  const settlementsAffectingThroughMonth = buildScopedSettlementEntries(
    settlements,
    expenseById,
    expenseDate => isOnOrBeforeMonth(expenseDate, selectedYear, selectedMonth),
    settlementDate => isOnOrBeforeMonth(settlementDate, selectedYear, selectedMonth)
  );
  const monthSettlementTransfers = settlementsAffectingMonth
    .map(entry => toSettlementTransfer(entry.settlement, entry.appliedAmount))
    .filter((transfer): transfer is SettlementTransfer => transfer !== null);

  const settlementsThroughMonth = settlements.filter(settlement =>
    isOnOrBeforeMonth(settlement.date, selectedYear, selectedMonth)
  );
  const settlementsInMonth = settlementsThroughMonth.filter(settlement =>
    isInMonth(settlement.date, selectedYear, selectedMonth)
  );
  const cumulativeSettlementTransfers = settlementsAffectingThroughMonth
    .map(entry => toSettlementTransfer(entry.settlement, entry.appliedAmount))
    .filter((transfer): transfer is SettlementTransfer => transfer !== null);

  return {
    month: calculateScopedBalance(monthExpenses, splitRatio, monthSettlementTransfers),
    cumulative: calculateScopedBalance(
      cumulativeExpensesThroughMonth,
      splitRatio,
      cumulativeSettlementTransfers
    ),
    settlementsAffectingMonth,
    settlementsAffectingThroughMonth,
    settlementsInMonth,
    settlementsThroughMonth,
  };
}
