import React from 'react';
import type { TFunction, i18n as I18nType } from 'i18next';
import type { PartnerNames, HouseholdSettings } from '../../../lib/types';
import type { ThemeMode } from '../../../lib/theme';
import { SettingsPanel } from '../widgets/SettingsPanel';

type Props = {
  t: TFunction;
  i18n: I18nType;
  partnerNames: PartnerNames;
  tempNames: PartnerNames;
  setTempNames: React.Dispatch<React.SetStateAction<PartnerNames>>;
  tempHouseholdSettings: HouseholdSettings;
  setTempHouseholdSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  householdSettings: HouseholdSettings;
  savingSettings: boolean;
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
  onClose: () => void;
};

export default function SettingsCenter(props: Props) {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl bg-slate-800/70 border border-slate-700 backdrop-blur-xl p-6 shadow-xl">
          <SettingsPanel
            {...props}
            title={props.t('settings.title')}
            showClose={false}
          />
        </div>
      </div>
    </div>
  );
}
