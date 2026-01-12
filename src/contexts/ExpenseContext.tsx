/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, useContext, useEffect, ReactNode, useMemo } from 'react';
import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
  Category,
} from '../lib/types';
import { loadAllData, saveExpenses, saveRecurring, savePartnerNames, saveSettings, saveSettlements } from '../lib/storageService';

// Default categories
const DEFAULT_CATEGORIES: Record<string, Category> = {
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

const defaultSettings: HouseholdSettings = {
  currencyCode: 'ILS',
  currencySymbol: '₪',
  splitMode: 'equal',
  partner1Ratio: 0.5,
  budgets: {},
  normalizationRules: {},
  categories: { ...DEFAULT_CATEGORIES },
};

// State type
export interface ExpenseState {
  expenses: Expense[];
  recurring: RecurringTransaction[];
  settlements: Settlement[];
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;
  ui: {
    loading: boolean;
    dirty: boolean;
    currentView: 'dashboard' | 'transactions' | 'categories' | 'balance';
    selectedMonth: number;
    selectedYear: number;
    searchQuery: string;
    selectedCategory: string | null;
  };
}

// Action types
export type ExpenseAction =
  | { type: 'INIT_DATA'; payload: { expenses: Expense[]; recurring: RecurringTransaction[]; names: PartnerNames; settings: HouseholdSettings | null; settlements: Settlement[] } }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: { id: string | number; updates: Partial<Expense> } }
  | { type: 'DELETE_EXPENSE'; payload: string | number }
  | { type: 'SET_RECURRING'; payload: RecurringTransaction[] }
  | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
  | { type: 'DELETE_RECURRING'; payload: string | number }
  | { type: 'SET_PARTNER_NAMES'; payload: PartnerNames }
  | { type: 'SET_SETTINGS'; payload: HouseholdSettings }
  | { type: 'SET_SETTLEMENTS'; payload: Settlement[] }
  | { type: 'ADD_SETTLEMENT'; payload: Settlement }
  | { type: 'DELETE_SETTLEMENT'; payload: string | number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_VIEW'; payload: ExpenseState['ui']['currentView'] }
  | { type: 'SET_MONTH_YEAR'; payload: { month: number; year: number } }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_CATEGORY_FILTER'; payload: string | null };

// Initial state
const initialState: ExpenseState = {
  expenses: [],
  recurring: [],
  settlements: [],
  partnerNames: { partner1: 'Partner 1', partner2: 'Partner 2' },
  householdSettings: defaultSettings,
  ui: {
    loading: true,
    dirty: false,
    currentView: 'dashboard',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    searchQuery: '',
    selectedCategory: null,
  },
};

// Reducer
function expenseReducer(state: ExpenseState, action: ExpenseAction): ExpenseState {
  switch (action.type) {
    case 'INIT_DATA':
      return {
        ...state,
        expenses: action.payload.expenses,
        recurring: action.payload.recurring,
        partnerNames: action.payload.names,
        settlements: action.payload.settlements,
        householdSettings: action.payload.settings || { ...defaultSettings, categories: { ...DEFAULT_CATEGORIES } },
        ui: { ...state.ui, loading: false },
      };

    case 'SET_EXPENSES':
      return {
        ...state,
        expenses: action.payload,
        ui: { ...state.ui, dirty: true },
      };

    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [...state.expenses, action.payload],
        ui: { ...state.ui, dirty: true },
      };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.updates } : e
        ),
        ui: { ...state.ui, dirty: true },
      };

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter(e => e.id !== action.payload),
        ui: { ...state.ui, dirty: true },
      };

    case 'SET_RECURRING':
      return {
        ...state,
        recurring: action.payload,
        ui: { ...state.ui, dirty: true },
      };

    case 'ADD_RECURRING':
      return {
        ...state,
        recurring: [...state.recurring, action.payload],
        ui: { ...state.ui, dirty: true },
      };

    case 'DELETE_RECURRING':
      return {
        ...state,
        recurring: state.recurring.filter(r => r.id !== action.payload),
        ui: { ...state.ui, dirty: true },
      };

    case 'SET_PARTNER_NAMES':
      return {
        ...state,
        partnerNames: action.payload,
        ui: { ...state.ui, dirty: true },
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        householdSettings: action.payload,
        ui: { ...state.ui, dirty: true },
      };

    case 'SET_SETTLEMENTS':
      return {
        ...state,
        settlements: action.payload,
        ui: { ...state.ui, dirty: true },
      };

    case 'ADD_SETTLEMENT':
      return {
        ...state,
        settlements: [...state.settlements, action.payload],
        ui: { ...state.ui, dirty: true },
      };

    case 'DELETE_SETTLEMENT':
      return {
        ...state,
        settlements: state.settlements.filter(s => s.id !== action.payload),
        ui: { ...state.ui, dirty: true },
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload },
      };

    case 'SET_DIRTY':
      return {
        ...state,
        ui: { ...state.ui, dirty: action.payload },
      };

    case 'SET_VIEW':
      return {
        ...state,
        ui: { ...state.ui, currentView: action.payload },
      };

    case 'SET_MONTH_YEAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedMonth: action.payload.month,
          selectedYear: action.payload.year,
        },
      };

    case 'SET_SEARCH':
      return {
        ...state,
        ui: { ...state.ui, searchQuery: action.payload },
      };

    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        ui: { ...state.ui, selectedCategory: action.payload },
      };

    default:
      return state;
  }
}

// Context type
interface ExpenseContextType {
  state: ExpenseState;
  dispatch: React.Dispatch<ExpenseAction>;
  actions: {
    addExpense: (expense: Expense) => Promise<void>;
    updateExpense: (id: string | number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: string | number) => Promise<void>;
    addRecurring: (recurring: RecurringTransaction) => Promise<void>;
    deleteRecurring: (id: string | number) => Promise<void>;
    updatePartnerNames: (names: PartnerNames) => Promise<void>;
    updateSettings: (settings: HouseholdSettings) => Promise<void>;
    addSettlement: (settlement: Settlement) => Promise<void>;
    deleteSettlement: (id: string | number) => Promise<void>;
  };
}

// Create context
export const ExpenseContext = createContext<ExpenseContextType | null>(null);

// Provider component
export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(expenseReducer, initialState);

  // Load data on mount
  useEffect(() => {
    loadAllData().then(data => {
      dispatch({ type: 'INIT_DATA', payload: data });
    }).catch(error => {
      console.error('Failed to load data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    });
  }, []);

  // Actions with side effects (storage writes)
  const actions = useMemo(() => ({
    addExpense: async (expense: Expense) => {
      dispatch({ type: 'ADD_EXPENSE', payload: expense });
      await saveExpenses([...state.expenses, expense]);
    },

    updateExpense: async (id: string | number, updates: Partial<Expense>) => {
      dispatch({ type: 'UPDATE_EXPENSE', payload: { id, updates } });
      const updatedExpenses = state.expenses.map(e =>
        e.id === id ? { ...e, ...updates } : e
      );
      await saveExpenses(updatedExpenses);
    },

    deleteExpense: async (id: string | number) => {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
      const updatedExpenses = state.expenses.filter(e => e.id !== id);
      await saveExpenses(updatedExpenses);
    },

    addRecurring: async (recurring: RecurringTransaction) => {
      dispatch({ type: 'ADD_RECURRING', payload: recurring });
      await saveRecurring([...state.recurring, recurring]);
    },

    deleteRecurring: async (id: string | number) => {
      dispatch({ type: 'DELETE_RECURRING', payload: id });
      const updatedRecurring = state.recurring.filter(r => r.id !== id);
      await saveRecurring(updatedRecurring);
    },

    updatePartnerNames: async (names: PartnerNames) => {
      dispatch({ type: 'SET_PARTNER_NAMES', payload: names });
      await savePartnerNames(names);
    },

    updateSettings: async (settings: HouseholdSettings) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      await saveSettings(settings);
    },

    addSettlement: async (settlement: Settlement) => {
      dispatch({ type: 'ADD_SETTLEMENT', payload: settlement });
      await saveSettlements([...state.settlements, settlement]);
    },

    deleteSettlement: async (id: string | number) => {
      dispatch({ type: 'DELETE_SETTLEMENT', payload: id });
      const updatedSettlements = state.settlements.filter(s => s.id !== id);
      await saveSettlements(updatedSettlements);
    },
  }), [state.expenses, state.recurring, state.settlements]);

  return (
    <ExpenseContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ExpenseContext.Provider>
  );
}

// Custom hook to use the context
export function useExpenseContext() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseContext must be used within ExpenseProvider');
  }
  return context;
}

