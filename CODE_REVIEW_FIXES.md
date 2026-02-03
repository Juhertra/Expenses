# Code Review Fixes Tracking

Created: 2026-02-02

## High Priority Findings

### 1. [x] Mojibake/Encoding Issues in Default Files
**Severity**: High
**Files affected**:
- `src/lib/defaults.ts`
- `src/lib/categoryIcons.ts`
- `src/i18n/en.json`
- `src/i18n/he.json`

**Problem**: Default category icons showing as gibberish (e.g., `ðŸ `, `â‚ª`) instead of proper emoji.

**Fix**: Re-save files as UTF-8 with proper encoding, ensure emoji characters are correctly stored.

---

### 2. [x] Missing i18n Keys
**Severity**: High
**Problem**: UI references translation keys that don't exist, showing raw keys to users.

**Missing keys to add**:
- [ ] `toasts.showingThisMonth` - used in TransactionsView.tsx
- [ ] `toasts.showingLastMonth` - used in TransactionsView.tsx
- [ ] `toasts.appliedFilter` - used in TransactionsView.tsx
- [ ] `toasts.foundLargeExpenses` - used in TransactionsView.tsx
- [ ] `toasts.noLargeExpensesThisMonth` - used in TransactionsView.tsx
- [ ] `errors.storageFailed` - used in useExpenseForm.ts
- [ ] `buttons.deleting` - check if exists
- [ ] `buttons.selectFolder` - check if exists

**Key mismatch to fix**:
- [ ] Code uses `errors.settlementSamePerson` but translation has `errors.settlementSamePartner` (in BalanceView.tsx)

**Files to update**:
- `src/i18n/en.json`
- `src/i18n/he.json`

---

### 3. [x] Balance View Scope Mismatch
**Severity**: High (Data Correctness)
**File**: `src/components/ExpenseTracker/views/BalanceView.tsx`

**Problem**: BalanceView receives month-scoped `filteredExpenses` but unfiltered `settlements`, causing incorrect balance calculations for the selected month.

**Fix options**:
1. Filter settlements to match the selected month, OR
2. Compute balances using full (unfiltered) expenses

---

### 4. [x] Anime.js Import Issue - FALSE POSITIVE
**Severity**: N/A
**File**: `src/lib/animeHelpers.ts`

**Problem**: Review claimed code imports `animate/remove` incorrectly.

**Actual Status**: Animejs v4.3.1 DOES export `animate` and `remove` as named exports. The import is correct. No fix needed.

---

### 5. [x] Cloud Drive Detection Not Working
**Severity**: Medium
**Files**:
- `src/components/ExpenseTracker/widgets/SaveStatusIndicator.tsx`
- `src/lib/cloudDriveDetection.ts`

**Problem**: `SaveStatusIndicator` passes only `saveDirectory.name` to `analyzeFolder`, which can't match typical paths for cloud detection.

**Fix**: Provide full path from Electron's `getDataFilePath` or extend the mock handle with path.

---

## Optimization Opportunities

### 6. [x] Consolidate filteredExpenses Calculations
**Files**: Multiple components computing totals

**Problem**: Multiple O(n) passes over `filteredExpenses` every render (totals, category totals, chart data, partner splits).

**Fix Applied**:

- `calculateBalance` now accepts optional precomputed totals to avoid duplicate calculation
- `calculateCategoryTotals` optimized from filter+reduce (2 passes) to single pass
- `getChartData` optimized from O(62n) to O(n) using Map-based single pass
- Created `useTotalsAndBalance` hook for components needing both values efficiently

---

### 7. [x] Transaction List Performance
**File**: Transaction list rendering

**Problem**: Renders 50 rows with fresh Date parsing each pass.

**Status**: Acceptable - pagination limits to 50 items max per page, making Date parsing impact minimal. Virtualization (react-window) would be over-engineering for current scale.

---

### 8. [x] Duplicate Detection Optimization
**File**: `src/hooks/useExpenseForm.ts`

**Problem**: Recomputes canonical strings per call, scans all expenses O(n).

**Fix Applied**: Added memoized `expensesByDate` Map for O(1) date lookup, reducing duplicate detection from O(n) to O(k) where k is expenses on the same date (typically 1-5).

---

## Enhancement Suggestions

### 9. [x] External File Change Detection
**Problem**: No UI feedback when data file changes externally (e.g., cloud sync).

**Fix Applied**:

- Created `useExternalFileChange` hook that listens for `electronAPI.onDataChanged` events
- Created `ExternalChangeBanner` component with Reload/Dismiss actions
- Integrated banner into ExpenseTracker with proper positioning
- Added i18n keys for English and Hebrew

---

### 10. [x] Add About/Info Screen
**Problem**: No way for users to see app version, data file path, etc.

**Fix Applied**:

- Added "About" section to SettingsPanel and SettingsCenterModal
- Shows app version, schema version, data file path, last modified date
- Added "Reveal in folder" button using `electronAPI.revealDataFile()`
- Added i18n keys for English and Hebrew

---

## Cleanup Candidates

### 11. [ ] Remove Large/Unnecessary Files
- [ ] `Expenses_backup_20260123_193648.tar.gz`
- [ ] `Expenses/node-v22.12.0-win-x64/**` (bundled Node runtime)

### 12. [ ] Remove Scratch/Duplicate Files
- [ ] Root `patch_tmp.py`
- [ ] `tmp_inspect.py`, `tmp_fix*.py`, `temp_he_fix.py`, `tmp_he.txt`
- [ ] `Expenses/garbage/*`
- [ ] Root `animeHelpers.ts` (duplicate of src version)

---

## Progress Log

| Date | Item | Status | Notes |
|------|------|--------|-------|
| 2026-02-02 | Plan created | Done | Initial tracking document |
| 2026-02-02 | i18n fixes | Done | Added missing keys: toasts.showingThisMonth/LastMonth, appliedFilter, foundLargeExpenses, noLargeExpensesThisMonth, errors.storageFailed, buttons.deleting/selectFolder. Fixed key mismatch: settlementSamePerson → settlementSamePartner |
| 2026-02-02 | Encoding check | Verified OK | Files defaults.ts and categoryIcons.ts have correct UTF-8 emoji characters |
| 2026-02-02 | Balance View scope | Fixed | Settlements now filtered by selectedMonth/Year in ViewRouter.tsx |
| 2026-02-02 | Anime.js import | False positive | animejs v4 exports `animate` and `remove` as named exports - import is correct |
| 2026-02-02 | Cloud detection | Fixed | SaveStatusIndicator now uses getDataFilePath() for full path detection |
| 2026-02-02 | Optimization #6 | Done | Consolidated calculations: calculateBalance accepts precomputed totals, getChartData O(62n)→O(n), calculateCategoryTotals single pass, new useTotalsAndBalance hook |
| 2026-02-02 | Optimization #7 | Acceptable | Pagination (50 items/page) already limits Date parsing impact; virtualization unnecessary |
| 2026-02-02 | Optimization #8 | Done | Duplicate detection uses memoized expensesByDate Map for O(1) date lookup |
| 2026-02-03 | Enhancement #9 | Done | External file change detection: useExternalFileChange hook + ExternalChangeBanner component |
| 2026-02-03 | Enhancement #10 | Done | About section in Settings: app version, schema version, data file path, reveal in folder |
| | | | |

---

## Notes

- Start with i18n fixes (quick wins, visible impact)
- Then encoding issues
- Then Balance View scope bug (data correctness)
- Optimizations can be done later as they're not breaking functionality
