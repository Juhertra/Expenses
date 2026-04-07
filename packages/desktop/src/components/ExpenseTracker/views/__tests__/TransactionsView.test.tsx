import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { Expense, HouseholdSettings, PartnerNames } from '@expenses/shared/types';
import i18n from '../../../../i18n';
import { ThemeProvider, themes } from '../../../../lib/theme';
import { TransactionsView } from '../TransactionsView';

const partnerNames: PartnerNames = {
  partner1: 'Hernan',
  partner2: 'Sivan',
};

const householdSettings: HouseholdSettings = {
  currencyCode: 'ILS',
  currencySymbol: '₪',
  splitMode: 'equal',
  partner1Ratio: 0.5,
  budgets: {},
  normalizationRules: {},
  categories: {},
};

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    description: 'Rent',
    amount: 7000,
    category: 'Housing',
    type: 'expense',
    date: '2026-04-10',
    paidBy: 'partner2',
    ...overrides,
  };
}

function renderTransactionsView(props?: Partial<ComponentProps<typeof TransactionsView>>) {
  const defaultProps: ComponentProps<typeof TransactionsView> = {
    filteredExpenses: [makeExpense()],
    expenses: [makeExpense()],
    categories: { Housing: { icon: '🏠', color: 'bg-orange-500' } },
    partnerNames,
    householdSettings,
    theme: themes['dark-purple'],
    searchQuery: '',
    selectedCategory: null,
    bulkMode: false,
    selectedIds: new Set<number>(),
    inlineEditId: null,
    inlineEditData: {},
    transactionPage: 1,
    filterPresets: [],
    totalExpense: 7000,
    totalIncome: 0,
    selectedMonth: 3,
    selectedYear: 2026,
    ITEMS_PER_PAGE: 20,
    savingTransaction: false,
    deletingItem: false,
    setShowAddModal: vi.fn(),
    setBulkMode: vi.fn(),
    setSelectedIds: vi.fn(),
    setSelectedCategory: vi.fn(),
    setSearchQuery: vi.fn(),
    setTransactionPage: vi.fn(),
    setInlineEditId: vi.fn(),
    setInlineEditData: vi.fn(),
    setSelectedMonth: vi.fn(),
    setSelectedYear: vi.fn(),
    formatCurrency: amount => `₪${amount.toFixed(2)}`,
    formatDateLocalized: value => value,
    formatSigned: amount => amount.toFixed(2),
    withLtr: value => value,
    getCategoryLabel: value => value,
    showToast: vi.fn(),
    toggleSelection: vi.fn(),
    bulkCategorize: vi.fn(),
    bulkDelete: vi.fn(),
    saveInlineEdit: vi.fn(),
    editExpense: vi.fn(),
    confirmDeleteExpense: vi.fn(),
    ...props,
  };

  return render(
    <ThemeProvider>
      <TransactionsView {...defaultProps} />
    </ThemeProvider>
  );
}

describe('TransactionsView', () => {
  const originalLanguage = i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage || 'en');
  });

  it('shows a recurring badge and hides inline quick edit for recurring expenses', () => {
    renderTransactionsView({
      filteredExpenses: [makeExpense({ recurringId: 9 })],
      expenses: [makeExpense({ recurringId: 9 })],
    });

    expect(screen.getByText(i18n.t('labels.recurringRuleBadge'))).not.toBeNull();
    expect(screen.queryByTitle(i18n.t('tooltips.quickEdit'))).toBeNull();
  });

  it('does not open inline quick edit on recurring-row double click', () => {
    const setInlineEditId = vi.fn();
    renderTransactionsView({
      filteredExpenses: [makeExpense({ recurringId: 9, description: 'Vaad' })],
      expenses: [makeExpense({ recurringId: 9, description: 'Vaad' })],
      setInlineEditId,
    });

    fireEvent.doubleClick(screen.getByText('Vaad'));

    expect(setInlineEditId).not.toHaveBeenCalled();
  });

  it('still allows inline quick edit for normal expenses', () => {
    const setInlineEditId = vi.fn();
    renderTransactionsView({
      filteredExpenses: [makeExpense({ description: 'Groceries' })],
      expenses: [makeExpense({ description: 'Groceries' })],
      setInlineEditId,
    });

    fireEvent.doubleClick(screen.getByText('Groceries'));

    expect(setInlineEditId).toHaveBeenCalledWith(1);
  });
});
