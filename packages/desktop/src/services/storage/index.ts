import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
} from '@expenses/shared/types';
import {
  loadAllData,
  loadExpenses,
  loadRecurring,
  loadPartnerNames,
  loadSettings,
  loadSettlements,
  saveExpenses,
  saveRecurring,
  savePartnerNames,
  saveSettings,
  saveSettlements,
  STORAGE_KEYS,
} from '../../lib/storageService';

export const storageKeys = STORAGE_KEYS;

export const getAllData = loadAllData;

export const getExpenses = loadExpenses;
export const setExpenses = saveExpenses;

export const getRecurring = loadRecurring;
export const setRecurring = saveRecurring;

export const getPartnerNames = loadPartnerNames;
export const setPartnerNames = savePartnerNames;

export const getSettings = loadSettings;
export const setSettings = saveSettings;

export const getSettlements = loadSettlements;
export const setSettlements = saveSettlements;

export type StorageSlices = {
  expenses: Expense[];
  recurring: RecurringTransaction[];
  partnerNames: PartnerNames;
  settings: HouseholdSettings | null;
  settlements: Settlement[];
};
