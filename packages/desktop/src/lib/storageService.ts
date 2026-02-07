import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
} from './types';

const STORAGE_KEYS = {
  EXPENSES: 'household-expenses',
  RECURRING: 'household-recurring',
  PARTNER_NAMES: 'household-partner-names',
  SETTINGS: 'household-settings',
  SETTLEMENTS: 'household-settlements',
} as const;

/**
 * Load all data from storage
 */
export async function loadAllData(): Promise<{
  expenses: Expense[];
  recurring: RecurringTransaction[];
  names: PartnerNames;
  settings: HouseholdSettings | null;
  settlements: Settlement[];
}> {
  const [expensesResult, recurringResult, namesResult, settingsResult, settlementsResult] =
    await Promise.all([
      window.storage.get(STORAGE_KEYS.EXPENSES),
      window.storage.get(STORAGE_KEYS.RECURRING),
      window.storage.get(STORAGE_KEYS.PARTNER_NAMES),
      window.storage.get(STORAGE_KEYS.SETTINGS),
      window.storage.get(STORAGE_KEYS.SETTLEMENTS),
    ]);

  // Parse expenses
  let expenses: Expense[] = [];
  if (expensesResult) {
    try {
      expenses = JSON.parse(expensesResult.value);
    } catch (error) {
      console.warn('Failed to parse expenses, starting with empty list', error);
    }
  }

  // Parse recurring
  let recurring: RecurringTransaction[] = [];
  if (recurringResult) {
    try {
      recurring = JSON.parse(recurringResult.value);
    } catch (error) {
      console.warn('Failed to parse recurring, starting with empty list', error);
    }
  }

  // Parse names
  let names: PartnerNames = { partner1: 'Partner 1', partner2: 'Partner 2' };
  if (namesResult) {
    try {
      names = JSON.parse(namesResult.value);
    } catch (error) {
      console.warn('Failed to parse partner names, using defaults', error);
    }
  }

  // Parse settings
  let settings: HouseholdSettings | null = null;
  if (settingsResult) {
    try {
      settings = JSON.parse(settingsResult.value);
    } catch (error) {
      console.warn('Failed to parse household settings', error);
    }
  }

  // Parse settlements
  let settlements: Settlement[] = [];
  if (settlementsResult) {
    try {
      settlements = JSON.parse(settlementsResult.value);
    } catch (error) {
      console.warn('Failed to parse settlements, starting with empty list', error);
    }
  }

  return { expenses, recurring, names, settings, settlements };
}

/**
 * Load expenses from storage
 */
export async function loadExpenses(): Promise<Expense[]> {
  const result = await window.storage.get(STORAGE_KEYS.EXPENSES);
  if (!result) return [];
  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.warn('Failed to parse expenses', error);
    return [];
  }
}

/**
 * Save expenses to storage
 * @returns true if successful, false if quota/storage error
 */
export async function saveExpenses(expenses: Expense[]): Promise<boolean> {
  try {
    await window.storage.set(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return true;
  } catch (error) {
    console.error('Failed to save expenses (quota exceeded or storage blocked?):', error);
    return false;
  }
}

/**
 * Load recurring transactions from storage
 */
export async function loadRecurring(): Promise<RecurringTransaction[]> {
  const result = await window.storage.get(STORAGE_KEYS.RECURRING);
  if (!result) return [];
  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.warn('Failed to parse recurring transactions', error);
    return [];
  }
}

/**
 * Save recurring transactions to storage
 * @returns true if successful, false if quota/storage error
 */
export async function saveRecurring(recurring: RecurringTransaction[]): Promise<boolean> {
  try {
    await window.storage.set(STORAGE_KEYS.RECURRING, JSON.stringify(recurring));
    return true;
  } catch (error) {
    console.error('Failed to save recurring transactions (quota exceeded or storage blocked?):', error);
    return false;
  }
}

/**
 * Load partner names from storage
 */
export async function loadPartnerNames(): Promise<PartnerNames> {
  const result = await window.storage.get(STORAGE_KEYS.PARTNER_NAMES);
  if (!result) return { partner1: 'Partner 1', partner2: 'Partner 2' };
  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.warn('Failed to parse partner names', error);
    return { partner1: 'Partner 1', partner2: 'Partner 2' };
  }
}

/**
 * Save partner names to storage
 * @returns true if successful, false if quota/storage error
 */
export async function savePartnerNames(names: PartnerNames): Promise<boolean> {
  try {
    await window.storage.set(STORAGE_KEYS.PARTNER_NAMES, JSON.stringify(names));
    return true;
  } catch (error) {
    console.error('Failed to save partner names (quota exceeded or storage blocked?):', error);
    return false;
  }
}

/**
 * Load household settings from storage
 */
export async function loadSettings(): Promise<HouseholdSettings | null> {
  const result = await window.storage.get(STORAGE_KEYS.SETTINGS);
  if (!result) return null;
  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.warn('Failed to parse household settings', error);
    return null;
  }
}

/**
 * Save household settings to storage
 * @returns true if successful, false if quota/storage error
 */
export async function saveSettings(settings: HouseholdSettings): Promise<boolean> {
  try {
    await window.storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save household settings (quota exceeded or storage blocked?):', error);
    return false;
  }
}

/**
 * Load settlements from storage
 */
export async function loadSettlements(): Promise<Settlement[]> {
  const result = await window.storage.get(STORAGE_KEYS.SETTLEMENTS);
  if (!result) return [];
  try {
    return JSON.parse(result.value);
  } catch (error) {
    console.warn('Failed to parse settlements', error);
    return [];
  }
}

/**
 * Save settlements to storage
 * @returns true if successful, false if quota/storage error
 */
export async function saveSettlements(settlements: Settlement[]): Promise<boolean> {
  try {
    await window.storage.set(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
    return true;
  } catch (error) {
    console.error('Failed to save settlements (quota exceeded or storage blocked?):', error);
    return false;
  }
}

/**
 * Export storage keys for use in import/export functionality
 */
export { STORAGE_KEYS };

