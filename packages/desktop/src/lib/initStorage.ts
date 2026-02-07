/**
 * Initialize window.storage and seed default data for first-time users
 */

import { localStorageAdapter } from './localStorageAdapter';
import { ElectronStorageAdapter } from './electronStorageAdapter';
import { getDefaultSeedData } from '@expenses/shared/defaults';

const STORAGE_KEYS = {
  EXPENSES: 'household-expenses',
  RECURRING: 'household-recurring',
  PARTNER_NAMES: 'household-partner-names',
};

/**
 * Seed storage with default data if keys are missing
 * ONLY writes if a key doesn't exist (never overwrites)
 */
async function seedDefaultData() {
  const defaults = getDefaultSeedData();

  // Check and seed partner names
  const existingNames = await window.storage.get(STORAGE_KEYS.PARTNER_NAMES);
  if (!existingNames) {
    await window.storage.set(
      STORAGE_KEYS.PARTNER_NAMES,
      JSON.stringify(defaults.partnerNames)
    );
    console.log('Seeded default partner names');
  }

  // Check and seed expenses
  const existingExpenses = await window.storage.get(STORAGE_KEYS.EXPENSES);
  if (!existingExpenses) {
    await window.storage.set(
      STORAGE_KEYS.EXPENSES,
      JSON.stringify(defaults.expenses)
    );
    console.log('Seeded default expenses');
  }

  // Check and seed recurring transactions
  const existingRecurring = await window.storage.get(STORAGE_KEYS.RECURRING);
  if (!existingRecurring) {
    await window.storage.set(
      STORAGE_KEYS.RECURRING,
      JSON.stringify(defaults.recurring)
    );
    console.log('Seeded default recurring transactions');
  }
}

/**
 * Initialize the global window.storage adapter and seed data
 * Must be called before React renders
 */
export async function initStorage(): Promise<void> {
  // Attach adapter to window (do not overwrite if preload already set it)
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'storage');
  const hasStorage = typeof window.storage !== 'undefined';
  const canAssignStorage = !storageDescriptor || storageDescriptor.writable !== false;
  const hasElectronAPI = !!window.electronAPI;

  if (!hasStorage && canAssignStorage) {
    if (hasElectronAPI) {
      window.storage = new ElectronStorageAdapter(window.electronAPI!);
    } else {
      window.storage = localStorageAdapter;
    }
  }
  
  // Seed default data if needed (skip for Electron file-based storage)
  if (!hasElectronAPI) {
    await seedDefaultData();
  }
  
  console.log('Storage initialized successfully');
}

