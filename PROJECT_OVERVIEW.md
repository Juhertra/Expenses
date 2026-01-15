# Project Overview

This project is a household expense tracker for two partners. It runs as a web app (Vite + React) and as a desktop app (Electron). Data is stored locally: in browser storage for the web app and in a JSON file for Electron.

## What The App Does
- Track expenses and income with categories, dates, and who paid.
- Split expenses between two partners (equal or proportional).
- Show dashboards (totals, categories, trends, recent transactions).
- Manage recurring transactions.
- Record settlements (repayments) between partners.
- Persist data locally with export/import support.

## Main Data Model
- `Expense`: description, amount, category, type (expense/income), date, paidBy (partner1/partner2/joint).
- `RecurringTransaction`: expense/income template with monthly day and last processed date.
- `Settlement`: repayment between partners (from/to/amount/date).
- `PartnerNames`: custom names for the two partners.
- `HouseholdSettings`: currency, split mode, ratio, budgets, normalization rules, categories, activePartner.

Types live in `src/lib/types.ts`.

## Storage Behavior
The app uses a `window.storage` adapter interface:
- Web: uses `localStorageAdapter` (localStorage).
- Electron: uses `electronStorageAdapter` (file-based JSON).

Storage adapter interface is in `src/lib/storage.ts`.

### Web (Browser)
- Uses localStorage keys:
  - `household-expenses`
  - `household-recurring`
  - `household-partner-names`
  - `household-settings`
  - `household-settlements`
- Default seed data is created on first run (see `src/lib/initStorage.ts`).

### Electron (Desktop)
- Uses a single JSON file as source of truth.
- File path is stored in Electron config (`config.json` under `app.getPath('userData')`).
- The JSON includes:
  - `data`: readable structured data
  - `raw`: exact storage strings used by the app
- No seed data is created for Electron (clean start).
- UI lets user choose the data file path, and auto-save writes to it.

Electron storage adapter in `src/lib/electronStorageAdapter.ts`.

## Key Screens / Features
### Dashboard
- Summary totals, balance, categories, trends, recent transactions.
- Trends show last 6 months ending at selected month/year.
- Prediction only shows if there are at least 2 months with spending.

### Transactions
- Add/edit/delete expenses and income.
- Filter by month/year, category, search.
- Inline edit and bulk actions.

### Balance
- Calculates fair share and who owes who.
- Settlements adjust balances.

### Settings
- Partner names and household settings.
- Active user selection (for auto-save messages).
- Data file selection (Electron).
- Export/import (backup files).

## Balance & Settlement Logic
Balances are derived from expenses only (income is not used to calculate who owes).
- `partnerPaid` = expenses paid by each partner
- `fairShare` = total shared expenses * split ratio
- `balance` = paid - fairShare (positive = is owed)

Settlements are applied as net transfers:
```
netToPartner1 = sum(from partner2 to partner1) - sum(from partner1 to partner2)
partner1Balance -= netToPartner1
partner2Balance += netToPartner1
```

Note: “Paid” in the UI reflects expense totals only, not settlements.

## Trend Chart Implementation
Trend data is computed from expenses:
- 6-month rolling window ending at selected month/year.
- Optional category filter (if selected).

Chart rendering uses SVG with:
- Full-width grid/axis lines.
- Points and labels distributed across the full width.
- Smoothed line with clamped control points to avoid dips below flat sections.

## Electron Integration (What Was Added/Changed)
### New Files
- `electron/main.cjs`: Electron main process, file IO, config, auto-update (packaged only).
- `electron/preload.cjs`: Preload bridge, suggested sync folders, IPC exposure.
- `electron/dev.cjs`: Launch helper for dev mode.
- `src/lib/electronStorageAdapter.ts`: File-based storage adapter.

### Updated Files
- `package.json`:
  - Added Electron scripts and builder config.
  - Added Electron dev/build dependencies.
- `src/lib/initStorage.ts`:
  - Chooses storage adapter (Electron vs web).
  - Skips seed data in Electron.
- `src/vite-env.d.ts`:
  - Electron API typings.
- `src/components/ExpenseTracker.tsx`:
  - Auto-save/Save flow.
  - Data file selection UI and suggested folders.
  - Trend chart adjustments.
  - Active partner label in auto-save message.

### Electron Scripts
- `npm run electron:dev`: Run Vite + Electron.
- `npm run electron:build`: Build desktop installers.
- `npm run electron:pack`: Build unpacked app.

Electron uses `electron-builder` and `electron-updater`.

## Auto-Save Behavior
### Electron
- Auto-save writes to the selected data file.
- Save button writes to the same file (no download).
- If no file is selected, Save opens the file picker.

### Web
- Auto-save uses localStorage only.
- Save/Export downloads a backup JSON file.

## Suggested Sync Providers (Electron)
The Settings UI provides suggested folders for:
- Google Drive
- OneDrive
- Dropbox
- iCloud Drive (macOS)
- Nextcloud (Linux)

This works with local sync clients (Google Drive/OneDrive/etc.) so the file is synced across devices.

## Development Notes
- Vite dev server runs on port 5173 for Electron dev.
- If the port is busy, stop the process and rerun.
- Electron dev uses `node electron/dev.cjs` to avoid `ELECTRON_RUN_AS_NODE` issues.

## Tests
Vitest is configured to run in `node` environment to avoid jsdom ESM issues.
Tests live in `src/lib/__tests__`.

## Known Tradeoffs
- No cloud sync (only local file or localStorage).
- Concurrent edits in shared folders can cause file conflicts.
- Web and Electron use different storage backends.

## Important Paths
- Main UI component: `src/components/ExpenseTracker.tsx`
- Storage adapter: `src/lib/storage.ts`
- Electron storage adapter: `src/lib/electronStorageAdapter.ts`
- Electron main/preload: `electron/main.cjs`, `electron/preload.cjs`

## Manual Run
Web:
```
npm install
npm run dev
```

Electron:
```
npm install
npm run electron:dev
```

## Packaging (Desktop)
```
npm run electron:build
```

Produces installers for the current OS. For Windows + macOS, build on each platform or use CI runners.

---

# Production Readiness Checklist (Electron Expense Tracker)

## ✅ DONE (already implemented / aligned)

### Electron security baseline

- `contextIsolation: true`, `nodeIntegration: false`
- Preload bridge (only exposing necessary APIs)
- Native dialogs for choosing the data file path (and/or export/import)

### Core product UX for normal users

- Insights widget (largest expense, avg daily, top category, days with spending)
- Split mode: equal + proportional
- Settlements (repayments) that reduce “who owes who”
- Search/filter, delete confirmation, guarded parsing, duplicate detection
- Category customization (name + emoji + color)

### Persistence model (desktop)

- Electron: file-backed JSON is the source of truth (not “Export to persist”)

---

## 🔜 NEXT (Must-Have before you ship a “real” build)

### 1) Atomic writes for the data file

Goal: Never corrupt the JSON file on crash/power loss.

- Write to `file.tmp` → rename to real file
- Optional: keep a rolling `.bak`

Why it matters: finance apps fail if data is corrupted.

---

### 2) External file-change detection + conflict handling (cloud sync safety)

If users put the data file inside Google Drive/Dropbox/OneDrive/iCloud, conflicts can happen.

Implement:

- Watch file (polling mtime/hash is fine)
- If changed externally:
  - show banner: “File changed outside the app”
  - offer: Reload / Keep current (overwrite) / Save As…
- Detect “conflicted copy” patterns and warn

Why it matters: prevents silent overwrites and disappearing edits.

---

### 3) Version/About screen

Show:

- App version + schema version
- Data file path + last modified time
- Reveal in Finder/Explorer
- Export backup button

Why it matters: trust + support/debugging.

---

### 4) Memoize heavy computations + performance budget

Use `useMemo` for:

- monthly filtered expenses
- category totals
- MoM deltas
- trend series
- settlement-derived balances

Consider caching by `YYYY-MM` for large data sets.

Why it matters: keeps UI smooth with 5k+ transactions.

---

### 5) Robust error surfaces (non-technical user friendly)

Add user-friendly error dialogs:

- “Data file unreadable” with: Open another file / Restore from backup / Show details
- Import validation errors with field-level messages

---

## 🟡 LATER (Nice-to-Have, high ROI polish)

### Desktop UX polish

- Native menus: File → New/Open/Save As/Export/Import
- Desktop shortcuts aligned with menus
- “Save As…” to duplicate the data file

### Safety / forgiveness

- Undo delete (or “Recently deleted”)
- Autosave indicator states: Saved / Saving / Error

### Reporting

- Export CSV (filtered month/category)
- Monthly summary view (PDF later)

### Hygiene upgrades

- Normalization UX editor + preview
- Split transaction into multiple categories

---

## Copy Guidance (Electron vs Web)

Replace “Export to persist” with:

- Electron: “Export backup (recommended)”
- Web: “Export backup (recommended)” and clarify: browser storage can be cleared.

Cross-platform label option:

- “Backup / Restore”

---

## Balance UX Sanity Check

If users feel “who owes whom” is missing, ensure the Balance view shows a single, obvious line:

- “Partner2 owes Partner1 ₪123.45” or “All settled ✅”

This should be visible even if the math is correct.

---

## TODO

1. Implement atomic writes for the Electron JSON file (`tmp + rename`, optional `.bak`).
2. Add external file change detection with a conflict banner + actions (Reload / Overwrite / Save As).
3. Add About screen with version + schema + file path + last modified + reveal in folder.
4. Memoize all heavy dashboard calculations and balance computations; avoid recompute loops.
5. Ensure backup wording is “Export backup (recommended)” for Electron and Web.
