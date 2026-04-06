import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  Check,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Save,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import type {
  Expense,
  RecurringTransaction,
  PartnerNames,
  ChartDataPoint,
  HouseholdSettings,
  Settlement
} from '@expenses/shared/types';
import { parseDateParts } from '@expenses/shared/calculations';
import { DEFAULT_CATEGORIES, defaultPartnerNames, defaultSettings } from '@expenses/shared/defaults';
import {
  setExpenses as persistExpenses,
  setRecurring as persistRecurring,
  setPartnerNames as persistPartnerNames,
  setSettings as persistSettings,
  setSettlements as persistSettlements,
} from '../../services/storage';
import { useTheme } from '../../lib/theme';
import { SettingsCenterModal } from './modals';
import { WelcomeModal, FolderSelectionModal, AddCategoryModal } from '../modals';
import { SaveStatusIndicator } from '../shared/SaveStatusIndicator';
import { ExternalChangeBanner } from '../shared/ExternalChangeBanner';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useDataPersistence } from '../../hooks/useDataPersistence';
import { useExternalFileChange } from '../../hooks/useExternalFileChange';
import { useUIContext } from '../../contexts/UIContext';
import { useDataContext } from '../../contexts/ExpenseContext';
import { useModalContext } from '../../contexts/ModalContext';
import { getSuggestedCloudPaths, type CloudDriveInfo } from '../../lib/cloudDriveDetection';
import { isFirstLaunch, markWelcomeSeen } from '../../lib/firstLaunch';
import { parseISODateToLocalDate } from '../../lib/date';
import { ViewRouter } from './ViewRouter';

type ViewType = 'dashboard' | 'transactions' | 'categories' | 'balance';

const CATEGORY_LABELS_HE: Record<string, string> = {
  Housing: '\u05d3\u05d9\u05d5\u05e8',
  Food: '\u05de\u05d6\u05d5\u05df',
  Transportation: '\u05ea\u05d7\u05d1\u05d5\u05e8\u05d4',
  Utilities: '\u05d7\u05e9\u05d1\u05d5\u05e0\u05d5\u05ea',
  Healthcare: '\u05d1\u05e8\u05d9\u05d0\u05d5\u05ea',
  Entertainment: '\u05d1\u05d9\u05d3\u05d5\u05e8',
  Shopping: '\u05e7\u05e0\u05d9\u05d5\u05ea',
  Education: '\u05d7\u05d9\u05e0\u05d5\u05da',
  Insurance: '\u05d1\u05d9\u05d8\u05d5\u05d7',
  Savings: '\u05d7\u05e1\u05db\u05d5\u05e0\u05d5\u05ea',
  Other: '\u05d0\u05d7\u05e8'
};

/**
 * A fully featured household expense tracker component for React.
 *
 * This component provides dashboard, transactions, categories, and balance
 * views, supports adding and editing expenses and recurring transactions,
 * and tracks payments by two partners and joint expenses. Data is persisted
 * via the provided `storage` API. The UI uses Tailwind CSS for
 * styling and lucide-react for icons.
 */
const ExpenseTracker: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentTheme, theme, setTheme: setAppTheme } = useTheme();

  // Core data from context (single source of truth)
  const {
    expenses,
    setExpenses,
    recurring,
    setRecurring,
    settlements,
    setSettlements,
    partnerNames,
    setPartnerNames,
    householdSettings,
    setHouseholdSettings,
    dirty,
    setDirty,
    lastExportDate,
    saveDirectory,
  } = useDataContext();

  // UI state from context
  const {
    loading,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    commandQuery, setCommandQuery,
    suggestions, setSuggestions,
    selectedIds, setSelectedIds,
    bulkMode, setBulkMode,
    transactionPage, setTransactionPage,
    toast, showToast,
  } = useUIContext();

  // Modal state from context
  const {
    showAddModal, setShowAddModal,
    showSettingsModal, setShowSettingsModal,
    settingsInitialTab, setSettingsInitialTab,
    showCategoryModal, setShowCategoryModal,
    showCommandPalette, setShowCommandPalette,
    showWelcomeModal, setShowWelcomeModal,
    showFolderSelectionModal, setShowFolderSelectionModal,
    editingId,
    editingCategory, setEditingCategory,
    inlineEditId, setInlineEditId,
    deleteConfirm, setDeleteConfirm,
    showDeleteCategoryConfirm, setShowDeleteCategoryConfirm,
  } = useModalContext();

  // Form state and operations (extracted to hook)
  const {
    formData,
    setFormData,
    savingTransaction,
    addExpense,
    updateExpense,
    editExpense,
    resetForm,
    openQuickAdd,
  } = useExpenseForm();

  // Data persistence operations (extracted to hook)
  const {
    importFile,
    exportingData,
    importingData,
    supportsFileSystem,
    loadData,
    saveData,
    exportData,
    importData,
    handleImportFile,
    chooseSaveDirectory,
    openSharedDataFile,
    createSharedDataFile,
    checkFileSystemSupport,
  } = useDataPersistence();

  // External file change detection (for cloud sync)
  const {
    hasExternalChange,
    changedAt: externalChangeTime,
    dismiss: dismissExternalChange,
    reload: reloadFromExternalChange,
  } = useExternalFileChange();

  // Local UI state (component-specific, not shared)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tempNames, setTempNames] = useState<PartnerNames>(defaultPartnerNames);
  const [tempHouseholdSettings, setTempHouseholdSettings] = useState<HouseholdSettings>(defaultSettings);

  useEffect(() => {
    const lang = i18n.language || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = i18n.dir(lang);
  }, [i18n, i18n.language]);

  // Sync temp state with context when data loads
  useEffect(() => {
    setTempNames(partnerNames);
    setTempHouseholdSettings(householdSettings);
  }, [partnerNames, householdSettings]);

  // Granular loading states (avoid freezing entire UI - component-specific)
  const [, setSavingTransaction] = useState(false); // For non-form operations (drag-drop, bulk, inline, etc.)
  const [deletingItem, setDeletingItem] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter presets (placeholder functionality - empty array renders nothing)
  const [pendingUpdateVersion, setPendingUpdateVersion] = useState<string | null>(null);

  const [filterPresets] = useState<Array<{
    name: string;
    filters: {
      categories?: string[];
      minAmount?: number;
      maxAmount?: number;
      dateRange?: { start: string; end: string };
      paidBy?: string[];
    };
  }>>([]);

  // Household settings state (for currency, split modes, budgets, normalization)

  // Curated emoji list for category picker
  const CURATED_EMOJIS = {
    home: ['ðŸ ', 'ðŸ¡', 'ðŸ˜ï¸', 'ðŸ¢', 'ðŸšï¸', 'ðŸ—ï¸', 'ðŸ›ï¸', 'â›ª', 'ðŸ°', 'ðŸ¯'],
    food: ['ðŸ”', 'ðŸ•', 'ðŸœ', 'ðŸ£', 'ðŸ¥—', 'ðŸ©', 'ðŸ', 'ðŸ±', 'ðŸ¥˜', 'ðŸ²', 'ðŸ¥™', 'ðŸŒ®', 'ðŸ›', 'ðŸ¥Ÿ', 'ðŸ¦', 'ðŸ§', 'â˜•', 'ðŸ·'],
    transport: ['ðŸš—', 'ðŸšŒ', 'ðŸš•', 'ðŸš™', 'ðŸš²', 'âœˆï¸', 'ðŸš†', 'ðŸš‚', 'ðŸšŠ', 'ðŸ›´', 'ðŸ›µ', 'ðŸš¤', 'â›½', 'ðŸš', 'ðŸ›£ï¸'],
    shopping: ['ðŸ›ï¸', 'ðŸ›’', 'ðŸŽ', 'ðŸ‘—', 'ðŸ‘Ÿ', 'ðŸ‘”', 'ðŸ‘•', 'ðŸ§¥', 'ðŸ’„', 'ðŸ’', 'ðŸŽ€', 'ðŸ•¶ï¸', 'ðŸ‘œ', 'ðŸŽ’'],
    entertainment: ['ðŸŽ®', 'ðŸŽ¬', 'ðŸŽ¤', 'ðŸŽ§', 'ðŸŽŸï¸', 'ðŸŽª', 'ðŸŽ¨', 'ðŸŽ­', 'ðŸŽ¹', 'ðŸŽ¸', 'ðŸŽº', 'ðŸŽ¯', 'ðŸŽ³', 'ðŸŽ²', 'ðŸŽ°', 'ðŸŽ¢'],
    utilities: ['ðŸ’¡', 'ðŸ”Œ', 'ðŸ§¯', 'ðŸš°', 'ðŸ·ï¸', 'ðŸ”§', 'ðŸ”¨', 'âš¡', 'ðŸ’§', 'ðŸš¿', 'ðŸ§¹', 'ðŸ§º', 'ðŸ—‘ï¸', 'ðŸ“ž'],
    health: ['ðŸ’Š', 'ðŸ©º', 'ðŸ’‰', 'ðŸ§´', 'ðŸŽ', 'âš•ï¸', 'ðŸ¥', 'ðŸ§˜', 'ðŸ’ª', 'ðŸ¦·', 'ðŸ‘“', 'ðŸ©¹', 'ðŸ§¬'],
    finance: ['ðŸ’°', 'ðŸ¦', 'ðŸ’³', 'ðŸ“ˆ', 'ðŸ§¾', 'ðŸ’µ', 'ðŸ’´', 'ðŸ’¶', 'ðŸ’·', 'ðŸ’¸', 'ðŸ’¹', 'ðŸª™', 'ðŸ“Š', 'ðŸ’¼'],
    education: ['ðŸ“š', 'ðŸ“', 'ðŸŽ“', 'âœï¸', 'ðŸ“–', 'ðŸ“•', 'ðŸ“—', 'ðŸ“˜', 'ðŸ–Šï¸', 'âœ’ï¸', 'ðŸ–ï¸', 'ðŸ“', 'ðŸ“', 'ðŸŽ’', 'ðŸ§®'],
    pets: ['ðŸ•', 'ðŸˆ', 'ðŸ©', 'ðŸ±', 'ðŸ¶', 'ðŸ¾', 'ðŸ¦´', 'ðŸŸ', 'ðŸ ', 'ðŸ¦', 'ðŸ¦œ', 'ðŸ¹', 'ðŸ°'],
    sports: ['âš½', 'ðŸ€', 'ðŸˆ', 'âš¾', 'ðŸŽ¾', 'ðŸ', 'ðŸ“', 'ðŸ¥Š', 'ðŸ¥‹', 'â›³', 'ðŸŠ', 'ðŸ‹ï¸', 'ðŸš´', 'â›·ï¸', 'ðŸ‡'],
    work: ['ðŸ’¼', 'ðŸ‘”', 'ðŸ“±', 'ðŸ’»', 'âŒ¨ï¸', 'ðŸ–±ï¸', 'ðŸ–¨ï¸', 'ðŸ“§', 'ðŸ“ž', 'ðŸ“ ', 'ðŸ—‚ï¸', 'ðŸ“‹', 'ðŸ“Œ', 'ðŸ“Ž'],
    travel: ['âœˆï¸', 'ðŸ—ºï¸', 'ðŸ§³', 'ðŸ–ï¸', 'ðŸ—¼', 'ðŸ—½', 'ðŸŽ¡', 'ðŸŽ¢', 'ðŸ•ï¸', 'â›º', 'ðŸ”ï¸', 'ðŸ—»', 'ðŸŒ‹', 'ðŸï¸'],
    nature: ['ðŸŒ³', 'ðŸŒ²', 'ðŸŒ´', 'ðŸŒ±', 'ðŸŒ¿', 'ðŸ€', 'ðŸŒº', 'ðŸŒ»', 'ðŸŒ¼', 'ðŸŒ·', 'ðŸŒ¹', 'ðŸŒ¾', 'ðŸƒ', 'ðŸ‚'],
    weather: ['â˜€ï¸', 'ðŸŒ¤ï¸', 'â›…', 'ðŸŒ¥ï¸', 'â˜ï¸', 'ðŸŒ¦ï¸', 'ðŸŒ§ï¸', 'â›ˆï¸', 'ðŸŒ©ï¸', 'â„ï¸', 'â­', 'ðŸŒ™', 'ðŸŒˆ'],
    tech: ['ðŸ’»', 'ðŸ“±', 'âŒ¨ï¸', 'ðŸ–¥ï¸', 'ðŸ–¨ï¸', 'ðŸ“·', 'ðŸ“¹', 'ðŸŽ®', 'ðŸ•¹ï¸', 'ðŸ’¾', 'ðŸ’¿', 'ðŸ“€', 'ðŸ”Œ', 'ðŸ”‹'],
    other: ['ðŸ“Œ', 'ðŸ“¦', 'ðŸ—‚ï¸', 'ðŸ“', 'ðŸ§©', 'ðŸŽ¯', 'ðŸŽ²', 'ðŸŽª', 'ðŸŽ­', 'ðŸ†', 'ðŸŽ–ï¸', 'ðŸ…', 'âš™ï¸', 'ðŸ””']
  };

  const resetSettingsDrafts = useCallback(() => {
    setTempNames(partnerNames);
    setTempHouseholdSettings(householdSettings);
  }, [householdSettings, partnerNames]);

  const openSettingsModal = useCallback((tab: 'settings' | 'shortcuts' = 'settings') => {
    resetSettingsDrafts();
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  }, [resetSettingsDrafts, setSettingsInitialTab, setShowSettingsModal]);

  const closeSettingsInterface = useCallback(() => {
    resetSettingsDrafts();
    setShowSettingsModal(false);
  }, [resetSettingsDrafts, setShowSettingsModal]);

  /**
   * Handle description input changes and generate autocomplete suggestions
   * Extracted to useCallback to prevent stale closures
   */
  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));

    // Generate suggestions based on existing expense descriptions
    const query = value.toLowerCase();
    if (query.length >= 2) {
      const matches = [...new Set(expenses.map(e => e.description))]
        .filter(d => d.toLowerCase().includes(query))
        .slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [expenses, setFormData, setSuggestions]);

  // Form draft state (local to component)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    color: 'bg-purple-500'
  });
  // Local inline edit draft data (component-specific)
  const [inlineEditData, setInlineEditData] = useState<Partial<Expense>>({});

  // Cloud folder suggestions state
  const [suggestedClouds, setSuggestedClouds] = useState<CloudDriveInfo[]>([]);

  const ITEMS_PER_PAGE = 50; // Phase 2 Feature #12: Pagination for performance

  // Category definitions including icon and color styling.
  // Use categories from household settings (dynamic, user-managed)
  const categories = householdSettings.categories || DEFAULT_CATEGORIES;

  /**
   * Load persisted data from storage on mount. This includes expenses,
   * recurring transactions, and partner names. If no data exists, the
   * component will start fresh.
   */
  useEffect(() => {
    loadData();
    checkFileSystemSupport();

    // Load suggested cloud folders
    const clouds = getSuggestedCloudPaths();
    setSuggestedClouds(clouds);

    // Check if this is first launch and show welcome modal
    if (isFirstLaunch()) {
      setShowWelcomeModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync temp states with loaded data for settings modal drafts
  useEffect(() => {
    setTempNames(partnerNames);
    setTempHouseholdSettings(householdSettings);
  }, [partnerNames, householdSettings]);

  /**
   * Clear search query and reset pagination when month or year changes (Phase 2 Feature #12)
   */
  useEffect(() => {
    setSearchQuery('');
    setTransactionPage(1);
  }, [selectedMonth, selectedYear, setSearchQuery, setTransactionPage]);

  /**
   * Reset pagination when search or category filter changes (Phase 2 Feature #12)
   */
  useEffect(() => {
    setTransactionPage(1);
  }, [searchQuery, selectedCategory, setTransactionPage]);

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
        closeSettingsInterface();
        setShowCommandPalette(false);
        setDeleteConfirm(null);
      }
      
      // ?: Show shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        openSettingsModal('shortcuts');
      }
      
      // Number keys 1-4: Switch views
      if (e.key >= '1' && e.key <= '4' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const views: ViewType[] = ['dashboard', 'transactions', 'categories', 'balance'];
        setCurrentView(views[parseInt(e.key) - 1]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dirty,
    exportingData,
    saveData,
    setShowAddModal,
    setShowCommandPalette,
    openQuickAdd,
    closeSettingsInterface,
    setDeleteConfirm,
    openSettingsModal,
    setCurrentView,
  ]);

  /**
   * Electron menu action listener â€” maps native menu items / accelerators
   * to the same handlers used by keyboard shortcuts and the UI.
   */
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onMenuAction) return;

    api.onMenuAction(async ({ action }) => {
      switch (action) {
        case 'open-settings':
          openSettingsModal();
          break;
        case 'show-shortcuts':
          openSettingsModal('shortcuts');
          break;
        case 'new-file': {
          if (confirm(t('confirmations.newFile', 'Start a new file? All unsaved data will be lost.'))) {
            setExpenses([]);
            setRecurring([]);
            setSettlements([]);
            setPartnerNames(defaultPartnerNames);
            setHouseholdSettings(defaultSettings);
            setDirty(true);
          }
          break;
        }
        case 'open-file': {
          await openSharedDataFile();
          break;
        }
        case 'save':
          if (dirty) saveData();
          break;
        case 'save-as':
          await createSharedDataFile();
          break;
        case 'export':
          exportData();
          break;
        case 'import': {
          const result = await api.importDataFile?.();
          if (result?.contents) {
            const file = new File(
              [result.contents],
              (result.filePath || 'import').split(/[\\/]/).pop() || 'import.json'
            );
            await importData(file);
          }
          break;
        }
        case 'reveal':
          await api.revealDataFile?.();
          break;
        case 'check-for-updates':
          await api.checkForUpdates?.();
          break;
      }
    });
  }, [
    openSettingsModal,
    chooseSaveDirectory,
    loadData,
    dirty,
    saveData,
    exportData,
    importData,
    openSharedDataFile,
    createSharedDataFile,
    setExpenses,
    setRecurring,
    setSettlements,
    setPartnerNames,
    setHouseholdSettings,
    setDirty,
    t,
  ]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onUpdateStatus) {
      return;
    }

    api.onUpdateStatus((payload) => {
      switch (payload.status) {
        case 'available':
          showToast(
            t('toasts.updateAvailable', {
              defaultValue: 'Update {{version}} is downloading.',
              version: payload.version || 'available',
            }),
            'success'
          );
          break;
        case 'not-available':
          showToast(
            t('toasts.updateNotAvailable', {
              defaultValue: 'You already have the latest version.',
            }),
            'success'
          );
          break;
        case 'downloaded':
          setPendingUpdateVersion(payload.version || 'latest');
          break;
        case 'error':
          showToast(
            payload.message ||
              t('errors.updateFailed', {
                defaultValue: 'The app could not check for updates.',
              }),
            'error'
          );
          break;
        default:
          break;
      }
    });
  }, [showToast, t]);
  useEffect(() => {
    if (!dirty || exportingData) {
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      // If FSA is available and directory is set, create backup file
      if (supportsFileSystem && saveDirectory) {
        saveData({ allowDownload: false, showToast: false, promptForDirectory: false });
      } else {
        // Web users without FSA or directory: data is already in localStorage
        // Clear dirty flag since persistent storage is up-to-date
        setDirty(false);
      }
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
    saveData,
    setDirty,
    expenses,
    recurring,
    partnerNames,
    householdSettings,
    settlements,
  ]);

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
      await persistExpenses(updated);
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
      await persistExpenses(updated);
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
      await persistExpenses(updated);
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
    const expense = expenses.find(e => e.id === expId);
    if (!expense) return;

    // Use edited value or fall back to original
    const description = (inlineEditData.description ?? expense.description)?.trim();
    if (!description) {
      showToast(t('errors.descriptionRequired'), 'error');
      return;
    }

    const amount = typeof inlineEditData.amount === 'number'
      ? inlineEditData.amount
      : (inlineEditData.amount !== undefined
          ? parseFloat(String(inlineEditData.amount))
          : expense.amount);

    if (isNaN(amount) || amount <= 0) {
      showToast(t('errors.amountGreaterThanZero'), 'error');
      return;
    }

    setSavingTransaction(true);
    try {
      const updated: Expense = {
        ...expense,
        description: description,
        amount: amount,
        category: inlineEditData.category ?? expense.category,
        date: inlineEditData.date ?? expense.date,
        paidBy: inlineEditData.paidBy ?? expense.paidBy
      };
      
      const updatedExpenses = expenses.map(e => e.id === expId ? updated : e);
      setExpenses(updatedExpenses);
      await persistExpenses(updatedExpenses);
      
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
   * Persist partner names to storage.
   */
  const saveNames = async () => {
    setSavingSettings(true);
    try {
      await persistPartnerNames(tempNames);
      setPartnerNames(tempNames);
      setDirty(true); // Mark as dirty (unsaved changes)
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
  const addCategory = async (categoryData?: { name: string; icon: string; color: string }) => {
    // Use either passed data or categoryForm
    const data = categoryData || categoryForm;
    const trimmedName = data.name.trim();

    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!data.icon) {
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
          icon: data.icon,
          color: data.color
        }
      };

      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };

      await persistSettings(updatedSettings);
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
  const editCategory = async (oldName: string, categoryData?: { name: string; icon: string; color: string }) => {
    // Use either passed data or categoryForm
    const data = categoryData || categoryForm;
    const trimmedName = data.name.trim();

    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!data.icon) {
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
        await persistExpenses(updatedExpenses);

        // Update recurring transactions
        const updatedRecurring = recurring.map(rec =>
          rec.category === oldName ? { ...rec, category: trimmedName } : rec
        );
        setRecurring(updatedRecurring);
        await persistRecurring(updatedRecurring);

        // Remove old category, add new
        delete updatedCategories[oldName];
      }

      updatedCategories[trimmedName] = {
        icon: data.icon,
        color: data.color
      };

      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };

      await persistSettings(updatedSettings);
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
        await persistExpenses(updatedExpenses);
        
        const updatedRecurring = recurring.map(rec =>
          rec.category === categoryName ? { ...rec, category: reassignTo } : rec
        );
        setRecurring(updatedRecurring);
        await persistRecurring(updatedRecurring);
      }
      
      const updatedSettings = {
        ...householdSettings,
        categories: updatedCategories
      };
      
      await persistSettings(updatedSettings);
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
      await persistSettings(clampedSettings);
      setHouseholdSettings(clampedSettings);
      setTempHouseholdSettings(clampedSettings);
      setDirty(true); // Mark as dirty (unsaved changes)
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Save a new list of expenses to storage and update state.
   *
   * @param newExpenses Updated expenses list
   */
  const saveExpenses = async (newExpenses: Expense[]) => {
    await persistExpenses(newExpenses);
    setExpenses(newExpenses);
  };

  /**
   * Save a new list of recurring transactions to storage and update state.
   *
   * @param newRecurring Updated recurring list
   */
  const saveRecurring = async (newRecurring: RecurringTransaction[]) => {
    await persistRecurring(newRecurring);
    setRecurring(newRecurring);
  };

  /**
   * Format currency using Intl.NumberFormat with household settings
   */
  const formatCurrency = useCallback(
    (amount: number): string => {
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
    },
    [householdSettings.currencyCode, householdSettings.currencySymbol]
  );

  const formatDateLocalized = useCallback(
    (dateStr: string) => parseISODateToLocalDate(dateStr).toLocaleDateString(i18n.language || undefined),
    [i18n.language]
  );

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
    await persistSettlements(newSettlements);
    setSettlements(newSettlements);
    setDirty(true); // Mark as dirty (unsaved changes)
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
   * Filter expenses based on the selected month and year, plus search query, plus category filter (Phase 1 Feature #8)
   */
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = parseDateParts(exp.date);
      const matchesDate = (
        expDate.month === selectedMonth &&
        expDate.year === selectedYear
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
  }, [expenses, selectedMonth, selectedYear, selectedCategory, searchQuery, partnerNames]);

  // Compute totals for income, expenses, and balances.
  const totalIncome = useMemo(
    () => filteredExpenses
      .filter(exp => exp.type === 'income')
      .reduce((sum, exp) => sum + exp.amount, 0),
    [filteredExpenses]
  );

  const totalExpense = useMemo(
    () => filteredExpenses
      .filter(exp => exp.type === 'expense')
      .reduce((sum, exp) => sum + exp.amount, 0),
    [filteredExpenses]
  );

  const balance = totalIncome - totalExpense;

  // Calculate totals per category for expenses.
  const categoryTotals = useMemo(
    () => filteredExpenses
      .filter(exp => exp.type === 'expense')
      .reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>),
    [filteredExpenses]
  );

  // Sort categories by total amount and take top six for the dashboard.
  const sortedCategories = useMemo(
    () => Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6),
    [categoryTotals]
  );

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
    { icon: Settings, label: t('commands.openSettings'), description: t('commands.configureApp'), action: () => openSettingsModal(), shortcut: 'Cmd+,' },
      { icon: Save, label: t('commands.exportData'), description: t('commands.saveBackup'), action: () => exportData() },

    // Search transactions (top 5 recent)
    ...filteredExpenses.slice(0, 5).map(exp => ({
      icon: DollarSign,
      label: exp.description,
      description: t('commands.transactionSummary', {
        amount: formatCurrency(exp.amount),
        date: formatDateLocalized(exp.date)
      }),
      action: () => { editExpense(exp); setShowCommandPalette(false); },
      keywords: [exp.category, exp.paidBy]
    }))
  ], [
    filteredExpenses,
    t,
    formatCurrency,
    formatDateLocalized,
    editExpense,
    exportData,
    openQuickAdd,
    openSettingsModal,
    setShowAddModal,
    setShowCommandPalette,
  ]);

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
    const years = [...new Set(expenses.map(exp => parseDateParts(exp.date).year))];
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
  const chartData = useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayExpenses = filteredExpenses
        .filter(exp => {
          const expDate = parseDateParts(exp.date);
          return expDate.day === day && exp.type === 'expense';
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const dayIncome = filteredExpenses
        .filter(exp => {
          const expDate = parseDateParts(exp.date);
          return expDate.day === day && exp.type === 'income';
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      data.push({ day, expense: dayExpenses, income: dayIncome });
    }
    return data;
  }, [filteredExpenses, selectedYear, selectedMonth]);

  const maxAmount = useMemo(() => {
    const computedMax = Math.max(...chartData.map(d => Math.max(d.expense, d.income)), 1);
    // Dynamic "nice" max - keeps scaling friendly for small amounts
    return computedMax <= 10 ? 10 : computedMax <= 50 ? 50 : computedMax <= 100 ? 100 : Math.ceil(computedMax / 100) * 100;
  }, [chartData]);

  const MIN_BAR_PX = 2;

  // Check if entire month is empty
  const hasAnyData = useMemo(
    () => chartData.some(d => d.expense > 0 || d.income > 0),
    [chartData]
  );

  /**
   * Calculate insights for the current month (for dashboard widget)
   */
  const insights = useMemo(() => {
    const monthExpenses = filteredExpenses.filter(e => e.type === 'expense');

    // Largest expense
    const largest = monthExpenses.reduce((max, e) =>
      e.amount > max.amount ? e : max,
      { amount: 0, description: t('labels.none'), category: '' }
    );

    // Days with spending (unique days)
    const daysWithSpending = new Set(
      monthExpenses.map(e => parseDateParts(e.date).day)
    ).size;

    // Average daily spend (only count days with spending)
    const avgDaily = daysWithSpending > 0
      ? totalExpense / daysWithSpending
      : 0;

    // Top category by spend
    const topCategoryEntry = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];
    const topCategory = topCategoryEntry ? topCategoryEntry[0] : t('labels.none');

    return { largest, avgDaily, topCategory, daysWithSpending };
  }, [filteredExpenses, totalExpense, categoryTotals, t]);

  /**
   * Calculate month-over-month category delta (current month vs previous month)
   */
  const categoryDeltas = useMemo(() => {
    // Current month category totals (already computed above as categoryTotals)

    // Previous month
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

    const prevExpenses = expenses.filter(e => {
      const d = parseDateParts(e.date);
      return e.type === 'expense' &&
             d.month === prevMonth &&
             d.year === prevYear;
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
  }, [expenses, selectedMonth, selectedYear, categoryTotals]);

  /**
   * Phase 2 Feature #6: Calculate spending trends over last 6 months
   */
  const trendData = useMemo(() => {
    const trendMonths = [];
    const now = new Date();
    // Use last 6 completed months (exclude current partial month)
    for (let i = 6; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthExpenses = expenses.filter(e => {
        const expDate = parseDateParts(e.date);
        return (
          e.type === 'expense' &&
          expDate.month === month &&
          expDate.year === year
        );
      });

      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      trendMonths.push({ month, year, amount: total });
    }

    return trendMonths;
  }, [expenses]);

  const maxTrend = useMemo(
    () => Math.max(...trendData.map(d => d.amount), 1),
    [trendData]
  );

  // Prediction: align with plotted data (all six completed months)
  const prediction = useMemo(
    () => trendData.length > 0
      ? trendData.reduce((sum, d) => sum + d.amount, 0) / trendData.length
      : 0,
    [trendData]
  );

  /**
   * Phase 2 Feature #5: Helper functions for pie chart generation
   */
  const isRTL = (i18n.dir && i18n.dir() === 'rtl') || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl');
  const dir = i18n.dir ? i18n.dir() : 'ltr';

  // Get theme-aware focus ring classes for inputs/selects
  const getFocusClasses = () => {
    switch (currentTheme) {
      case 'ocean-blue':
        return 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
      case 'minimal':
        return 'focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20';
      default:
        return 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20';
    }
  };

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language || undefined, { month: 'short' }),
    [i18n.language]
  );
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => monthFormatter.format(new Date(2000, i, 1))),
    [monthFormatter]
  );

  // Keep chronological order; mirror positions for RTL instead of reversing data.
  const renderTrend = useMemo(() => trendData, [trendData]);

  const withLtr = useCallback(
    (node: React.ReactNode) => (isRTL ? <span className="ltr-text">{node}</span> : node),
    [isRTL]
  );

  const formatSigned = useCallback(
    (amount: number, type: 'income' | 'expense') => {
      const sign = amount < 0 ? '-' : type === 'income' ? '+' : '-';
      const val = Math.abs(amount);
      return withLtr(`${sign}${formatCurrency(val)}`);
    },
    [withLtr, formatCurrency]
  );

  const formatPercent = useCallback(
    (value: number) => {
      if (Math.abs(value) < 0.01) return withLtr('0%');
      const sign = value > 0 ? '+' : '-';
      return withLtr(`${sign}${Math.round(Math.abs(value))}%`);
    },
    [withLtr]
  );


  const getCategoryLabel = useCallback(
    (name: string) => {
      if (i18n.language?.startsWith('he') && CATEGORY_LABELS_HE[name]) {
        return CATEGORY_LABELS_HE[name];
      }
      return t(`categories.${name}`, { defaultValue: name });
    },
    [i18n.language, t]
  );

  /**
   * Handle cloud folder selection from welcome/folder selection modals
   */
  const handleCloudFolderSelection = async (cloud: CloudDriveInfo) => {
    setShowWelcomeModal(false);
    setShowFolderSelectionModal(false);
    markWelcomeSeen();

    if (window.electronAPI?.createDataFile) {
      await createSharedDataFile(cloud.path || undefined);
      return;
    }

    await chooseSaveDirectory();
  };

  /**
   * Handle custom folder selection from welcome/folder selection modals
   */
  const handleCustomFolderSelection = async () => {
    setShowWelcomeModal(false);
    setShowFolderSelectionModal(false);
    markWelcomeSeen();

    if (window.electronAPI?.createDataFile) {
      await createSharedDataFile();
      return;
    }

    await chooseSaveDirectory();
  };

  const handleOpenExistingSharedFile = async () => {
    setShowWelcomeModal(false);
    setShowFolderSelectionModal(false);
    markWelcomeSeen();

    if (window.electronAPI?.openDataFile) {
      await openSharedDataFile();
      return;
    }

    await chooseSaveDirectory();
  };

  /**
   * Handle skipping welcome modal
   */
  const handleSkipWelcome = () => {
    setShowWelcomeModal(false);
    markWelcomeSeen();
    // User can set up folder later via Settings
  };

  /**
   * Open folder selection modal
   */
  const openFolderSelection = () => {
    const clouds = getSuggestedCloudPaths();
    setSuggestedClouds(clouds);
    setShowFolderSelectionModal(true);
  };

  // Show a loading state while retrieving data from storage.
  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.colors.bgPrimary} ${theme.colors.textPrimary} flex items-center justify-center`}>
        <div className="text-xl">{t('status.loading')}</div>
      </div>
    );
  }

  return (
    <>
      {/* External file change banner (cloud sync notification) */}
      <ExternalChangeBanner
        show={hasExternalChange}
        changedAt={externalChangeTime}
        onReload={reloadFromExternalChange}
        onDismiss={dismissExternalChange}
      />

      <div className={`min-h-screen bg-gradient-to-br ${theme.colors.bgPrimary} ${theme.colors.textPrimary} p-4 ${hasExternalChange ? 'pt-16' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* Toast Notification (Phase 1 Feature #2D) */}
        {toast && (
          <div className={`fixed top-6 ${isRTL ? 'left-6' : 'right-6'} px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in flex items-center gap-3 ${
            toast.type === 'success' ? `${theme.colors.successBg} text-white` : `${theme.colors.errorBg} text-white`
          }`}>
            {toast.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950/85 via-slate-900/80 to-purple-900/70 border border-slate-800/40 backdrop-blur-xl rounded-xl p-4 sm:p-5 mb-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-12 h-12 flex-shrink-0 bg-gradient-to-br ${theme.colors.accentGradient} rounded-xl flex items-center justify-center shadow-lg`}>
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm truncate">
                {partnerNames.partner1} &amp; {partnerNames.partner2}
              </p>
              <div className="mt-2">
                <SaveStatusIndicator
                  dirty={dirty}
                  saving={exportingData}
                  lastSaveDate={lastExportDate}
                  saveDirectory={saveDirectory}
                  onSelectFolder={openFolderSelection}
                />
              </div>
            </div>
          </div>

          <div className={`flex gap-2 flex-wrap items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              onClick={() => saveDirectory ? saveData() : openFolderSelection()}
              disabled={exportingData}
              variant={saveDirectory ? "success" : "accent"}
              size="md"
              iconStart={<Save className="w-4 h-4" />}
              title={saveDirectory ? t('tooltips.saveTo', { name: saveDirectory.name }) : t('tooltips.selectFolder', 'Select save folder')}
              className={saveDirectory ? "shadow-lg shadow-green-500/30" : "shadow-lg shadow-purple-500/30"}
            >
              {exportingData ? t('buttons.saving') : (saveDirectory ? t('buttons.save') : t('buttons.selectFolder', 'Select Folder'))}
            </Button>

            <Button
              onClick={() => openSettingsModal('shortcuts')}
              variant="secondary"
              size="md"
              iconStart={<HelpCircle className="w-4 h-4" />}
              title={t('tooltips.keyboardShortcuts')}
            >
              {t('buttons.help')}
            </Button>

            <Button
              onClick={() => openSettingsModal()}
              variant="secondary"
              size="md"
              iconStart={<Settings className="w-4 h-4" />}
              title={t('tooltips.settings')}
            >
              {t('buttons.settings')}
            </Button>
          </div>
        </div>

        {/* Navigation buttons and selectors */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* View navigation buttons */}
          <div className="flex items-center gap-4 overflow-x-auto pb-3 -mx-2 px-2 sm:mx-0 sm:px-0 border-b border-slate-700/50 mb-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`relative pb-3 px-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                currentView === 'dashboard' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('nav.dashboard')}</span>
              {currentView === 'dashboard' && (
                <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-0.5 ${theme.colors.accentPrimary} rounded-full`} />
              )}
            </button>
            <button
              onClick={() => {
                setCurrentView('transactions');
              }}
              className={`relative pb-3 px-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                currentView === 'transactions' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{t('nav.transactions')}</span>
              {currentView === 'transactions' && (
                <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-0.5 ${theme.colors.accentPrimary} rounded-full`} />
              )}
            </button>
            <button
              onClick={() => setCurrentView('categories')}
              className={`relative pb-3 px-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                currentView === 'categories' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>{t('nav.categories')}</span>
              {currentView === 'categories' && (
                <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-0.5 ${theme.colors.accentPrimary} rounded-full`} />
              )}
            </button>
            <button
              onClick={() => setCurrentView('balance')}
              className={`relative pb-3 px-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                currentView === 'balance' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{t('nav.balance')}</span>
              {currentView === 'balance' && (
                <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-0.5 ${theme.colors.accentPrimary} rounded-full`} />
              )}
            </button>
          </div>

          {/* Month and year selectors */}
          <div className={`flex gap-2 ${isRTL ? 'sm:mr-auto sm:pr-4' : 'sm:ml-auto sm:pl-4'} flex-wrap`}>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              dir={dir}
              className={`flex-1 sm:flex-initial min-w-[110px] shrink-0 bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 ${getFocusClasses()} ${isRTL ? 'pr-10 pl-3 sm:pl-4' : 'pl-3 pr-10 sm:pr-4'} py-2 rounded-lg text-white cursor-pointer transition-all duration-200 outline-none text-sm sm:text-base`}
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
              dir={dir}
              className={`flex-1 sm:flex-initial min-w-[110px] shrink-0 bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 ${getFocusClasses()} ${isRTL ? 'pr-10 pl-3 sm:pl-4' : 'pl-3 pr-10 sm:pr-4'} py-2 rounded-lg text-white cursor-pointer transition-all duration-200 outline-none text-sm sm:text-base`}
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
              <span className="text-white font-medium">
                {currentView === 'transactions'
                  ? t('nav.transactions')
                  : currentView === 'categories'
                  ? t('nav.categories')
                  : t('nav.balance')}
              </span>
            </>
          )}
          
          {/* Show active filters as breadcrumb items */}
          {selectedCategory && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-purple-400 flex items-center gap-1">
                {categories[selectedCategory]?.icon} {getCategoryLabel(selectedCategory)}
              </span>
            </>
          )}
          {searchQuery && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-purple-400">
                {t('messages.searchBreadcrumb', { query: searchQuery })}
              </span>
            </>
          )}
        </div>

        {/* Views */}
        <ViewRouter
          currentView={currentView}
          filteredExpenses={filteredExpenses}
          expenses={expenses}
          recurring={recurring}
          settlements={settlements}
          categories={categories}
          partnerNames={partnerNames}
          householdSettings={householdSettings}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          bulkMode={bulkMode}
          selectedIds={selectedIds}
          inlineEditId={inlineEditId}
          inlineEditData={inlineEditData}
          transactionPage={transactionPage}
          filterPresets={filterPresets}
          totalExpense={totalExpense}
          totalIncome={totalIncome}
          balance={balance}
          insights={insights}
          categoryDeltas={categoryDeltas}
          sortedCategories={sortedCategories}
          frequentExpenses={frequentExpenses}
          chartData={chartData}
          maxAmount={maxAmount}
          hasAnyData={hasAnyData}
          renderTrend={renderTrend}
          maxTrend={maxTrend}
          prediction={prediction}
          months={months}
          MIN_BAR_PX={MIN_BAR_PX}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          savingTransaction={savingTransaction}
          deletingItem={deletingItem}
          savingSettings={savingSettings}
          setShowAddModal={setShowAddModal}
          setFormData={setFormData}
          setExpenses={setExpenses}
          setDirty={setDirty}
          setSavingTransaction={setSavingTransaction}
          setBulkMode={setBulkMode}
          setSelectedIds={setSelectedIds}
          setSelectedCategory={setSelectedCategory}
          setSearchQuery={setSearchQuery}
          setTransactionPage={setTransactionPage}
          setInlineEditId={setInlineEditId}
          setInlineEditData={setInlineEditData}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
          setCurrentView={setCurrentView}
          setSettlements={setSettlements}
          formatCurrency={formatCurrency}
          formatDateLocalized={formatDateLocalized}
          formatSigned={formatSigned}
          formatPercent={formatPercent}
          withLtr={withLtr}
          getCategoryLabel={getCategoryLabel}
          getFocusClasses={getFocusClasses}
          showToast={showToast}
          openQuickAdd={openQuickAdd}
          toggleSelection={toggleSelection}
          bulkCategorize={bulkCategorize}
          bulkDelete={bulkDelete}
          saveInlineEdit={saveInlineEdit}
          editExpense={editExpense}
          confirmDeleteExpense={confirmDeleteExpense}
          confirmDeleteRecurring={confirmDeleteRecurring}
          deleteSettlement={deleteSettlement}
          addCategory={addCategory}
          editCategory={editCategory}
          confirmDeleteCategory={confirmDeleteCategory}
          updateTransactionCategory={updateTransactionCategory}
          persistExpenses={persistExpenses}
          persistSettlements={persistSettlements}
          t={t}
        />



        <SettingsCenterModal
          isOpen={showSettingsModal}
          onClose={closeSettingsInterface}
          initialTab={settingsInitialTab}
          t={t}
          i18n={i18n}
          tempNames={tempNames}
          setTempNames={setTempNames}
          partnerNames={partnerNames}
          tempHouseholdSettings={tempHouseholdSettings}
          setTempHouseholdSettings={setTempHouseholdSettings}
          householdSettings={householdSettings}
          supportsFileSystem={supportsFileSystem}
          saveDirectory={saveDirectory}
          exportingData={exportingData}
          importFile={importFile}
          importingData={importingData}
          lastExportDate={lastExportDate}
          dirty={dirty}
          onSaveNames={saveNames}
          onSaveHouseholdSettings={saveHouseholdSettings}
          onChooseSaveDirectory={chooseSaveDirectory}
          onOpenSharedDataFile={openSharedDataFile}
          onCreateSharedDataFile={createSharedDataFile}
          onExportData={exportData}
          onImportFileChange={handleImportFile}
          onImportData={importData}
          setAppTheme={setAppTheme}
          currentTheme={currentTheme}
        />

        {/* Add/edit transaction modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={resetForm}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
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
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('labels.description')}
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => handleDescriptionChange(e.target.value)}
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
                            {categories[matchingExp.category]?.icon} {withLtr(formatCurrency(matchingExp.amount))}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
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
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('labels.category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    dir={dir}
                    className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                  >
                    {Object.keys(categories).map(cat => (
                      <option key={cat} value={cat}>
                        {categories[cat].icon} {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('labels.type')}</label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })
                    }
                    dir={dir}
                    className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                  >
                    <option value="expense">{t('labels.expense')}</option>
                    <option value="income">{t('labels.income')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('labels.date')}</label>
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
                  <label className="block text-sm text-slate-400 mb-2">{t('labels.paidBy')}</label>
                  <select
                    value={formData.paidBy}
                    onChange={e =>
                      setFormData({ ...formData, paidBy: e.target.value as 'partner1' | 'partner2' | 'joint' })
                    }
                    dir={dir}
                    className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
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
                        <label className="block text-sm text-slate-400 mb-2">
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
                  <Button
                    onClick={resetForm}
                    variant="secondary"
                    className="flex-1"
                  >
                    {t('buttons.cancel')}
                  </Button>
                  <Button
                    onClick={editingId ? updateExpense : addExpense}
                    disabled={savingTransaction}
                    variant="accent"
                    className="flex-1"
                  >
                    {savingTransaction ? t('buttons.saving') : (editingId ? t('buttons.update') : t('buttons.add'))}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-red-500 my-8"
              onClick={e => e.stopPropagation()}
            >
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
                <Button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingItem}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={executeDelete}
                  disabled={deletingItem}
                  variant="danger"
                  className="flex-1"
                >
                  {deletingItem ? t('buttons.deleting') : t('buttons.delete')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Buttons - Dashboard Only (Phase 1 Feature #1 & #10) */}
        {currentView === 'dashboard' && (
          <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} flex flex-col gap-3 z-30`}>
            {/* Quick Income Button */}
            <Button
              onClick={() => openQuickAdd('income')}
              variant="income"
              title={t('buttons.quickIncome', { shortcut: 'I' })}
              className="!w-14 !h-14 !p-0 rounded-full shadow-2xl shadow-green-500/30 hover:scale-110 active:scale-95 animate-bounce-slow group"
            >
              <TrendingUp className="w-6 h-6 text-white" />
              <span className={`absolute ${isRTL ? 'left-full ml-3' : 'right-full mr-3'} bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg`}>
                {t('buttons.quickIncome', { shortcut: 'I' })}
              </span>
            </Button>

            {/* Quick Expense Button */}
            <Button
              onClick={() => openQuickAdd('expense')}
              variant="expense"
              title={t('buttons.quickExpense', { shortcut: 'E' })}
              className="!w-14 !h-14 !p-0 rounded-full shadow-2xl shadow-red-500/30 hover:scale-110 active:scale-95 animate-bounce-slow group"
            >
              <TrendingDown className="w-6 h-6 text-white" />
              <span className={`absolute ${isRTL ? 'left-full ml-3' : 'right-full mr-3'} bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg`}>
                {t('buttons.quickExpense', { shortcut: 'E' })}
              </span>
            </Button>
          </div>
        )}

        {/* Command Palette (Phase 2 Feature #1) */}
        {showCommandPalette && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32 p-4 z-50"
            onClick={() => setShowCommandPalette(false)}
          >
            <div
              className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
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

        {/* Category Add Modal (New Design) */}
        {showCategoryModal && !editingCategory && (
          <AddCategoryModal
            isOpen={showCategoryModal}
            onClose={() => {
              setShowCategoryModal(false);
              setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
            }}
            onAdd={(category) => {
              addCategory(category);
            }}
            existingCategories={Object.keys(categories)}
          />
        )}

        {/* Category Edit Modal (Legacy) */}
        {showCategoryModal && editingCategory && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-2xl font-bold bg-gradient-to-r ${theme.colors.accentGradient} bg-clip-text text-transparent`}>
                  {editingCategory ? t('labels.editCategoryTitle') : t('labels.addCategoryTitle')}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('labels.categoryName')}</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className={`w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 ${getFocusClasses()} transition-all`}
                    placeholder={t('labels.categoryNamePlaceholder')}
                    autoFocus
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">{t('labels.iconEmoji')}</label>

                  {/* Selected Emoji Display */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="text-6xl bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-4 border-2 border-slate-600 shadow-lg">
                      {categoryForm.icon || '???'}
                    </div>
                  </div>

                  {/* Emoji Picker Grid with better styling */}
                  <div className="bg-slate-900/30 rounded-xl p-3 border border-slate-700/50">
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(CURATED_EMOJIS).map(([theme, emojis]) => {
                        const usedEmojis = getUsedEmojis();
                        return (
                          <div key={theme} className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-900/50 backdrop-blur-sm py-1.5 px-1 rounded">
                              {t(`emojiThemes.${theme}`, { defaultValue: theme })}
                            </p>
                            <div className="grid grid-cols-9 gap-1.5">
                              {emojis.map(emoji => {
                                const isUsed = usedEmojis.has(emoji);
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => !isUsed && setCategoryForm({ ...categoryForm, icon: emoji })}
                                    disabled={isUsed}
                                    className={`
                                      text-2xl p-2 rounded-lg transition-all
                                      ${isUsed
                                        ? 'opacity-20 cursor-not-allowed bg-slate-800/30'
                                        : 'hover:bg-slate-600/50 cursor-pointer bg-slate-700/30 hover:scale-125 active:scale-95'}
                                      ${categoryForm.icon === emoji ? 'ring-2 ring-purple-500 bg-slate-600 scale-110' : ''}
                                    `}
                                    title={
                                      isUsed
                                        ? t('tooltips.emojiAlreadyUsed')
                                        : t('tooltips.selectEmoji')
                                    }
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
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">{t('labels.color')}</label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      'bg-red-500', 'bg-orange-500', 'bg-yellow-500',
                      'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
                      'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
                      'bg-purple-500', 'bg-pink-500', 'bg-gray-500'
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`w-full aspect-square rounded-xl ${color} ${
                          categoryForm.color === color
                            ? 'ring-4 ring-white/50 ring-offset-2 ring-offset-slate-800 scale-110'
                            : 'hover:scale-110 shadow-lg'
                        } transition-all duration-200 active:scale-95`}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('labels.preview')}</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${categoryForm.color} rounded-xl flex items-center justify-center text-3xl shadow-lg`}>
                      {categoryForm.icon || '???'}
                    </div>
                    <span className="font-semibold text-lg">
                      {categoryForm.name ? getCategoryLabel(categoryForm.name) : t('labels.categoryNamePlaceholder')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    {t('buttons.cancel')}
                  </Button>
                  <Button
                    onClick={() => editingCategory ? editCategory(editingCategory) : addCategory()}
                    disabled={savingSettings || !categoryForm.name.trim()}
                    variant="accent"
                    className="flex-1"
                  >
                    {savingSettings ? t('buttons.saving') : (editingCategory ? t('buttons.update') : t('buttons.add'))}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Delete Confirmation with Reassignment */}
        {showDeleteCategoryConfirm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteCategoryConfirm(null)}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-red-500"
              onClick={e => e.stopPropagation()}
            >
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
                dir={dir}
                className={`w-full bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 mb-6 ${getFocusClasses()} outline-none transition-all`}
                aria-label={t('labels.category')}
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
                <Button
                  onClick={() => setShowDeleteCategoryConfirm(null)}
                  disabled={savingSettings}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={() =>
                    executeDeleteCategory(
                      showDeleteCategoryConfirm.categoryName,
                      showDeleteCategoryConfirm.reassignTo
                    )
                  }
                  disabled={savingSettings}
                  variant="danger"
                  className="flex-1"
                >
                  {savingSettings ? t('buttons.deleting') : t('buttons.deleteReassign')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Modal (First Launch) */}
        <WelcomeModal
          visible={showWelcomeModal}
          suggestedClouds={suggestedClouds}
          onSelectCloud={handleCloudFolderSelection}
          onChooseCustomFolder={handleCustomFolderSelection}
          onOpenExistingFile={handleOpenExistingSharedFile}
          onSkip={handleSkipWelcome}
        />

        {/* Folder Selection Modal */}
        <FolderSelectionModal
          visible={showFolderSelectionModal}
          onClose={() => setShowFolderSelectionModal(false)}
          suggestedClouds={suggestedClouds}
          onSelectCloud={handleCloudFolderSelection}
          onChooseCustomFolder={handleCustomFolderSelection}
          onOpenExistingFile={handleOpenExistingSharedFile}
        />

        {/* Update ready modal */}
        {pendingUpdateVersion && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              const api = window.electronAPI;
              api?.deferUpdate?.(householdSettings.autoUpdate ?? true);
              setPendingUpdateVersion(null);
            }}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2">
                {t('labels.updateReady', { defaultValue: 'Update ready' })}
              </h3>
              <p className="text-slate-300 text-sm mb-6">
                {t('messages.updateReadyDetail', {
                  defaultValue: 'Version {{version}} has been downloaded and is ready to install. Restart now to apply the update.',
                  version: pendingUpdateVersion,
                })}
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const api = window.electronAPI;
                    api?.deferUpdate?.(householdSettings.autoUpdate ?? true);
                    setPendingUpdateVersion(null);
                  }}
                >
                  {t('buttons.notNow', { defaultValue: 'Not now' })}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    window.electronAPI?.installUpdate?.();
                  }}
                >
                  {t('buttons.restartAndInstall', { defaultValue: 'Restart & Install' })}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
};

export default ExpenseTracker;









