import { parseDateParts } from '@expenses/shared/calculations';
import type { Expense, FormData, RecurringTransaction } from '@expenses/shared/types';

export interface RecurringRuleDraft {
  description: string;
  amount: string;
  category: string;
  type: 'expense' | 'income';
  paidBy: 'partner1' | 'partner2' | 'joint';
  recurringDay: number;
}

export interface ResolvedRecurringRuleLink {
  recurring: RecurringTransaction | null;
  resolvedRecurringId: number | null;
  isRecurringOccurrence: boolean;
  canEditRule: boolean;
  isAmbiguousLegacyMatch: boolean;
  missingExplicitRule: boolean;
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function createNumericId(): number {
  return Date.now() + Math.random();
}

export function createRecurringDraft(overrides: Partial<RecurringRuleDraft> = {}): RecurringRuleDraft {
  return {
    description: '',
    amount: '',
    category: 'Housing',
    type: 'expense',
    paidBy: 'partner1',
    recurringDay: 1,
    ...overrides,
  };
}

export function buildRecurringDraftFromExpense(
  expense: Pick<Expense, 'description' | 'amount' | 'category' | 'type' | 'paidBy' | 'date'>
): RecurringRuleDraft {
  return {
    description: expense.description,
    amount: expense.amount.toString(),
    category: expense.category,
    type: expense.type,
    paidBy: expense.paidBy,
    recurringDay: parseDateParts(expense.date).day,
  };
}

export function buildRecurringDraftFromForm(formData: FormData): RecurringRuleDraft {
  return {
    description: formData.description,
    amount: formData.amount,
    category: formData.category,
    type: formData.type,
    paidBy: formData.paidBy,
    recurringDay: formData.recurringDay,
  };
}

export function getRecurringProcessedMonthIso(dateStr: string): string {
  const { year, month } = parseDateParts(dateStr);
  return new Date(Date.UTC(year, month, 15, 12, 0, 0)).toISOString();
}

export function getCurrentMonthProcessedIso(today: Date = new Date()): string {
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 15, 12, 0, 0)).toISOString();
}

export function buildRecurringRuleFromDraft(
  draft: RecurringRuleDraft,
  id: number,
  lastProcessed: string
): RecurringTransaction {
  return {
    id,
    description: draft.description.trim(),
    amount: parseFloat(draft.amount),
    category: draft.category,
    type: draft.type,
    paidBy: draft.paidBy,
    recurringDay: Math.max(1, Math.min(31, draft.recurringDay)),
    lastProcessed,
  };
}

export function isRecurringOccurrence(expense: Expense): boolean {
  return Boolean(expense.isAuto || expense.recurringId != null);
}

export function matchesRecurringRule(expense: Expense, recurring: RecurringTransaction): boolean {
  return (
    normalizeDescription(expense.description) === normalizeDescription(recurring.description) &&
    Math.abs(expense.amount - recurring.amount) < 0.01 &&
    expense.category === recurring.category &&
    expense.type === recurring.type &&
    expense.paidBy === recurring.paidBy &&
    parseDateParts(expense.date).day === recurring.recurringDay
  );
}

export function resolveRecurringRuleLink(
  expense: Expense,
  recurringRules: RecurringTransaction[]
): ResolvedRecurringRuleLink {
  if (expense.recurringId != null) {
    const linkedRule = recurringRules.find(rule => rule.id === expense.recurringId) ?? null;
    return {
      recurring: linkedRule,
      resolvedRecurringId: linkedRule?.id ?? expense.recurringId,
      isRecurringOccurrence: true,
      canEditRule: linkedRule !== null,
      isAmbiguousLegacyMatch: false,
      missingExplicitRule: linkedRule === null,
    };
  }

  if (!expense.isAuto) {
    return {
      recurring: null,
      resolvedRecurringId: null,
      isRecurringOccurrence: false,
      canEditRule: false,
      isAmbiguousLegacyMatch: false,
      missingExplicitRule: false,
    };
  }

  const matchingRules = recurringRules.filter(rule => matchesRecurringRule(expense, rule));
  if (matchingRules.length === 1) {
    return {
      recurring: matchingRules[0],
      resolvedRecurringId: matchingRules[0].id,
      isRecurringOccurrence: true,
      canEditRule: true,
      isAmbiguousLegacyMatch: false,
      missingExplicitRule: false,
    };
  }

  return {
    recurring: null,
    resolvedRecurringId: null,
    isRecurringOccurrence: true,
    canEditRule: false,
    isAmbiguousLegacyMatch: matchingRules.length > 1,
    missingExplicitRule: false,
  };
}
