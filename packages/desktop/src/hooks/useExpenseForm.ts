import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Expense, FormData, RecurringTransaction } from '@expenses/shared/types';
import { useDataContext } from '../contexts/ExpenseContext';
import { useUIContext } from '../contexts/UIContext';
import { useModalContext } from '../contexts/ModalContext';
import {
  setExpenses as persistExpenses,
  setRecurring as persistRecurring,
} from '../services/storage';
import { getLocalISODate } from '../lib/date';

/**
 * Hook for managing expense form state and operations (add, edit, validate)
 */
export function useExpenseForm() {
  const { t } = useTranslation();
  const {
    expenses,
    setExpenses,
    recurring,
    setRecurring,
    setDirty,
  } = useDataContext();
  const { lastExpenseCategory, lastIncomeCategory, setLastExpenseCategory, setLastIncomeCategory, showToast } = useUIContext();
  const { setShowAddModal, editingId, setEditingId } = useModalContext();

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    category: 'Housing',
    type: 'expense',
    date: getLocalISODate(),
    paidBy: 'partner1',
    isRecurring: false,
    recurringDay: 1
  });

  // Loading state
  const [savingTransaction, setSavingTransaction] = useState(false);

  /**
   * Create canonical form of a description (for safe matching)
   * Canonical = lowercase + trim + collapse whitespace
   */
  const canonicalForm = useCallback((desc: string): string => {
    return desc.trim().replace(/\s+/g, ' ').toLowerCase();
  }, []);

  /**
   * Memoized expense index by date for O(1) lookup during duplicate detection
   * Instead of scanning all expenses (O(n)), we only scan expenses on the same date
   */
  const expensesByDate = useMemo(() => {
    const index = new Map<string, Expense[]>();
    for (const exp of expenses) {
      const list = index.get(exp.date);
      if (list) {
        list.push(exp);
      } else {
        index.set(exp.date, [exp]);
      }
    }
    return index;
  }, [expenses]);

  /**
   * Check for duplicate transactions (same date, amount, canonical description)
   * Uses canonical form for stable comparison that won't change with normalization rules
   * Optimized to use date-indexed lookup for O(1) instead of O(n)
   * @param excludeId - ID to exclude when checking (for updates)
   */
  const checkDuplicate = useCallback((
    date: string,
    amount: number,
    normalizedDesc: string,
    excludeId?: number
  ): Expense | null => {
    // Allow repeat incomes (partners can record the same income name/amount/date)
    if (formData.type === 'income') return null;

    // Get only expenses on this date (O(1) lookup)
    const dateExpenses = expensesByDate.get(date);
    if (!dateExpenses) return null;

    const canonicalDesc = canonicalForm(normalizedDesc);
    return dateExpenses.find(e =>
      Math.abs(e.amount - amount) < 0.01 &&
      e.type === formData.type &&
      e.paidBy === formData.paidBy &&
      canonicalForm(e.description) === canonicalDesc &&
      e.id !== excludeId
    ) || null;
  }, [expensesByDate, formData.type, formData.paidBy, canonicalForm]);

  /**
   * Validate form data before adding/updating
   * @returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    // Description must not be empty
    if (!formData.description.trim()) {
      alert(t('errors.descriptionRequired'));
      return false;
    }

    // Amount must be a positive number
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(t('errors.amountGreaterThanZero'));
      return false;
    }

    // Recurring day must be between 1 and 31
    if (formData.isRecurring) {
      const day = formData.recurringDay;
      if (day < 1 || day > 31) {
        alert(t('errors.recurringDayInvalid'));
        return false;
      }
    }

    return true;
  }, [formData, t]);

  /**
   * Save expenses to storage and update state
   * @returns true if successful, false if storage quota exceeded
   */
  const saveExpenses = useCallback(async (newExpenses: Expense[]): Promise<boolean> => {
    const success = await persistExpenses(newExpenses);
    if (success) {
      setExpenses(newExpenses);
    }
    return success;
  }, [setExpenses]);

  /**
   * Save recurring transactions to storage and update state
   * @returns true if successful, false if storage quota exceeded
   */
  const saveRecurring = useCallback(async (newRecurring: RecurringTransaction[]): Promise<boolean> => {
    const success = await persistRecurring(newRecurring);
    if (success) {
      setRecurring(newRecurring);
    }
    return success;
  }, [setRecurring]);

  /**
   * Reset the form to initial state and close the add/edit modal.
   */
  const resetForm = useCallback(() => {
    setFormData({
      description: '',
      amount: '',
      category: 'Housing',
      type: 'expense',
      date: getLocalISODate(),
      paidBy: 'partner1',
      isRecurring: false,
      recurringDay: 1
    });
    setShowAddModal(false);
    setEditingId(null);
  }, [setShowAddModal, setEditingId]);

  /**
   * Add a new expense and optionally a recurring entry based on form data.
   */
  const addExpense = useCallback(async () => {
    if (!validateForm()) return;

    // Trim description but preserve user's original casing/formatting
    const userDescription = formData.description.trim();

    // Check for duplicates using canonical form (for comparison only, not storage)
    const duplicate = checkDuplicate(
      formData.date,
      parseFloat(formData.amount),
      userDescription
    );

    if (duplicate) {
      if (!confirm(t('dialogs.duplicateConfirm', { description: duplicate.description, date: duplicate.date }))) {
        return; // User cancelled
      }
    }

    setSavingTransaction(true);
    try {
      const newExpense: Expense = {
        id: Date.now(),
        description: userDescription, // Store original user-entered description
        amount: parseFloat(formData.amount),
        category: formData.category,
        type: formData.type,
        date: formData.date,
        paidBy: formData.paidBy,
      };

      const newExpenses = [...expenses, newExpense];
      const expensesSaved = await saveExpenses(newExpenses);

      if (!expensesSaved) {
        showToast(t('errors.storageFailed', { defaultValue: 'Failed to save to storage. Your data may not be persisted.' }), 'error');
      }

      setDirty(true); // Mark as dirty (unsaved changes)

      // Remember last category for quick add
      if (newExpense.type === 'expense') {
        setLastExpenseCategory(newExpense.category);
      } else {
        setLastIncomeCategory(newExpense.category);
      }

      if (formData.isRecurring) {
        // Clamp recurring day to 1-31 range
        const clampedDay = Math.max(1, Math.min(31, formData.recurringDay));

        const newRecurringItem: RecurringTransaction = {
          id: Date.now() + 1,
          description: userDescription, // Store original user-entered description
          amount: parseFloat(formData.amount),
          category: formData.category,
          type: formData.type,
          paidBy: formData.paidBy,
          recurringDay: clampedDay,
          lastProcessed: new Date().toISOString()
        };
        const recurringSaved = await saveRecurring([...recurring, newRecurringItem]);

        if (!recurringSaved) {
          showToast(t('errors.storageFailed', { defaultValue: 'Failed to save recurring transaction to storage.' }), 'error');
        }

        setDirty(true); // Mark as dirty
      }

      resetForm();
    } finally {
      setSavingTransaction(false);
    }
  }, [
    validateForm,
    formData,
    checkDuplicate,
    expenses,
    recurring,
    saveExpenses,
    saveRecurring,
    setDirty,
    setLastExpenseCategory,
    setLastIncomeCategory,
    resetForm,
    t
  ]);

  /**
   * Update an existing expense based on the editing ID and form data.
   */
  const updateExpense = useCallback(async () => {
    if (!validateForm()) return;

    // Trim description but preserve user's original casing/formatting
    const userDescription = formData.description.trim();

    // Check for duplicates using canonical form (excluding current expense being edited)
    const duplicate = checkDuplicate(
      formData.date,
      parseFloat(formData.amount),
      userDescription,
      editingId || undefined
    );

    if (duplicate) {
      if (!confirm(t('dialogs.duplicateConfirm', { description: duplicate.description, date: duplicate.date }))) {
        return; // User cancelled
      }
    }

    setSavingTransaction(true);
    try {
      const newExpenses = expenses.map(exp =>
        exp.id === editingId
          ? { ...exp, description: userDescription, amount: parseFloat(formData.amount), category: formData.category, type: formData.type, date: formData.date, paidBy: formData.paidBy }
          : exp
      );
      const saved = await saveExpenses(newExpenses);

      if (!saved) {
        showToast(t('errors.storageFailed', { defaultValue: 'Failed to save changes to storage.' }), 'error');
      }

      setDirty(true); // Mark as dirty (unsaved changes)
      resetForm();
    } finally {
      setSavingTransaction(false);
    }
  }, [
    validateForm,
    formData,
    checkDuplicate,
    editingId,
    expenses,
    saveExpenses,
    setDirty,
    resetForm,
    t
  ]);

  /**
   * Populate the form with an existing expense's data for editing.
   *
   * @param expense Expense object to edit
   */
  const editExpense = useCallback((expense: Expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      type: expense.type,
      date: expense.date,
      paidBy: expense.paidBy,
      isRecurring: false,
      recurringDay: 1
    });
    setEditingId(expense.id);
    setShowAddModal(true);
  }, [setEditingId, setShowAddModal]);

  /**
   * Open quick add modal with pre-selected type and last-used category
   * Uses functional update to avoid depending on formData
   */
  const openQuickAdd = useCallback((type: 'expense' | 'income') => {
    setFormData(prev => ({
      ...prev,
      type,
      date: getLocalISODate(),
      category: type === 'expense' ? lastExpenseCategory : lastIncomeCategory
    }));
    setShowAddModal(true);
  }, [lastExpenseCategory, lastIncomeCategory, setShowAddModal]);

  return {
    // State
    formData,
    setFormData,
    savingTransaction,

    // Operations
    addExpense,
    updateExpense,
    editExpense,
    resetForm,
    openQuickAdd,

    // Validation
    validateForm,
    checkDuplicate,
  };
}
