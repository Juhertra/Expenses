import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { Expense, RecurringTransaction, PartnerNames } from '@expenses/shared/types';
import i18n from '../../../../i18n';
import { ThemeProvider, themes } from '../../../../lib/theme';
import { DashboardView } from '../DashboardView';

const partnerNames: PartnerNames = {
  partner1: 'Hernan',
  partner2: 'Sivan',
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

function makeRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: 9,
    description: 'Rent',
    amount: 7000,
    category: 'Housing',
    type: 'expense',
    paidBy: 'partner2',
    recurringDay: 10,
    lastProcessed: '2026-04-05T10:57:19.550Z',
    ...overrides,
  };
}

function renderDashboardView(props?: Partial<ComponentProps<typeof DashboardView>>) {
  const defaultProps: ComponentProps<typeof DashboardView> = {
    filteredExpenses: [makeExpense({ recurringId: 9 })],
    expenses: [makeExpense({ recurringId: 9 })],
    recurring: [makeRecurring()],
    categories: { Housing: { icon: '🏠', color: 'bg-orange-500' } },
    partnerNames,
    theme: themes['dark-purple'],
    selectedMonth: 3,
    selectedYear: 2026,
    totalExpense: 7000,
    totalIncome: 0,
    balance: -7000,
    insights: {
      largest: { amount: 7000, description: 'Rent' },
      avgDaily: 250,
      topCategory: 'Housing',
      daysWithSpending: 1,
    },
    categoryDeltas: [],
    sortedCategories: [],
    frequentExpenses: [],
    chartData: [],
    maxAmount: 7000,
    hasAnyData: true,
    renderTrend: [],
    maxTrend: 0,
    prediction: 0,
    months: ['Jan'],
    MIN_BAR_PX: 1,
    formatCurrency: amount => `₪${amount.toFixed(2)}`,
    formatDateLocalized: value => value,
    formatSigned: amount => amount.toFixed(2),
    formatPercent: value => `${value.toFixed(0)}%`,
    withLtr: value => value,
    getCategoryLabel: value => value,
    onOpenQuickAdd: vi.fn(),
    onSetShowAddModal: vi.fn(),
    onPrefillForm: vi.fn(),
    onAddFrequentExpense: vi.fn(async () => {}),
    onFilterByCategory: vi.fn(),
    onViewTransactions: vi.fn(),
    onViewMonth: vi.fn(),
    onFilterByDay: vi.fn(),
    onEditExpense: vi.fn(),
    onCreateRecurringRule: vi.fn(),
    onEditRecurringRule: vi.fn(),
    onDeleteRecurring: vi.fn(),
    showToast: vi.fn(),
    savingTransaction: false,
    ...props,
  };

  return render(
    <ThemeProvider>
      <DashboardView {...defaultProps} />
    </ThemeProvider>
  );
}

describe('DashboardView', () => {
  const originalLanguage = i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage || 'en');
  });

  it('opens recurring rule creation from the recurring header button', () => {
    const onCreateRecurringRule = vi.fn();
    renderDashboardView({ onCreateRecurringRule });

    fireEvent.click(screen.getByLabelText(i18n.t('buttons.addRecurring')));

    expect(onCreateRecurringRule).toHaveBeenCalledTimes(1);
  });

  it('opens recurring rule editing from the recurring list', () => {
    const recurringRule = makeRecurring({ id: 11, description: 'Vaad' });
    const onEditRecurringRule = vi.fn();
    renderDashboardView({
      recurring: [recurringRule],
      onEditRecurringRule,
    });

    fireEvent.click(screen.getByTitle(i18n.t('buttons.editRecurringRule')));

    expect(onEditRecurringRule).toHaveBeenCalledWith(recurringRule);
  });

  it('shows a recurring badge on linked recent expenses', () => {
    renderDashboardView({
      filteredExpenses: [makeExpense({ recurringId: 9, description: 'Tami 4' })],
      expenses: [makeExpense({ recurringId: 9, description: 'Tami 4' })],
    });

    expect(screen.getAllByText(i18n.t('labels.recurringRuleBadge')).length).toBeGreaterThan(0);
  });
});
