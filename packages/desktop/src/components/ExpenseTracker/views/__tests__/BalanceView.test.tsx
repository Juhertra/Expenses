import { describe, expect, it, vi } from 'vitest';
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
  currencySymbol: '₪',
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
        formatCurrency={(amount) => `₪${amount.toFixed(2)}`}
        formatDateLocalized={(date) => date}
        withLtr={(value) => value}
        getFocusClasses={() => ''}
        onRecordSettlement={vi.fn(async () => {})}
        onUpdateSettlement={vi.fn(async () => {})}
        onDeleteSettlement={vi.fn(async () => {})}
      />
    </ThemeProvider>
  );
}

describe('BalanceView', () => {
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
    expect(monthAmountNode?.textContent).toBe('₪20.00');
    fireEvent.click(screen.getByRole('button', { name: /Cumulative \+ settlements/i }));
    const cumulativeAmountNode = container.querySelector('.text-4xl.font-bold.text-yellow-400');
    expect(cumulativeAmountNode?.textContent).toBe('₪10.00');
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

  it('opens settlement modal prefilled from obligation row', () => {
    const expense = makeExpense({ id: 1, description: 'Rent', amount: 100, paidBy: 'partner2' });

    renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /Create settlement/i }));

    expect(screen.getByText(/Record Settlement/i)).toBeTruthy();
    // Amount is prefilled both in top amount input and linked row amount input.
    expect(screen.getAllByDisplayValue('50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Recommended for this expense/i)).toBeTruthy();
  });

  it('prefills Create settlement amount without exceeding obligation remaining', () => {
    const fractionalExpense = makeExpense({
      id: 3,
      description: 'Fractional rent',
      amount: 66.67,
      paidBy: 'partner2',
    });

    renderBalanceView({
      monthExpenses: [fractionalExpense],
      expenses: [fractionalExpense],
      settlements: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /Create settlement/i }));

    // Remaining is 33.335, prefill should round down to 33.33 to stay valid against availability checks.
    expect(screen.getAllByDisplayValue('33.33').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Outstanding obligations section before Payment breakdown', () => {
    const expense = makeExpense({ id: 1, amount: 100, paidBy: 'partner2' });
    const { container } = renderBalanceView({
      monthExpenses: [expense],
      expenses: [expense],
      settlements: [],
    });

    const text = container.textContent ?? '';
    expect(text.indexOf('Outstanding obligations')).toBeGreaterThan(-1);
    expect(text.indexOf('Payment breakdown')).toBeGreaterThan(-1);
    expect(text.indexOf('Outstanding obligations')).toBeLessThan(text.indexOf('Payment breakdown'));
  });

  it('keeps settlement visibility behavior by scope', () => {
    const marchExpense = makeExpense({ id: 1, description: 'March rent', amount: 100, paidBy: 'partner2', date: '2026-03-10' });
    const aprilExpense = makeExpense({ id: 2, description: 'April rent', amount: 100, paidBy: 'partner2', date: '2026-04-10' });
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
