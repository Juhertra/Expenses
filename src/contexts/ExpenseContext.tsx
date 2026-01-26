/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
} from '../lib/types';
import {
  getExpenses,
  setExpenses as persistExpenses,
  getRecurring,
  setRecurring as persistRecurring,
  getPartnerNames,
  setPartnerNames as persistPartnerNames,
  getSettings,
  setSettings as persistSettings,
  getSettlements,
  setSettlements as persistSettlements,
} from '../services/storage/index.ts';
import { DEFAULT_CATEGORIES, defaultSettings, defaultPartnerNames } from '../lib/defaults';
import { processRecurringTransactions } from '../services/recurring/index.ts';

// Data context state - Core application data
export interface DataContextState {
  // Core data
  expenses: Expense[];
  recurring: RecurringTransaction[];
  settlements: Settlement[];
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;

  // File system and persistence
  saveDirectory: FileSystemDirectoryHandle | null;
  lastExportDate: string | null;
  dirty: boolean;

  // Derived data
  categories: typeof DEFAULT_CATEGORIES;
}

// Context value interface
interface DataContextValue extends DataContextState {
  // Setters
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setRecurring: React.Dispatch<React.SetStateAction<RecurringTransaction[]>>;
  setSettlements: React.Dispatch<React.SetStateAction<Settlement[]>>;
  setPartnerNames: React.Dispatch<React.SetStateAction<PartnerNames>>;
  setHouseholdSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  setSaveDirectory: React.Dispatch<React.SetStateAction<FileSystemDirectoryHandle | null>>;
  setLastExportDate: React.Dispatch<React.SetStateAction<string | null>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions with side effects
  loadData: () => Promise<void>;
  saveData: (options?: { allowDownload?: boolean; showToast?: boolean; promptForDirectory?: boolean }) => Promise<void>;
  processRecurring: () => void;
}

// Create context
export const DataContext = createContext<DataContextValue | null>(null);

// Provider component
export function DataProvider({ children }: { readonly children: ReactNode }) {
  // Core data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [partnerNames, setPartnerNames] = useState<PartnerNames>(defaultPartnerNames);
  const [householdSettings, setHouseholdSettings] = useState<HouseholdSettings>(defaultSettings);

  // File system and persistence state
  const [saveDirectory, setSaveDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Derived data - categories from settings
  const categories = householdSettings.categories || DEFAULT_CATEGORIES;

  // Load data from storage on mount
  const loadData = useCallback(async () => {
    try {
      const [
        loadedExpenses,
        loadedRecurring,
        loadedPartnerNames,
        loadedSettings,
        loadedSettlements,
      ] = await Promise.all([
        getExpenses(),
        getRecurring(),
        getPartnerNames(),
        getSettings(),
        getSettlements(),
      ]);

      setExpenses(loadedExpenses);
      setRecurring(loadedRecurring);
      setPartnerNames(loadedPartnerNames);
      setHouseholdSettings(loadedSettings || { ...defaultSettings, categories: { ...DEFAULT_CATEGORIES } });
      setSettlements(loadedSettlements);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  // Process recurring transactions
  const processRecurring = useCallback(() => {
    const { updatedExpenses, updatedRecurring, changed } = processRecurringTransactions(recurring, expenses);
    if (changed) {
      setExpenses(updatedExpenses);
      setRecurring(updatedRecurring);
      setDirty(true);
    }
  }, [expenses, recurring]);

  // Save data function (placeholder - will be implemented with export logic)
  const saveData = useCallback(async (_options?: { allowDownload?: boolean; showToast?: boolean; promptForDirectory?: boolean }) => {
    // This will be implemented when integrating with ExpenseTracker's save logic
    console.log('saveData called - to be implemented');
  }, []);

  // Auto-save expenses when changed
  useEffect(() => {
    if (expenses.length > 0) {
      persistExpenses(expenses).catch(console.error);
    }
  }, [expenses]);

  // Auto-save recurring when changed
  useEffect(() => {
    if (recurring.length > 0) {
      persistRecurring(recurring).catch(console.error);
    }
  }, [recurring]);

  // Auto-save settlements when changed
  useEffect(() => {
    if (settlements.length > 0) {
      persistSettlements(settlements).catch(console.error);
    }
  }, [settlements]);

  // Auto-save partner names when changed
  useEffect(() => {
    persistPartnerNames(partnerNames).catch(console.error);
  }, [partnerNames]);

  // Auto-save settings when changed
  useEffect(() => {
    persistSettings(householdSettings).catch(console.error);
  }, [householdSettings]);

  const value: DataContextValue = useMemo(() => ({
    // State
    expenses,
    recurring,
    settlements,
    partnerNames,
    householdSettings,
    saveDirectory,
    lastExportDate,
    dirty,
    categories,

    // Setters
    setExpenses,
    setRecurring,
    setSettlements,
    setPartnerNames,
    setHouseholdSettings,
    setSaveDirectory,
    setLastExportDate,
    setDirty,

    // Actions
    loadData,
    saveData,
    processRecurring,
  }), [
    expenses,
    recurring,
    settlements,
    partnerNames,
    householdSettings,
    saveDirectory,
    lastExportDate,
    dirty,
    categories,
    loadData,
    saveData,
    processRecurring,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook to use the context
export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within DataProvider');
  }
  return context;
}

// Backward compatibility exports (to be removed after integration)
// These allow existing hooks/files to continue working during the transition
export const ExpenseProvider = DataProvider;
export const useExpenseContext = () => {
  const data = useDataContext();
  // Adapt new DataContext to old ExpenseContext API
  return {
    state: {
      expenses: data.expenses,
      recurring: data.recurring,
      settlements: data.settlements,
      partnerNames: data.partnerNames,
      householdSettings: data.householdSettings,
      ui: {
        loading: false, // Will be provided by UIContext after integration
        dirty: data.dirty,
        currentView: 'dashboard' as const,
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        searchQuery: '',
        selectedCategory: null,
      },
    },
  };
};
export type ExpenseState = DataContextState & {
  ui: {
    loading: boolean;
    dirty: boolean;
    currentView: 'dashboard' | 'transactions' | 'categories' | 'balance';
    selectedMonth: number;
    selectedYear: number;
    searchQuery: string;
    selectedCategory: string | null;
  };
};
