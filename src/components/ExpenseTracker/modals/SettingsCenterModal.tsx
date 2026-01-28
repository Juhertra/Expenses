import React, { useEffect, useMemo, useRef, useState } from "react";
import { createScope, createTimeline, stagger } from "animejs";
import { X, Search, Sliders, Keyboard, Users, Database, Palette } from "lucide-react";
import type { TFunction, i18n as I18nType } from "i18next";
import type { PartnerNames, HouseholdSettings } from "../../../lib/types";
import type { ThemeMode } from "../../../lib/theme";
import { themes } from "../../../lib/theme";
import { SettingsPanel } from "../widgets/SettingsPanel";

type SectionId = "general" | "household" | "data" | "appearance";
type TabId = "settings" | "shortcuts";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabId;

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
};

const SECTIONS: Array<{ id: SectionId; icon: React.ElementType; labelKey: string }> = [
  { id: "general", icon: Sliders, labelKey: "settings.sections.general" },
  { id: "household", icon: Users, labelKey: "settings.sections.household" },
  { id: "data", icon: Database, labelKey: "settings.sections.dataBackup" },
  { id: "appearance", icon: Palette, labelKey: "settings.sections.appearance" },
];

const KEYWORDS: Record<SectionId, string[]> = {
  general: ["general", "language", "english", "hebrew", "partner", "name", "names"],
  household: ["household", "currency", "ils", "usd", "eur", "split", "ratio", "proportional"],
  data: ["data", "export", "import", "backup", "folder", "directory", "auto", "save"],
  appearance: ["appearance", "theme", "dark", "ocean", "minimal", "color"],
};

export default function SettingsCenterModal(props: Props) {
  const { isOpen, onClose, t, i18n, currentTheme, initialTab = "settings" } = props;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const hasInitialized = useRef(false);

  const [tab, setTab] = useState<TabId>("settings");
  const [section, setSection] = useState<SectionId>("general");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const dir = useMemo(() => i18n.dir(i18n.language), [i18n, i18n.language]);
  const themeDef = themes[currentTheme] || { colors: { cardBg: "bg-slate-900/60", cardBorder: "border-slate-700" } };
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  const tt = (key: string, fallback: string) => (i18n.exists(key) ? t(key) : fallback);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 160);
    return () => clearTimeout(timer);
  }, [query]);

  const sectionLabels = useMemo(
    () =>
      SECTIONS.reduce<Record<SectionId, string>>((acc, s) => {
        acc[s.id] = tt(s.labelKey, s.id);
        return acc;
      }, {} as Record<SectionId, string>),
    [i18n.language]
  );

  const allSections = useMemo(() => SECTIONS.map((s) => s.id), []);

  const visibleSections = useMemo(() => {
    if (!debouncedQuery) return allSections;
    return allSections.filter((id) => {
      const label = sectionLabels[id]?.toLowerCase?.() || "";
      const keywords = KEYWORDS[id] || [];
      return label.includes(debouncedQuery) || keywords.some((k) => k.includes(debouncedQuery) || debouncedQuery.includes(k));
    });
  }, [allSections, debouncedQuery, sectionLabels]);

  const noMatches = tab === "settings" && debouncedQuery.length > 0 && visibleSections.length === 0;

  const scrollToSection = (id: SectionId, behavior: ScrollBehavior = "smooth") => {
    const container = contentRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`#settings-section-${id}`);
    if (el) {
      const top = el.offsetTop - container.offsetTop;
      container.scrollTo({ top, behavior });
    }
  };

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const list = visibleSections.length ? visibleSections : allSections;
      if (isCmd && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (tab === "settings" && list.length) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const currentIdx = list.indexOf(section as SectionId);
          const nextIdx = e.key === "ArrowDown"
            ? (currentIdx + 1 + list.length) % list.length
            : (currentIdx - 1 + list.length) % list.length;
          const next = list[nextIdx];
          setSection(next);
          scrollToSection(next);
        }
        if (e.key === "Enter" && document.activeElement === searchRef.current) {
          e.preventDefault();
          const target = list[0];
          setSection(target);
          scrollToSection(target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, tab, section, visibleSections, allSections]);

  // Open animation
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      return;
    }

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setTab(initialTab);
      setSection("general");
      scrollToSection("general", "auto");
    }

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const sidebar = sidebarRef.current;
    const content = contentRef.current;
    if (!overlay || !panel) return;

    searchRef.current?.focus();

    const sidebarItems = sidebar ? Array.from(sidebar.querySelectorAll('[data-animate="sidebar-item"]')) : [];
    const cards = content ? Array.from(content.querySelectorAll('[data-animate="card"]')) : [];

    overlay.style.opacity = "0";
    panel.style.opacity = "0";
    panel.style.transform = "translateY(12px) scale(0.98)";
    sidebarItems.forEach((item) => {
      const el = item as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateX(-6px)";
    });
    cards.forEach((item) => {
      const el = item as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
    });

    const tl = createTimeline({ autoplay: true });

    tl.add(overlay, {
      opacity: [0, 1],
      duration: 140,
      easing: "linear",
    })
      .add(
        panel,
        {
          opacity: [0, 1],
          translateY: [12, 0],
          scale: [0.98, 1],
          duration: 260,
          easing: "easeOutCubic",
        },
        "-=40"
      )
      .add(
        sidebarItems,
        {
          opacity: [0, 1],
          translateX: [-6, 0],
          duration: 220,
          delay: stagger(35),
          easing: "easeOutCubic",
        },
        "-=140"
      )
      .add(
        cards,
        {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 240,
          delay: stagger(45),
          easing: "easeOutCubic",
        },
        "-=170"
      );

    const scope = createScope();
    scope.register(tl);

    return () => {
      scope.revert();
    };
  }, [isOpen, initialTab]);

  // Active sidebar animation
  useEffect(() => {
    if (!isOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const activeButton = sidebar.querySelector<HTMLElement>(`[data-animate="sidebar-item"][data-id="${section}"]`);
    if (!activeButton) return;
    const scope = createScope();
    const tl = createTimeline({ autoplay: true });
    tl.add(activeButton, {
      translateX: [-2, 0],
      opacity: [0.8, 1],
      duration: 160,
      easing: "easeOutCubic",
    });
    scope.register(tl);
    return () => scope.revert();
  }, [section, isOpen]);

  // Scroll spy
  useEffect(() => {
    if (!isOpen || tab !== "settings" || noMatches) return;
    const container = contentRef.current;
    if (!container) return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-settings-section]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-settings-section") as SectionId | null;
          if (id && id !== section) setSection(id);
        }
      },
      {
        root: container,
        threshold: 0.1,
        rootMargin: "-50px 0px -50px 0px",
      }
    );
    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [isOpen, tab, noMatches, section]);

  // Search routing
  useEffect(() => {
    if (!isOpen || tab !== "settings") return;
    if (!debouncedQuery) {
      // Don't reset to general when clearing search, just stay on current section
      return;
    }
    if (visibleSections.length) {
      const target = visibleSections.includes(section) ? section : visibleSections[0];
      setSection(target);
      scrollToSection(target);
    }
  }, [debouncedQuery, visibleSections, isOpen, tab, section]);

  const sectionLabel = useMemo(() => {
    const found = SECTIONS.find((s) => s.id === section);
    return found ? tt(found.labelKey, found.id) : tt("settings.title", "Settings");
  }, [section, i18n.language]);

  if (!isOpen) return null;

  const currentSections = visibleSections.length ? visibleSections : allSections;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div ref={overlayRef} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div
        ref={panelRef}
        dir={dir}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/85 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${themeDef.colors.cardBorder} ${themeDef.colors.cardBg}`}>
          <div className={`flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${themeDef.colors.accentGradient} flex items-center justify-center`}>
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div className={dir === "rtl" ? "text-right" : "text-left"}>
              <div className="text-lg font-bold text-white">{tt("settings.title", "Settings")}</div>
              <div className="text-xs text-slate-400">{sectionLabel}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className={`${dir === "rtl" ? "mr-6" : "ml-6"} flex items-center bg-slate-800/60 rounded-2xl p-1 border border-slate-700 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === "settings" ? `${themeDef.colors.accentPrimary} text-white` : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setTab("settings")}
            >
              {tt("settings.tabs.settings", "Settings")}
            </button>
            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                tab === "shortcuts" ? `${themeDef.colors.accentPrimary} text-white` : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setTab("shortcuts")}
            >
              <Keyboard className="w-4 h-4" />
              {tt("settings.tabs.shortcuts", "Shortcuts")}
            </button>
          </div>

          {/* Search */}
          <div className={`${dir === "rtl" ? "mr-auto" : "ml-auto"} flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-2xl px-3 py-2 w-[320px] ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <Search className="w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tt("settings.searchPlaceholder", "Search settings...")}
              dir={dir}
              className={`w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500 ${dir === "rtl" ? "text-right" : "text-left"}`}
            />
            {query && (
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setQuery("");
                  setSection("general");
                  scrollToSection("general", "auto");
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-slate-800/70 transition ${dir === "rtl" ? "mr-2" : "ml-2"}`}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-200" />
          </button>
        </div>

        {/* Body */}
        <div className={`flex h-[calc(90vh-72px)] overflow-hidden ${dir === "rtl" ? "flex-row-reverse" : ""}`} dir={dir}>
          {/* Sidebar - only show for settings tab */}
          {tab === "settings" && (
            <div
              ref={sidebarRef}
              className={`w-1/4 flex-shrink-0 ${dir === "rtl" ? "border-l" : "border-r"} ${themeDef.colors.cardBorder} ${themeDef.colors.cardBg} p-4 overflow-y-auto h-full`}
            >
              <div className="space-y-2">
                {SECTIONS.filter((s) => currentSections.includes(s.id)).map(({ id, icon: Icon, labelKey }) => (
                  <button
                    key={id}
                    data-animate="sidebar-item"
                    data-id={id}
                    onClick={() => {
                      setSection(id);
                      scrollToSection(id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition border ${
                      section === id
                        ? `${themeDef.colors.accentPrimary}/20 ${themeDef.colors.focus}/40 text-white`
                        : "bg-transparent border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    } ${dir === "rtl" ? "flex-row-reverse text-right" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{tt(labelKey, id)}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-xs text-slate-500">{tt("settings.hint", "Changes are saved locally.")}</div>
            </div>
          )}

          {/* Content */}
          <div ref={contentRef} className={`flex-1 p-6 overflow-y-auto h-full ${themeDef.colors.cardBg}`}>
            {tab === "shortcuts" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">⌨️ {tt("labels.keyboardShortcuts", "Keyboard Shortcuts")}</h3>
                  <p className="text-slate-400 text-sm">{tt("messages.boostProductivity", "Boost productivity with shortcuts")}</p>
                </div>

                {/* Navigation */}
                <div data-animate="card">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{tt("labels.navigation", "Navigation")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { keys: ['1'], desc: tt('nav.dashboard', 'Dashboard') },
                      { keys: ['2'], desc: tt('nav.transactions', 'Transactions') },
                      { keys: ['3'], desc: tt('nav.categories', 'Categories') },
                      { keys: ['4'], desc: tt('nav.balance', 'Balance') }
                    ].map((s, i) => (
                      <div key={i} className={`flex justify-between p-3 bg-slate-700/30 rounded-lg ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <span className="text-sm text-slate-300">{s.desc}</span>
                        <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono min-w-[2rem] text-center">{s.keys[0]}</kbd>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div data-animate="card">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{tt("labels.actions", "Actions")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { keys: [isMac ? '⌘' : 'Ctrl', 'N'], desc: tt('shortcuts.newTransaction', 'New transaction') },
                      { keys: ['E'], desc: tt('shortcuts.quickExpense', 'Quick expense') },
                      { keys: ['I'], desc: tt('shortcuts.quickIncome', 'Quick income') },
                      { keys: [isMac ? '⌘' : 'Ctrl', 'S'], desc: tt('shortcuts.saveExport', 'Save / export') },
                      { keys: [isMac ? '⌘' : 'Ctrl', 'K'], desc: tt('shortcuts.commandPalette', 'Command palette') },
                      { keys: ['Esc'], desc: tt('shortcuts.closeModal', 'Close modal') }
                    ].map((s, i) => (
                      <div key={i} className={`flex justify-between p-3 bg-slate-700/30 rounded-lg ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                        <span className="text-sm text-slate-300">{s.desc}</span>
                        <div className={`flex gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                          {s.keys.map((k, j) => (
                            <kbd key={j} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Help */}
                <div data-animate="card">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">{tt("labels.helpSection", "Help")}</h4>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-sm text-slate-300">{tt('shortcuts.showPanel', 'Show shortcuts panel')}</span>
                    <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">
                      {isMac ? '⌘ /' : 'Ctrl /'}
                    </kbd>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-700">
                  <p className="text-xs text-slate-500">
                    <span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded">
                        {isMac ? '⌘' : 'Ctrl'}
                      </kbd> {tt('shortcuts.cmdHint', 'Cmd/Ctrl key')}
                    </span>
                    <br />
                    <span className="mt-2 inline-block">
                      {tt('shortcuts.pressAnytime', 'Press anytime')}
                      <kbd className="px-2 py-1 bg-slate-700 rounded mx-1">
                        {isMac ? '⌘ /' : 'Ctrl /'}
                      </kbd> {tt('shortcuts.toShowHelp', 'to show help')}
                    </span>
                  </p>
                </div>
              </div>
            ) : noMatches ? (
              <div className="space-y-4">
                <div
                  data-animate="card"
                  className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center"
                >
                  <div className="text-lg font-bold text-white mb-2">{tt("settings.noResultsTitle", "No results")}</div>
                  <div className="text-sm text-slate-400">
                    {tt(
                      "settings.noResultsHint",
                      "Try searching for \"currency\", \"export\", \"theme\", or \"language\"."
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div data-animate="card" className={`rounded-2xl border ${themeDef.colors.cardBorder} ${themeDef.colors.cardBg} p-5`}>
                  <SettingsPanel
                    {...props}
                    title={tt("settings.title", "Settings")}
                    subtitle=""
                    showClose={false}
                    activeSection={section}
                    visibleSections={currentSections as SectionId[]}
                    searchQuery={debouncedQuery}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
