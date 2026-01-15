/**
 * Initialize window.storage and seed default data for first-time users
 */

import { localStorageAdapter } from './localStorageAdapter';
import { ElectronStorageAdapter } from './electronStorageAdapter';

const STORAGE_KEYS = {
  EXPENSES: 'household-expenses',
  RECURRING: 'household-recurring',
  PARTNER_NAMES: 'household-partner-names',
};

/**
 * Get default seed data for the application
 */
function getDefaultData() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Format: YYYY-MM-DD
  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

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
        amount: 120.50,
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

/**
 * Seed storage with default data if keys are missing
 * ONLY writes if a key doesn't exist (never overwrites)
 */
async function seedDefaultData() {
  const defaults = getDefaultData();

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
  // Attach adapter to window
  if (window.electronAPI?.readDataFile && window.electronAPI?.writeDataFile) {
    window.storage = new ElectronStorageAdapter(window.electronAPI);
  } else {
    window.storage = localStorageAdapter;
  }
  
  // Seed default data if needed (skip for Electron file-based storage)
  if (!window.electronAPI) {
    await seedDefaultData();
  }
  
  console.log('Storage initialized successfully');
}

