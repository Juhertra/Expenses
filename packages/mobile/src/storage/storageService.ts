import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
} from '@expenses/shared';
import { defaultSettings, defaultPartnerNames } from '@expenses/shared';
import { storageAdapter } from './ReactNativeStorageAdapter';

/**
 * Storage keys matching desktop implementation for data portability
 */
const STORAGE_KEYS = {
  EXPENSES: 'household-expenses',
  RECURRING: 'household-recurring',
  PARTNER_NAMES: 'household-partner-names',
  SETTINGS: 'household-settings',
  SETTLEMENTS: 'household-settlements',
} as const;

/**
 * Get expenses from storage
 */
export async function getExpenses(): Promise<Expense[]> {
  const result = await storageAdapter.get(STORAGE_KEYS.EXPENSES);
  if (!result) return [];

  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.error('Failed to parse expenses:', error);
    return [];
  }
}

/**
 * Save expenses to storage
 */
export async function setExpenses(expenses: Expense[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

/**
 * Get recurring transactions from storage
 */
export async function getRecurring(): Promise<RecurringTransaction[]> {
  const result = await storageAdapter.get(STORAGE_KEYS.RECURRING);
  if (!result) return [];

  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.error('Failed to parse recurring:', error);
    return [];
  }
}

/**
 * Save recurring transactions to storage
 */
export async function setRecurring(recurring: RecurringTransaction[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.RECURRING, JSON.stringify(recurring));
}

/**
 * Get partner names from storage
 */
export async function getPartnerNames(): Promise<PartnerNames> {
  const result = await storageAdapter.get(STORAGE_KEYS.PARTNER_NAMES);
  if (!result) return defaultPartnerNames;

  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.error('Failed to parse partner names:', error);
    return defaultPartnerNames;
  }
}

/**
 * Save partner names to storage
 */
export async function setPartnerNames(names: PartnerNames): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.PARTNER_NAMES, JSON.stringify(names));
}

/**
 * Get household settings from storage
 */
export async function getSettings(): Promise<HouseholdSettings> {
  const result = await storageAdapter.get(STORAGE_KEYS.SETTINGS);
  if (!result) return defaultSettings;

  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.error('Failed to parse settings:', error);
    return defaultSettings;
  }
}

/**
 * Save household settings to storage
 */
export async function setSettings(settings: HouseholdSettings): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Get settlements from storage
 */
export async function getSettlements(): Promise<Settlement[]> {
  const result = await storageAdapter.get(STORAGE_KEYS.SETTLEMENTS);
  if (!result) return [];

  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.error('Failed to parse settlements:', error);
    return [];
  }
}

/**
 * Save settlements to storage
 */
export async function setSettlements(settlements: Settlement[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
}

/**
 * Clear all app data from storage
 */
export async function clearAllData(): Promise<void> {
  await storageAdapter.clear();
}
