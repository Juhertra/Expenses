import React from 'react';
import type { TFunction, i18n as I18nType } from 'i18next';
import type { PartnerNames, HouseholdSettings } from '../../../lib/types';
import type { ThemeMode } from '../../../lib/theme';
import { SettingsPanel } from '../widgets/SettingsPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TFunction;
  i18n: I18nType;
  tempNames: PartnerNames;
  setTempNames: React.Dispatch<React.SetStateAction<PartnerNames>>;
  partnerNames: PartnerNames;
  tempHouseholdSettings: HouseholdSettings;
  setTempHouseholdSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  householdSettings: HouseholdSettings;
  supportsFileSystem: boolean;
  saveDirectory: FileSystemDirectoryHandle | null;
  exportingData: boolean;
  importFile: File | null;
  importingData: boolean;
  lastExportDate: string | null;
  dirty: boolean;
  onSaveNames: () => Promise<void>;
  onSaveHouseholdSettings: () => Promise<void>;
  onChooseSaveDirectory: () => Promise<FileSystemDirectoryHandle | null>;
  onExportData: () => Promise<void>;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportData: () => Promise<void>;
  setAppTheme: (theme: ThemeMode) => void;
  currentTheme: ThemeMode;
}

export function SettingsModal({
  isOpen,
  onClose,
  t,
  i18n,
  tempNames,
  setTempNames,
  partnerNames,
  tempHouseholdSettings,
  setTempHouseholdSettings,
  householdSettings,
  supportsFileSystem,
  saveDirectory,
  exportingData,
  importFile,
  importingData,
  lastExportDate,
  dirty,
  onSaveNames,
  onSaveHouseholdSettings,
  onChooseSaveDirectory,
  onExportData,
  onImportFileChange,
  onImportData,
  setAppTheme,
  currentTheme,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <SettingsPanel
          title={t('settings.title')}
          showClose
          onClose={onClose}
          t={t}
          i18n={i18n}
          partnerNames={partnerNames}
          tempNames={tempNames}
          setTempNames={setTempNames}
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
          onSaveNames={onSaveNames}
          onSaveHouseholdSettings={onSaveHouseholdSettings}
          onChooseSaveDirectory={onChooseSaveDirectory}
          onExportData={onExportData}
          onImportFileChange={onImportFileChange}
          onImportData={onImportData}
          setAppTheme={setAppTheme}
          currentTheme={currentTheme}
        />
      </div>
    </div>
  );
}
