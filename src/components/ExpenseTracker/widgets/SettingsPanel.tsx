import React, { useState, useEffect, useRef } from "react";
import { X, FolderOpen, Check, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "../../ui/Button";
import type { PartnerNames, HouseholdSettings } from "../../../lib/types";
import type { ThemeMode } from "../../../lib/theme";
import type { TFunction, i18n as I18nType } from "i18next";
import type { MouseEvent } from "react";
import { themes } from "../../../lib/theme";

type SectionId = "general" | "household" | "appearance" | "data";

type Props = {
  title?: string;
  subtitle?: string;
  showClose?: boolean;
  onClose?: () => void;

  t: TFunction;
  i18n: I18nType;

  partnerNames: PartnerNames;
  tempNames: PartnerNames;
  setTempNames: React.Dispatch<React.SetStateAction<PartnerNames>>;
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

  activeSection?: SectionId;
  visibleSections?: SectionId[];
  searchQuery?: string;
};

export function SettingsPanel({
  title = "Settings",
  subtitle = "",
  showClose = false,
  onClose,
  t,
  i18n,
  partnerNames,
  tempNames,
  setTempNames,
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
  activeSection,
  visibleSections,
  searchQuery = "",
}: Props) {
  const [importStatus, setImportStatus] = useState<null | "success" | "error">(null);
  const [namesSaveStatus, setNamesSaveStatus] = useState<null | "saving" | "saved">(null);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<null | "saving" | "saved">(null);
  const namesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const themeDef = themes[currentTheme] || { colors: { cardBorder: "border-slate-700", cardBg: "bg-slate-900/60" } };
  const dir = i18n.dir(i18n.language);

  const q = searchQuery.trim().toLowerCase();

  const sectionKeywords: Record<SectionId, string[]> = {
    general: ["language", "partner", "name", "names"],
    household: ["currency", "split", "ratio", "proportional"],
    data: ["export", "import", "backup", "folder", "directory", "auto", "save"],
    appearance: ["appearance", "theme", "dark", "ocean", "minimal", "color"],
  };

  const namesDirty =
    tempNames.partner1 !== partnerNames.partner1 || tempNames.partner2 !== partnerNames.partner2;
  const settingsDirty =
    tempHouseholdSettings.currencyCode !== householdSettings.currencyCode ||
    tempHouseholdSettings.currencySymbol !== householdSettings.currencySymbol ||
    tempHouseholdSettings.splitMode !== householdSettings.splitMode ||
    tempHouseholdSettings.partner1Ratio !== householdSettings.partner1Ratio;

  // Auto-save partner names after 1.5s of no changes
  useEffect(() => {
    if (!namesDirty) return;

    // Clear existing timer
    if (namesSaveTimerRef.current) {
      clearTimeout(namesSaveTimerRef.current);
    }

    // Set new timer for debounced save
    namesSaveTimerRef.current = setTimeout(async () => {
      setNamesSaveStatus("saving");
      try {
        await onSaveNames();
        setNamesSaveStatus("saved");

        // Clear "saved" indicator after 2s
        if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
        savedIndicatorTimerRef.current = setTimeout(() => {
          setNamesSaveStatus(null);
        }, 2000);
      } catch (err) {
        console.error("Failed to auto-save names:", err);
        setNamesSaveStatus(null);
      }
    }, 1500);

    return () => {
      if (namesSaveTimerRef.current) {
        clearTimeout(namesSaveTimerRef.current);
      }
    };
  }, [tempNames, namesDirty, onSaveNames]);

  // Auto-save household settings after 1.5s of no changes
  useEffect(() => {
    if (!settingsDirty) return;

    // Clear existing timer
    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current);
    }

    // Set new timer for debounced save
    settingsSaveTimerRef.current = setTimeout(async () => {
      setSettingsSaveStatus("saving");
      try {
        await onSaveHouseholdSettings();
        setSettingsSaveStatus("saved");

        // Clear "saved" indicator after 2s
        if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
        savedIndicatorTimerRef.current = setTimeout(() => {
          setSettingsSaveStatus(null);
        }, 2000);
      } catch (err) {
        console.error("Failed to auto-save household settings:", err);
        setSettingsSaveStatus(null);
      }
    }, 1500);

    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current);
      }
    };
  }, [tempHouseholdSettings, settingsDirty, onSaveHouseholdSettings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (namesSaveTimerRef.current) clearTimeout(namesSaveTimerRef.current);
      if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current);
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, []);

  const highlightText = (text: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <mark className="bg-purple-500/40 text-white px-0.5 rounded">{match}</mark>
        {after}
      </>
    );
  };

  const handleImport = async (e?: MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    if (!importFile) return;
    const confirmed = window.confirm(
      t("messages.importConfirm", "Import will overwrite current data. Continue?")
    );
    if (!confirmed) return;
    try {
      await onImportData();
      setImportStatus("success");
    } catch (err) {
      console.error(err);
      setImportStatus("error");
    }
  };

  const matchesSection = (id: SectionId) => {
    const visible = !visibleSections || visibleSections.includes(id);
    if (!visible) return false;
    if (!q) return true;
    const keywords = sectionKeywords[id] || [];
    return keywords.some((k) => k.includes(q) || q.includes(k));
  };

  const sectionContainer = (children: React.ReactNode, id: SectionId, extra = "") => (
    <section
      id={`settings-section-${id}`}
      data-settings-section={id}
      data-search={(sectionKeywords[id] || []).join(" ")}
      data-active={activeSection === id}
      data-animate="card"
      className={`space-y-4 p-4 rounded-xl border ${themeDef.colors.cardBorder} ${themeDef.colors.cardBg} ${extra} ${
        matchesSection(id) ? "" : "hidden"
      }`}
    >
      {children}
    </section>
  );

  const cardBgInput = "bg-slate-700";
  const cardBorderInput = "border-slate-600";

  return (
    <div className="w-full" dir={dir}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className={dir === "rtl" ? "text-right" : "text-left"}>
          <h3 className="text-xl font-bold">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {showClose && (
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {sectionContainer(
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-300">
                {highlightText(t("settings.sections.general"))}
              </h4>
              {namesSaveStatus && (
                <div className="flex items-center gap-2 text-xs">
                  {namesSaveStatus === "saving" && (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      <span className="text-yellow-400">{t("status.autoSaving", "Auto-saving...")}</span>
                    </>
                  )}
                  {namesSaveStatus === "saved" && (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">{t("status.settingsSaved", "Saved")}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400">{t("settings.language")}</label>
              <select
                value={i18n.language || "en"}
                onChange={(e) => {
                  const nextLang = e.target.value;
                  i18n.changeLanguage(nextLang);
                  window.localStorage.setItem("app-locale", nextLang);
                }}
                dir={dir}
                className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg ${dir === "rtl" ? "pr-10 pl-4" : "pl-4 pr-10"} py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all`}
              >
                <option value="en">{t("settings.languages.en")}</option>
                <option value="he">{t("settings.languages.he")}</option>
              </select>
              <p className="text-xs text-slate-500">{t("settings.languageHelp")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">{t("settings.partner1Name")}</label>
                <input
                  type="text"
                  value={tempNames.partner1}
                  onChange={(e) => setTempNames({ ...tempNames, partner1: e.target.value })}
                  className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg px-4 py-2 ${dir === "rtl" ? "text-right" : ""}`}
                  placeholder={t("settings.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">{t("settings.partner2Name")}</label>
                <input
                  type="text"
                  value={tempNames.partner2}
                  onChange={(e) => setTempNames({ ...tempNames, partner2: e.target.value })}
                  className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg px-4 py-2 ${dir === "rtl" ? "text-right" : ""}`}
                  placeholder={t("settings.namePlaceholder")}
                />
              </div>
            </div>
          </>,
          "general"
        )}

        {sectionContainer(
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-300">
                {highlightText(t("labels.householdSettings"))}
              </h4>
              {settingsSaveStatus && (
                <div className="flex items-center gap-2 text-xs">
                  {settingsSaveStatus === "saving" && (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      <span className="text-yellow-400">{t("status.autoSaving", "Auto-saving...")}</span>
                    </>
                  )}
                  {settingsSaveStatus === "saved" && (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">{t("status.settingsSaved", "Saved")}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400">{t("labels.currency")}</label>
              <select
                value={tempHouseholdSettings.currencyCode}
                onChange={(e) => {
                  const code = e.target.value;
                  const symbol = code === "ILS" ? "₪" : code === "USD" ? "$" : "€";
                  setTempHouseholdSettings({
                    ...tempHouseholdSettings,
                    currencyCode: code,
                    currencySymbol: symbol,
                  });
                }}
                dir={dir}
                className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg ${dir === "rtl" ? "pr-10 pl-4" : "pl-4 pr-10"} py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all`}
              >
                <option value="ILS">{t("settings.currencyILS")}</option>
                <option value="USD">{t("settings.currencyUSD")}</option>
                <option value="EUR">{t("settings.currencyEUR")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400">{t("labels.expenseSplitMode")}</label>
              <select
                value={tempHouseholdSettings.splitMode}
                onChange={(e) =>
                  setTempHouseholdSettings({
                    ...tempHouseholdSettings,
                    splitMode: e.target.value as "equal" | "proportional",
                  })
                }
                dir={dir}
                className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg ${dir === "rtl" ? "pr-10 pl-4" : "pl-4 pr-10"} py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all`}
              >
                <option value="equal">{t("settings.splitEqual")}</option>
                <option value="proportional">{t("settings.splitProportional")}</option>
              </select>
            </div>

            {tempHouseholdSettings.splitMode === "proportional" && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">
                  {t("settings.shareRatioLabel", { name: tempNames.partner1 || t("labels.partner1") })}
                </label>
                <input
                  type="number"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={tempHouseholdSettings.partner1Ratio}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setTempHouseholdSettings({
                        ...tempHouseholdSettings,
                        partner1Ratio: Math.max(0.05, Math.min(0.95, val)),
                      });
                    }
                  }}
                  className={`w-full ${cardBgInput} ${cardBorderInput} rounded-lg px-4 py-2 ${dir === "rtl" ? "text-right" : ""}`}
                />
                <p className="text-xs text-slate-500">
                  {t("settings.ratioSummary", {
                    name1: tempNames.partner1 || t("labels.partner1"),
                    ratio1: (tempHouseholdSettings.partner1Ratio * 100).toFixed(0),
                    name2: tempNames.partner2 || t("labels.partner2"),
                    ratio2: ((1 - tempHouseholdSettings.partner1Ratio) * 100).toFixed(0),
                  })}
                </p>
                {(tempHouseholdSettings.partner1Ratio <= 0.05 || tempHouseholdSettings.partner1Ratio >= 0.95) && (
                  <p className="text-xs text-yellow-400">{t("settings.ratioClamped")}</p>
                )}
              </div>
            )}
          </>,
          "household"
        )}

        {sectionContainer(
          <>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {highlightText(t("settings.appearance"))}
            </h4>

            <div>
              <label className="block text-sm text-slate-400 mb-3">{t("settings.theme")}</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setAppTheme("dark-purple")}
                  className={`relative p-4 rounded-xl transition-all ${
                    currentTheme === "dark-purple"
                      ? "ring-2 ring-purple-500 bg-gradient-to-br from-purple-900 to-pink-900"
                      : "bg-gradient-to-br from-purple-900/50 to-pink-900/50 hover:from-purple-900/70 hover:to-pink-900/70"
                  }`}
                >
                  {currentTheme === "dark-purple" && <Check className="w-4 h-4 absolute top-2 right-2" />}
                  <div className="text-xs font-medium mb-2 text-center">{t("settings.darkPurple")}</div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                </button>

                <button
                  onClick={() => setAppTheme("ocean-blue")}
                  className={`relative p-4 rounded-xl transition-all ${
                    currentTheme === "ocean-blue"
                      ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-900 to-cyan-900"
                      : "bg-gradient-to-br from-blue-900/50 to-cyan-900/50 hover:from-blue-900/70 hover:to-cyan-900/70"
                  }`}
                >
                  {currentTheme === "ocean-blue" && <Check className="w-4 h-4 absolute top-2 right-2" />}
                  <div className="text-xs font-medium mb-2 text-center">{t("settings.oceanBlue")}</div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                </button>

                <button
                  onClick={() => setAppTheme("minimal")}
                  className={`relative p-4 rounded-xl transition-all ${
                    currentTheme === "minimal"
                      ? "ring-2 ring-slate-500 bg-gradient-to-br from-slate-900 to-slate-800"
                      : "bg-gradient-to-br from-slate-900/50 to-slate-800/50 hover:from-slate-900/70 hover:to-slate-800/70"
                  }`}
                >
                  {currentTheme === "minimal" && <Check className="w-4 h-4 absolute top-2 right-2" />}
                  <div className="text-xs font-medium mb-2 text-center">{t("settings.minimal")}</div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-slate-600 to-slate-500" />
                </button>
              </div>
            </div>
          </>,
          "appearance"
        )}

        {sectionContainer(
          <>
            {supportsFileSystem && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">{t("labels.autoSaveFolder")}</h4>
                <p className="text-xs text-slate-400">{t("messages.autoSaveHelp")}</p>

                <button
                  onClick={onChooseSaveDirectory}
                  className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  {saveDirectory ? t("buttons.changeFolder", { name: saveDirectory.name }) : t("buttons.chooseSaveFolder")}
                </button>

                {saveDirectory && <p className="text-xs text-green-400">{t("status.savingTo", { name: saveDirectory.name })}</p>}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-300">{t("labels.dataBackup")}</h4>
              <p className="text-xs text-slate-400">{t("messages.exportHelp")}</p>

              <Button
                onClick={onExportData}
                disabled={exportingData}
                variant="success"
                className="w-full"
              >
                {exportingData ? t("buttons.exporting") : t("buttons.exportData")}
              </Button>

              {lastExportDate && !dirty && (
                <p className="text-xs text-green-400">{t("status.lastExported", { date: new Date(lastExportDate).toLocaleString() })}</p>
              )}

              <div className="space-y-2">
                <input type="file" accept=".json" onChange={onImportFileChange} className="hidden" id="import-file" />
                <label
                  htmlFor="import-file"
                  className="block w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors text-center cursor-pointer"
                >
                  {t("buttons.chooseFileToImport")}
                </label>
                {importFile && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">{t("labels.selectedFile", { name: importFile.name })}</p>
                    <Button
                      onClick={handleImport}
                      disabled={importingData}
                      variant="accent"
                      className="w-full"
                    >
                      {importingData ? t("buttons.importing") : t("buttons.importReplace")}
                    </Button>
                    {importStatus === "success" && (
                      <p className="text-xs text-green-400">{t("status.imported", "Import completed")}</p>
                    )}
                    {importStatus === "error" && (
                      <p className="text-xs text-rose-400">{t("errors.importFailed", "Import failed. Please check the file.")}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          "data"
        )}
      </div>
    </div>
  );
}
