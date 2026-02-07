import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Expense, RecurringTransaction } from '@expenses/shared/types';
import { useDataContext } from '../contexts/ExpenseContext';
import { useUIContext } from '../contexts/UIContext';
import {
  getExpenses,
  getRecurring,
  getPartnerNames as loadPartnerNames,
  getSettings,
  getSettlements,
  setExpenses as persistExpenses,
  setRecurring as persistRecurring,
  setPartnerNames as persistPartnerNames,
  setSettings as persistSettings,
  setSettlements as persistSettlements,
} from '../services/storage';
import { pickDirectory, supportsDirectoryPicker, isElectron } from '../services/platform';
import { processRecurringTransactions } from '@expenses/shared/recurring';
import {
  buildExportObject,
  serializeExport,
  parseImport,
  writeJsonToDirectory,
  downloadJson,
} from '@expenses/shared/importExport';
import { DEFAULT_CATEGORIES, defaultSettings } from '@expenses/shared/defaults';

/**
 * Hook for managing data persistence (load, save, export, import)
 */
export function useDataPersistence() {
  const { t } = useTranslation();
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
    saveDirectory,
    setSaveDirectory,
    setLastExportDate,
    setDirty,
  } = useDataContext();
  const { showToast, setLoading } = useUIContext();

  // State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [supportsFileSystem, setSupportsFileSystem] = useState(false);

  /**
   * Check if File System Access API is supported
   */
  const checkFileSystemSupport = useCallback(() => {
    if (supportsDirectoryPicker()) {
      setSupportsFileSystem(true);
    }
  }, []);

  /**
   * Process recurring transactions using the centralized service.
   * If any recurring transactions are processed, saves updated state.
   */
  const processRecurring = useCallback(
    async (recurringList: RecurringTransaction[], currentExpenses: Expense[]) => {
      const result = processRecurringTransactions(recurringList, currentExpenses);

      if (result.changed) {
        await persistExpenses(result.updatedExpenses);
        await persistRecurring(result.updatedRecurring);
        setExpenses(result.updatedExpenses);
        setRecurring(result.updatedRecurring);
        setDirty(true); // Mark data as changed so exports include auto-added transactions
      }
    },
    [setExpenses, setRecurring, setDirty]
  );

  /**
   * Load persisted data from storage on mount. Includes expenses,
   * recurring transactions, partner names, settings, and settlements.
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        loadedExpenses,
        loadedRecurring,
        names,
        loadedSettings,
        loadedSettlements,
      ] = await Promise.all([
        getExpenses(),
        getRecurring(),
        loadPartnerNames(),
        getSettings(),
        getSettlements(),
      ]);

      const settingsWithCategories =
        loadedSettings && loadedSettings.categories && Object.keys(loadedSettings.categories).length > 0
          ? loadedSettings
          : { ...defaultSettings, categories: { ...DEFAULT_CATEGORIES } };

      setHouseholdSettings(settingsWithCategories);
      setPartnerNames(names);
      setSettlements(loadedSettlements);
      setExpenses(loadedExpenses);
      setRecurring(loadedRecurring);

      await processRecurring(loadedRecurring, loadedExpenses);

      // Check if Electron has a data file configured
      if (window.electronAPI?.getDataFilePath) {
        const filePath = await window.electronAPI.getDataFilePath();
        if (filePath) {
          // Create a mock directory handle for Electron to indicate storage is configured
          const mockHandle = {
            name: 'Electron Storage',
            kind: 'electron-file' as const,
          } as unknown as FileSystemDirectoryHandle;
          setSaveDirectory(mockHandle);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [
    setLoading,
    setHouseholdSettings,
    setPartnerNames,
    setSettlements,
    setExpenses,
    setRecurring,
    processRecurring,
    setSaveDirectory,
  ]);

  /**
   * Prompt user to select a directory for auto-saving backups
   */
  const chooseSaveDirectory = useCallback(
    async (): Promise<FileSystemDirectoryHandle | null> => {
      try {
        const dirHandle = await pickDirectory();
        if (!dirHandle) {
          return null;
        }
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
    },
    [setSaveDirectory, showToast, t]
  );

  /**
   * Helper to build export payload from current state
   */
  const getExportPayload = useCallback(
    () => ({
      expenses,
      recurring,
      partnerNames,
      householdSettings,
      settlements,
    }),
    [expenses, recurring, partnerNames, householdSettings, settlements]
  );

  /**
   * Save data to a stable file (used by auto-save and manual Save).
   */
  const saveData = useCallback(
    async (options?: {
      allowDownload?: boolean;
      showToast?: boolean;
      promptForDirectory?: boolean;
    }) => {
      setExportingData(true);
      try {
        const payload = getExportPayload();
        const exportObject = buildExportObject(payload);
        const jsonString = serializeExport(payload);
        const filename = 'expense-tracker.json';

        let targetDirectory = saveDirectory;
        const shouldPrompt = options?.promptForDirectory !== false;
        if (supportsFileSystem && !targetDirectory && shouldPrompt) {
          targetDirectory = await chooseSaveDirectory();
        }

        if (supportsFileSystem && targetDirectory) {
          // In Electron, data is already persisted via storage API, skip file write
          const isElectronStorage = isElectron() || (targetDirectory as any).kind === 'electron-file';

          if (!isElectronStorage) {
            await writeJsonToDirectory(targetDirectory, filename, jsonString);
          }

          setDirty(false);
          setLastExportDate(exportObject.exportDate);
          if (options?.showToast !== false) {
            const message = isElectronStorage
              ? t('toasts.dataSaved')
              : t('toasts.savedTo', { path: `${targetDirectory.name}/${filename}` });
            showToast(message, 'success');
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

        downloadJson(filename, jsonString);

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
    },
    [
      getExportPayload,
      saveDirectory,
      supportsFileSystem,
      chooseSaveDirectory,
      setDirty,
      setLastExportDate,
      showToast,
      t,
    ]
  );

  /**
   * Export a timestamped backup file.
   */
  const exportData = useCallback(async () => {
    setExportingData(true);
    try {
      const payload = getExportPayload();
      const exportObject = buildExportObject(payload);
      const jsonString = serializeExport(payload);
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

      downloadJson(filename, jsonString);

      setDirty(false);
      setLastExportDate(exportObject.exportDate);
      showToast(t('toasts.dataExported'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast(t('errors.exportFailed'), 'error');
    } finally {
      setExportingData(false);
    }
  }, [
    getExportPayload,
    saveDirectory,
    supportsFileSystem,
    setDirty,
    setLastExportDate,
    showToast,
    t,
  ]);

  /**
   * Handle file selection for import
   */
  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  }, []);

  /**
   * Import data from JSON file (validates, shows summary, and overwrites)
   * Vault mode: This restores the source of truth
   */
  const importData = useCallback(async (fileOverride?: File) => {
    const file = fileOverride || importFile;
    if (!file) {
      alert(t('errors.selectImportFile'));
      return;
    }

    setImportingData(true);
    try {
      // Read and validate file using service layer
      const text = await file.text();
      const importObject = parseImport(text);

      const { data, raw } = importObject;
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
          partner2: data.partnerNames.partner2,
        }),
        t('dialogs.importSummaryCurrency', { currency }),
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
      if (
        raw &&
        raw['household-expenses'] &&
        raw['household-recurring'] &&
        raw['household-partner-names'] &&
        raw['household-settings']
      ) {
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
        const rawExpenses = JSON.parse(raw['household-expenses']);
        const rawRecurring = JSON.parse(raw['household-recurring']);
        const rawNames = JSON.parse(raw['household-partner-names']);
        const rawSettings = JSON.parse(raw['household-settings']);
        const rawSettlements = raw['household-settlements']
          ? JSON.parse(raw['household-settlements'])
          : [];

        await persistExpenses(rawExpenses);
        await persistRecurring(rawRecurring);
        await persistPartnerNames(rawNames);
        await persistSettings(rawSettings);
        await persistSettlements(rawSettlements);
      } else {
        // Fallback to parsed data
        await persistExpenses(data.expenses);
        await persistRecurring(data.recurring);
        await persistPartnerNames(data.partnerNames);
        await persistSettings(data.householdSettings || defaultSettings);
        await persistSettlements(data.settlements || []);
      }

      // Clear file input for clean UI reset
      setImportFile(null);
      // Reset the file input element
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Clear dirty flag (data is now in sync with "vault")
      setDirty(false);

      showToast(t('dialogs.importSuccess'), 'success');
      await loadData();
    } catch (error) {
      console.error('Import error:', error);
      showToast(t('errors.importFailed'), 'error');
    } finally {
      setImportingData(false);
    }
  }, [importFile, householdSettings, setDirty, showToast, loadData, t]);

  return {
    // State
    importFile,
    setImportFile,
    exportingData,
    importingData,
    supportsFileSystem,

    // Operations
    loadData,
    saveData,
    exportData,
    importData,
    handleImportFile,
    chooseSaveDirectory,
    checkFileSystemSupport,
  };
}
