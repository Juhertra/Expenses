import {
  loadExpenses,
  saveExpenses,
  loadPartnerNames,
  savePartnerNames,
  loadSettings,
  saveSettings,
} from '../storageService.ts';
import type { Expense, PartnerNames, HouseholdSettings } from '@expenses/shared/types';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('expenses', () => {
    it('should save and load expenses', async () => {
      const expenses: Expense[] = [
        {
          id: 1,
          description: 'Test',
          amount: 100,
          category: 'Food',
          type: 'expense',
          date: '2026-01-01',
          paidBy: 'partner1',
        },
      ];

      await saveExpenses(expenses);
      const loaded = await loadExpenses();

      expect(loaded).toEqual(expenses);
    });

    it('should return empty array when no expenses exist', async () => {
      const loaded = await loadExpenses();
      expect(loaded).toEqual([]);
    });
  });

  describe('partner names', () => {
    it('should save and load partner names', async () => {
      const names: PartnerNames = {
        partner1: 'Alice',
        partner2: 'Bob',
      };

      await savePartnerNames(names);
      const loaded = await loadPartnerNames();

      expect(loaded).toEqual(names);
    });

    it('should return default names when none exist', async () => {
      const loaded = await loadPartnerNames();
      expect(loaded).toEqual({ partner1: 'Partner 1', partner2: 'Partner 2' });
    });
  });

  describe('settings', () => {
    it('should save and load settings', async () => {
      const settings: HouseholdSettings = {
        currencyCode: 'USD',
        currencySymbol: '$',
        splitMode: 'equal',
        partner1Ratio: 0.5,
        budgets: {},
        normalizationRules: {},
        categories: {},
      };

      await saveSettings(settings);
      const loaded = await loadSettings();

      expect(loaded).toEqual(settings);
    });

    it('should return null when no settings exist', async () => {
      const loaded = await loadSettings();
      expect(loaded).toBeNull();
    });
  });
});

