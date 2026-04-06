import { parseDateParts } from '@expenses/shared/calculations';
import type { Expense, Settlement, SettlementRemainderMode } from '@expenses/shared/types';

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

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function monthKeyFromDate(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  return toMonthKey(parts.year, parts.month);
}

function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const monthOneBased = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthOneBased)) return null;
  if (monthOneBased < 1 || monthOneBased > 12) return null;

  return { year, month: monthOneBased - 1 };
}

function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
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

function getRemainderMode(settlement: Settlement): SettlementRemainderMode {
  if (
    settlement.remainderMode === 'payment_month' ||
    settlement.remainderMode === 'specific_month' ||
    settlement.remainderMode === 'oldest_open_debt'
  ) {
    return settlement.remainderMode;
  }
  return 'payment_month';
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

interface MonthState {
  key: string;
  year: number;
  month: number;
  partner1Paid: number;
  partner2Paid: number;
  partner1FairShare: number;
  partner2FairShare: number;
  partner1BalanceBase: number;
  partner1BalanceCurrent: number;
}

interface SettlementMonthApplication {
  amount: number;
  linkedExpenseIds: Set<number>;
  includesPaymentMonthRemainder: boolean;
}

interface SettlementAccumulator {
  settlement: Settlement;
  amount: number;
  remainder: number;
  paymentMonthKey: string;
  remainderMode: SettlementRemainderMode;
  remainderTargetMonthKey: string | null;
  applicationsByMonth: Map<string, SettlementMonthApplication>;
}

function settlementEffectOnPartner1(settlement: Settlement, amount: number): number {
  if (settlement.from === 'partner1' && settlement.to === 'partner2') return amount;
  if (settlement.from === 'partner2' && settlement.to === 'partner1') return -amount;
  return 0;
}

function openDebtForDirection(partner1BalanceCurrent: number, settlement: Settlement): number {
  if (settlement.from === 'partner1' && settlement.to === 'partner2') {
    return Math.max(0, -partner1BalanceCurrent);
  }
  if (settlement.from === 'partner2' && settlement.to === 'partner1') {
    return Math.max(0, partner1BalanceCurrent);
  }
  return 0;
}

function ensureMonthState(
  statesByMonth: Map<string, MonthState>,
  year: number,
  month: number
): MonthState {
  const key = toMonthKey(year, month);
  const existing = statesByMonth.get(key);
  if (existing) return existing;

  const state: MonthState = {
    key,
    year,
    month,
    partner1Paid: 0,
    partner2Paid: 0,
    partner1FairShare: 0,
    partner2FairShare: 0,
    partner1BalanceBase: 0,
    partner1BalanceCurrent: 0,
  };
  statesByMonth.set(key, state);
  return state;
}

function applySettlementToMonth(
  accumulator: SettlementAccumulator,
  monthState: MonthState,
  amount: number,
  linkedExpenseId: number | null,
  includesPaymentMonthRemainder: boolean
): number {
  const parsedAmount = parsePositiveAmount(amount);
  if (parsedAmount === null) return 0;

  const effect = settlementEffectOnPartner1(accumulator.settlement, parsedAmount);
  monthState.partner1BalanceCurrent += effect;

  const existing = accumulator.applicationsByMonth.get(monthState.key) ?? {
    amount: 0,
    linkedExpenseIds: new Set<number>(),
    includesPaymentMonthRemainder: false,
  };
  existing.amount += parsedAmount;
  if (linkedExpenseId !== null) existing.linkedExpenseIds.add(linkedExpenseId);
  if (includesPaymentMonthRemainder) existing.includesPaymentMonthRemainder = true;
  accumulator.applicationsByMonth.set(monthState.key, existing);

  return parsedAmount;
}

function buildSettlementApplications(
  expensesForScope: Expense[],
  settlements: Settlement[],
  splitRatio: number
): SettlementAccumulator[] {
  const statesByMonth = new Map<string, MonthState>();
  const expenseById = new Map<number, Expense>();

  for (const expense of expensesForScope) {
    expenseById.set(expense.id, expense);
    if (!isPersonalSharedExpense(expense)) continue;

    const parts = parseDateParts(expense.date);
    const state = ensureMonthState(statesByMonth, parts.year, parts.month);
    if (expense.paidBy === 'partner1') state.partner1Paid += expense.amount;
    if (expense.paidBy === 'partner2') state.partner2Paid += expense.amount;
  }

  for (const state of statesByMonth.values()) {
    const total = state.partner1Paid + state.partner2Paid;
    state.partner1FairShare = total * splitRatio;
    state.partner2FairShare = total * (1 - splitRatio);
    state.partner1BalanceBase = state.partner1Paid - state.partner1FairShare;
    state.partner1BalanceCurrent = state.partner1BalanceBase;
  }

  const accumulators: SettlementAccumulator[] = settlements
    .map(settlement => {
      const amount = parsePositiveAmount(settlement.amount);
      if (amount === null) return null;

      const paymentMonthKey = monthKeyFromDate(settlement.date);
      const remainderMode = getRemainderMode(settlement);
      let remainderTargetMonthKey: string | null = null;
      if (remainderMode === 'specific_month' && settlement.remainderMonth) {
        const parsed = parseMonthKey(settlement.remainderMonth);
        if (parsed) remainderTargetMonthKey = toMonthKey(parsed.year, parsed.month);
      }

      return {
        settlement,
        amount,
        remainder: amount,
        paymentMonthKey,
        remainderMode,
        remainderTargetMonthKey,
        applicationsByMonth: new Map<string, SettlementMonthApplication>(),
      } satisfies SettlementAccumulator;
    })
    .filter((value): value is SettlementAccumulator => value !== null)
    .sort((a, b) => {
      const byDate = a.settlement.date.localeCompare(b.settlement.date);
      if (byDate !== 0) return byDate;
      return a.settlement.id - b.settlement.id;
    });

  // Apply linked allocations first (no capping; link validation handles upper bounds).
  for (const accumulator of accumulators) {
    const allocations = Array.isArray(accumulator.settlement.allocations)
      ? accumulator.settlement.allocations
      : [];
    for (const allocation of allocations) {
      if (accumulator.remainder <= 0) break;

      const expenseId = Number(allocation?.expenseId);
      const allocationAmount = parsePositiveAmount(allocation?.amount);
      if (!Number.isFinite(expenseId) || allocationAmount === null) continue;

      const consumed = Math.min(allocationAmount, accumulator.remainder);
      accumulator.remainder -= consumed;

      const linkedExpense = expenseById.get(expenseId);
      if (!linkedExpense || !isPersonalSharedExpense(linkedExpense)) continue;

      const linkedParts = parseDateParts(linkedExpense.date);
      const monthState = statesByMonth.get(toMonthKey(linkedParts.year, linkedParts.month));
      if (!monthState) continue;

      applySettlementToMonth(accumulator, monthState, consumed, expenseId, false);
    }
  }

  // Apply remainder according to selected strategy with same-direction debt cap.
  const sortedMonthKeys = [...statesByMonth.keys()].sort(compareMonthKeys);
  for (const accumulator of accumulators) {
    if (accumulator.remainder <= 0) continue;

    const tryApplyToMonth = (targetMonthKey: string, includesPaymentRemainder: boolean): number => {
      const state = statesByMonth.get(targetMonthKey);
      if (!state) return 0;

      const openDebt = openDebtForDirection(state.partner1BalanceCurrent, accumulator.settlement);
      const applied = Math.min(accumulator.remainder, openDebt);
      if (applied <= 0) return 0;

      accumulator.remainder -= applySettlementToMonth(
        accumulator,
        state,
        applied,
        null,
        includesPaymentRemainder
      );
      return applied;
    };

    if (accumulator.remainderMode === 'oldest_open_debt') {
      for (const monthKey of sortedMonthKeys) {
        if (accumulator.remainder <= 0) break;
        if (compareMonthKeys(monthKey, accumulator.paymentMonthKey) > 0) break;

        const includesPaymentRemainder = monthKey === accumulator.paymentMonthKey;
        tryApplyToMonth(monthKey, includesPaymentRemainder);
      }
      continue;
    }

    const targetMonthKey =
      accumulator.remainderMode === 'specific_month' && accumulator.remainderTargetMonthKey
        ? accumulator.remainderTargetMonthKey
        : accumulator.paymentMonthKey;
    const includesPaymentRemainder = targetMonthKey === accumulator.paymentMonthKey;
    tryApplyToMonth(targetMonthKey, includesPaymentRemainder);
  }

  return accumulators;
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

export function calculateBalanceScopes(
  monthExpenses: Expense[],
  cumulativeExpensesThroughMonth: Expense[],
  settlements: Settlement[],
  selectedYear: number,
  selectedMonth: number,
  splitRatio: number
): BalanceScopesResult {
  const selectedMonthKey = toMonthKey(selectedYear, selectedMonth);
  const expensesForScopeById = new Map<number, Expense>();
  for (const expense of cumulativeExpensesThroughMonth) {
    expensesForScopeById.set(expense.id, expense);
  }
  for (const expense of monthExpenses) {
    expensesForScopeById.set(expense.id, expense);
  }
  const expensesForScope = [...expensesForScopeById.values()];
  const settlementApplications = buildSettlementApplications(expensesForScope, settlements, splitRatio);

  const settlementsAffectingMonth: ScopedSettlementEntry[] = [];
  const settlementsAffectingThroughMonth: ScopedSettlementEntry[] = [];
  for (const accumulator of settlementApplications) {
    const monthApp = accumulator.applicationsByMonth.get(selectedMonthKey);
    if (monthApp && monthApp.amount > 0) {
      settlementsAffectingMonth.push({
        settlement: accumulator.settlement,
        appliedAmount: monthApp.amount,
        linkedExpenseIds: [...monthApp.linkedExpenseIds],
        includesPaymentMonthRemainder: monthApp.includesPaymentMonthRemainder,
      });
    }

    let throughAmount = 0;
    const throughLinkedIds = new Set<number>();
    let throughIncludesPaymentRemainder = false;
    for (const [monthKey, app] of accumulator.applicationsByMonth.entries()) {
      if (compareMonthKeys(monthKey, selectedMonthKey) > 0) continue;
      throughAmount += app.amount;
      for (const id of app.linkedExpenseIds) throughLinkedIds.add(id);
      throughIncludesPaymentRemainder ||= app.includesPaymentMonthRemainder;
    }
    if (throughAmount > 0) {
      settlementsAffectingThroughMonth.push({
        settlement: accumulator.settlement,
        appliedAmount: throughAmount,
        linkedExpenseIds: [...throughLinkedIds],
        includesPaymentMonthRemainder: throughIncludesPaymentRemainder,
      });
    }
  }

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
