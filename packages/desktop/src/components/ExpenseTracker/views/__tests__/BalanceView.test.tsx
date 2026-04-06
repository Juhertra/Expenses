import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '../../../../i18n';
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
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: originalScrollIntoView,
    });
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

  it('renders Reimbursement status section before Payment breakdown', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const { container } = renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [],
    });

    const text = container.textContent ?? '';
    expect(text.indexOf('Reimbursement status')).toBeGreaterThan(-1);
    expect(text.indexOf('Payment breakdown')).toBeGreaterThan(-1);
    expect(text.indexOf('Reimbursement status')).toBeLessThan(text.indexOf('Payment breakdown'));
  });

  it('renders open-to-settle rows oldest-first and pre-fills settlement from actionable remaining', () => {
    const olderExpense = makeExpense({ id: 1, description: 'Older', amount: 40, paidBy: 'partner2', date: '2026-04-01' });
    const newerExpense = makeExpense({ id: 2, description: 'Newer', amount: 60, paidBy: 'partner2', date: '2026-04-02' });
    const balancingSettlement = makeSettlement({
      id: 13,
      date: '2026-04-05',
      amount: 35,
      from: 'partner1',
      to: 'partner2',
    });

    renderBalanceView({
      monthExpenses: [olderExpense, newerExpense],
      expenses: [olderExpense, newerExpense],
      settlements: [balancingSettlement],
    });

    const openRows = screen.getAllByTestId('reimbursement-open-row');
    expect(openRows).toHaveLength(1);
    expect(openRows[0].textContent).toContain('2026-04-01 - Older');

    fireEvent.click(screen.getByRole('button', { name: /Create settlement/i }));
    expect(screen.getByText(/Record Settlement/i)).toBeTruthy();
    expect(screen.getAllByDisplayValue('15.00').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps needs-linking collapsed by default, with count badge and newest-first ordering when expanded', () => {
    const olderExpense = makeExpense({ id: 1, description: 'Older', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
    const newerExpense = makeExpense({ id: 2, description: 'Newer', amount: 60, paidBy: 'partner2', date: '2026-04-12' });
    const unlinkedSettlement = makeSettlement({
      id: 14,
      date: '2026-04-15',
      amount: 80,
      from: 'partner1',
      to: 'partner2',
      allocations: [],
    });

    renderBalanceView({
      monthExpenses: [olderExpense, newerExpense],
      expenses: [olderExpense, newerExpense],
      settlements: [unlinkedSettlement],
    });

    expect(screen.getByText(/Some expenses are still unlinked for traceability./i)).toBeTruthy();
    const toggle = screen.getByTestId('needs-linking-toggle');
    expect(toggle.textContent).toContain('2');
    expect(screen.queryAllByTestId('reimbursement-needs-linking-row')).toHaveLength(0);

    fireEvent.click(toggle);
    const rows = screen.getAllByTestId('reimbursement-needs-linking-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('2026-04-12 - Newer');
    expect(rows[1].textContent).toContain('2026-04-10 - Older');
  });

  it('review settlements only scrolls and applies temporary highlight to settlements section', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
    const settlement = makeSettlement({
      id: 15,
      amount: 50,
      from: 'partner1',
      to: 'partner2',
      allocations: [],
    });

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
    });

    fireEvent.click(screen.getByTestId('needs-linking-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /Review settlements/i }));

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    const settlementsSection = screen.getByTestId('settlements-section');
    expect(settlementsSection.className).toContain('border-amber-400/80');
  });

  it('renders exact month and cumulative balanced no-action copy', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });
    const settlement = makeSettlement({
      id: 16,
      amount: 50,
      from: 'partner1',
      to: 'partner2',
      allocations: [{ expenseId: 1, amount: 50 }],
    });

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [settlement],
    });

    expect(screen.getByText('This month is balanced. No settlement action needed.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cumulative \+ settlements/i }));
    expect(
      screen.getByText('This balance is settled through the selected month. No settlement action needed.')
    ).toBeTruthy();
  });

  it('does not render balanced empty-state copy when aggregate residual debt exists', () => {
    const tinyExpenseA = makeExpense({ id: 30, description: 'Tiny A', amount: 0.01, paidBy: 'partner2', date: '2026-04-10' });
    const tinyExpenseB = makeExpense({ id: 31, description: 'Tiny B', amount: 0.01, paidBy: 'partner2', date: '2026-04-11' });

    renderBalanceView({
      monthExpenses: [tinyExpenseA, tinyExpenseB],
      expenses: [tinyExpenseA, tinyExpenseB],
      settlements: [],
    });

    expect(screen.queryByText('This month is balanced. No settlement action needed.')).toBeNull();
    expect(
      screen.getByText('No reimbursement rows are available in this scope. Check the top balance for any residual amount.')
    ).toBeTruthy();
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
      makeSettlement({ id: 20, date: '2026-03-10', amount: 10, note: 'March settlement' }),
      makeSettlement({ id: 21, date: '2026-04-15', amount: 5, note: 'April settlement' }),
    ];

    renderBalanceView({
      monthExpenses: [aprilExpense],
      expenses: [marchExpense, aprilExpense],
      settlements,
    });

    expect(screen.queryByText(/March settlement/i)).toBeNull();
    expect(screen.getByText(/April settlement/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Cumulative \+ settlements/i }));

    expect(screen.getByText(/March settlement/i)).toBeTruthy();
    expect(screen.getByText(/April settlement/i)).toBeTruthy();
  });
});
