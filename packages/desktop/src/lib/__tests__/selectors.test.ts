import { describe, it, expect } from 'vitest';
import {
  selectFilteredExpenses,
  selectCategoryDeltas,
} from '../../state/selectors';
import type { FilterState } from '../../state/selectors';
import type { Expense } from '@expenses/shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultPartnerNames = { partner1: 'Alice', partner2: 'Bob' };

function makeState(
  expenses: Expense[],
  ui: Partial<FilterState['ui']> = {}
): FilterState {
  return {
    expenses,
    partnerNames: defaultPartnerNames,
    ui: {
      selectedMonth: 0, // January
      selectedYear: 2026,
      selectedCategory: null,
      searchQuery: '',
      ...ui,
    },
  };
}

function makeExpense(overrides: Partial<Expense> & { id: number }): Expense {
  return {
    description: 'Test',
    amount: 100,
    category: 'Food',
    type: 'expense',
    date: '2026-01-15',
    paidBy: 'partner1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// selectFilteredExpenses
// ---------------------------------------------------------------------------

describe('selectFilteredExpenses', () => {
  it('returns only expenses that match the selected month and year', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-01-10' }), // Jan 2026 ✓
      makeExpense({ id: 2, date: '2026-02-10' }), // Feb 2026 ✗
      makeExpense({ id: 3, date: '2025-01-10' }), // Jan 2025 ✗
    ];
    const result = selectFilteredExpenses(makeState(expenses, { selectedMonth: 0, selectedYear: 2026 }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns all matching expenses when no category or search filter is set', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-01-01' }),
      makeExpense({ id: 2, date: '2026-01-31' }),
    ];
    const result = selectFilteredExpenses(makeState(expenses));
    expect(result).toHaveLength(2);
  });

  it('filters by category on a plain expense', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-01-01', category: 'Food' }),
      makeExpense({ id: 2, date: '2026-01-01', category: 'Housing' }),
    ];
    const result = selectFilteredExpenses(makeState(expenses, { selectedCategory: 'Housing' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filters by category on a split expense (matches any split)', () => {
    const splitExpense = makeExpense({
      id: 1,
      date: '2026-01-01',
      category: 'Mixed',
      splits: [
        { category: 'Food', amount: 60 },
        { category: 'Housing', amount: 40 },
      ],
    });
    const plainExpense = makeExpense({ id: 2, date: '2026-01-01', category: 'Food' });

    const resultFood    = selectFilteredExpenses(makeState([splitExpense, plainExpense], { selectedCategory: 'Food' }));
    const resultHousing = selectFilteredExpenses(makeState([splitExpense, plainExpense], { selectedCategory: 'Housing' }));

    // Both split and plain should match 'Food'
    expect(resultFood).toHaveLength(2);
    // Only the split expense matches 'Housing'
    expect(resultHousing).toHaveLength(1);
    expect(resultHousing[0].id).toBe(1);
  });

  it('filters by search query against description (case-insensitive)', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-01-01', description: 'Grocery Run' }),
      makeExpense({ id: 2, date: '2026-01-01', description: 'Electricity Bill' }),
    ];
    const result = selectFilteredExpenses(makeState(expenses, { searchQuery: 'grocery' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('matches search query against resolved partner name', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-01-01', paidBy: 'partner1' }), // Alice
      makeExpense({ id: 2, date: '2026-01-01', paidBy: 'partner2' }), // Bob
    ];
    // Search for "alice" — should only return partner1's expense
    const result = selectFilteredExpenses(makeState(expenses, { searchQuery: 'alice' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// selectCategoryDeltas
// ---------------------------------------------------------------------------

describe('selectCategoryDeltas', () => {
  it('returns a positive delta when a category grew month-over-month', () => {
    const current  = [makeExpense({ id: 1, date: '2026-02-01', category: 'Food', amount: 300 })];
    const previous = [makeExpense({ id: 2, date: '2026-01-01', category: 'Food', amount: 200 })];

    const deltas = selectCategoryDeltas(current, previous);
    const food = deltas.find(d => d.category === 'Food')!;

    expect(food.delta).toBe(100);
    expect(food.current).toBe(300);
    expect(food.previous).toBe(200);
  });

  it('returns a negative delta when a category shrank month-over-month', () => {
    const current  = [makeExpense({ id: 1, date: '2026-02-01', category: 'Housing', amount: 800 })];
    const previous = [makeExpense({ id: 2, date: '2026-01-01', category: 'Housing', amount: 1000 })];

    const deltas = selectCategoryDeltas(current, previous);
    const housing = deltas.find(d => d.category === 'Housing')!;

    expect(housing.delta).toBe(-200);
  });

  it('treats a category present only in current period as a full positive delta', () => {
    const current  = [makeExpense({ id: 1, date: '2026-02-01', category: 'Travel', amount: 450 })];
    const previous: Expense[] = [];

    const deltas = selectCategoryDeltas(current, previous);
    const travel = deltas.find(d => d.category === 'Travel')!;

    expect(travel.delta).toBe(450);
    expect(travel.previous).toBe(0);
  });

  it('treats a category present only in the previous period as a full negative delta', () => {
    const current: Expense[] = [];
    const previous = [makeExpense({ id: 1, date: '2026-01-01', category: 'Gym', amount: 50 })];

    const deltas = selectCategoryDeltas(current, previous);
    const gym = deltas.find(d => d.category === 'Gym')!;

    expect(gym.delta).toBe(-50);
    expect(gym.current).toBe(0);
  });
});
