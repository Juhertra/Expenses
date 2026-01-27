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
 * Seed data for first-run initialization.
 * Ships with EMPTY data - users start with a clean slate.
 * If a saved file exists, that data will be loaded instead.
 */
export function getDefaultSeedData() {
  return {
    partnerNames: {
      partner1: 'Partner 1',
      partner2: 'Partner 2',
    },
    expenses: [],
    recurring: [],
  };
}
