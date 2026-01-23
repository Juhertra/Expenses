import type { Expense, RecurringTransaction } from '../../lib/types';

export interface RecurringProcessResult {
  updatedExpenses: Expense[];
  updatedRecurring: RecurringTransaction[];
  changed: boolean;
}

/**
 * Process recurring transactions for the current month.
 * Pure function: returns updated lists without touching storage or React state.
 */
export function processRecurringTransactions(
  recurringList: RecurringTransaction[],
  currentExpenses: Expense[],
  today: Date = new Date()
): RecurringProcessResult {
  const updatedExpenses = [...currentExpenses];
  const updatedRecurring = recurringList.map(r => ({ ...r }));
  let changed = false;

  for (const rec of updatedRecurring) {
    if (!rec.lastProcessed) {
      rec.lastProcessed = today.toISOString();
      changed = true;
      continue;
    }

    const lastProcessedDate = new Date(rec.lastProcessed);
    const lastMonth = lastProcessedDate.getMonth();
    const lastYear = lastProcessedDate.getFullYear();

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Skip if already processed this month
    if (lastYear === currentYear && lastMonth === currentMonth) continue;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const effectiveDay = Math.min(rec.recurringDay, daysInMonth);

    const newExpense: Expense = {
      id: Date.now() + Math.random(),
      description: rec.description,
      amount: rec.amount,
      category: rec.category,
      type: rec.type,
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(effectiveDay).padStart(
        2,
        '0'
      )}`,
      paidBy: rec.paidBy,
      isAuto: true,
    };

    updatedExpenses.push(newExpense);
    rec.lastProcessed = today.toISOString();
    changed = true;
  }

  return {
    updatedExpenses,
    updatedRecurring,
    changed,
  };
}
