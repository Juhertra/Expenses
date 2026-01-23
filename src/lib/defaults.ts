/**
 * Shared defaults for categories, settings, and seed data.
 * Keeping values identical to the previous inline definitions to avoid UI or schema changes.
 */
import type { Category, HouseholdSettings } from './types';

export const DEFAULT_CATEGORIES: Record<string, Category> = {
  Housing: { icon: '🏠', color: 'bg-orange-500' },
  Food: { icon: '🍔', color: 'bg-green-500' },
  Transportation: { icon: '🚗', color: 'bg-blue-500' },
  Utilities: { icon: '⚡', color: 'bg-yellow-500' },
  Healthcare: { icon: '🏥', color: 'bg-red-500' },
  Entertainment: { icon: '🎮', color: 'bg-purple-500' },
  Shopping: { icon: '🛍️', color: 'bg-pink-500' },
  Education: { icon: '📚', color: 'bg-indigo-500' },
  Insurance: { icon: '🛡️', color: 'bg-cyan-500' },
  Savings: { icon: '💰', color: 'bg-emerald-500' },
  Other: { icon: '📌', color: 'bg-gray-500' },
};

export const defaultSettings: HouseholdSettings = {
  currencyCode: 'ILS',
  currencySymbol: '₪',
  splitMode: 'equal',
  partner1Ratio: 0.5,
  budgets: {},
  normalizationRules: {},
  categories: { ...DEFAULT_CATEGORIES },
};

export const defaultPartnerNames = {
  partner1: 'Partner 1',
  partner2: 'Partner 2',
};

/**
 * Seed data for first-run localStorage initialization (web only).
 */
export function getDefaultSeedData() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const formatDate = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    partnerNames: {
      partner1: 'Hernan',
      partner2: 'Partner',
    },
    expenses: [
      {
        id: Date.now() - 3000,
        description: 'Monthly Rent',
        amount: 1500,
        category: 'Housing',
        type: 'expense',
        date: formatDate(1),
        paidBy: 'joint',
      },
      {
        id: Date.now() - 2000,
        description: 'Grocery Shopping',
        amount: 120.5,
        category: 'Food',
        type: 'expense',
        date: formatDate(5),
        paidBy: 'partner1',
      },
      {
        id: Date.now() - 1000,
        description: 'Salary',
        amount: 4500,
        category: 'Other',
        type: 'income',
        date: formatDate(1),
        paidBy: 'partner1',
      },
    ],
    recurring: [],
  };
}
