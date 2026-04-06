import type { Expense, Settlement } from '@expenses/shared/types';
import { calculateBalanceScopes, type ScopedBalanceResult, type ScopedSettlementEntry } from './balanceScopes';
import { getReimbursementDirectionForExpense } from './settlementAllocation';

export type BalanceMode = 'month' | 'cumulative';

type PartnerKey = 'partner1' | 'partner2';

const UI_ZERO_EPSILON = 0.01;

export interface BalanceTopSummaryModel {
  isBalanced: boolean;
  amount: number;
  from: PartnerKey | null;
  to: PartnerKey | null;
  partner1Balance: number;
  partner2Balance: number;
}

export interface BalanceSupportCardModel {
  partner1: number;
  partner2: number;
}

export interface BalanceExplanationPartnerModel {
  shareFromOtherPaid: number;
  creditFromOwnPaid: number;
  expenseDelta: number;
  settlementsPaid: number;
  settlementsReceived: number;
  finalBalance: number;
}

export interface BalanceExplanationModel {
  partner1: BalanceExplanationPartnerModel;
  partner2: BalanceExplanationPartnerModel;
}

export interface ExpenseShareItemModel {
  expense: Expense;
  shareAmount: number;
}

export interface PaymentBreakdownModel {
  partner1Paid: number;
  partner2Paid: number;
  jointPaid: number;
  totalAllPayments: number;
}

export interface DisplayedSettlementModel {
  settlement: Settlement;
  amountToShow: number;
  linkedExpenseIds: number[];
  isPartialForScope: boolean;
}

export type ObligationStatus = 'unlinked' | 'partially_settled' | 'settled';

export interface ObligationRowModel {
  expenseId: number;
  expenseDate: string;
  expenseDescription: string;
  paidBy: PartnerKey;
  from: PartnerKey;
  to: PartnerKey;
  owed: number;
  linkedSettled: number;
  remaining: number;
  status: ObligationStatus;
}

export interface ReconciliationModel {
  partner1Balance: number;
  partner2Balance: number;
  netMismatch: number;
  showWarning: boolean;
}

export interface BalanceViewModel {
  activeScope: ScopedBalanceResult;
  topSummary: BalanceTopSummaryModel;
  cashFlow: BalanceSupportCardModel;
  fairSplitResult: BalanceSupportCardModel;
  explanation: BalanceExplanationModel;
  expenseShareBreakdown: {
    partner1OwesItems: ExpenseShareItemModel[];
    partner2OwesItems: ExpenseShareItemModel[];
    partner1OwesTotal: number;
    partner2OwesTotal: number;
  };
  paymentBreakdown: PaymentBreakdownModel;
  displayedSettlements: DisplayedSettlementModel[];
  obligations: {
    allRows: ObligationRowModel[];
    openRows: ObligationRowModel[];
  };
  reconciliation: ReconciliationModel;
}

interface BuildBalanceViewModelInput {
  monthExpenses: Expense[];
  expenses: Expense[];
  settlements: Settlement[];
  selectedYear: number;
  selectedMonth: number;
  splitRatio: number;
  balanceMode: BalanceMode;
}

function isPersonalSharedExpense(expense: Expense): expense is Expense & { paidBy: PartnerKey } {
  return expense.type === 'expense' && (expense.paidBy === 'partner1' || expense.paidBy === 'partner2');
}

function computeSettlementFlows(entries: ScopedSettlementEntry[]): {
  partner1SettlementPaid: number;
  partner1SettlementReceived: number;
  partner2SettlementPaid: number;
  partner2SettlementReceived: number;
} {
  const partner1SettlementPaid = entries
    .filter(entry => entry.settlement.from === 'partner1' && entry.settlement.to === 'partner2')
    .reduce((sum, entry) => sum + entry.appliedAmount, 0);
  const partner1SettlementReceived = entries
    .filter(entry => entry.settlement.from === 'partner2' && entry.settlement.to === 'partner1')
    .reduce((sum, entry) => sum + entry.appliedAmount, 0);

  return {
    partner1SettlementPaid,
    partner1SettlementReceived,
    partner2SettlementPaid: partner1SettlementReceived,
    partner2SettlementReceived: partner1SettlementPaid,
  };
}

function toDisplayedSettlements(entries: ScopedSettlementEntry[]): DisplayedSettlementModel[] {
  return entries.map(entry => ({
    settlement: entry.settlement,
    amountToShow: entry.appliedAmount,
    linkedExpenseIds: entry.linkedExpenseIds,
    isPartialForScope: Math.abs(entry.appliedAmount - Number(entry.settlement.amount || 0)) > UI_ZERO_EPSILON,
  }));
}

function parsePositiveAmount(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function calculateLinkedSettledByExpenseId(settlements: Settlement[]): Map<number, number> {
  const linkedByExpenseId = new Map<number, number>();

  for (const settlement of settlements) {
    let remainder = parsePositiveAmount(settlement.amount);
    if (remainder === null) continue;

    const allocations = Array.isArray(settlement.allocations) ? settlement.allocations : [];
    for (const allocation of allocations) {
      if (remainder <= 0) break;

      const allocationAmount = parsePositiveAmount(allocation?.amount);
      if (allocationAmount === null) continue;

      const consumed = Math.min(allocationAmount, remainder);
      remainder -= consumed;

      const expenseId = Number(allocation?.expenseId);
      if (!Number.isFinite(expenseId)) continue;

      linkedByExpenseId.set(expenseId, (linkedByExpenseId.get(expenseId) ?? 0) + consumed);
    }
  }

  return linkedByExpenseId;
}

function calculateObligations(
  selectedScopeExpenses: Expense[],
  settlements: Settlement[],
  splitRatio: number
): { allRows: ObligationRowModel[]; openRows: ObligationRowModel[] } {
  const linkedByExpenseId = calculateLinkedSettledByExpenseId(settlements);

  const rows = selectedScopeExpenses
    .filter(isPersonalSharedExpense)
    .map(expense => {
      const direction = getReimbursementDirectionForExpense(expense, splitRatio);
      if (!direction) return null;

      const owed = Math.max(0, direction.recommendedAmount);
      const linkedSettled = Math.min(owed, Math.max(0, linkedByExpenseId.get(expense.id) ?? 0));
      const remaining = Math.max(0, owed - linkedSettled);

      let status: ObligationStatus = 'unlinked';
      if (remaining < UI_ZERO_EPSILON) {
        status = 'settled';
      } else if (linkedSettled >= UI_ZERO_EPSILON) {
        status = 'partially_settled';
      }

      return {
        expenseId: expense.id,
        expenseDate: expense.date,
        expenseDescription: expense.description,
        paidBy: expense.paidBy,
        from: direction.from,
        to: direction.to,
        owed,
        linkedSettled,
        remaining,
        status,
      } satisfies ObligationRowModel;
    })
    .filter((row): row is ObligationRowModel => row !== null)
    .sort((a, b) => {
      if (a.expenseDate === b.expenseDate) return b.expenseId - a.expenseId;
      return b.expenseDate.localeCompare(a.expenseDate);
    });

  return {
    allRows: rows,
    openRows: rows.filter(row => row.remaining >= UI_ZERO_EPSILON),
  };
}

function calculateExpenseShareBreakdown(
  selectedScopeExpenses: Expense[],
  splitRatio: number
): {
  partner1OwesItems: ExpenseShareItemModel[];
  partner2OwesItems: ExpenseShareItemModel[];
  partner1OwesTotal: number;
  partner2OwesTotal: number;
} {
  const partner1OwesItems: ExpenseShareItemModel[] = [];
  const partner2OwesItems: ExpenseShareItemModel[] = [];

  for (const expense of selectedScopeExpenses) {
    if (expense.type !== 'expense') continue;
    if (expense.paidBy === 'partner2') {
      partner1OwesItems.push({
        expense,
        shareAmount: expense.amount * splitRatio,
      });
    } else if (expense.paidBy === 'partner1') {
      partner2OwesItems.push({
        expense,
        shareAmount: expense.amount * (1 - splitRatio),
      });
    }
  }

  partner1OwesItems.sort((a, b) => b.shareAmount - a.shareAmount);
  partner2OwesItems.sort((a, b) => b.shareAmount - a.shareAmount);

  const partner1OwesTotal = partner1OwesItems.reduce((sum, item) => sum + item.shareAmount, 0);
  const partner2OwesTotal = partner2OwesItems.reduce((sum, item) => sum + item.shareAmount, 0);

  return {
    partner1OwesItems,
    partner2OwesItems,
    partner1OwesTotal,
    partner2OwesTotal,
  };
}

export function buildBalanceViewModel({
  monthExpenses,
  expenses,
  settlements,
  selectedYear,
  selectedMonth,
  splitRatio,
  balanceMode,
}: BuildBalanceViewModelInput): BalanceViewModel {
  const scopes = calculateBalanceScopes(
    monthExpenses,
    expenses,
    settlements,
    selectedYear,
    selectedMonth,
    splitRatio
  );

  const activeScope = balanceMode === 'month' ? scopes.month : scopes.cumulative;
  const selectedScopeExpenses = balanceMode === 'month' ? monthExpenses : expenses;
  const settlementsForMode =
    balanceMode === 'month' ? scopes.settlementsAffectingMonth : scopes.settlementsAffectingThroughMonth;

  const flows = computeSettlementFlows(settlementsForMode);

  const partner1ExpenseDelta = activeScope.partner1Paid - activeScope.partner1FairShare;
  const partner2ExpenseDelta = activeScope.partner2Paid - activeScope.partner2FairShare;
  const partner1FinalBalance =
    partner1ExpenseDelta + flows.partner1SettlementPaid - flows.partner1SettlementReceived;
  const partner2FinalBalance =
    partner2ExpenseDelta + flows.partner2SettlementPaid - flows.partner2SettlementReceived;

  const topSummary: BalanceTopSummaryModel = (() => {
    const isBalanced =
      Math.abs(activeScope.partner1Balance) < UI_ZERO_EPSILON &&
      Math.abs(activeScope.partner2Balance) < UI_ZERO_EPSILON;

    if (isBalanced) {
      return {
        isBalanced: true,
        amount: 0,
        from: null,
        to: null,
        partner1Balance: activeScope.partner1Balance,
        partner2Balance: activeScope.partner2Balance,
      };
    }

    if (activeScope.partner1Balance > 0) {
      return {
        isBalanced: false,
        amount: Math.abs(activeScope.partner1Balance),
        from: 'partner2',
        to: 'partner1',
        partner1Balance: activeScope.partner1Balance,
        partner2Balance: activeScope.partner2Balance,
      };
    }

    return {
      isBalanced: false,
      amount: Math.abs(activeScope.partner2Balance),
      from: 'partner1',
      to: 'partner2',
      partner1Balance: activeScope.partner1Balance,
      partner2Balance: activeScope.partner2Balance,
    };
  })();

  const jointPaid = selectedScopeExpenses
    .filter(expense => expense.type === 'expense' && expense.paidBy === 'joint')
    .reduce((sum, expense) => sum + expense.amount, 0);

  const obligations = calculateObligations(selectedScopeExpenses, settlements, splitRatio);
  const expenseShareBreakdown = calculateExpenseShareBreakdown(selectedScopeExpenses, splitRatio);

  const reconciliationMismatch = activeScope.partner1Balance + activeScope.partner2Balance;

  return {
    activeScope,
    topSummary,
    cashFlow: {
      partner1: activeScope.partner1Paid + flows.partner1SettlementPaid - flows.partner1SettlementReceived,
      partner2: activeScope.partner2Paid + flows.partner2SettlementPaid - flows.partner2SettlementReceived,
    },
    fairSplitResult: {
      partner1: partner1ExpenseDelta,
      partner2: partner2ExpenseDelta,
    },
    explanation: {
      partner1: {
        shareFromOtherPaid: expenseShareBreakdown.partner1OwesTotal,
        creditFromOwnPaid: expenseShareBreakdown.partner2OwesTotal,
        expenseDelta: partner1ExpenseDelta,
        settlementsPaid: flows.partner1SettlementPaid,
        settlementsReceived: flows.partner1SettlementReceived,
        finalBalance: partner1FinalBalance,
      },
      partner2: {
        shareFromOtherPaid: expenseShareBreakdown.partner2OwesTotal,
        creditFromOwnPaid: expenseShareBreakdown.partner1OwesTotal,
        expenseDelta: partner2ExpenseDelta,
        settlementsPaid: flows.partner2SettlementPaid,
        settlementsReceived: flows.partner2SettlementReceived,
        finalBalance: partner2FinalBalance,
      },
    },
    expenseShareBreakdown,
    paymentBreakdown: {
      partner1Paid: activeScope.partner1Paid,
      partner2Paid: activeScope.partner2Paid,
      jointPaid,
      totalAllPayments: activeScope.partner1Paid + activeScope.partner2Paid + jointPaid,
    },
    displayedSettlements: toDisplayedSettlements(settlementsForMode),
    obligations,
    reconciliation: {
      partner1Balance: activeScope.partner1Balance,
      partner2Balance: activeScope.partner2Balance,
      netMismatch: reconciliationMismatch,
      showWarning: Math.abs(reconciliationMismatch) >= UI_ZERO_EPSILON,
    },
  };
}
