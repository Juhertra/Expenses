import type { Expense, Settlement } from '@expenses/shared/types';

const EPSILON = 0.000001;

export interface ReimbursementDirection {
  from: 'partner1' | 'partner2';
  to: 'partner1' | 'partner2';
  recommendedAmount: number;
}

export interface LinkableExpenseAvailability {
  expense: Expense;
  maxReimbursable: number;
  alreadyAllocated: number;
  remaining: number;
  isFullyLinked: boolean;
}

export interface CappedSettlementAllocation {
  expenseId: number;
  amount: number;
}

function parsePositiveAmount(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function isPersonalSharedExpense(expense: Expense): boolean {
  return expense.type === 'expense' && (expense.paidBy === 'partner1' || expense.paidBy === 'partner2');
}

export function getReimbursementDirectionForExpense(
  expense: Expense,
  splitRatio: number
): ReimbursementDirection | null {
  if (!isPersonalSharedExpense(expense)) return null;

  if (expense.paidBy === 'partner1') {
    return {
      from: 'partner2',
      to: 'partner1',
      recommendedAmount: expense.amount * (1 - splitRatio),
    };
  }

  if (expense.paidBy === 'partner2') {
    return {
      from: 'partner1',
      to: 'partner2',
      recommendedAmount: expense.amount * splitRatio,
    };
  }

  return null;
}

export function getCappedLinkedAmountsByExpenseId(
  settlements: Settlement[],
  excludeSettlementId: number | null = null
): Map<number, number> {
  const linkedByExpense = new Map<number, number>();

  for (const settlement of settlements) {
    if (excludeSettlementId !== null && settlement.id === excludeSettlementId) continue;

    for (const allocation of getCappedSettlementAllocations(settlement)) {
      linkedByExpense.set(
        allocation.expenseId,
        (linkedByExpense.get(allocation.expenseId) ?? 0) + allocation.amount
      );
    }
  }

  return linkedByExpense;
}

export function getCappedSettlementAllocations(
  settlement: Settlement
): CappedSettlementAllocation[] {
  let settlementRemaining = parsePositiveAmount(settlement.amount);
  if (settlementRemaining === null) return [];

  const cappedAllocations: CappedSettlementAllocation[] = [];
  const allocations = Array.isArray(settlement.allocations) ? settlement.allocations : [];
  for (const allocation of allocations) {
    if (settlementRemaining <= 0) break;

    const expenseId = Number(allocation?.expenseId);
    const requested = parsePositiveAmount(allocation?.amount);
    if (!Number.isFinite(expenseId) || requested === null) continue;

    const consumed = Math.min(requested, settlementRemaining);
    settlementRemaining -= consumed;
    cappedAllocations.push({ expenseId, amount: consumed });
  }

  return cappedAllocations;
}

export function getLinkableExpenseAvailabilities(
  expenses: Expense[],
  settlements: Settlement[],
  splitRatio: number,
  excludeSettlementId: number | null = null
): LinkableExpenseAvailability[] {
  const allocatedByExpense = getCappedLinkedAmountsByExpenseId(settlements, excludeSettlementId);

  return expenses
    .filter(isPersonalSharedExpense)
    .map(expense => {
      const direction = getReimbursementDirectionForExpense(expense, splitRatio);
      const maxReimbursable = direction ? direction.recommendedAmount : 0;
      const alreadyAllocated = allocatedByExpense.get(expense.id) ?? 0;
      const remaining = Math.max(0, maxReimbursable - alreadyAllocated);

      return {
        expense,
        maxReimbursable,
        alreadyAllocated,
        remaining,
        isFullyLinked: remaining <= EPSILON,
      };
    });
}
