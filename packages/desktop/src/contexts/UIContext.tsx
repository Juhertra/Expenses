/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback, useRef, ReactNode } from 'react';

type ViewType = 'dashboard' | 'transactions' | 'categories' | 'balance';

// UI context state - User interface state
export interface UIContextState {
  // View state
  currentView: ViewType;
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;

  // Filter and search
  searchQuery: string;
  selectedCategory: string | null;
  transactionPage: number;

  // Bulk operations
  bulkMode: boolean;
  selectedIds: Set<number>;

  // Chart interaction
  chartTooltip: {
    day: number;
    income: number;
    expense: number;
    x: number;
    y: number;
  } | null;

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' } | null;

  // Command palette
  commandQuery: string;

  // Last used categories (for quick add)
  lastExpenseCategory: string;
  lastIncomeCategory: string;

  // Suggestions (for autocomplete)
  suggestions: string[];
}

// Context value interface
interface UIContextValue extends UIContextState {
  // View setters
  setCurrentView: React.Dispatch<React.SetStateAction<ViewType>>;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Filter and search setters
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setTransactionPage: React.Dispatch<React.SetStateAction<number>>;

  // Bulk operations setters
  setBulkMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;

  // Chart interaction setters
  setChartTooltip: React.Dispatch<React.SetStateAction<UIContextState['chartTooltip']>>;

  // Toast setter and helper
  setToast: React.Dispatch<React.SetStateAction<UIContextState['toast']>>;
  showToast: (message: string, type: 'success' | 'error') => void;

  // Command palette setter
  setCommandQuery: React.Dispatch<React.SetStateAction<string>>;

  // Last used categories setters
  setLastExpenseCategory: React.Dispatch<React.SetStateAction<string>>;
  setLastIncomeCategory: React.Dispatch<React.SetStateAction<string>>;

  // Suggestions setter
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
}

// Create context
export const UIContext = createContext<UIContextValue | null>(null);

// Provider component
export function UIProvider({ children }: { children: ReactNode }) {
  // View state
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Filter and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);

  // Bulk operations
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Chart interaction
  const [chartTooltip, setChartTooltip] = useState<UIContextState['chartTooltip']>(null);

  // Toast notifications
  const [toast, setToast] = useState<UIContextState['toast']>(null);

  // Command palette
  const [commandQuery, setCommandQuery] = useState('');

  // Last used categories
  const [lastExpenseCategory, setLastExpenseCategory] = useState('Housing');
  const [lastIncomeCategory, setLastIncomeCategory] = useState('Other');

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Ref to track active toast timer — prevents race when toasts arrive in quick succession
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: UIContextValue = useMemo(() => ({
    // State
    currentView,
    selectedMonth,
    selectedYear,
    loading,
    searchQuery,
    selectedCategory,
    transactionPage,
    bulkMode,
    selectedIds,
    chartTooltip,
    toast,
    commandQuery,
    lastExpenseCategory,
    lastIncomeCategory,
    suggestions,

    // Setters
    setCurrentView,
    setSelectedMonth,
    setSelectedYear,
    setLoading,
    setSearchQuery,
    setSelectedCategory,
    setTransactionPage,
    setBulkMode,
    setSelectedIds,
    setChartTooltip,
    setToast,
    showToast,
    setCommandQuery,
    setLastExpenseCategory,
    setLastIncomeCategory,
    setSuggestions,
  }), [
    currentView,
    selectedMonth,
    selectedYear,
    loading,
    searchQuery,
    selectedCategory,
    transactionPage,
    bulkMode,
    selectedIds,
    chartTooltip,
    toast,
    commandQuery,
    lastExpenseCategory,
    lastIncomeCategory,
    suggestions,
    setCurrentView,
    setSelectedMonth,
    setSelectedYear,
    setLoading,
    setSearchQuery,
    setSelectedCategory,
    setTransactionPage,
    setBulkMode,
    setSelectedIds,
    setChartTooltip,
    setToast,
    showToast,
    setCommandQuery,
    setLastExpenseCategory,
    setLastIncomeCategory,
    setSuggestions,
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

// Custom hook to use the context
export function useUIContext() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider');
  }
  return context;
}
