---
name: Household Expense Insights & Vault Mode
overview: Implement household settings (currency, split modes, budgets), insights widget, month-over-month comparisons, data hygiene, and "Vault mode" persistence model with dirty tracking - all in ExpenseTracker.tsx with minimal UI changes.
todos:
  - id: foundation
    content: Add types, state (householdSettings, dirty), guarded loadData
    status: pending
  - id: settings-ui
    content: "Settings modal: currency, split mode, ratio, budgets UI"
    status: pending
  - id: vault-mode
    content: Dirty tracking, unsaved indicator, enhanced export/import
    status: pending
  - id: insights
    content: Insights widget with largest/avg/top/days calculations
    status: pending
  - id: mom-delta
    content: Month-over-month category comparison section
    status: pending
  - id: budgets
    content: Budget progress bars on category cards
    status: pending
  - id: split-mode
    content: Update settlement calculations to use splitMode setting
    status: pending
  - id: data-hygiene
    content: Normalization + duplicate detection in add/update
    status: pending
  - id: currency-display
    content: Replace $ with currencySymbol throughout UI
    status: pending
  - id: testing
    content: "Sanity check all features: settings, export, budgets, split, duplicates"
    status: pending
---

# Household Expense Insights & Vault Mode

## Overview

Enhance the expense tracker with:

- **Vault Mode**: Export/Import as source of truth, localStorage as cache
- **Household Settings**: Currency, split modes, budgets, normalization rules
- **Insights**: Dashboard widget, month-over-month comparisons
- **Data Hygiene**: Normalization + duplicate detection

**Constraints**: NO backend/IndexedDB, localStorage = cache only, minimal UI, TypeScript strict. **No backward compatibility needed** - fresh start allowed.

## A. Household Settings Storage

### New Storage Key: `household-settings`

**Default Structure**:

```typescript
{
  currencyCode: "ILS",
  currencySymbol: "₪",
  splitMode: "equal" | "proportional",
  partner1Ratio: 0.5,
  budgets: { [category: string]: number },
  normalizationRules: { [key: string]: string }
}
```

### Type Definition

```typescript
type SplitMode = 'equal' | 'proportional';

interface HouseholdSettings {
  currencyCode: string;
  currencySymbol: string;
  splitMode: SplitMode;
  partner1Ratio: number;
  budgets: { [category: string]: number };
  normalizationRules: { [key: string]: string };
}
```

### State Management

- Add `householdSettings` state
- Add `tempHouseholdSettings` for modal editing
- Add `savingSettings` loading flag
- Load with guarded `JSON.parse` (per-key try/catch, fallback to defaults)
- Save updates `dirty` flag

### Settings Modal UI Additions

1. **Currency Selector**: ILS (₪), USD ($), EUR (€)
2. **Split Mode**: Radio buttons for equal/proportional
3. **Partner Ratio**: Input field (0.0-1.0) shown only if proportional, with validation
4. **Budgets Section**: Per-category budget inputs
5. **Normalization Rules**: Key-value pairs (optional, can be basic textarea JSON)

## B. Vault Mode Implementation

### Dirty State Tracking

**Add State**:

```typescript
const [dirty, setDirty] = useState(false);
const [lastExportDate, setLastExportDate] = useState<string | null>(null);
```

**Set `dirty = true` when**:

- Add/edit/delete expense
- Add/edit/delete recurring transaction
- Update partner names
- Update household settings
- Update budgets
- Update normalization rules

**Clear `dirty = false` when**:

- Export completes successfully
- Import completes successfully

### Unsaved Changes Indicator

Add small badge/banner in header:

```tsx
{dirty && (
  <div className="text-yellow-400 text-sm flex items-center gap-1">
    <span>⚠️</span>
    <span>Unsaved changes (Export to persist)</span>
  </div>
)}
```

### Enhanced Export

**Update `exportData()`**:

1. Fetch all 4 keys: expenses, recurring, partner-names, **settings**
2. Include in `exportObject.data`:

- `expenses` (parsed)
- `recurring` (parsed)
- `partnerNames` (parsed)
- **`householdSettings` (parsed)**

3. Include in `exportObject.raw`:

- `household-expenses` (string)
- `household-recurring` (string)
- `household-partner-names` (string)
- **`household-settings` (string)**

4. Clear `dirty = false`
5. Set `lastExportDate = new Date().toISOString()`

### Enhanced Import

**Update `importData()`**:

1. Validate schema includes all required keys
2. Validate `householdSettings` structure
3. Prefer `raw` if present and parseable for all 4 keys
4. Fallback to `data` if raw invalid
5. Write all 4 keys to storage
6. Set `dirty = false`
7. Reload: `window.location.reload()`

## C. Insights Widget (Dashboard)

### Add new card on Dashboard below stats cards:

**Calculations** (for selected month):

```typescript
const insights = useMemo(() => {
  const monthExpenses = filteredExpenses.filter(e => e.type === 'expense');
  
  // Largest expense
  const largest = monthExpenses.reduce((max, e) => 
    e.amount > max.amount ? e : max, 
    { amount: 0, description: 'None' }
  );
  
  // Days with spending
  const daysWithSpending = new Set(
    monthExpenses.map(e => new Date(e.date).getDate())
  ).size;
  
  // Average daily spend
  const avgDaily = daysWithSpending > 0 
    ? totalExpense / daysWithSpending 
    : 0;
  
  // Top category
  const categoryTotals: { [k: string]: number } = {};
  monthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
  
  return { largest, avgDaily, topCategory, daysWithSpending };
}, [filteredExpenses, totalExpense]);
```

**UI Card**:

```tsx
<div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
  <h3 className="text-lg font-bold mb-4">💡 Insights</h3>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <div className="text-slate-400 text-sm">Largest Expense</div>
      <div className="font-bold">{insights.largest.description}</div>
      <div className="text-red-400">{currencySymbol}{insights.largest.amount.toFixed(2)}</div>
    </div>
    <div>
      <div className="text-slate-400 text-sm">Avg Daily Spend</div>
      <div className="text-2xl font-bold">{currencySymbol}{insights.avgDaily.toFixed(2)}</div>
    </div>
    <div>
      <div className="text-slate-400 text-sm">Top Category</div>
      <div className="font-bold">{insights.topCategory}</div>
    </div>
    <div>
      <div className="text-slate-400 text-sm">Days with Spending</div>
      <div className="text-2xl font-bold">{insights.daysWithSpending}</div>
    </div>
  </div>
</div>
```

## D. Month-over-Month Category Delta

### Calculation Function

```typescript
const getCategoryDelta = () => {
  // Current month totals
  const currentCats: { [k: string]: number } = {};
  filteredExpenses.filter(e => e.type === 'expense').forEach(e => {
    currentCats[e.category] = (currentCats[e.category] || 0) + e.amount;
  });
  
  // Previous month
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return e.type === 'expense' && 
           d.getMonth() === prevMonth && 
           d.getFullYear() === prevYear;
  });
  
  const prevCats: { [k: string]: number } = {};
  prevExpenses.forEach(e => {
    prevCats[e.category] = (prevCats[e.category] || 0) + e.amount;
  });
  
  // Delta
  const allCats = new Set([...Object.keys(currentCats), ...Object.keys(prevCats)]);
  return Array.from(allCats).map(cat => ({
    category: cat,
    current: currentCats[cat] || 0,
    previous: prevCats[cat] || 0,
    delta: (currentCats[cat] || 0) - (prevCats[cat] || 0)
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};
```

### UI Section (add to Dashboard after Categories)

```tsx
<div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
  <h3 className="text-lg font-bold mb-4">📊 Month-over-Month</h3>
  {getCategoryDelta().map(({ category, delta }) => (
    <div key={category} className="flex justify-between items-center mb-2">
      <span>{category}</span>
      <span className={delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : ''}>
        {delta > 0 ? '+' : ''}{currencySymbol}{delta.toFixed(2)}
      </span>
    </div>
  ))}
</div>
```

## E. Category Budgets

### UI in Categories View

**For each category card, add budget UI**:

```tsx
{householdSettings.budgets[categoryName] && (
  <div className="mt-2">
    <div className="flex justify-between text-xs text-slate-400 mb-1">
      <span>Budget</span>
      <span>{currencySymbol}{householdSettings.budgets[categoryName]}</span>
    </div>
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all ${
          spent > householdSettings.budgets[categoryName] 
            ? 'bg-red-500' 
            : 'bg-green-500'
        }`}
        style={{ 
          width: `${Math.min(
            (spent / householdSettings.budgets[categoryName]) * 100, 
            100
          )}%` 
        }}
      />
    </div>
    <div className="text-xs text-right mt-1">
      {((spent / householdSettings.budgets[categoryName]) * 100).toFixed(0)}%
    </div>
  </div>
)}
```

**Budget editing in Settings modal**:

```tsx
<div className="mb-4">
  <h4 className="font-bold mb-2">Category Budgets</h4>
  {categories.map(cat => (
    <div key={cat} className="flex items-center gap-2 mb-2">
      <span className="w-32">{cat}</span>
      <input
        type="number"
        min="0"
        step="100"
        value={tempHouseholdSettings.budgets[cat] || ''}
        onChange={e => {
          setTempHouseholdSettings({
            ...tempHouseholdSettings,
            budgets: {
              ...tempHouseholdSettings.budgets,
              [cat]: parseFloat(e.target.value) || 0
            }
          });
        }}
        className="bg-slate-700 px-2 py-1 rounded"
      />
    </div>
  ))}
</div>
```

## F. Split Mode in Settlement

### Update Balance Calculation

**In balance calculation logic**:

```typescript
// Before (equal split)
const halfExpense = expense.amount / 2;

// After (respect splitMode)
const splitRatio = householdSettings.splitMode === 'equal' 
  ? 0.5 
  : Math.max(0.05, Math.min(0.95, householdSettings.partner1Ratio));

const partner1Share = expense.amount * splitRatio;
const partner2Share = expense.amount * (1 - splitRatio);
```

**Apply to all joint expense calculations**:

- Balance settlement view
- Balance calculation card
- Payment breakdown

## G. Data Hygiene

### 1. Normalization Function

```typescript
const normalizeDescription = (desc: string): string => {
  // Trim and collapse whitespace
  let normalized = desc.trim().replace(/\s+/g, ' ');
  
  // Apply normalization rules (case-insensitive match)
  Object.entries(householdSettings.normalizationRules).forEach(([key, value]) => {
    const regex = new RegExp(key, 'gi');
    normalized = normalized.replace(regex, value);
  });
  
  return normalized;
};
```

**Apply in `addExpense` and `updateExpense`**:

```typescript
const normalizedDesc = normalizeDescription(formData.description);
// Save normalizedDesc instead of raw description
```

### 2. Duplicate Detection

```typescript
const checkDuplicate = (
  date: string, 
  amount: number, 
  normalizedDesc: string, 
  excludeId?: number
): Expense | null => {
  return expenses.find(e => 
    e.date === date && 
    Math.abs(e.amount - amount) < 0.01 && 
    normalizeDescription(e.description) === normalizedDesc &&
    e.id !== excludeId
  ) || null;
};
```

**In `addExpense`**:

```typescript
const duplicate = checkDuplicate(formData.date, formData.amount, normalizedDesc);
if (duplicate) {
  if (!confirm(`Possible duplicate found: "${duplicate.description}" on ${duplicate.date}. Save anyway?`)) {
    return; // Abort
  }
}
```

**In `updateExpense`** (exclude current ID):

```typescript
const duplicate = checkDuplicate(
  formData.date, 
  formData.amount, 
  normalizedDesc, 
  editingExpense.id
);
```

## Implementation Checklist

### Phase 1: Foundation

- [ ] Add `HouseholdSettings` type
- [ ] Add state: `householdSettings`, `tempHouseholdSettings`, `dirty`, `lastExportDate`
- [ ] Implement `loadData()` with guarded parse for household-settings
- [ ] Implement `saveSettings()` function
- [ ] Add dirty tracking to all data mutations

### Phase 2: Settings UI

- [ ] Add currency selector in Settings modal
- [ ] Add split mode selector in Settings modal
- [ ] Add partner ratio input (conditional on proportional mode)
- [ ] Add budget inputs per category
- [ ] Add unsaved changes indicator in header

### Phase 3: Export/Import

- [ ] Update `exportData()` to include household-settings
- [ ] Update `importData()` to validate and restore household-settings
- [ ] Clear dirty flag on export/import

### Phase 4: Insights

- [ ] Implement insights calculations
- [ ] Add Insights widget card on Dashboard
- [ ] Use `currencySymbol` in display

### Phase 5: Month-over-Month

- [ ] Implement category delta calculation
- [ ] Add MoM comparison section on Dashboard

### Phase 6: Budgets

- [ ] Add budget progress bars to category cards
- [ ] Color code: green/red based on budget status

### Phase 7: Split Mode

- [ ] Update settlement calculations to use splitMode
- [ ] Apply to balance card, settlement view, payment breakdown

### Phase 8: Data Hygiene

- [ ] Implement `normalizeDescription()`
- [ ] Implement `checkDuplicate()`
- [ ] Apply normalization in add/update expense
- [ ] Add duplicate detection with confirm prompt

### Phase 9: Currency Display

- [ ] Replace hardcoded "$" with `currencySymbol` throughout
- [ ] Dashboard cards, transaction lists, insights, etc.

### Phase 10: Testing

- [ ] Verify settings save/load
- [ ] Verify export includes all 4 keys
- [ ] Verify import restores all state
- [ ] Verify budgets render and persist
- [ ] Verify split mode affects settlement
- [ ] Verify duplicate detection triggers
- [ ] Verify insights show correct values
- [ ] **Clear localStorage and test fresh start** (no backward compat needed)

## File Changes

**Primary**: [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)

- Add ~500-800 lines (types, state, functions, UI sections)
- All changes localized to this file

**No other files modified** (unless type definitions become too large, then extract to `src/lib/types.ts`)

## Notes

- **No backward compatibility needed** - can start fresh with clean data model
- Keep all changes minimal and focused
- Maintain existing UI patterns
- Guard all JSON.parse operations
- Clamp partner1Ratio to [0.05, 0.95] to avoid division issues
- Use `useMemo` for expensive calculations (insights, MoM)
- Comment where dirty is set/cleared and split calculations changed
- Clear localStorage before implementation to start fresh