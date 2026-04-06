import type { Expense, Settlement } from '@expenses/shared/types';
import { calculateBalanceScopes, type ScopedBalanceResult, type ScopedSettlementEntry } from './balanceScopes';
import {
  getCappedLinkedAmountsByExpenseId,
  getReimbursementDirectionForExpense,
} from './settlementAllocation';

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
export type ReimbursementBucket = 'open_to_settle' | 'needs_linking';

export interface ObligationRowModel {
  expenseId: number;
  expenseDate: string;
  expenseDescription: string;
  paidBy: PartnerKey;
  from: PartnerKey;
  to: PartnerKey;
  owed: number;
  linkedSettled: number;
  expenseRemainingUnlinked: number;
  remaining: number;
  actionableRemaining: number;
  bucket: ReimbursementBucket | null;
  status: ObligationStatus;
}

export interface ReimbursementStatusModel {
  allRows: ObligationRowModel[];
  openToSettleRows: ObligationRowModel[];
  needsLinkingRows: ObligationRowModel[];
  showBalancedNoActionState: boolean;
  showNoRowsNeedsReviewState: boolean;
  showTraceabilityOnlyNote: boolean;
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
  obligations: ReimbursementStatusModel;
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

function calculateObligations(
  selectedScopeExpenses: Expense[],
  settlements: Settlement[],
  splitRatio: number,
  activeScope: ScopedBalanceResult
): ReimbursementStatusModel {
  const linkedByExpenseId = getCappedLinkedAmountsByExpenseId(settlements);

  const sortNewestFirst = (a: ObligationRowModel, b: ObligationRowModel) => {
    if (a.expenseDate === b.expenseDate) return b.expenseId - a.expenseId;
    return b.expenseDate.localeCompare(a.expenseDate);
  };
  const sortOldestFirst = (a: ObligationRowModel, b: ObligationRowModel) => {
    if (a.expenseDate === b.expenseDate) return a.expenseId - b.expenseId;
    return a.expenseDate.localeCompare(b.expenseDate);
  };

  const rows = selectedScopeExpenses
    .filter(isPersonalSharedExpense)
    .map(expense => {
      const direction = getReimbursementDirectionForExpense(expense, splitRatio);
      if (!direction) return null;

      const owed = Math.max(0, direction.recommendedAmount);
      const linkedSettled = Math.min(owed, Math.max(0, linkedByExpenseId.get(expense.id) ?? 0));
      const expenseRemainingUnlinked = Math.max(0, owed - linkedSettled);

      let status: ObligationStatus = 'unlinked';
      if (expenseRemainingUnlinked < UI_ZERO_EPSILON) {
        status = 'settled';
      } else if (linkedSettled >= UI_ZERO_EPSILON) {
        status = 'partially_settled';
      }

      const row: ObligationRowModel = {
        expenseId: expense.id,
        expenseDate: expense.date,
        expenseDescription: expense.description,
        paidBy: expense.paidBy,
        from: direction.from,
        to: direction.to,
        owed,
        linkedSettled,
        expenseRemainingUnlinked,
        remaining: expenseRemainingUnlinked,
        actionableRemaining: 0,
        bucket: null,
        status,
      };
      return row;
    })
    .filter((row): row is ObligationRowModel => row !== null);

  const rowsById = new Map<number, ObligationRowModel>();
  for (const row of rows) {
    rowsById.set(row.expenseId, row);
  }

  const directionalBudgets = [
    {
      from: 'partner1' as const,
      to: 'partner2' as const,
      budget: Math.max(-activeScope.partner1Balance, 0),
    },
    {
      from: 'partner2' as const,
      to: 'partner1' as const,
      budget: Math.max(activeScope.partner1Balance, 0),
    },
  ];

  for (const direction of directionalBudgets) {
    let remainingBudget = direction.budget;
    const directionalRows = [...rowsById.values()]
      .filter(
        row =>
          row.from === direction.from &&
          row.to === direction.to &&
          row.expenseRemainingUnlinked >= UI_ZERO_EPSILON
      )
      .sort(sortOldestFirst);

    for (const row of directionalRows) {
      if (remainingBudget <= 0) break;
      const actionable = Math.min(row.expenseRemainingUnlinked, remainingBudget);
      row.actionableRemaining = actionable;
      remainingBudget -= actionable;
    }
  }

  for (const row of rowsById.values()) {
    if (row.expenseRemainingUnlinked < UI_ZERO_EPSILON) {
      row.bucket = null;
      continue;
    }
    row.bucket = row.actionableRemaining >= UI_ZERO_EPSILON ? 'open_to_settle' : 'needs_linking';
  }

  const allRows = [...rowsById.values()].sort(sortNewestFirst);
  const openToSettleRows = allRows
    .filter(row => row.bucket === 'open_to_settle')
    .sort(sortOldestFirst);
  const needsLinkingRows = allRows
    .filter(row => row.bucket === 'needs_linking')
    .sort(sortNewestFirst);
  const hasDisplayRows = openToSettleRows.length > 0 || needsLinkingRows.length > 0;
  const isScopeBalanced =
    Math.abs(activeScope.partner1Balance) < UI_ZERO_EPSILON &&
    Math.abs(activeScope.partner2Balance) < UI_ZERO_EPSILON;

  return {
    allRows,
    openToSettleRows,
    needsLinkingRows,
    showBalancedNoActionState: !hasDisplayRows && isScopeBalanced,
    showNoRowsNeedsReviewState: !hasDisplayRows && !isScopeBalanced,
    showTraceabilityOnlyNote: openToSettleRows.length === 0 && needsLinkingRows.length > 0,
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

  const obligations = calculateObligations(selectedScopeExpenses, settlements, splitRatio, activeScope);
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
