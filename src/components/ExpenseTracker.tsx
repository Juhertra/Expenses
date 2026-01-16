import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit2,
  Trash2,
  X,
  Check,
  Users,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Save,
  FolderOpen,
  HelpCircle,
  Zap
} from 'lucide-react';
import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  FormData,
  Category,
  ChartDataPoint,
  HouseholdSettings,
  Settlement
} from '../lib/types';

/**
 * A fully featured household expense tracker component for React.
 *
 * This component provides dashboard, transactions, categories, and balance
 * views, supports adding and editing expenses and recurring transactions,
 * and tracks payments by two partners and joint expenses. Data is persisted
 * via the provided `window.storage` API. The UI uses Tailwind CSS for
 * styling and lucide-react for icons.
 */
const ExpenseTracker: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'categories' | 'balance'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [partnerNames, setPartnerNames] = useState<PartnerNames>({
    partner1: 'Partner 1',
    partner2: 'Partner 2'
  });
  const [tempNames, setTempNames] = useState<PartnerNames>({
    partner1: 'Partner 1',
    partner2: 'Partner 2'
  });

  useEffect(() => {
    const lang = i18n.language || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation state (unified for expenses and recurring)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    description: string;
    type: 'expense' | 'recurring';
  } | null>(null);

  // Export/Import state
  const [importFile, setImportFile] = useState<File | null>(null);

  // Granular loading states (avoid freezing entire UI)
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Household settings state (for currency, split modes, budgets, normalization)
  // Default categories (used for initialization)
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
    Other: { icon: '📌', color: 'bg-gray-500' }
  };

  // Curated emoji list for category picker
  const CURATED_EMOJIS = {
    home: ['🏠', '🏡', '🏢', '🏘️', '🛏️', '🪑', '🚪'],
    food: ['🍔', '🍕', '🍜', '🍱', '🥗', '🍞', '☕', '🍷'],
    transport: ['🚗', '🚕', '🚙', '🚌', '🚎', '🚲', '🛵', '✈️', '⛽'],
    shopping: ['🛍️', '👕', '👗', '👠', '💄', '🛒', '🎁'],
    entertainment: ['🎮', '🎬', '🎵', '🎸', '🎭', '🎨', '📺', '🎪'],
    utilities: ['⚡', '💡', '🔥', '💧', '📱', '💻', '📡', '🌐'],
    health: ['🏥', '💊', '🩺', '💉', '🧘', '🏋️', '🧴'],
    finance: ['💰', '💳', '💵', '🏦', '📊', '💸', '🪙', '💎'],
    education: ['📚', '✏️', '🎓', '📝', '🧑‍🎓'],
    other: ['📌', '🔧', '🎉', '🌟', '✨', '❤️']
  };

  const defaultSettings: HouseholdSettings = {
    currencyCode: 'ILS',
    currencySymbol: '₪',
    splitMode: 'equal',
    partner1Ratio: 0.5,
    budgets: {},
    normalizationRules: {},
    categories: { ...DEFAULT_CATEGORIES }
  };
  const [householdSettings, setHouseholdSettings] = useState<HouseholdSettings>(defaultSettings);
  const [tempHouseholdSettings, setTempHouseholdSettings] = useState<HouseholdSettings>(defaultSettings);

  // Vault mode: dirty tracking (localStorage is cache only, export/import is source of truth)
  const [dirty, setDirty] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

  // Settlements state (for recording repayments between partners)
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    from: 'partner1' as 'partner1' | 'partner2',
    to: 'partner2' as 'partner1' | 'partner2',
    note: ''
  });

  // File System Access API state (for auto-saving to folder)
  const [saveDirectory, setSaveDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [supportsFileSystem, setSupportsFileSystem] = useState(false);

  // Phase 1 UX Features: Toast, Shortcuts, Category Filter, Last Used Categories
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    color: 'bg-purple-500'
  });
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState<{
    categoryName: string;
    transactionCount: number;
    reassignTo: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastExpenseCategory, setLastExpenseCategory] = useState<string>('Housing');
  const [lastIncomeCategory, setLastIncomeCategory] = useState<string>('Other');

  // Phase 2 Features: Command Palette, Breadcrumbs, Filters, Charts, Inline Edit, Templates, Bulk Ops, Virtual Scroll
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [filterPresets, _setFilterPresets] = useState<Array<{
    name: string;
    filters: {
      categories?: string[];
      minAmount?: number;
      maxAmount?: number;
      dateRange?: { start: string; end: string };
      paidBy?: string[];
    };
  }>>([]);
  const [chartTooltip, setChartTooltip] = useState<{
    day: number;
    income: number;
    expense: number;
    x: number;
    y: number;
  } | null>(null);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<Expense>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const ITEMS_PER_PAGE = 50; // Phase 2 Feature #12: Pagination for performance

  // Category definitions including icon and color styling.
  // Use categories from household settings (dynamic, user-managed)
  const categories = householdSettings.categories || DEFAULT_CATEGORIES;

  // Form data state for the add/edit modal.
  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    category: 'Housing',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    paidBy: 'partner1',
    isRecurring: false,
    recurringDay: 1
  });

  /**
   * Load persisted data from storage on mount. This includes expenses,
   * recurring transactions, and partner names. If no data exists, the
   * component will start fresh.
   */
  useEffect(() => {
    loadData();
    // Check if File System Access API is supported
    if ('showDirectoryPicker' in window) {
      setSupportsFileSystem(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Clear search query and reset pagination when month or year changes (Phase 2 Feature #12)
   */
  useEffect(() => {
    setSearchQuery('');
    setTransactionPage(1);
  }, [selectedMonth, selectedYear]);

  /**
   * Reset pagination when search or category filter changes (Phase 2 Feature #12)
   */
  useEffect(() => {
    setTransactionPage(1);
  }, [searchQuery, selectedCategory]);

  /**
   * Comprehensive keyboard shortcuts (Phase 1 Feature #5)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
        // Cmd/Ctrl + S: Save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          if (dirty && !exportingData) {
            saveData();
          }
        }
      
      // Cmd/Ctrl + N: New transaction
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddModal(true);
      }
      
      // Cmd/Ctrl + K: Command Palette (Phase 2 Feature #1)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // E: Quick expense
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        openQuickAdd('expense');
      }
      
      // I: Quick income
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        openQuickAdd('income');
      }
      
      // Escape: Close any open modal
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowSettingsModal(false);
        setShowSettlementModal(false);
        setShowShortcuts(false);
        setShowCommandPalette(false);
        setDeleteConfirm(null);
      }
      
      // ?: Show shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      
      // Number keys 1-4: Switch views
      if (e.key >= '1' && e.key <= '4' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const views: Array<'dashboard' | 'transactions' | 'categories' | 'balance'> = 
          ['dashboard', 'transactions', 'categories', 'balance'];
        setCurrentView(views[parseInt(e.key) - 1]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, exportingData]);

  useEffect(() => {
    if (!dirty || exportingData || !supportsFileSystem || !saveDirectory) {
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      saveData({ allowDownload: false, showToast: false, promptForDirectory: false });
    }, 1500);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [
    dirty,
    exportingData,
    supportsFileSystem,
    saveDirectory,
    expenses,
    recurring,
    partnerNames,
    householdSettings,
    settlements,
  ]);

  /**
   * Show toast notification (Phase 1 Feature #2D)
   */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Phase 2 Feature #10: Bulk operations helpers
   */
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(t('dialogs.bulkDeleteConfirm', { count: selectedIds.size }))) return;
    
    setDeletingItem(true);
    try {
      const updated = expenses.filter(e => !selectedIds.has(e.id));
      setExpenses(updated);
      await window.storage.set('household-expenses', JSON.stringify(updated));
      setSelectedIds(new Set());
      setBulkMode(false);
      setDirty(true);
      showToast(t('toasts.deletedTransactions', { count: selectedIds.size }), 'success');
    } catch (error) {
      showToast(t('errors.deleteTransactionsFailed'), 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  /**
   * Phase 2 Feature #11: Drag & Drop handler
   */
  const updateTransactionCategory = async (txId: number, newCategory: string) => {
    setSavingTransaction(true);
    try {
      const updated = expenses.map(e => 
        e.id === txId ? { ...e, category: newCategory } : e
      );
      setExpenses(updated);
      await window.storage.set('household-expenses', JSON.stringify(updated));
      setDirty(true);
    } catch (error) {
      showToast(t('errors.categoryUpdateFailed'), 'error');
    } finally {
      setSavingTransaction(false);
    }
  };

  const bulkCategorize = async () => {
    if (selectedIds.size === 0) return;
    
    const newCategory = prompt(t('dialogs.newCategoryPrompt'));
    if (!newCategory || !categories[newCategory]) {
      showToast(t('errors.invalidCategory'), 'error');
      return;
    }
    
    setSavingTransaction(true);
    try {
      const updated = expenses.map(e => 
        selectedIds.has(e.id) ? { ...e, category: newCategory } : e
      );
      setExpenses(updated);
      await window.storage.set('household-expenses', JSON.stringify(updated));
      setSelectedIds(new Set());
      setBulkMode(false);
      setDirty(true);
      showToast(
        t('toasts.bulkUpdatedCategory', { count: selectedIds.size, category: newCategory }),
        'success'
      );
    } catch (error) {
      showToast(t('errors.categoriesUpdateFailed'), 'error');
    } finally {
      setSavingTransaction(false);
    }
  };

  /**
   * Phase 2 Feature #7: Save inline edit
   */
  const saveInlineEdit = async (expId: number) => {
    if (!inlineEditData.description?.trim()) {
      showToast(t('errors.descriptionRequired'), 'error');
      return;
    }
    
    const amount = typeof inlineEditData.amount === 'number' ? inlineEditData.amount : parseFloat(String(inlineEditData.amount || '0'));
    if (isNaN(amount) || amount <= 0) {
      showToast(t('errors.amountGreaterThanZero'), 'error');
      return;
    }
    
    setSavingTransaction(true);
    try {
      const expense = expenses.find(e => e.id === expId);
      if (!expense) return;
      
      const updated: Expense = {
        ...expense,
        description: inlineEditData.description?.trim() || expense.description,
        amount: amount,
        category: inlineEditData.category || expense.category,
        date: inlineEditData.date || expense.date,
        paidBy: inlineEditData.paidBy || expense.paidBy
      };
      
      const updatedExpenses = expenses.map(e => e.id === expId ? updated : e);
      setExpenses(updatedExpenses);
      await window.storage.set('household-expenses', JSON.stringify(updatedExpenses));
      
      setInlineEditId(null);
      setInlineEditData({});
      setDirty(true);
      showToast(t('toasts.transactionUpdated'), 'success');
    } catch (error) {
      console.error('Inline edit error:', error);
      showToast(t('errors.transactionUpdateFailed'), 'error');
    } finally {
      setSavingTransaction(false);
    }
  };

  /**
   * Open quick add modal with pre-selected type and last-used category (Phase 1 Feature #1)
   */
  const openQuickAdd = (type: 'expense' | 'income') => {
    setFormData({
      ...formData,
      type,
      date: new Date().toISOString().split('T')[0],
      category: type === 'expense' ? lastExpenseCategory : lastIncomeCategory
    });
    setShowAddModal(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Parse each key independently - corrupted data in one key doesn't wipe everything
      const expensesResult = await window.storage.get('household-expenses');
      const recurringResult = await window.storage.get('household-recurring');
      const namesResult = await window.storage.get('household-partner-names');
      const settingsResult = await window.storage.get('household-settings');
      const settlementsResult = await window.storage.get('household-settlements');

      // Load household settings with fallback to defaults
      if (settingsResult) {
        try {
          const settings = JSON.parse(settingsResult.value);
          
          // Initialize categories if not present (first run or old vault)
          if (!settings.categories || Object.keys(settings.categories).length === 0) {
            settings.categories = { ...DEFAULT_CATEGORIES };
            // Save back to storage
            await window.storage.set('household-settings', JSON.stringify(settings));
          }
          
          setHouseholdSettings(settings);
          setTempHouseholdSettings(settings);
        } catch (error) {
          console.warn('Failed to parse household settings, using defaults', error);
          const settingsWithCategories = {
            ...defaultSettings,
            categories: { ...DEFAULT_CATEGORIES }
          };
          setHouseholdSettings(settingsWithCategories);
          setTempHouseholdSettings(settingsWithCategories);
        }
      } else {
        // No settings in storage, initialize with defaults including categories
        const settingsWithCategories = {
          ...defaultSettings,
          categories: { ...DEFAULT_CATEGORIES }
        };
        await window.storage.set('household-settings', JSON.stringify(settingsWithCategories));
        setHouseholdSettings(settingsWithCategories);
        setTempHouseholdSettings(settingsWithCategories);
      }

      // Load partner names
      if (namesResult) {
        try {
          const names = JSON.parse(namesResult.value);
          setPartnerNames(names);
          setTempNames(names);
        } catch (error) {
          console.warn('Failed to parse partner names, using defaults', error);
        }
      }

      // Load settlements
      if (settlementsResult) {
        try {
          const loadedSettlements = JSON.parse(settlementsResult.value);
          setSettlements(loadedSettlements);
        } catch (error) {
          console.warn('Failed to parse settlements, starting with empty list', error);
        }
      }

      // Load expenses
      let loadedExpenses: Expense[] = [];
      if (expensesResult) {
        try {
          loadedExpenses = JSON.parse(expensesResult.value);
          setExpenses(loadedExpenses);
        } catch (error) {
          console.warn('Failed to parse expenses, starting with empty list', error);
        }
      }

      // Load recurring transactions
      if (recurringResult) {
        try {
          const loadedRecurring = JSON.parse(recurringResult.value);
          setRecurring(loadedRecurring);
          await processRecurring(loadedRecurring, loadedExpenses);
        } catch (error) {
          console.warn('Failed to parse recurring transactions, starting with empty list', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Persist partner names to storage and close the settings modal.
   */
  const saveNames = async () => {
    setSavingSettings(true);
    try {
      await window.storage.set('household-partner-names', JSON.stringify(tempNames));
      setPartnerNames(tempNames);
      setDirty(true); // Mark as dirty (unsaved changes)
      setShowSettingsModal(false);
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Helper function to get all currently used emojis across categories
   * When editing, excludes the current category's emoji to allow reselection
   */
  const getUsedEmojis = (): Set<string> => {
    const used = new Set<string>();
    Object.values(categories).forEach(cat => {
      if (cat.icon) used.add(cat.icon);
    });
    // When editing, exclude the current category's emoji
    if (editingCategory && categories[editingCategory]) {
      used.delete(categories[editingCategory].icon);
    }
    return used;
  };

  /**
   * Add a new category
   */
  const addCategory = async () => {
    const trimmedName = categoryForm.name.trim();
    
    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!categoryForm.icon) {
      showToast(t('errors.categoryEmojiRequired'), 'error');
      return;
    }
    if (categories[trimmedName]) {
      showToast(t('errors.categoryAlreadyExists'), 'error');
      return;
    }
    
    setSavingSettings(true);
    try {
      const updatedCategories = {
        ...householdSettings.categories,
        [trimmedName]: {
          icon: categoryForm.icon,
          color: categoryForm.color
        }
      };
      
      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };
      
      await window.storage.set('household-settings', JSON.stringify(updatedSettings));
      setHouseholdSettings(updatedSettings);
      setTempHouseholdSettings(updatedSettings);
      setDirty(true);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
      showToast(t('toasts.categoryAdded', { name: trimmedName }), 'success');
    } catch (error) {
      showToast(t('errors.categoryAddFailed'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Edit an existing category
   */
  const editCategory = async (oldName: string) => {
    const trimmedName = categoryForm.name.trim();
    
    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!categoryForm.icon) {
      showToast(t('errors.categoryEmojiRequired'), 'error');
      return;
    }
    if (trimmedName !== oldName && categories[trimmedName]) {
      showToast(t('errors.categoryNameExists'), 'error');
      return;
    }
    
    setSavingSettings(true);
    try {
      const updatedCategories = { ...householdSettings.categories };
      
      // If name changed, update all transactions
      if (trimmedName !== oldName) {
        const updatedExpenses = expenses.map(exp =>
          exp.category === oldName ? { ...exp, category: trimmedName } : exp
        );
        setExpenses(updatedExpenses);
        await window.storage.set('household-expenses', JSON.stringify(updatedExpenses));
        
        // Update recurring transactions
        const updatedRecurring = recurring.map(rec =>
          rec.category === oldName ? { ...rec, category: trimmedName } : rec
        );
        setRecurring(updatedRecurring);
        await window.storage.set('household-recurring', JSON.stringify(updatedRecurring));
        
        // Remove old category, add new
        delete updatedCategories[oldName];
      }
      
      updatedCategories[trimmedName] = {
        icon: categoryForm.icon,
        color: categoryForm.color
      };
      
      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };
      
      await window.storage.set('household-settings', JSON.stringify(updatedSettings));
      setHouseholdSettings(updatedSettings);
      setTempHouseholdSettings(updatedSettings);
      setDirty(true);
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
      showToast(t('toasts.categoryUpdated'), 'success');
    } catch (error) {
      showToast(t('errors.categoryUpdateFailed'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Confirm category deletion (with transaction count check)
   */
  const confirmDeleteCategory = (categoryName: string) => {
    const transactionCount = expenses.filter(e => e.category === categoryName).length +
                            recurring.filter(r => r.category === categoryName).length;
    
    if (transactionCount > 0) {
      // Show reassignment modal
      const firstOtherCategory = Object.keys(categories).find(c => c !== categoryName) || '';
      setShowDeleteCategoryConfirm({
        categoryName,
        transactionCount,
        reassignTo: firstOtherCategory
      });
    } else {
      // No transactions, delete directly
      executeDeleteCategory(categoryName, null);
    }
  };

  /**
   * Execute category deletion (with optional reassignment)
   */
  const executeDeleteCategory = async (categoryName: string, reassignTo: string | null) => {
    setSavingSettings(true);
    try {
      const updatedCategories = { ...householdSettings.categories };
      delete updatedCategories[categoryName];
      
      // If reassigning, update transactions
      if (reassignTo) {
        const updatedExpenses = expenses.map(exp =>
          exp.category === categoryName ? { ...exp, category: reassignTo } : exp
        );
        setExpenses(updatedExpenses);
        await window.storage.set('household-expenses', JSON.stringify(updatedExpenses));
        
        const updatedRecurring = recurring.map(rec =>
          rec.category === categoryName ? { ...rec, category: reassignTo } : rec
        );
        setRecurring(updatedRecurring);
        await window.storage.set('household-recurring', JSON.stringify(updatedRecurring));
      }
      
      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };
      
      await window.storage.set('household-settings', JSON.stringify(updatedSettings));
      setHouseholdSettings(updatedSettings);
      setTempHouseholdSettings(updatedSettings);
      setDirty(true);
      setShowDeleteCategoryConfirm(null);
      showToast(t('toasts.categoryDeleted', { name: categoryName }), 'success');
    } catch (error) {
      showToast(t('errors.categoryDeleteFailed'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Save household settings (currency, split mode, budgets, normalization rules)
   */
  const saveHouseholdSettings = async () => {
    // Clamp partner1Ratio to safe range
    const clampedSettings = {
      ...tempHouseholdSettings,
      partner1Ratio: Math.max(0.05, Math.min(0.95, tempHouseholdSettings.partner1Ratio))
    };
    
    setSavingSettings(true);
    try {
      await window.storage.set('household-settings', JSON.stringify(clampedSettings));
      setHouseholdSettings(clampedSettings);
      setTempHouseholdSettings(clampedSettings);
      setDirty(true); // Mark as dirty (unsaved changes)
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Process recurring transactions at the beginning of each month. This
   * function checks each recurring entry and, if it has not been
   * processed for the current month, creates a corresponding expense.
   * The updated expenses and recurring entries are saved back to
   * storage.
   *
   * @param recurringList List of recurring entries
   * @param currentExpenses Current list of all expenses
   */
  const processRecurring = async (recurringList: RecurringTransaction[], currentExpenses: Expense[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let updated = false;

    for (const rec of recurringList) {
      const lastProcessed = rec.lastProcessed
        ? new Date(rec.lastProcessed)
        : new Date(currentYear, currentMonth - 1, 1);

      if (
        lastProcessed.getMonth() !== currentMonth ||
        lastProcessed.getFullYear() !== currentYear
      ) {
        // Guard: clamp recurring day to last day of month if it exceeds
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const effectiveDay = Math.min(rec.recurringDay, daysInMonth);

        const newExpense: Expense = {
          id: Date.now() + Math.random(),
          description: rec.description,
          amount: rec.amount,
          category: rec.category,
          type: rec.type,
          date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
            effectiveDay
          ).padStart(2, '0')}`,
          paidBy: rec.paidBy,
          isAuto: true
        };
        currentExpenses.push(newExpense);
        rec.lastProcessed = today.toISOString();
        updated = true;
      }
    }

    if (updated) {
      await window.storage.set(
        'household-expenses',
        JSON.stringify(currentExpenses)
      );
      await window.storage.set(
        'household-recurring',
        JSON.stringify(recurringList)
      );
      setExpenses(currentExpenses);
      setRecurring(recurringList);
    }
  };

  /**
   * Save a new list of expenses to storage and update state.
   *
   * @param newExpenses Updated expenses list
   */
  const saveExpenses = async (newExpenses: Expense[]) => {
    await window.storage.set('household-expenses', JSON.stringify(newExpenses));
    setExpenses(newExpenses);
  };

  /**
   * Save a new list of recurring transactions to storage and update state.
   *
   * @param newRecurring Updated recurring list
   */
  const saveRecurring = async (newRecurring: RecurringTransaction[]) => {
    await window.storage.set(
      'household-recurring',
      JSON.stringify(newRecurring)
    );
    setRecurring(newRecurring);
  };

  /**
   * Format currency using Intl.NumberFormat with household settings
   */
  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: householdSettings.currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback if currencyCode is invalid
      return `${householdSettings.currencySymbol}${amount.toFixed(2)}`;
    }
  };

  /**
   * Create canonical form of a description (for safe matching)
   * Canonical = lowercase + trim + collapse whitespace
   */
  const canonicalForm = (desc: string): string => {
    return desc.trim().replace(/\s+/g, ' ').toLowerCase();
  };

  /**
   * Normalize description: trim, collapse whitespace, apply safe exact-match normalization rules
   * SAFE: Uses exact-match mapping (not regex) to avoid user-entered patterns breaking the app
   */
  const normalizeDescription = (desc: string): string => {
    // First pass: trim and collapse whitespace
    let normalized = desc.trim().replace(/\s+/g, ' ');
    
    // Create canonical key for lookup
    const canonical = canonicalForm(normalized);
    
    // Apply normalization rules if a canonical match exists
    // Rules map keys must be canonical (lowercase, trimmed, collapsed spaces)
    if (householdSettings.normalizationRules[canonical]) {
      normalized = householdSettings.normalizationRules[canonical];
    }
    
    return normalized;
  };

  /**
   * Check for duplicate transactions (same date, amount, canonical description)
   * Uses canonical form for stable comparison that won't change with normalization rules
   * @param excludeId - ID to exclude when checking (for updates)
   */
  const checkDuplicate = (
    date: string,
    amount: number,
    normalizedDesc: string,
    excludeId?: number
  ): Expense | null => {
    const canonicalDesc = canonicalForm(normalizedDesc);
    return expenses.find(e =>
      e.date === date &&
      Math.abs(e.amount - amount) < 0.01 &&
      canonicalForm(e.description) === canonicalDesc &&
      e.id !== excludeId
    ) || null;
  };

  /**
   * Validate form data before adding/updating
   * @returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    // Description must not be empty
    if (!formData.description.trim()) {
      alert(t('errors.descriptionRequired'));
      return false;
    }

    // Amount must be a positive number
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(t('errors.amountGreaterThanZero'));
      return false;
    }

    // Recurring day must be between 1 and 31
    if (formData.isRecurring) {
      const day = formData.recurringDay;
      if (day < 1 || day > 31) {
        alert(t('errors.recurringDayInvalid'));
        return false;
      }
    }

    return true;
  };

  /**
   * Add a new expense and optionally a recurring entry based on form data.
   */
  const addExpense = async () => {
    if (!validateForm()) return;

    // Normalize description
    const normalizedDesc = normalizeDescription(formData.description);

    // Check for duplicates
    const duplicate = checkDuplicate(
      formData.date,
      parseFloat(formData.amount),
      normalizedDesc
    );

    if (duplicate) {
      if (!confirm(t('dialogs.duplicateConfirm', { description: duplicate.description, date: duplicate.date }))) {
        return; // User cancelled
      }
    }

    setSavingTransaction(true);
    try {
      const newExpense: Expense = {
        id: Date.now(),
        description: normalizedDesc, // Use normalized description
        amount: parseFloat(formData.amount),
        category: formData.category,
        type: formData.type,
        date: formData.date,
        paidBy: formData.paidBy,
      };

      const newExpenses = [...expenses, newExpense];
      await saveExpenses(newExpenses);
      setDirty(true); // Mark as dirty (unsaved changes)

      // Remember last category for quick add (Phase 1 Feature #1)
      if (newExpense.type === 'expense') {
        setLastExpenseCategory(newExpense.category);
      } else {
        setLastIncomeCategory(newExpense.category);
      }

      if (formData.isRecurring) {
        // Clamp recurring day to 1-31 range
        const clampedDay = Math.max(1, Math.min(31, formData.recurringDay));
        
        const newRecurringItem: RecurringTransaction = {
          id: Date.now() + 1,
          description: normalizedDesc, // Use normalized description
          amount: parseFloat(formData.amount),
          category: formData.category,
          type: formData.type,
          paidBy: formData.paidBy,
          recurringDay: clampedDay,
          lastProcessed: new Date().toISOString()
        };
        await saveRecurring([...recurring, newRecurringItem]);
        setDirty(true); // Mark as dirty
      }

      resetForm();
    } finally {
      setSavingTransaction(false);
    }
  };

  /**
   * Update an existing expense based on the editing ID and form data.
   */
  const updateExpense = async () => {
    if (!validateForm()) return;

    // Normalize description
    const normalizedDesc = normalizeDescription(formData.description);

    // Check for duplicates (excluding current expense being edited)
    const duplicate = checkDuplicate(
      formData.date,
      parseFloat(formData.amount),
      normalizedDesc,
      editingId || undefined
    );

    if (duplicate) {
      if (!confirm(t('dialogs.duplicateConfirm', { description: duplicate.description, date: duplicate.date }))) {
        return; // User cancelled
      }
    }

    setSavingTransaction(true);
    try {
      const newExpenses = expenses.map(exp =>
        exp.id === editingId
          ? { ...exp, description: normalizedDesc, amount: parseFloat(formData.amount), category: formData.category, type: formData.type, date: formData.date, paidBy: formData.paidBy }
          : exp
      );
      await saveExpenses(newExpenses);
      setDirty(true); // Mark as dirty (unsaved changes)
      resetForm();
    } finally {
      setSavingTransaction(false);
    }
  };

  /**
   * Delete an expense by ID and persist the updated list.
   *
   * @param id Expense ID to delete
   */
  const deleteExpense = async (id: number) => {
    const newExpenses = expenses.filter(exp => exp.id !== id);
    await saveExpenses(newExpenses);
    setDirty(true); // Mark as dirty (unsaved changes)
  };

  /**
   * Delete a recurring entry by ID and persist the updated list.
   *
   * @param id Recurring entry ID to delete
   */
  const deleteRecurring = async (id: number) => {
    const newRecurring = recurring.filter(rec => rec.id !== id);
    await saveRecurring(newRecurring);
    setDirty(true); // Mark as dirty (unsaved changes)
  };

  /**
   * Save settlements to storage
   */
  const saveSettlements = async (newSettlements: Settlement[]) => {
    await window.storage.set('household-settlements', JSON.stringify(newSettlements));
    setSettlements(newSettlements);
    setDirty(true); // Mark as dirty (unsaved changes)
  };

  /**
   * Record a new settlement/repayment between partners
   */
  const recordSettlement = async () => {
    const amount = parseFloat(settlementForm.amount);
    if (!amount || amount <= 0) {
      alert(t('errors.settlementAmountInvalid'));
      return;
    }

    if (settlementForm.from === settlementForm.to) {
      alert(t('errors.settlementSamePartner'));
      return;
    }

    const newSettlement: Settlement = {
      id: Date.now(),
      date: settlementForm.date,
      amount,
      from: settlementForm.from,
      to: settlementForm.to,
      note: settlementForm.note
    };

    const newSettlements = [...settlements, newSettlement];
    await saveSettlements(newSettlements);

    // Reset form and close modal
    setSettlementForm({ date: new Date().toISOString().split('T')[0], amount: '', from: 'partner1', to: 'partner2', note: '' });
    setShowSettlementModal(false);
  };

  /**
   * Delete a settlement by ID
   */
  const deleteSettlement = async (id: number) => {
    const newSettlements = settlements.filter(s => s.id !== id);
    await saveSettlements(newSettlements);
  };

  /**
   * Confirm deletion of an expense (shows confirmation modal)
   */
  const confirmDeleteExpense = (id: number, description: string) => {
    setDeleteConfirm({ id, description, type: 'expense' });
  };

  /**
   * Confirm deletion of a recurring transaction (shows confirmation modal)
   */
  const confirmDeleteRecurring = (id: number, description: string) => {
    setDeleteConfirm({ id, description, type: 'recurring' });
  };

  /**
   * Execute the confirmed deletion (unified for expenses and recurring)
   */
  const executeDelete = async () => {
    if (!deleteConfirm) return;

    setDeletingItem(true);
    try {
      if (deleteConfirm.type === 'expense') {
        await deleteExpense(deleteConfirm.id);
      } else {
        await deleteRecurring(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    } finally {
      setDeletingItem(false);
    }
  };

  /**
   * Prompt user to select a directory for auto-saving backups
   */
  const chooseSaveDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      setSaveDirectory(dirHandle);
      showToast(t('toasts.saveFolderSet', { name: dirHandle.name }), 'success');
      return dirHandle;
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error choosing directory:', error);
        showToast(t('errors.selectFolderFailed'), 'error');
      }
      return null;
    }
  };

  const buildExportObject = () => {
    const exportDate = new Date().toISOString();
    const raw = {
      'household-expenses': JSON.stringify(expenses),
      'household-recurring': JSON.stringify(recurring),
      'household-partner-names': JSON.stringify(partnerNames),
      'household-settings': JSON.stringify(householdSettings),
      'household-settlements': JSON.stringify(settlements),
    };

    return {
      schemaVersion: 1,
      exportDate,
      data: {
        expenses,
        recurring,
        partnerNames,
        householdSettings,
        settlements,
      },
      raw,
    };
  };

  const writeJsonToDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    filename: string,
    jsonString: string
  ) => {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();
  };

  /**
   * Save data to a stable file (used by auto-save and manual Save).
   */
  const saveData = async (options?: {
    allowDownload?: boolean;
    showToast?: boolean;
    promptForDirectory?: boolean;
  }) => {
    setExportingData(true);
    try {
      const exportObject = buildExportObject();
      const jsonString = JSON.stringify(exportObject, null, 2);
      const filename = 'expense-tracker.json';

      let targetDirectory = saveDirectory;
      const shouldPrompt = options?.promptForDirectory !== false;
      if (supportsFileSystem && !targetDirectory && shouldPrompt) {
        targetDirectory = await chooseSaveDirectory();
      }

      if (supportsFileSystem && targetDirectory) {
        await writeJsonToDirectory(targetDirectory, filename, jsonString);
        setDirty(false);
        setLastExportDate(exportObject.exportDate);
        if (options?.showToast !== false) {
          showToast(
            t('toasts.savedTo', { path: `${targetDirectory.name}/${filename}` }),
            'success'
          );
        }
        return;
      }

      const allowDownload = options?.allowDownload ?? !supportsFileSystem;
      if (!allowDownload) {
        if (options?.showToast !== false && supportsFileSystem && shouldPrompt) {
          showToast(t('errors.saveFolderRequired'), 'error');
        }
        return;
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDirty(false);
      setLastExportDate(exportObject.exportDate);
      if (options?.showToast !== false) {
        showToast(t('toasts.dataSaved'), 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      if (options?.showToast !== false) {
        showToast(t('errors.saveFailed'), 'error');
      }
    } finally {
      setExportingData(false);
    }
  };

  /**
   * Export a timestamped backup file.
   */
  const exportData = async () => {
    setExportingData(true);
    try {
      const exportObject = buildExportObject();
      const jsonString = JSON.stringify(exportObject, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `expense-tracker-${timestamp}.json`;

      if (supportsFileSystem && saveDirectory) {
        await writeJsonToDirectory(saveDirectory, filename, jsonString);
        setDirty(false);
        setLastExportDate(exportObject.exportDate);
        showToast(
          t('toasts.exportedTo', { path: `${saveDirectory.name}/${filename}` }),
          'success'
        );
        return;
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDirty(false);
      setLastExportDate(exportObject.exportDate);
      showToast(t('toasts.dataExported'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast(t('errors.exportFailed'), 'error');
    } finally {
      setExportingData(false);
    }
  };

  /**
   * Handle file selection for import
   */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  /**
   * Import data from JSON file (validates, shows summary, and overwrites)
   * Vault mode: This restores the source of truth
   */
  const importData = async () => {
    if (!importFile) {
      alert(t('errors.selectImportFile'));
      return;
    }

    setImportingData(true);
    try {
      // Read file
      const text = await importFile.text();
      const importObject = JSON.parse(text);

      // Validate schema v1 (strict - fail fast)
      if (importObject.schemaVersion !== 1) {
        alert(t('errors.invalidSchemaVersion'));
        return;
      }
      
      if (!importObject.data) {
        alert(t('errors.invalidBackupMissingData'));
        return;
      }

      const { data, raw } = importObject;

      // Validation: Check data structure - ALL 4 keys required (clean slate v1)
      if (!Array.isArray(data.expenses)) {
        alert(t('errors.invalidBackupExpenses'));
        return;
      }
      if (!Array.isArray(data.recurring)) {
        alert(t('errors.invalidBackupRecurring'));
        return;
      }
      if (!data.partnerNames ||
          typeof data.partnerNames.partner1 !== 'string' ||
          typeof data.partnerNames.partner2 !== 'string') {
        alert(t('errors.invalidBackupPartners'));
        return;
      }
      // household-settings is REQUIRED in schema v1
      if (!data.householdSettings || typeof data.householdSettings !== 'object') {
        alert(t('errors.invalidBackupSettings'));
        return;
      }
      // settlements is optional (for backward compatibility)
      const settlementsCount = Array.isArray(data.settlements) ? data.settlements.length : 0;

      // Show summary before import
      const currency =
        data.householdSettings?.currencySymbol || householdSettings.currencySymbol || '';
      const summaryLines = [
        t('dialogs.importSummaryTitle'),
        '',
        t('dialogs.importSummaryTransactions', { count: data.expenses.length }),
        t('dialogs.importSummaryRecurring', { count: data.recurring.length }),
        t('dialogs.importSummaryPartners', {
          partner1: data.partnerNames.partner1,
          partner2: data.partnerNames.partner2
        }),
        t('dialogs.importSummaryCurrency', { currency })
      ];

      if (data.householdSettings) {
        summaryLines.push(
          t('dialogs.importSummarySplit', { mode: data.householdSettings.splitMode })
        );
      }
      if (settlementsCount > 0) {
        summaryLines.push(
          t('dialogs.importSummarySettlements', { count: settlementsCount })
        );
      }

      summaryLines.push('', t('dialogs.importSummaryWarning'));
      const summary = summaryLines.join('\n');

      if (!confirm(summary)) {
        return;
      }

      // Import: prefer raw strings if available AND valid, fallback to data
      // Schema v1 requires all 4 keys (settlements optional)
      let useRaw = false;
      if (raw && 
          raw['household-expenses'] && 
          raw['household-recurring'] && 
          raw['household-partner-names'] && 
          raw['household-settings']) {
        // Sanity check: validate that ALL raw data can be parsed before trusting it
        try {
          JSON.parse(raw['household-expenses']);
          JSON.parse(raw['household-recurring']);
          JSON.parse(raw['household-partner-names']);
          JSON.parse(raw['household-settings']);
          if (raw['household-settlements']) {
            JSON.parse(raw['household-settlements']);
          }
          useRaw = true;
        } catch (error) {
          console.warn('Raw data failed to parse, falling back to parsed data', error);
        }
      }

      if (useRaw) {
        // Use raw storage strings for perfect fidelity
        await window.storage.set('household-expenses', raw['household-expenses']);
        await window.storage.set('household-recurring', raw['household-recurring']);
        await window.storage.set('household-partner-names', raw['household-partner-names']);
        await window.storage.set('household-settings', raw['household-settings']);
        await window.storage.set('household-settlements', raw['household-settlements'] || '[]');
      } else {
        // Fallback to parsed data
        await window.storage.set('household-expenses', JSON.stringify(data.expenses));
        await window.storage.set('household-recurring', JSON.stringify(data.recurring));
        await window.storage.set('household-partner-names', JSON.stringify(data.partnerNames));
        await window.storage.set('household-settings', JSON.stringify(data.householdSettings || defaultSettings));
        await window.storage.set('household-settlements', JSON.stringify(data.settlements || []));
      }

      // Clear file input for clean UI reset
      setImportFile(null);
      // Reset the file input element
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Clear dirty flag (data is now in sync with "vault")
      setDirty(false);

      alert(t('dialogs.importSuccess'));
      window.location.reload();

    } catch (error) {
      console.error('Import error:', error);
      showToast(t('errors.importFailed'), 'error');
    } finally {
      setImportingData(false);
    }
  };

  /**
   * Reset the form to initial state and close the add/edit modal.
   */
  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'Housing',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      paidBy: 'partner1',
      isRecurring: false,
      recurringDay: 1
    });
    setShowAddModal(false);
    setEditingId(null);
  };

  /**
   * Populate the form with an existing expense's data for editing.
   *
   * @param expense Expense object to edit
   */
  const editExpense = (expense: Expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      type: expense.type,
      date: expense.date,
      paidBy: expense.paidBy,
      isRecurring: false,
      recurringDay: 1
    });
    setEditingId(expense.id);
    setShowAddModal(true);
  };

  /**
   * Filter expenses based on the selected month and year, plus search query, plus category filter (Phase 1 Feature #8)
   */
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const matchesDate = (
      expDate.getMonth() === selectedMonth &&
      expDate.getFullYear() === selectedYear
    );

    if (!matchesDate) return false;

    // Apply category filter (Phase 1 Feature #8)
    if (selectedCategory && exp.category !== selectedCategory) return false;

    // Apply search filter (description, category, or paidBy)
    if (searchQuery === '') return true;

    const query = searchQuery.toLowerCase();
    return (
      exp.description.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      exp.paidBy.toLowerCase().includes(query) ||
      (exp.paidBy === 'partner1' && partnerNames.partner1.toLowerCase().includes(query)) ||
      (exp.paidBy === 'partner2' && partnerNames.partner2.toLowerCase().includes(query))
    );
  });

  // Compute totals for income, expenses, and balances.
  const totalIncome = filteredExpenses
    .filter(exp => exp.type === 'income')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpense = filteredExpenses
    .filter(exp => exp.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const balance = totalIncome - totalExpense;

  const partner1Paid = filteredExpenses
    .filter(exp => exp.paidBy === 'partner1' && exp.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const partner2Paid = filteredExpenses
    .filter(exp => exp.paidBy === 'partner2' && exp.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const partner1Income = filteredExpenses
    .filter(exp => exp.paidBy === 'partner1' && exp.type === 'income')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const partner2Income = filteredExpenses
    .filter(exp => exp.paidBy === 'partner2' && exp.type === 'income')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const jointPaid = filteredExpenses
    .filter(exp => exp.paidBy === 'joint' && exp.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Split mode: Calculate fair share based on household settings
  // For equal: 50/50 split; for proportional: use partner1Ratio
  const splitRatio = householdSettings.splitMode === 'equal' 
    ? 0.5 
    : Math.max(0.05, Math.min(0.95, householdSettings.partner1Ratio)); // Clamp ratio to safe range
  
  // Balance calculation: Only count personal payments (partner1 and partner2)
  // Joint expenses are excluded - they represent payments from a shared account/already settled
  const totalSharedExpenses = partner1Paid + partner2Paid;
  const partner1FairShare = totalSharedExpenses * splitRatio;
  const partner2FairShare = totalSharedExpenses * (1 - splitRatio);
  
  // For progress bar display: include all payment types to calculate percentages correctly
  const totalAllPayments = partner1Paid + partner2Paid + jointPaid;
  
  // Balance calculation: What they paid minus what they should have paid
  // Positive balance = partner is OWED money (overpaid)
  // Negative balance = partner OWES money (underpaid)
  let partner1Balance = partner1Paid - partner1FairShare;
  let partner2Balance = partner2Paid - partner2FairShare;

  // Adjust balances for settlements/repayments.
  // Treat settlements as net transfers toward partner1 (positive = partner1 received).
  const netSettlementToPartner1 = settlements.reduce((sum, settlement) => {
    const amount = Number(settlement.amount);
    if (!Number.isFinite(amount)) return sum;
    if (settlement.from === 'partner1' && settlement.to === 'partner2') return sum - amount;
    if (settlement.from === 'partner2' && settlement.to === 'partner1') return sum + amount;
    return sum;
  }, 0);

  partner1Balance -= netSettlementToPartner1;
  partner2Balance += netSettlementToPartner1;

  // Calculate totals per category for expenses.
  const categoryTotals = filteredExpenses
    .filter(exp => exp.type === 'expense')
    .reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  // Sort categories by total amount and take top six for the dashboard.
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  /**
   * Compute frequent expenses for quick-add widget (Phase 1 Feature #7)
   * Shows the 3 most common transactions by exact match (description + category + amount)
   */
  const frequentExpenses = useMemo(() => {
    const counts: Record<string, number> = {};
    
    expenses.forEach(exp => {
      if (exp.type === 'expense') { // Only track expenses, not income
        const key = `${exp.description}|${exp.category}|${exp.amount}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => {
        const [description, category, amount] = key.split('|');
        return { description, category, amount: parseFloat(amount) };
      });
  }, [expenses]);

  /**
   * Phase 2 Feature #1: Command Palette - search & navigation
   * Define all available commands with fuzzy search
   */
  const commands = useMemo(() => [
    // Navigation
    { icon: BarChart3, label: t('commands.goToDashboard'), description: t('commands.viewOverview'), action: () => setCurrentView('dashboard'), keywords: ['home', 'overview'] },
    { icon: Activity, label: t('commands.goToTransactions'), description: t('commands.viewAllTransactions'), action: () => setCurrentView('transactions'), keywords: ['list', 'all'] },
    { icon: PieChart, label: t('commands.goToCategories'), description: t('commands.viewByCategory'), action: () => setCurrentView('categories'), keywords: ['breakdown'] },
    { icon: DollarSign, label: t('commands.goToBalance'), description: t('commands.viewSettlement'), action: () => setCurrentView('balance'), keywords: ['settlement', 'owe'] },
    
    // Actions
    { icon: PlusCircle, label: t('commands.addTransaction'), description: t('commands.createEntry'), action: () => setShowAddModal(true), shortcut: 'Cmd+N' },
    { icon: TrendingDown, label: t('commands.addExpense'), description: t('commands.quickExpense'), action: () => openQuickAdd('expense'), shortcut: 'E' },
    { icon: TrendingUp, label: t('commands.addIncome'), description: t('commands.quickIncome'), action: () => openQuickAdd('income'), shortcut: 'I' },
    { icon: Settings, label: t('commands.openSettings'), description: t('commands.configureApp'), action: () => setShowSettingsModal(true), shortcut: 'Cmd+,' },
      { icon: Save, label: t('commands.exportData'), description: t('commands.saveBackup'), action: () => exportData() },
    
    // Search transactions (top 5 recent)
    ...filteredExpenses.slice(0, 5).map(exp => ({
      icon: DollarSign,
      label: exp.description,
      description: `${formatCurrency(exp.amount)} on ${exp.date}`,
      action: () => { editExpense(exp); setShowCommandPalette(false); },
      keywords: [exp.category, exp.paidBy]
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [filteredExpenses, currentView]);

  const filteredCommands = useMemo(() => {
    if (!commandQuery) return commands;
    const query = commandQuery.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.keywords?.some((k: string) => k.toLowerCase().includes(query))
    );
  }, [commands, commandQuery]);

  const executeCommand = (cmd: { action: () => void }) => {
    cmd.action();
    setShowCommandPalette(false);
    setCommandQuery('');
  };

  /**
   * Get available years for the year selector dropdown.
   * Returns years based on actual transaction data, plus current and next year.
   */
  const getAvailableYears = (): number[] => {
    if (expenses.length === 0) {
      // Default range if no data: previous year, current year, next year
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);
    }
    
    // Get unique years from actual transactions
    const years = [...new Set(expenses.map(exp => new Date(exp.date).getFullYear()))];
    years.sort((a, b) => a - b);
    
    // Always include current year and next year for planning
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.push(currentYear);
    if (!years.includes(currentYear + 1)) years.push(currentYear + 1);
    
    return years.sort((a, b) => a - b);
  };

  /**
   * Generate chart data for daily expenses and income for the selected month.
   */
  const getChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayExpenses = filteredExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getDate() === day && exp.type === 'expense';
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const dayIncome = filteredExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getDate() === day && exp.type === 'income';
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      data.push({ day, expense: dayExpenses, income: dayIncome });
    }
    return data;
  };

  const chartData = getChartData();
  const computedMax = Math.max(...chartData.map(d => Math.max(d.expense, d.income)), 1);
  // Dynamic "nice" max - keeps scaling friendly for small amounts
  const maxAmount = computedMax <= 10 ? 10 : computedMax <= 50 ? 50 : computedMax <= 100 ? 100 : Math.ceil(computedMax / 100) * 100;

  const MIN_BAR_PX = 2;

  // Check if entire month is empty
  const hasAnyData = chartData.some(d => d.expense > 0 || d.income > 0);

  /**
   * Calculate insights for the current month (for dashboard widget)
   */
  const getInsights = () => {
    const monthExpenses = filteredExpenses.filter(e => e.type === 'expense');
    
    // Largest expense
    const largest = monthExpenses.reduce((max, e) => 
      e.amount > max.amount ? e : max, 
      { amount: 0, description: 'None', category: '' }
    );
    
    // Days with spending (unique days)
    const daysWithSpending = new Set(
      monthExpenses.map(e => new Date(e.date).getDate())
    ).size;
    
    // Average daily spend (only count days with spending)
    const avgDaily = daysWithSpending > 0 
      ? totalExpense / daysWithSpending 
      : 0;
    
    // Top category by spend
    const topCategoryEntry = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];
    const topCategory = topCategoryEntry ? topCategoryEntry[0] : 'None';
    
    return { largest, avgDaily, topCategory, daysWithSpending };
  };

  const insights = getInsights();

  /**
   * Calculate month-over-month category delta (current month vs previous month)
   */
  const getCategoryDelta = () => {
    // Current month category totals (already computed above as categoryTotals)
    
    // Previous month
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    
    const prevExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return e.type === 'expense' && 
             d.getMonth() === prevMonth && 
             d.getFullYear() === prevYear;
    });
    
    const prevCategoryTotals: Record<string, number> = {};
    prevExpenses.forEach(e => {
      prevCategoryTotals[e.category] = (prevCategoryTotals[e.category] || 0) + e.amount;
    });
    
    // Calculate delta for all categories that appear in either month
    const allCategories = new Set([
      ...Object.keys(categoryTotals),
      ...Object.keys(prevCategoryTotals)
    ]);
    
    return Array.from(allCategories).map(cat => ({
      category: cat,
      current: categoryTotals[cat] || 0,
      previous: prevCategoryTotals[cat] || 0,
      delta: (categoryTotals[cat] || 0) - (prevCategoryTotals[cat] || 0)
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  };

  const categoryDeltas = getCategoryDelta();

  /**
   * Phase 2 Feature #6: Calculate spending trends over last 6 months
   */
  const getTrendData = () => {
    const trendMonths = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      
      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.date);
        return e.type === 'expense' && 
               expDate.getMonth() === month && 
               expDate.getFullYear() === year;
      });
      
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      trendMonths.push({ month, year, amount: total });
    }
    
    return trendMonths;
  };

  const trendData = getTrendData();
  const maxTrend = Math.max(...trendData.map(d => d.amount), 1);
  
  // Calculate prediction based on 6-month average
  const prediction = trendData.length > 0 
    ? trendData.reduce((sum, d) => sum + d.amount, 0) / trendData.length 
    : 0;

  /**
   * Phase 2 Feature #5: Helper functions for pie chart generation
   */
  const createPieSlice = (anglePercent: number, startAngle: number): string => {
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    
    const angle = (anglePercent / 100) * 2 * Math.PI;
    const start = (startAngle / 100) * 2 * Math.PI - Math.PI / 2;
    const end = start + angle;
    
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    
    const largeArc = angle > Math.PI ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const calculateLabelPosition = (anglePercent: number, startAngle: number): { x: number; y: number } => {
    const centerX = 100;
    const centerY = 100;
    const labelRadius = 60;
    
    const midAngle = ((startAngle + anglePercent / 2) / 100) * 2 * Math.PI - Math.PI / 2; // Restore: offset needed
    
    return {
      x: centerX + labelRadius * Math.cos(midAngle),
      y: centerY + labelRadius * Math.sin(midAngle)
    };
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  // Show a loading state while retrieving data from storage.
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Toast Notification (Phase 1 Feature #2D) */}
        {toast && (
          <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 flex-shrink-0 bg-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">{t('app.title')}</h1>
              <p className="text-purple-300 text-xs sm:text-sm truncate">{partnerNames.partner1} &amp; {partnerNames.partner2}</p>
              {dirty && (
                <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1 flex-wrap">
                  <span>⚠️</span>
                  <span className="break-words">
                    {saveDirectory
                      ? t('status.unsavedChangesWillSaveTo', { name: saveDirectory.name })
                      : t('status.unsavedChanges')}
                  </span>
                </p>
              )}
              {!dirty && saveDirectory && (
                <p className="text-green-400 text-xs flex items-center gap-1 mt-1 flex-wrap">
                  <span>✓</span>
                  <span className="truncate">{t('status.autoSavingTo', { name: saveDirectory.name })}</span>
                  {lastExportDate && (
                    <span className="text-slate-400">
                      Auto-saved {new Date(lastExportDate).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Auto-Save Status Indicator (Phase 1 Feature #6) */}
          <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
            {!dirty && (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-slate-300">{t('status.allSaved')}</span>
              </>
            )}
            {dirty && !exportingData && (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-slate-300">{t('status.unsavedChanges')}</span>
              </>
            )}
            {exportingData && (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-300">{t('status.saving')}</span>
              </>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Save Button */}
              <button
                onClick={saveData}
                disabled={exportingData || !dirty}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                title={saveDirectory ? t('tooltips.saveTo', { name: saveDirectory.name }) : t('tooltips.save')}
              >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">
                {exportingData ? t('buttons.saving') : t('buttons.save')}
              </span>
            </button>
            
            {/* Help Button (Phase 1 Feature #5) */}
            <button
              onClick={() => setShowShortcuts(true)}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title={t('tooltips.keyboardShortcuts')}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{t('buttons.help')}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title={t('tooltips.settings')}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">{t('buttons.settings')}</span>
            </button>
          </div>
        </div>

        {/* Navigation buttons and selectors */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* View navigation buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0 border-b-2 border-slate-700">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                currentView === 'dashboard'
                  ? 'bg-slate-800/50 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('nav.dashboard')}</span>
              {currentView === 'dashboard' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => {
                setCurrentView('transactions');
              }}
              className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                currentView === 'transactions'
                  ? 'bg-slate-800/50 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{t('nav.transactions')}</span>
              {currentView === 'transactions' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('categories')}
              className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                currentView === 'categories'
                  ? 'bg-slate-800/50 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>{t('nav.categories')}</span>
              {currentView === 'categories' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('balance')}
              className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                currentView === 'balance'
                  ? 'bg-slate-800/50 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{t('nav.balance')}</span>
              {currentView === 'balance' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
              )}
            </button>
          </div>

          {/* Month and year selectors */}
          <div className="flex gap-2 sm:ml-auto">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="flex-1 sm:flex-initial bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 px-3 sm:px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200 outline-none text-sm sm:text-base"
            >
              {months.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="flex-1 sm:flex-initial bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 px-3 sm:px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200 outline-none text-sm sm:text-base"
            >
              {getAvailableYears().map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Breadcrumb Navigation (Phase 2 Feature #2) */}
        <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`hover:text-purple-400 transition-colors ${
              currentView === 'dashboard' ? 'text-white font-medium' : 'text-slate-400'
            }`}
          >
            {t('nav.dashboard')}
          </button>
          {currentView !== 'dashboard' && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-white font-medium capitalize">{currentView}</span>
            </>
          )}
          
          {/* Show active filters as breadcrumb items */}
          {selectedCategory && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-purple-400 flex items-center gap-1">
                {categories[selectedCategory]?.icon} {selectedCategory}
              </span>
            </>
          )}
          {searchQuery && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-purple-400">Search: &quot;{searchQuery}&quot;</span>
            </>
          )}
        </div>

        {/* Dashboard view */}
        {currentView === 'dashboard' && (
          <>
            {/* Empty State (Phase 1 Feature #4) */}
            {filteredExpenses.length === 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-12 text-center">
                <div className="text-7xl mb-6">[]</div>
                <h3 className="text-3xl font-bold mb-3">{t('app.welcomeTitle')}</h3>
                <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                  {t('app.welcomeBody')}
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => openQuickAdd('expense')}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-3 transition-colors text-lg font-medium"
                  >
                    <TrendingDown className="w-6 h-6" />
                    {t('buttons.addFirstExpense')}
                  </button>
                  <button
                    onClick={() => openQuickAdd('income')}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-3 transition-colors text-lg font-medium"
                  >
                    <TrendingUp className="w-6 h-6" />
                    {t('buttons.addIncome')}
                  </button>
                </div>
                <p className="text-slate-500 text-sm mt-6">
                  {t('app.shortcutHint')}
                </p>
              </div>
            )}

            {filteredExpenses.length > 0 && (
              <>
            {/* Balance, Expense, Income cards (Phase 1 Feature #2C - Hover effects) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-800/70 hover:border-slate-600 hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{t('labels.balance')}</span>
                  <div className="text-blue-400 text-2xl font-bold">
                    {totalIncome > 0
                      ? Math.round((balance / totalIncome) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1 transition-all duration-500">
                  {formatCurrency(balance)}
                </div>
                <div className="text-xs text-slate-500">
                  {t('labels.transactionsCount', { count: filteredExpenses.length })}
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-800/70 hover:border-slate-600 hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{t('labels.expense')}</span>
                  <div className="text-red-400 text-2xl font-bold">
                    -{totalIncome > 0
                      ? Math.round((totalExpense / totalIncome) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-400 mb-1 transition-all duration-500">
                  -{formatCurrency(totalExpense)}
                </div>
                <div className="text-xs text-slate-500">
                  {t('labels.transactionsCount', {
                    count: filteredExpenses.filter(e => e.type === 'expense').length
                  })}
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-800/70 hover:border-slate-600 hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{t('labels.income')}</span>
                  <div className="text-green-400 text-2xl font-bold">100%</div>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-1 transition-all duration-500">
                  +{formatCurrency(totalIncome)}
                </div>
                <div className="text-xs text-slate-500">
                  {t('labels.transactionsCount', {
                    count: filteredExpenses.filter(e => e.type === 'income').length
                  })}
                </div>
              </div>
            </div>

            {/* Frequent Transactions Widget (Phase 1 Feature #7 + Phase 2 Feature #8 - Add Again) */}
            {frequentExpenses.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold">{t('labels.quickAddFrequent')}</h3>
                  <span className="text-xs text-slate-400">{t('messages.mostCommonTransactions')}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {frequentExpenses.map((exp, idx) => (
                    <div key={idx} className="relative group flex-shrink-0">
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            description: exp.description,
                            category: exp.category,
                            amount: exp.amount.toString(),
                            type: 'expense',
                            date: new Date().toISOString().split('T')[0]
                          });
                          setShowAddModal(true);
                          showToast(t('toasts.prefilled', { description: exp.description }), 'success');
                        }}
                        className="bg-slate-700/50 hover:bg-slate-600 px-4 py-3 rounded-xl transition-all hover:scale-105 border border-slate-600 hover:border-purple-500"
                        title={t('tooltips.editAndAdd', { description: exp.description })}
                      >
                        <div className="text-2xl mb-1">{categories[exp.category]?.icon}</div>
                        <div className="text-sm font-medium truncate max-w-[120px]">{exp.description}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(exp.amount)}</div>
                      </button>
                      {/* Add Again button (Phase 2 Feature #8) */}
                      <button
                        onClick={async () => {
                          // Directly add the transaction without opening modal
                          setSavingTransaction(true);
                          try {
                            const newExpense: Expense = {
                              id: Date.now(),
                              description: exp.description,
                              amount: exp.amount,
                              category: exp.category,
                              type: 'expense',
                              date: new Date().toISOString().split('T')[0],
                              paidBy: 'partner1',
                              isAuto: false
                            };
                            const updated = [...expenses, newExpense];
                            setExpenses(updated);
                            await window.storage.set('household-expenses', JSON.stringify(updated));
                            setDirty(true);
                            showToast(t('toasts.added', { description: exp.description }), 'success');
                          } catch (error) {
                            showToast(t('errors.addTransactionFailed'), 'error');
                          } finally {
                            setSavingTransaction(false);
                          }
                        }}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-2 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg transition-all transform hover:scale-110"
                        title={t('tooltips.addTransactionNow')}
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights and MoM Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Insights Widget */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t('labels.insights')}
                </h3>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-slate-400 whitespace-nowrap">{t('labels.largestExpense')}:</span>
                    <span className="font-semibold text-right break-words min-w-0">
                      {insights.largest.amount > 0 
                        ? `${formatCurrency(insights.largest.amount)} - ${insights.largest.description}`
                        : t('labels.none')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{t('labels.avgDailySpend')}:</span>
                    <span className="font-semibold">{formatCurrency(insights.avgDaily)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{t('labels.topCategory')}:</span>
                    <span className="font-semibold flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0">{categories[insights.topCategory]?.icon || ''}</span>
                      <span className="truncate">{insights.topCategory}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{t('labels.daysWithSpending')}:</span>
                    <span className="font-semibold">{t('labels.daysCount', { count: insights.daysWithSpending })}</span>
                  </div>
                </div>
              </div>

              {/* Month-over-Month Comparison */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold mb-4">{t('labels.monthOverMonth')}</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categoryDeltas.slice(0, 6).map(delta => (
                    <div key={delta.category} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="text-slate-400 flex items-center gap-2 min-w-0 flex-1">
                        <span className="flex-shrink-0">{categories[delta.category]?.icon || '📌'}</span>
                        <span className="truncate">{delta.category}</span>
                      </span>
                      <span className={`font-semibold whitespace-nowrap flex-shrink-0 ${delta.delta > 0 ? 'text-red-400' : delta.delta < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                        {delta.delta > 0 ? '+' : ''}{formatCurrency(delta.delta)}
                      </span>
                    </div>
                  ))}
                  {categoryDeltas.length === 0 && (
                    <p className="text-slate-500 text-xs sm:text-sm text-center py-4">{t('messages.noPreviousMonthData')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Categories and statistics section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Top categories */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t('labels.categories')}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="text-yellow-400">● {t('labels.expense')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {sortedCategories.slice(0, 4).map(([category, amount]) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentView('transactions');
                        showToast(t('toasts.filteringBy', { category }), 'success');
                      }}
                      className={`${categories[category]?.color} bg-opacity-20 rounded-xl p-4 border border-opacity-30 hover:border-opacity-100 transition-all hover:scale-105 cursor-pointer text-left ${
                        selectedCategory === category ? 'ring-2 ring-white' : ''
                      }`}
                      title={t('tooltips.filterByCategory', { category })}
                    >
                      <div className="text-3xl mb-2">
                        {categories[category]?.icon}
                      </div>
                      <div className="text-xs text-slate-300 mb-1">{category}</div>
                      <div className="text-sm font-bold">
                        {Math.round((amount / totalExpense) * 100)}%
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex gap-1 mb-1">
                      {sortedCategories.slice(0, 4).map(([category, amount], idx) => (
                        <div
                          key={idx}
                          className={`h-2 ${categories[category]?.color} rounded-full`}
                          style={{ width: `${(amount / totalExpense) * 100}%` }}
                        />
                      ))}
                    </div>
                    <span>
                      {t('charts.others')}{' '}
                      {sortedCategories.length > 4
                        ? Math.round(
                            (sortedCategories
                              .slice(4)
                              .reduce((sum, [, amt]) => sum + amt, 0) /
                              totalExpense) *
                            100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics bar chart */}
              <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t('labels.statistics')}</h3>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                      {t('labels.expense')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {t('labels.income')}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-2">{t('labels.thisMonth')}</div>

                <div className="relative h-48">
                  {!hasAnyData && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-slate-500 text-sm">{t('messages.noDataThisMonth')}</p>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex items-end justify-between gap-1">
                    {chartData.map((data, idx) => {
                      const expensePct = (data.expense / maxAmount) * 100;
                      const incomePct = (data.income / maxAmount) * 100;

                      // Convert percent to px min-height when non-zero
                      const incomeStyle =
                        data.income > 0
                          ? { height: `${incomePct}%`, minHeight: `${MIN_BAR_PX}px` }
                          : { height: '2px', opacity: 0.15 };

                      const expenseStyle =
                        data.expense > 0
                          ? { height: `${expensePct}%`, minHeight: `${MIN_BAR_PX}px` }
                          : { height: '2px', opacity: 0.15 };

                      return (
                        <div 
                          key={idx} 
                          className="flex-1 flex flex-col items-center justify-end gap-1 relative cursor-pointer"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setChartTooltip({
                              day: data.day,
                              income: data.income,
                              expense: data.expense,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setChartTooltip(null)}
                          onClick={() => {
                            // Click bar to filter to that day
                            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
                            setSearchQuery(dateStr);
                            setCurrentView('transactions');
                            showToast(t('toasts.showingTransactionsForDay', { day: data.day }), 'success');
                          }}
                        >
                          {/* Always render both bars so the chart never looks empty */}
                          <div
                            className="w-full bg-green-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
                            style={{ 
                              ...incomeStyle,
                              transitionDelay: `${idx * 30}ms`
                            }}
                            title={
                              data.income > 0
                                ? t('charts.incomeDayTitle', {
                                    day: data.day,
                                    value: formatCurrency(data.income)
                                  })
                                : t('charts.noIncomeDayTitle', { day: data.day })
                            }
                          />
                          <div
                            className="w-full bg-red-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
                            style={{ 
                              ...expenseStyle,
                              transitionDelay: `${idx * 30}ms`
                            }}
                            title={
                              data.expense > 0
                                ? t('charts.expenseDayTitle', {
                                    day: data.day,
                                    value: formatCurrency(data.expense)
                                  })
                                : t('charts.noExpenseDayTitle', { day: data.day })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  {[1, 5, 10, 15, 20, 25, 30].map(day => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {t('messages.onlyDaysWithSpending')}
                </p>

                {/* Chart Tooltip Portal (Phase 2 Feature #4) */}
                {chartTooltip && (
                  <div
                    className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl pointer-events-none"
                    style={{
                      left: `${chartTooltip.x}px`,
                      top: `${chartTooltip.y - 10}px`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="text-sm font-bold mb-1">
                      {t('charts.day', { day: chartTooltip.day })}
                    </div>
                    {chartTooltip.income > 0 && (
                      <div className="text-xs text-green-400">
                        {t('charts.incomeLabel', { value: formatCurrency(chartTooltip.income) })}
                      </div>
                    )}
                    {chartTooltip.expense > 0 && (
                      <div className="text-xs text-red-400">
                        {t('charts.expenseLabel', { value: formatCurrency(chartTooltip.expense) })}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      {t('charts.clickToView')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Spending Trends - 6 month view (Phase 2 Feature #6) */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">{t('labels.spendingTrends')}</h3>
              <div className="relative h-48">
                <svg viewBox="0 0 600 150" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 30}
                      x2="600"
                      y2={i * 30}
                      stroke="#334155"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  ))}
                  
                  {/* Trend line */}
                  <polyline
                    points={trendData.map((d, i) => `${i * 100},${150 - (d.amount / maxTrend) * 130}`).join(' ')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="3"
                    className="transition-all duration-500"
                  />
                  
                  {/* Data points */}
                  {trendData.map((d, i) => (
                    <circle
                      key={i}
                      cx={i * 100}
                      cy={150 - (d.amount / maxTrend) * 130}
                      r="5"
                      fill="#a855f7"
                      className="hover:r-8 cursor-pointer transition-all"
                      onClick={() => {
                        setSelectedMonth(d.month);
                        setSelectedYear(d.year);
                        showToast(t('toasts.viewingMonth', { month: months[d.month], year: d.year }), 'success');
                      }}
                    >
                      <title>{t('charts.monthAmount', { month: months[d.month], value: formatCurrency(d.amount) })}</title>
                    </circle>
                  ))}
                </svg>
              </div>
              
              {/* Month labels */}
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                {trendData.map(d => (
                  <span key={`${d.year}-${d.month}`}>{months[d.month].slice(0, 3)}</span>
                ))}
              </div>
              
              {/* Prediction badge */}
              {prediction > 0 && (
                <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700 rounded-lg text-sm">
                  <span className="text-purple-400">{t('charts.predictedNextLabel')}</span>
                  <span className="font-bold">{formatCurrency(prediction)}</span>
                  <span className="text-xs text-slate-400 ml-2">{t('charts.predictedNote')}</span>
                </div>
              )}
            </div>

            {/* Recent transactions and upcoming recurring */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent transactions */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t('labels.transactions')}</h3>
                  <button
                    onClick={() => setCurrentView('transactions')}
                    className="text-purple-400 text-sm hover:text-purple-300"
                  >
                    {t('buttons.seeAll')}
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredExpenses
                    .slice(-6)
                    .reverse()
                    .map(exp => (
                      <div 
                        key={exp.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all cursor-pointer"
                        onClick={() => editExpense(exp)}
                        title={t('tooltips.clickToEdit')}
                      >
                        <div
                          className={`w-10 h-10 ${categories[exp.category]?.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
                        >
                          {categories[exp.category]?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {exp.description}
                          </div>
                          <div className="text-xs text-slate-400">
                            {exp.paidBy === 'joint'
                              ? t('labels.joint')
                              : exp.paidBy === 'partner1'
                              ? partnerNames.partner1
                              : partnerNames.partner2}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-bold ${
                              exp.type === 'income'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {exp.type === 'income' ? '+' : '-'}$
                            {exp.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {exp.category}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Upcoming recurring items */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t('labels.upcoming')}</h3>
                  <button
                    className="text-purple-400 text-sm hover:text-purple-300"
                    title={t('buttons.addRecurring')}
                  >
                    +
                  </button>
                </div>

                <div className="space-y-3">
                  {recurring.map(rec => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
                    >
                      <div
                        className={`w-10 h-10 ${categories[rec.category]?.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
                      >
                        {categories[rec.category]?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {rec.description}
                        </div>
                        <div className="text-xs text-slate-400">
                          {t('labels.recurringMonthly', { day: rec.recurringDay })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className={`font-bold ${
                              rec.type === 'income'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {rec.type === 'income' ? '+' : '-'}$
                            {rec.amount.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => confirmDeleteRecurring(rec.id, rec.description)}
                          className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {recurring.length === 0 && (
                    <div className="text-center text-slate-400 py-8 text-sm">
                      {t('messages.noRecurring')}
                    </div>
                  )}
                </div>
              </div>
            </div>
              </>
            )}
          </>
        )}

        {/* Transactions view */}
        {currentView === 'transactions' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('labels.myTransactions')}</h3>
              <div className="flex gap-2">
                {/* Add Transaction Button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  title={t('buttons.addTransaction')}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('buttons.addTransaction')}</span>
                </button>
                {/* Bulk Mode Toggle (Phase 2 Feature #10) */}
                <button
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedIds(new Set());
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    bulkMode 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {bulkMode ? t('buttons.exitBulkMode') : t('buttons.bulkSelect')}
                </button>
              </div>
            </div>

            {/* Category Filter Indicator (Phase 1 Feature #8) */}
            {selectedCategory && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-400">{t('labels.filteredBy')}:</span>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    showToast(t('toasts.filterCleared'), 'success');
                  }}
                  className="px-3 py-1 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                >
                  <span>{categories[selectedCategory]?.icon}</span>
                  <span>{selectedCategory}</span>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={t('messages.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
            </div>

            {/* Bulk Actions Bar (Phase 2 Feature #10) */}
            {bulkMode && (
              <div className="sticky top-0 z-10 bg-purple-900 border border-purple-700 rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{t('labels.selectedCount', { count: selectedIds.size })}</span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-purple-300 hover:text-white"
                  >
                    {t('buttons.clear')}
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={bulkCategorize}
                    disabled={selectedIds.size === 0 || savingTransaction}
                    className="flex-1 sm:flex-initial px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                  >
                    {t('buttons.changeCategory')}
                  </button>
                  <button
                    onClick={bulkDelete}
                    disabled={selectedIds.size === 0 || deletingItem}
                    className="flex-1 sm:flex-initial px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                  >
                    {t('buttons.deleteSelected')}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Filter Chips (Phase 2 Feature #3) */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth());
                  setSelectedYear(now.getFullYear());
                  showToast(t('toasts.showingThisMonth'), 'success');
                }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
              >
                {t('labels.thisMonth')}
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                  setSelectedMonth(prevMonth);
                  setSelectedYear(prevYear);
                  showToast(t('toasts.showingLastMonth'), 'success');
                }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
              >
                {t('labels.lastMonth')}
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  const largeExpenses = expenses.filter(e => 
                    e.type === 'expense' && 
                    e.amount >= 1000 &&
                    new Date(e.date).getMonth() === selectedMonth &&
                    new Date(e.date).getFullYear() === selectedYear
                  );
                  if (largeExpenses.length > 0) {
                    showToast(t('toasts.foundLargeExpenses', { count: largeExpenses.length }), 'success');
                  } else {
                    showToast(t('toasts.noLargeExpensesThisMonth'), 'error');
                  }
                }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
              >
                {t('labels.largeExpenses')} (&gt; {householdSettings.currencySymbol}1000)
              </button>
              {filterPresets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    // Apply preset filters
                    if (preset.filters.categories && preset.filters.categories.length > 0) {
                      setSelectedCategory(preset.filters.categories[0]);
                    }
                    showToast(t('toasts.appliedFilter', { name: preset.name }), 'success');
                  }}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded-full text-xs whitespace-nowrap transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 overflow-x-auto">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                <span>{formatCurrency(totalExpense)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                <span>{formatCurrency(totalIncome)}</span>
              </div>
            </div>

            {/* Empty State (Phase 1 Feature #4) */}
            {filteredExpenses.length === 0 && expenses.length > 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h4 className="text-xl font-semibold mb-2">{t('messages.noTransactionsFound')}</h4>
                <p className="text-slate-400 mb-6">
                  {searchQuery 
                    ? t('messages.noResultsFor', { query: searchQuery })
                    : selectedCategory
                    ? t('messages.noTransactionsInCategory', { category: selectedCategory })
                    : t('messages.noTransactions')
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      {t('buttons.clearFilters')}
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {t('buttons.addTransaction')}
                  </button>
                </div>
              </div>
            )}

            {/* Pagination info (Phase 2 Feature #12) */}
            {filteredExpenses.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mb-4 text-sm text-slate-400">
                <span>
                  {t('messages.showingRange', {
                    start: ((transactionPage - 1) * ITEMS_PER_PAGE) + 1,
                    end: Math.min(transactionPage * ITEMS_PER_PAGE, filteredExpenses.length),
                    total: filteredExpenses.length
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTransactionPage(Math.max(1, transactionPage - 1))}
                    disabled={transactionPage === 1}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    {t('buttons.previous')}
                  </button>
                  <span className="px-3 py-1">
                    {t('messages.pageOf', {
                      page: transactionPage,
                      total: Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)
                    })}
                  </span>
                  <button
                    onClick={() => setTransactionPage(Math.min(Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE), transactionPage + 1))}
                    disabled={transactionPage >= Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    {t('buttons.next')}
                  </button>
                </div>
              </div>
            )}

            {/* Transaction list (Phase 1 Feature #9 - Click to edit, Phase 2 Feature #7 - Inline edit, Phase 2 Feature #12 - Paginated) */}
            <div className="space-y-2">
              {filteredExpenses
                .slice((transactionPage - 1) * ITEMS_PER_PAGE, transactionPage * ITEMS_PER_PAGE)
                .map(exp => (
                inlineEditId === exp.id ? (
                  // INLINE EDIT MODE (Phase 2 Feature #7)
                  <div key={exp.id} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={inlineEditData.description ?? exp.description}
                        onChange={(e) => setInlineEditData({...inlineEditData, description: e.target.value})}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                        placeholder={t('labels.description')}
                      />
                      <input
                        type="number"
                        value={inlineEditData.amount ?? exp.amount}
                        onChange={(e) => setInlineEditData({...inlineEditData, amount: parseFloat(e.target.value)})}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                        placeholder={t('labels.amount')}
                        step="0.01"
                      />
                      <select
                        value={inlineEditData.category ?? exp.category}
                        onChange={(e) => setInlineEditData({...inlineEditData, category: e.target.value})}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                      >
                        {Object.keys(categories).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveInlineEdit(exp.id)}
                          disabled={savingTransaction}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1 flex-1 justify-center disabled:opacity-50"
                          title={t('tooltips.saveChanges')}
                        >
                          <Check className="w-4 h-4" />
                          <span>{t('buttons.save')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setInlineEditId(null);
                            setInlineEditData({});
                          }}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
                          title={t('buttons.cancel')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // NORMAL VIEW MODE (Phase 2 Feature #11 - Draggable)
                  <div
                    key={exp.id}
                    draggable={!bulkMode}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('transactionId', exp.id.toString());
                    }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    onClick={(e) => {
                      // Don't trigger if clicking action buttons
                      if ((e.target as HTMLElement).closest('button[data-action]')) return;
                      editExpense(exp);
                    }}
                    onDoubleClick={() => {
                      setInlineEditId(exp.id);
                      setInlineEditData({});
                    }}
                    title={bulkMode ? "Select transaction" : "Drag to re-categorize, click to edit, double-click for inline edit"}
                  >
                  {/* Checkbox (Bulk Mode - Phase 2 Feature #10) */}
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(exp.id)}
                      onChange={() => toggleSelection(exp.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 flex-shrink-0 cursor-pointer"
                    />
                  )}
                  
                  {/* Icon + Info */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${categories[exp.category]?.color} rounded-xl flex items-center justify-center text-xl sm:text-2xl`}
                    >
                      {categories[exp.category]?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {exp.description}
                        <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                        <span className="truncate">{exp.category}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{exp.date}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">
                            {exp.paidBy === 'joint'
                              ? t('labels.joint')
                              : exp.paidBy === 'partner1'
                              ? partnerNames.partner1
                              : partnerNames.partner2}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount + Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-13 sm:pl-0">
                    <div
                      className={`text-base sm:text-lg font-bold whitespace-nowrap ${
                        exp.type === 'income' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {exp.type === 'income' ? '+' : '-'}{formatCurrency(exp.amount).replace('-', '')}
                    </div>
                    {!exp.isAuto && (
                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          data-action="inline-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInlineEditId(exp.id);
                            setInlineEditData({});
                          }}
                          className="p-1.5 sm:p-2 hover:bg-blue-600 rounded-lg transition-colors"
                          title="Quick edit (inline)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          data-action="delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteExpense(exp.id, exp.description);
                          }}
                          className="p-1.5 sm:p-2 hover:bg-red-600 rounded-lg transition-colors"
                          title={t('tooltips.deleteTransaction')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Categories view */}
        {currentView === 'categories' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('labels.expensesByCategory')}</h3>
              <button
                onClick={() => {
                  setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                title={t('buttons.addCategory')}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{t('buttons.addCategory')}</span>
              </button>
            </div>

            {/* Empty State (Phase 1 Feature #4) */}
            {totalExpense === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">[]</div>
                <h4 className="text-xl font-semibold mb-2">{t('messages.noExpensesThisMonth')}</h4>
                <p className="text-slate-400 mb-6">{t('messages.addExpensesForCategoryBreakdown')}</p>
                <button
                  onClick={() => openQuickAdd('expense')}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <TrendingDown className="w-5 h-5" />
                  {t('buttons.addExpense')}
                </button>
              </div>
            )}

            {totalExpense > 0 && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals).map(([category, amount]) => {
                return (
                  <div
                    key={category}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const txId = parseInt(e.dataTransfer.getData('transactionId'));
                      updateTransactionCategory(txId, category);
                      showToast(t('toasts.movedToCategory', { category }), 'success');
                    }}
                    className="bg-slate-700/50 rounded-xl p-6 border-2 border-dashed border-transparent hover:border-purple-500 transition-colors relative group"
                    title={t('tooltips.dropToRecategorize')}
                  >
                    {/* Edit & Delete Buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryForm({
                            name: category,
                            icon: categories[category].icon,
                            color: categories[category].color
                          });
                          setEditingCategory(category);
                          setShowCategoryModal(true);
                        }}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors bg-slate-800/90"
                        title={t('tooltips.editCategory')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteCategory(category);
                        }}
                        className="p-2 hover:bg-red-600 rounded-lg transition-colors bg-slate-800/90"
                        title={t('tooltips.deleteCategory')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-16 h-16 ${categories[category]?.color} rounded-xl flex items-center justify-center text-3xl`}
                      >
                        {categories[category]?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-400 text-sm">{category}</div>
                        <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{t('labels.percentage')}</span>
                        <span className="font-medium">
                          {((amount / totalExpense) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className={`${categories[category]?.color} h-2 rounded-full`}
                          style={{ width: `${(amount / totalExpense) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Pie Chart Visualization (Phase 2 Feature #5) */}
              <div className="mt-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">{t('labels.categoryDistribution')}</h3>
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  {/* Visual Pie Chart using CSS */}
                  <div className="relative w-64 h-64 flex-shrink-0">
                    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                      {Object.entries(categoryTotals)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, amount], idx, arr) => {
                          const percentage = (amount / totalExpense) * 100;
                          const startAngle = arr
                            .slice(0, idx)
                            .reduce((sum, [, amt]) => sum + (amt / totalExpense) * 100, 0);
                          
                          const path = createPieSlice(percentage, startAngle);
                          const labelPos = calculateLabelPosition(percentage, startAngle);
                          const color = categories[category]?.color.replace('bg-', '');
                          
                          // Map Tailwind color classes to actual colors
                          const colorMap: Record<string, string> = {
                            'orange-500': '#f97316',
                            'green-500': '#22c55e',
                            'blue-500': '#3b82f6',
                            'yellow-500': '#eab308',
                            'red-500': '#ef4444',
                            'purple-500': '#a855f7',
                            'pink-500': '#ec4899',
                            'indigo-500': '#6366f1',
                            'cyan-500': '#06b6d4',
                            'emerald-500': '#10b981',
                            'gray-500': '#6b7280'
                          };
                          
                          return (
                            <g key={category}>
                              <path
                                d={path}
                                fill={colorMap[color] || '#6b7280'}
                                className="hover:opacity-80 cursor-pointer transition-opacity"
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setCurrentView('transactions');
                                  showToast(t('toasts.filteringBy', { category }), 'success');
                                }}
                              >
                                <title>{category}: {percentage.toFixed(1)}%</title>
                              </path>
                              {percentage > 2 && (
                                <text
                                  x={labelPos.x}
                                  y={labelPos.y}
                                  className="text-xs fill-white font-bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  transform={`rotate(90 ${labelPos.x} ${labelPos.y})`}
                                >
                                  {percentage.toFixed(1)}%
                                </text>
                              )}
                            </g>
                          );
                        })}
                    </svg>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex-1 space-y-2 w-full">
                    {Object.entries(categoryTotals)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => {
                        const percentage = (amount / totalExpense) * 100;
                        return (
                          <div
                            key={category}
                            className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedCategory(category);
                              setCurrentView('transactions');
                              showToast(t('toasts.filteringBy', { category }), 'success');
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`w-3 h-3 rounded-full ${categories[category]?.color} flex-shrink-0`} />
                              <span className="text-sm truncate">{categories[category]?.icon} {category}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                              <span className="text-xs text-slate-400 w-12 text-right">{percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* Balance view */}
        {currentView === 'balance' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">{t('labels.balanceSettlement')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-slate-700/50 rounded-xl p-4 sm:p-6">
                  <div className="text-slate-400 text-xs sm:text-sm mb-2 truncate">
                    {partnerNames.partner1}
                  </div>
                    <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words">
                      {formatCurrency(partner1Paid)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">Paid</span>
                        <span className="font-medium break-words text-right">
                          {formatCurrency(partner1Paid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">Fair Share</span>
                        <span className="font-medium break-words text-right">
                          {formatCurrency(partner1FairShare)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">{t('labels.income')}</span>
                        <span className="font-medium text-green-400 break-words text-right">
                          +{formatCurrency(partner1Income)}
                        </span>
                      </div>
                    </div>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-4 sm:p-6">
                  <div className="text-slate-400 text-xs sm:text-sm mb-2 truncate">
                    {partnerNames.partner2}
                  </div>
                    <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words">
                      {formatCurrency(partner2Paid)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">Paid</span>
                        <span className="font-medium break-words text-right">
                          {formatCurrency(partner2Paid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">Fair Share</span>
                        <span className="font-medium break-words text-right">
                          {formatCurrency(partner2FairShare)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-slate-400">{t('labels.income')}</span>
                        <span className="font-medium text-green-400 break-words text-right">
                          +{formatCurrency(partner2Income)}
                        </span>
                      </div>
                    </div>
                </div>
              </div>

              {/* Settlement summary (Phase 1 Feature #4 - Empty state for settled) */}
              {Math.abs(partner1Balance) < 0.01 ? (
                <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <h4 className="text-xl font-bold text-green-400 mb-2">{t('messages.perfectBalance')}</h4>
                  <p className="text-slate-300">{t('messages.allSettled')}</p>
                </div>
              ) : (
              <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-6">
                <div className="text-center">
                  <div className="text-lg font-bold mb-2">{t('messages.settlementRequired')}</div>
                  {householdSettings.splitMode === 'proportional' && (
                    <div className="text-xs text-slate-400 mb-2">
                      Split: {(splitRatio * 100).toFixed(0)}% / {((1-splitRatio) * 100).toFixed(0)}%
                    </div>
                  )}
                  {partner1Balance > 0 ? (
                    <div>
                      <div className="text-2xl font-bold mb-2">
                        {partnerNames.partner2} owes {partnerNames.partner1}
                      </div>
                      <div className="text-4xl font-bold text-yellow-400">
                        {formatCurrency(Math.abs(partner1Balance))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold mb-2">
                        {partnerNames.partner1} owes {partnerNames.partner2}
                      </div>
                      <div className="text-4xl font-bold text-yellow-400">
                        {formatCurrency(Math.abs(partner2Balance))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Payment Breakdown</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex justify-between mb-2 gap-2">
                    <span className="font-medium text-sm sm:text-base truncate">{partnerNames.partner1}</span>
                    <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{formatCurrency(partner1Paid)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-blue-500 h-2 sm:h-3 rounded-full transition-all"
                      style={{ width: `${(partner1Paid / (totalAllPayments || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 gap-2">
                    <span className="font-medium text-sm sm:text-base truncate">{partnerNames.partner2}</span>
                    <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{formatCurrency(partner2Paid)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-purple-500 h-2 sm:h-3 rounded-full transition-all"
                      style={{ width: `${(partner2Paid / (totalAllPayments || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                {jointPaid > 0 && (
                  <div>
                    <div className="flex justify-between mb-2 gap-2">
                      <span className="font-medium text-sm sm:text-base">{t('labels.joint')}</span>
                      <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{formatCurrency(jointPaid)}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                      <div
                        className="bg-green-500 h-2 sm:h-3 rounded-full transition-all"
                        style={{ width: `${(jointPaid / (totalAllPayments || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settlements section */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold">{t('labels.settlements')}</h3>
                <button
                  onClick={() => setShowSettlementModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <PlusCircle className="w-5 h-5" />
                  {t('buttons.recordPayment')}
                </button>
              </div>

              {settlements.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-sm">{t('messages.noSettlements')}</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {settlements
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm sm:text-base truncate">
                              {settlement.from === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                            </span>
                            <span className="text-slate-400 flex-shrink-0">→</span>
                            <span className="font-medium text-sm sm:text-base truncate">
                              {settlement.to === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 flex-wrap">
                            <span className="whitespace-nowrap">{new Date(settlement.date).toLocaleDateString()}</span>
                            {settlement.note && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="truncate">{settlement.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <span className="text-xl font-bold text-green-400">
                            {formatCurrency(settlement.amount)}
                          </span>
                          <button
                            onClick={() => deleteSettlement(settlement.id)}
                            className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                            title={t('tooltips.deleteSettlement')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settlement recording modal */}
        {showSettlementModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('labels.recordSettlement')}</h3>
                <button
                  onClick={() => setShowSettlementModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settlementForm.amount}
                    onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">From</label>
                  <select
                    value={settlementForm.from}
                    onChange={(e) => setSettlementForm({ ...settlementForm, from: e.target.value as 'partner1' | 'partner2' })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  >
                    <option value="partner1">{partnerNames.partner1}</option>
                    <option value="partner2">{partnerNames.partner2}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">To</label>
                  <select
                    value={settlementForm.to}
                    onChange={(e) => setSettlementForm({ ...settlementForm, to: e.target.value as 'partner1' | 'partner2' })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  >
                    <option value="partner1">{partnerNames.partner1}</option>
                    <option value="partner2">{partnerNames.partner2}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Note (optional)</label>
                  <input
                    type="text"
                    value={settlementForm.note}
                    onChange={(e) => setSettlementForm({ ...settlementForm, note: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder="e.g., Bank transfer"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowSettlementModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    onClick={recordSettlement}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors"
                  >
                    {t('buttons.recordPayment')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('settings.title')}</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('settings.language')}
                  </label>
                  <select
                    value={i18n.language || 'en'}
                    onChange={e => {
                      const nextLang = e.target.value;
                      i18n.changeLanguage(nextLang);
                      window.localStorage.setItem('app-locale', nextLang);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  >
                    <option value="en">{t('settings.languages.en')}</option>
                    <option value="he">{t('settings.languages.he')}</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">{t('settings.languageHelp')}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('settings.partner1Name')}
                  </label>
                  <input
                    type="text"
                    value={tempNames.partner1}
                    onChange={e =>
                      setTempNames({ ...tempNames, partner1: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder={t('settings.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('settings.partner2Name')}
                  </label>
                  <input
                    type="text"
                    value={tempNames.partner2}
                    onChange={e =>
                      setTempNames({ ...tempNames, partner2: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder={t('settings.namePlaceholder')}
                  />
                </div>

                {/* Household Settings Section */}
                <div className="space-y-4 pt-4 border-t border-slate-600">
                  <h4 className="text-sm font-semibold text-slate-300">{t('labels.householdSettings')}</h4>
                  
                  {/* Currency */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      {t('labels.currency')}
                    </label>
                    <select
                      value={tempHouseholdSettings.currencyCode}
                      onChange={e => {
                        const code = e.target.value;
                        const symbol = code === 'ILS' ? '\u20aa' : code === 'USD' ? '$' : '\u20ac';
                        setTempHouseholdSettings({ 
                          ...tempHouseholdSettings, 
                          currencyCode: code,
                          currencySymbol: symbol
                        });
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    >
                      <option value="ILS">{t('settings.currencyILS')}</option>
                      <option value="USD">{t('settings.currencyUSD')}</option>
                      <option value="EUR">{t('settings.currencyEUR')}</option>
                    </select>
                  </div>

                  {/* Split Mode */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      {t('labels.expenseSplitMode')}
                    </label>
                    <select
                      value={tempHouseholdSettings.splitMode}
                      onChange={e =>
                        setTempHouseholdSettings({ 
                          ...tempHouseholdSettings, 
                          splitMode: e.target.value as 'equal' | 'proportional'
                        })
                      }
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    >
                      <option value="equal">{t('settings.splitEqual')}</option>
                      <option value="proportional">{t('settings.splitProportional')}</option>
                    </select>
                  </div>

                  {/* Proportional Ratio (only shown if proportional mode) */}
                  {tempHouseholdSettings.splitMode === 'proportional' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        {t('settings.shareRatioLabel', { name: tempNames.partner1 || t('labels.partner1') })}
                      </label>
                      <input
                        type="number"
                        min="0.05"
                        max="0.95"
                        step="0.05"
                        value={tempHouseholdSettings.partner1Ratio}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setTempHouseholdSettings({ 
                              ...tempHouseholdSettings, 
                              partner1Ratio: Math.max(0.05, Math.min(0.95, val))
                            });
                          }
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {t('settings.ratioSummary', {
                          name1: tempNames.partner1 || t('labels.partner1'),
                          ratio1: (tempHouseholdSettings.partner1Ratio * 100).toFixed(0),
                          name2: tempNames.partner2 || t('labels.partner2'),
                          ratio2: ((1 - tempHouseholdSettings.partner1Ratio) * 100).toFixed(0)
                        })}
                      </p>
                      {(tempHouseholdSettings.partner1Ratio <= 0.05 || tempHouseholdSettings.partner1Ratio >= 0.95) && (
                        <p className="text-xs text-yellow-400 mt-1">
                          {t('settings.ratioClamped')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      // Reset temp settings if user cancels
                      setTempNames(partnerNames);
                      setTempHouseholdSettings(householdSettings);
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    onClick={async () => {
                      await saveNames();
                      await saveHouseholdSettings();
                    }}
                    disabled={savingSettings}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSettings ? t('buttons.saving') : t('buttons.saveSettings')}
                  </button>
                </div>

                {/* Save Folder Configuration */}
                {supportsFileSystem && (
                  <div className="space-y-4 pt-4 border-t border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-300">{t('labels.autoSaveFolder')}</h4>
                    <p className="text-xs text-slate-400">{t('messages.autoSaveHelp')}</p>

                    <button
                      onClick={chooseSaveDirectory}
                      className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      {saveDirectory
                        ? t('buttons.changeFolder', { name: saveDirectory.name })
                        : t('buttons.chooseSaveFolder')}
                    </button>
                    
                    {saveDirectory && (
                      <p className="text-xs text-green-400">
                        {t('status.savingTo', { name: saveDirectory.name })}
                      </p>
                    )}
                  </div>
                )}

                {/* Export/Import Section */}
                <div className="space-y-4 pt-4 border-t border-slate-600">
                  <h4 className="text-sm font-semibold text-slate-300">{t('labels.dataBackup')}</h4>
                  <p className="text-xs text-slate-400">{t('messages.exportHelp')}</p>

                  <button
                    onClick={exportData}
                    disabled={exportingData}
                    className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {exportingData ? t('buttons.exporting') : t('buttons.exportData')}
                  </button>
                  
                  {lastExportDate && !dirty && (
                    <p className="text-xs text-green-400">
                      {t('status.lastExported', { date: new Date(lastExportDate).toLocaleString() })}
                    </p>
                  )}

                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="block w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors text-center cursor-pointer"
                    >
                      {t('buttons.chooseFileToImport')}
                    </label>
                    {importFile && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-2">
                          {t('labels.selectedFile', { name: importFile.name })}
                        </p>
                        <button
                          onClick={importData}
                          disabled={importingData}
                          className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {importingData ? t('buttons.importing') : t('buttons.importReplace')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/edit transaction modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {editingId ? t('labels.editTransaction') : t('labels.addTransactionTitle')}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Description with Auto-suggestions (Phase 2 Feature #9) */}
                <div className="relative">
                  <label className="block text-sm text-slate-400 mb-1">
                    {t('labels.description')}
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => {
                      setFormData({ ...formData, description: e.target.value });
                      // Generate suggestions
                      const query = e.target.value.toLowerCase();
                      if (query.length >= 2) {
                        const matches = [...new Set(expenses.map(e => e.description))]
                          .filter(d => d.toLowerCase().includes(query))
                          .slice(0, 5);
                        setSuggestions(matches);
                      } else {
                        setSuggestions([]);
                      }
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                    placeholder={t('placeholders.descriptionExample')}
                  />
                  
                  {/* Suggestion dropdown (Phase 2 Feature #9) */}
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-10 max-h-48 overflow-y-auto">
                      {suggestions.map((suggestion, idx) => {
                        const matchingExp = expenses.find(e => e.description === suggestion);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                description: suggestion,
                                category: matchingExp?.category || formData.category,
                                amount: matchingExp?.amount.toString() || formData.amount
                              });
                              setSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 flex items-center justify-between transition-colors"
                          >
                            <span className="flex-1">{suggestion}</span>
                            {matchingExp && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                {categories[matchingExp.category]?.icon} {formatCurrency(matchingExp.amount)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t('labels.amount')}
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                    placeholder={t('placeholders.amount')}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t('labels.category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  >
                    {Object.keys(categories).map(cat => (
                      <option key={cat} value={cat}>
                        {categories[cat].icon} {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('labels.type')}</label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  >
                    <option value="expense">{t('labels.expense')}</option>
                    <option value="income">{t('labels.income')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('labels.date')}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('labels.paidBy')}</label>
                  <select
                    value={formData.paidBy}
                    onChange={e =>
                      setFormData({ ...formData, paidBy: e.target.value as 'partner1' | 'partner2' | 'joint' })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  >
                    <option value="partner1">{partnerNames.partner1}</option>
                    <option value="partner2">{partnerNames.partner2}</option>
                    <option value="joint">{t('labels.joint')}</option>
                  </select>
                </div>
                {!editingId && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            isRecurring: e.target.checked
                          })
                        }
                        className="w-4 h-4"
                      />
                      <label className="text-sm">{t('labels.recurringToggle')}</label>
                    </div>
                    {formData.isRecurring && (
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">
                          {t('labels.dayOfMonth')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.recurringDay}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              recurringDay: Math.max(1, Math.min(31, parseInt(e.target.value) || 1))
                            })
                          }
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    onClick={editingId ? updateExpense : addExpense}
                    disabled={savingTransaction}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingTransaction ? t('buttons.saving') : (editingId ? t('buttons.update') : t('buttons.add'))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-red-500 my-8">
              <h3 className="text-xl font-bold mb-4">
                {t('messages.deleteConfirmTitle', {
                  type: deleteConfirm.type === 'expense' ? t('labels.transaction') : t('labels.recurringItem')
                })}
              </h3>
              <p className="text-slate-300 mb-6">
                {t('messages.deleteConfirmBody', { description: deleteConfirm.description })}
                <br />
                <span className="text-sm text-red-400">{t('messages.deleteCannotUndo')}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingItem}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  onClick={executeDelete}
                  disabled={deletingItem}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingItem ? t('buttons.deleting') : t('buttons.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Buttons - Dashboard Only (Phase 1 Feature #1 & #10) */}
        {currentView === 'dashboard' && (
          <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
            {/* Quick Income Button */}
            <button
              onClick={() => openQuickAdd('income')}
              className="w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-bounce-slow group"
              title={t('buttons.quickIncome', { shortcut: 'I' })}
            >
              <TrendingUp className="w-6 h-6 text-white" />
              <span className="absolute right-full mr-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {t('buttons.quickIncome', { shortcut: 'I' })}
              </span>
            </button>
            
            {/* Quick Expense Button */}
            <button
              onClick={() => openQuickAdd('expense')}
              className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-bounce-slow group"
              title={t('buttons.quickExpense', { shortcut: 'E' })}
            >
              <TrendingDown className="w-6 h-6 text-white" />
              <span className="absolute right-full mr-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {t('buttons.quickExpense', { shortcut: 'E' })}
              </span>
            </button>
          </div>
        )}

        {/* Command Palette (Phase 2 Feature #1) */}
        {showCommandPalette && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32 p-4 z-50">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl">
              {/* Search Input */}
              <div className="p-4 border-b border-slate-700">
                <input
                  type="text"
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder={t('messages.searchCommandsPlaceholder')}
                  className="w-full bg-slate-700 border-0 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              
              {/* Results */}
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredCommands.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {t('messages.noCommandsFound')}
                  </div>
                )}
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => executeCommand(cmd)}
                    className="w-full text-left p-3 hover:bg-slate-700 rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <cmd.icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{cmd.label}</div>
                      <div className="text-xs text-slate-400">{cmd.description}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-xs px-2 py-1 bg-slate-900 rounded flex-shrink-0">{cmd.shortcut}</kbd>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Add/Edit Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 max-h-[90vh] overflow-y-auto my-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {editingCategory ? t('labels.editCategoryTitle') : t('labels.addCategoryTitle')}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Category Name */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('labels.categoryName')}</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder="e.g., Groceries"
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Icon (Emoji)</label>
                  
                  {/* Selected Emoji Display */}
                  <div className="flex items-center justify-center mb-3">
                    <div className="text-5xl bg-slate-700 rounded-lg p-3 border-2 border-slate-600">
                      {categoryForm.icon || '❓'}
                    </div>
                  </div>

                  {/* Emoji Picker Grid */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(CURATED_EMOJIS).map(([theme, emojis]) => {
                      const usedEmojis = getUsedEmojis();
                      return (
                        <div key={theme} className="space-y-1">
                          <p className="text-xs text-slate-500 capitalize sticky top-0 bg-slate-800 py-1">{theme}</p>
                          <div className="grid grid-cols-8 gap-2">
                            {emojis.map(emoji => {
                              const isUsed = usedEmojis.has(emoji);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => !isUsed && setCategoryForm({ ...categoryForm, icon: emoji })}
                                  disabled={isUsed}
                                  className={`
                                    text-2xl p-2 rounded transition-all
                                    ${isUsed 
                                      ? 'opacity-30 cursor-not-allowed bg-slate-800' 
                                      : 'hover:bg-slate-600 cursor-pointer bg-slate-700 hover:scale-110'}
                                    ${categoryForm.icon === emoji ? 'ring-2 ring-purple-500 bg-slate-600' : ''}
                                  `}
                                  title={isUsed ? 'Already used' : 'Select emoji'}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('labels.color')}</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      'bg-red-500', 'bg-orange-500', 'bg-yellow-500',
                      'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
                      'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
                      'bg-purple-500', 'bg-pink-500', 'bg-gray-500'
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`w-10 h-10 rounded-lg ${color} ${
                          categoryForm.color === color
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                            : 'hover:scale-110'
                        } transition-transform`}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">{t('labels.preview')}</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${categoryForm.color} rounded-xl flex items-center justify-center text-2xl`}>
                      {categoryForm.icon || '?'}
                    </div>
                    <span className="font-medium">{categoryForm.name || t('labels.categoryNamePlaceholder')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    onClick={() => editingCategory ? editCategory(editingCategory) : addCategory()}
                    disabled={savingSettings}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? t('buttons.saving') : (editingCategory ? t('buttons.update') : t('buttons.add'))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Delete Confirmation with Reassignment */}
        {showDeleteCategoryConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-red-500">
              <h3 className="text-xl font-bold mb-4">{t('messages.deleteCategoryTitle')}</h3>
              <p className="text-slate-300 mb-4">
                {t('messages.categoryHasTransactions', {
                  category: showDeleteCategoryConfirm.categoryName,
                  count: showDeleteCategoryConfirm.transactionCount
                })}
              </p>
              <p className="text-slate-300 mb-4">
                {t('messages.chooseReassignCategory')}
              </p>
              
              <select
                value={showDeleteCategoryConfirm.reassignTo}
                onChange={(e) =>
                  setShowDeleteCategoryConfirm({
                    ...showDeleteCategoryConfirm,
                    reassignTo: e.target.value
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 mb-6"
              >
                {Object.keys(categories)
                  .filter(c => c !== showDeleteCategoryConfirm.categoryName)
                  .map(cat => (
                    <option key={cat} value={cat}>
                      {categories[cat].icon} {cat}
                    </option>
                  ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteCategoryConfirm(null)}
                  disabled={savingSettings}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  onClick={() =>
                    executeDeleteCategory(
                      showDeleteCategoryConfirm.categoryName,
                      showDeleteCategoryConfirm.reassignTo
                    )
                  }
                  disabled={savingSettings}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingSettings ? t('buttons.deleting') : t('buttons.deleteReassign')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Modal (Phase 1 Feature #5) */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-3xl w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold mb-1">⌨️ {t('labels.keyboardShortcuts')}</h3>
                  <p className="text-slate-400 text-sm">{t('messages.boostProductivity')}</p>
                </div>
                <button 
                  onClick={() => setShowShortcuts(false)} 
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title={t('tooltips.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Navigation */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{t('labels.navigation')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { keys: ['1'], desc: t('nav.dashboard') },
                      { keys: ['2'], desc: t('nav.transactions') },
                      { keys: ['3'], desc: t('nav.categories') },
                      { keys: ['4'], desc: t('nav.balance') }
                    ].map((s, i) => (
                      <div key={i} className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                        <span className="text-sm text-slate-300">{s.desc}</span>
                        <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono min-w-[2rem] text-center">{s.keys[0]}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{t('labels.actions')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { keys: ['⌘', 'N'], desc: t('shortcuts.newTransaction') },
                      { keys: ['E'], desc: t('shortcuts.quickExpense') },
                      { keys: ['I'], desc: t('shortcuts.quickIncome') },
                      { keys: ['⌘', 'S'], desc: t('shortcuts.saveExport') },
                      { keys: ['⌘', 'K'], desc: t('shortcuts.commandPalette') },
                      { keys: ['Esc'], desc: t('shortcuts.closeModal') }
                    ].map((s, i) => (
                      <div key={i} className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                        <span className="text-sm text-slate-300">{s.desc}</span>
                        <div className="flex gap-1">
                          {s.keys.map((k, j) => (
                            <kbd key={j} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Help */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{t('labels.helpSection')}</h4>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-sm text-slate-300">{t('shortcuts.showPanel')}</span>
                    <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">?</kbd>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                  <span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded">⌘</kbd> {t('shortcuts.cmdHint')}
                  </span>
                  <br />
                  <span>
                    {t('shortcuts.pressAnytime')} <kbd className="px-2 py-1 bg-slate-700 rounded">⌘/</kbd> {t('shortcuts.toShowHelp')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;
