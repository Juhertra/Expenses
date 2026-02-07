/**
 * Storage Service Tests
 *
 * Basic smoke tests to verify AsyncStorage adapter works
 * Run with: npm test (when jest is configured)
 */

import { getExpenses, setExpenses, getPartnerNames, setPartnerNames } from '../storageService';
import type { Expense, PartnerNames } from '@expenses/shared';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    clear: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('storageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExpenses', () => {
    it('should return empty array when no data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getExpenses();

      expect(result).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('household-expenses');
    });

    it('should return parsed expenses when data exists', async () => {
      const mockExpenses: Expense[] = [
        {
          id: 1,
          description: 'Coffee',
          amount: 5.0,
          category: 'Food',
          type: 'expense',
          date: '2026-02-07',
          paidBy: 'partner1',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockExpenses)
      );

      const result = await getExpenses();

      expect(result).toEqual(mockExpenses);
    });

    it('should return empty array on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await getExpenses();

      expect(result).toEqual([]);
    });
  });

  describe('setExpenses', () => {
    it('should save expenses to AsyncStorage', async () => {
      const expenses: Expense[] = [
        {
          id: 1,
          description: 'Lunch',
          amount: 12.5,
          category: 'Food',
          type: 'expense',
          date: '2026-02-07',
          paidBy: 'partner1',
        },
      ];

      await setExpenses(expenses);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'household-expenses',
        JSON.stringify(expenses)
      );
    });
  });

  describe('getPartnerNames', () => {
    it('should return default partner names when no data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getPartnerNames();

      expect(result).toEqual({
        partner1: 'Partner 1',
        partner2: 'Partner 2',
      });
    });

    it('should return stored partner names when data exists', async () => {
      const mockNames: PartnerNames = {
        partner1: 'Alice',
        partner2: 'Bob',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockNames)
      );

      const result = await getPartnerNames();

      expect(result).toEqual(mockNames);
    });
  });

  describe('setPartnerNames', () => {
    it('should save partner names to AsyncStorage', async () => {
      const names: PartnerNames = {
        partner1: 'Charlie',
        partner2: 'Dana',
      };

      await setPartnerNames(names);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'household-partner-names',
        JSON.stringify(names)
      );
    });
  });
});
