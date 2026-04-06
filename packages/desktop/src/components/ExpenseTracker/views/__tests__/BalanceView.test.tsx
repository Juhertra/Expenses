import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import i18n from '../../../../i18n';
import { BalanceView } from '../BalanceView';
import type { Expense, HouseholdSettings, PartnerNames, Settlement } from '@expenses/shared/types';
import { ThemeProvider, themes } from '../../../../lib/theme';

function makeExpense(overrides: Partial<Expense> & { id: number }): Expense {
  const { id, ...rest } = overrides;
  return {
    id,
    description: 'Expense',
    amount: 100,
    category: 'Housing',
    type: 'expense',
    date: '2026-04-10',
    paidBy: 'partner2',
    ...rest,
  };
}

function makeSettlement(overrides: Partial<Settlement> & { id: number }): Settlement {
  const { id, ...rest } = overrides;
  return {
    id,
    date: '2026-04-20',
    amount: 10,
    from: 'partner1',
    to: 'partner2',
    ...rest,
  };
}

const partnerNames: PartnerNames = {
  partner1: 'Hernan',
  partner2: 'Sivan',
};

const settings: HouseholdSettings = {
  currencyCode: 'ILS',
  currencySymbol: '$',
  splitMode: 'equal',
  partner1Ratio: 0.5,
  budgets: {},
  normalizationRules: {},
  categories: {},
};

function renderBalanceView({
  monthExpenses,
  expenses,
  settlements = [],
}: {
  monthExpenses: Expense[];
  expenses: Expense[];
  settlements?: Settlement[];
}) {
  return render(
    <ThemeProvider>
      <BalanceView
        expenses={expenses}
        monthExpenses={monthExpenses}
        selectedMonth={3}
        selectedYear={2026}
        settlements={settlements}
        partnerNames={partnerNames}
        householdSettings={settings}
        theme={themes['dark-purple']}
        formatCurrency={amount => `$${amount.toFixed(2)}`}
        formatDateLocalized={date => date}
        withLtr={value => value}
        getFocusClasses={() => ''}
        onRecordSettlement={vi.fn(async () => {})}
        onUpdateSettlement={vi.fn(async () => {})}
        onDeleteSettlement={vi.fn(async () => {})}
      />
    </ThemeProvider>
  );
}

describe('BalanceView', () => {
  const originalLanguage = i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage || 'en');
  });

  it('updates top result when scope toggles month vs cumulative', () => {
    const aprilExpense = makeExpense({ id: 1, amount: 100, date: '2026-04-10', paidBy: 'partner2' });
    const febExpense = makeExpense({ id: 2, amount: 60, date: '2026-02-10', paidBy: 'partner1' });
    const settlements = [
      makeSettlement({ id: 11, amount: 30, from: 'partner1', to: 'partner2', date: '2026-04-20' }),
    ];

    const { container } = renderBalanceView({
      monthExpenses: [aprilExpense],
      expenses: [febExpense, aprilExpense],
      settlements,
    });

    const monthAmountNode = container.querySelector('.text-4xl.font-bold.text-yellow-400');
    expect(monthAmountNode?.textContent).toBe('$20.00');
    fireEvent.click(screen.getByRole('button', { name: /Cumulative \+ settlements/i }));
    const cumulativeAmountNode = container.querySelector('.text-4xl.font-bold.text-yellow-400');
    expect(cumulativeAmountNode?.textContent).toBe('$10.00');
  });

  it('renders balanced primary result when threshold is effectively zero', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlements = [
      makeSettlement({
        id: 12,
        amount: 99.995,
        from: 'partner1',
        to: 'partner2',
        allocations: [{ expenseId: 1, amount: 50 }],
      }),
    ];

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements,
    });

    expect(screen.getByRole('heading', { name: /^Balanced$/i })).toBeTruthy();
  });

  it('removes the reimbursement section and renders unallocated settlements before Payment breakdown', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const settlements = [
      makeSettlement({ id: 13, amount: 50, from: 'partner1', to: 'partner2', allocations: [] }),
    ];
    const { container } = renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements,
    });

    const text = container.textContent ?? '';
    expect(text.includes('Reimbursement status')).toBe(false);
    expect(text.includes('Open to settle')).toBe(false);
    expect(text.includes('Needs linking')).toBe(false);
    expect(text.indexOf('Unallocated settlements')).toBeGreaterThan(-1);
    expect(text.indexOf('Unallocated settlements')).toBeLessThan(text.indexOf('Payment breakdown'));
  });

  it('renders unallocated settlements only when applicable and opens edit mode from that section', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const settlements = [
      makeSettlement({ id: 14, amount: 50, from: 'partner1', to: 'partner2', allocations: [] }),
    ];

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements,
    });

    expect(screen.getByTestId('unallocated-settlements-section')).toBeTruthy();
    expect(screen.getAllByTestId('unallocated-settlement-row')).toHaveLength(1);

    fireEvent.click(
      within(screen.getByTestId('unallocated-settlements-section')).getByRole('button', {
        name: /Edit settlement/i,
      })
    );
    expect(screen.getByRole('heading', { name: /Edit settlement/i })).toBeTruthy();
  });

  it('shows allocation-status badges in the main settlements list', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const settlements = [
      makeSettlement({
        id: 15,
        amount: 50,
        from: 'partner1',
        to: 'partner2',
        allocations: [{ expenseId: 1, amount: 50 }],
      }),
    ];

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements,
    });

    expect(screen.queryByTestId('unallocated-settlements-section')).toBeNull();
    const settlementsSection = screen.getByTestId('settlements-section');
    expect(within(settlementsSection).getByText('Fully allocated')).toBeTruthy();
  });

  it('opens Record payment with no pre-added allocations and updated allocation copy', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    expect(screen.getByRole('heading', { name: /Record Settlement/i })).toBeTruthy();
    expect(screen.getByText('Settlement allocations (optional)')).toBeTruthy();
    expect(screen.getByText('No settlement allocations')).toBeTruthy();
  });

  it('shows current-scope candidates first and reveals historical candidates on demand', () => {
    const marchExpense = makeExpense({ id: 1, description: 'March rent', amount: 100, paidBy: 'partner2', date: '2026-03-10' });
    const aprilExpense = makeExpense({ id: 2, description: 'April rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });

    renderBalanceView({
      monthExpenses: [aprilExpense],
      expenses: [marchExpense, aprilExpense],
      settlements: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add allocation/i }));

    expect(screen.getByRole('option', { name: /April rent/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /March rent/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Show all eligible expenses/i }));
    expect(screen.getByRole('option', { name: /March rent/i })).toBeTruthy();
  });

  it('auto-allocates current-scope expenses oldest first', () => {
    const olderExpense = makeExpense({ id: 1, description: 'Older', amount: 40, paidBy: 'partner2', date: '2026-04-01' });
    const newerExpense = makeExpense({ id: 2, description: 'Newer', amount: 60, paidBy: 'partner2', date: '2026-04-02' });

    renderBalanceView({
      monthExpenses: [olderExpense, newerExpense],
      expenses: [olderExpense, newerExpense],
      settlements: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Auto-allocate oldest first/i }));

    const selects = screen.getAllByRole('combobox');
    expect(selects.some(select => (select as HTMLSelectElement).value === '1')).toBe(true);
    expect(selects.some(select => (select as HTMLSelectElement).value === '2')).toBe(true);
    expect(screen.getByDisplayValue('20.00')).toBeTruthy();
    expect(screen.getByDisplayValue('30.00')).toBeTruthy();
  });

  it('keeps settlement visibility behavior by scope', () => {
    const marchExpense = makeExpense({
      id: 1,
      description: 'March rent',
      amount: 100,
      paidBy: 'partner2',
      date: '2026-03-10',
    });
    const aprilExpense = makeExpense({
      id: 2,
      description: 'April rent',
      amount: 100,
      paidBy: 'partner2',
      date: '2026-04-10',
    });
    const settlements = [
      makeSettlement({ id: 20, date: '2026-03-10', amount: 10, note: 'March settlement', allocations: [] }),
      makeSettlement({ id: 21, date: '2026-04-15', amount: 5, note: 'April settlement', allocations: [] }),
    ];

    renderBalanceView({
      monthExpenses: [aprilExpense],
      expenses: [marchExpense, aprilExpense],
      settlements,
    });

    expect(screen.queryByText(/March settlement/i)).toBeNull();
    expect(
      within(screen.getByTestId('settlements-section')).getAllByText(/April settlement/i).length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Cumulative \+ settlements/i }));

    expect(
      within(screen.getByTestId('settlements-section')).getAllByText(/March settlement/i).length
    ).toBeGreaterThan(0);
    expect(
      within(screen.getByTestId('settlements-section')).getAllByText(/April settlement/i).length
    ).toBeGreaterThan(0);
  });

  it('renders the new settlement/allocation copy in Hebrew', async () => {
    await i18n.changeLanguage('he');
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const settlements = [
      makeSettlement({ id: 30, amount: 50, from: 'partner1', to: 'partner2', allocations: [] }),
    ];

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements,
    });

    expect(screen.getByText('התחשבנויות לא מוקצות')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /רשום תשלום/i }));
    expect(screen.getByText('הקצאות להתחשבנות (אופציונלי)')).toBeTruthy();
  });
});
