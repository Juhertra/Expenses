# ExpenseTracker Refactoring Plan

## Current State
**File**: `src/components/ExpenseTracker/ExpenseTracker.tsx`
**Size**: 4,260 lines, 183 KB
**Issues**:
- God component with too many responsibilities
- 40+ state variables
- Difficult to test individual features
- Hard to maintain and understand
- High risk of merge conflicts

## Refactoring Goals
1. **Modularity**: Break into smaller, focused components
2. **Testability**: Enable unit testing of individual pieces
3. **Maintainability**: Easier to understand and modify
4. **Performance**: Selective re-renders with proper memoization
5. **Developer Experience**: Faster navigation and comprehension

## Architectural Strategy

### Phase 1: Extract State Management (High Impact)
**Goal**: Move state into custom hooks and context providers

#### 1.1 Create Context Providers
**Location**: `src/contexts/`

```typescript
// DataContext.tsx - Core data state
- expenses, setExpenses
- recurring, setRecurring
- settlements, setSettlements
- partnerNames, setPartnerNames
- householdSettings, setHouseholdSettings
- saveDirectory, setSaveDirectory
- dirty, setDirty
- lastExportDate, setLastExportDate

// UIContext.tsx - UI state
- currentView, setCurrentView
- selectedMonth, setSelectedMonth
- selectedYear, setSelectedYear
- searchQuery, setSearchQuery
- selectedCategory, setSelectedCategory
- toast, setToast

// ModalContext.tsx - Modal state
- showAddModal, setShowAddModal
- showSettingsModal, setShowSettingsModal
- showCommandPalette, setShowCommandPalette
- showCategoryModal, setShowCategoryModal
- showSettlementModal, setShowSettlementModal
```

#### 1.2 Create Custom Hooks
**Location**: `src/hooks/`

```typescript
// useExpenseForm.ts - Form state and validation
- formData, setFormData
- editingId, setEditingId
- savingTransaction, setSavingTransaction
- Form validation logic
- Add/edit/delete expense functions

// useDataPersistence.ts - Save/load/export/import
- exportData()
- importData()
- saveData()
- Auto-save logic

// useRecurringTransactions.ts - Recurring logic
- processRecurring()
- Add/edit/delete recurring items

// useCategoryManagement.ts - Category CRUD
- Category state
- Add/edit/delete categories
- Category validation

// useSettlements.ts - Settlement logic
- Settlement state
- Record/delete settlements
- Settlement calculations

// useCommandPalette.ts - Command palette
- Command filtering
- Keyboard shortcuts
- Command execution
```

**Benefits**:
- Each hook is independently testable
- State logic reusable across components
- Reduced complexity in main component

### Phase 2: Extract View Components (Medium Impact)
**Goal**: Split UI rendering into separate components

#### 2.1 Create View Components
**Location**: `src/components/ExpenseTracker/views/`

```typescript
// DashboardView.tsx (~400 lines)
- Overview stats
- Charts
- Quick actions
- Frequent expenses

// TransactionsView.tsx (~500 lines)
- Transaction list
- Filters
- Inline editing
- Bulk operations

// CategoriesView.tsx (~400 lines)
- Category list
- Category breakdown
- Drag-and-drop categorization

// BalanceView.tsx (~400 lines)
- Balance calculations
- Settlement tracking
- Payment breakdown
```

#### 2.2 Extract Shared Components
**Location**: `src/components/ExpenseTracker/components/`

```typescript
// TransactionForm.tsx (~200 lines)
- Add/edit expense modal
- Form validation
- Duplicate detection

// CategoryForm.tsx (~150 lines)
- Add/edit category modal
- Emoji picker
- Category validation

// SettlementForm.tsx (~100 lines)
- Record settlement modal
- Settlement validation

// QuickAddButtons.tsx (~80 lines)
- FAB buttons
- Quick income/expense

// StatusBar.tsx (~80 lines)
- Auto-save status
- Action buttons

// CommandPalette.tsx (~200 lines)
- Command search
- Keyboard shortcuts dialog
```

**Benefits**:
- Each view is independently testable
- Easier to optimize specific views
- Better code organization
- Parallel development possible

### Phase 3: Consolidate Business Logic (Low Effort, High Value)
**Goal**: Move pure functions to service layer

#### 3.1 Extract Calculation Functions
**Location**: `src/services/calculations/`

✅ **Already exists**: `src/lib/calculations.ts`
- `calculateTotals()`
- `calculateBalance()`
- `calculateCategoryTotals()`
- `calculateInsights()`
- `getFrequentExpenses()`

#### 3.2 Extract Data Operations
**Location**: `src/services/`

✅ **Already exists**:
- `src/services/storage/` - persistence
- `src/services/importExport.ts` - export/import
- `src/services/recurring/` - recurring logic
- `src/services/platform.ts` - platform utilities

✅ **Already refactored** (this session):
- Consolidated recurring logic
- Consolidated export/import logic

#### 3.3 Extract Validation Functions
**Location**: `src/lib/validators.ts`

✅ **Already exists**:
- `validateExpenseForm()`
- `validateImportData()`
- `validateSettlement()`

**Benefits**:
- Pure functions are easy to test
- Can be reused across the app
- Better separation of concerns

### Phase 4: Optimize Rendering (Performance)
**Goal**: Prevent unnecessary re-renders

#### 4.1 Memoization Strategy
```typescript
// Memoize expensive computations
const filteredExpenses = useMemo(() => {
  return expenses.filter(/* ... */);
}, [expenses, filters]);

// Memoize callbacks passed to children
const handleExpenseAdd = useCallback((expense: Expense) => {
  // ...
}, [dependencies]);

// Memoize child components
const MemoizedTransactionRow = memo(TransactionRow);
```

#### 4.2 Virtual Scrolling
For long transaction lists (100+ items):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
// Render only visible rows
```

## Implementation Plan

### Sprint 1: Foundation (Week 1)
**Goal**: Set up context and basic hooks
- [ ] Create DataContext
- [ ] Create UIContext
- [ ] Create ModalContext
- [ ] Create useExpenseForm hook
- [ ] Update ExpenseTracker to use contexts

**Success Criteria**: ExpenseTracker still works, tests pass

### Sprint 2: Extract Views (Week 2)
**Goal**: Create view components
- [ ] Extract DashboardView
- [ ] Extract TransactionsView
- [ ] Update ExpenseTracker routing
- [ ] Test view rendering

**Success Criteria**: Dashboard and Transactions work independently

### Sprint 3: Complete Views (Week 3)
**Goal**: Finish extracting all views
- [ ] Extract CategoriesView
- [ ] Extract BalanceView
- [ ] Create CommandPalette component
- [ ] Test all views

**Success Criteria**: All views work, ExpenseTracker < 1000 lines

### Sprint 4: Extract Forms (Week 4)
**Goal**: Move forms to separate components
- [ ] Extract TransactionForm
- [ ] Extract CategoryForm
- [ ] Extract SettlementForm
- [ ] Test forms independently

**Success Criteria**: Forms work in isolation

### Sprint 5: Polish & Optimize (Week 5)
**Goal**: Performance and testing
- [ ] Add memoization
- [ ] Add virtual scrolling for transactions
- [ ] Write integration tests
- [ ] Update documentation

**Success Criteria**: No performance regressions, 80%+ test coverage

## File Structure After Refactoring

```
src/
├── components/
│   └── ExpenseTracker/
│       ├── ExpenseTracker.tsx           # Main router (~200 lines)
│       ├── views/
│       │   ├── DashboardView.tsx
│       │   ├── TransactionsView.tsx
│       │   ├── CategoriesView.tsx
│       │   └── BalanceView.tsx
│       ├── components/
│       │   ├── TransactionForm.tsx
│       │   ├── CategoryForm.tsx
│       │   ├── SettlementForm.tsx
│       │   ├── QuickAddButtons.tsx
│       │   ├── StatusBar.tsx
│       │   └── CommandPalette.tsx
│       └── modals/
│           └── SettingsCenterModal.tsx  # Already exists
├── contexts/
│   ├── DataContext.tsx
│   ├── UIContext.tsx
│   └── ModalContext.tsx
├── hooks/
│   ├── useExpenseForm.ts
│   ├── useDataPersistence.ts
│   ├── useRecurringTransactions.ts
│   ├── useCategoryManagement.ts
│   ├── useSettlements.ts
│   ├── useCommandPalette.ts
│   ├── useBalance.ts                     # Already exists
│   ├── useCategoryTotals.ts              # Already exists
│   ├── useFilteredExpenses.ts            # Already exists
│   └── useTotals.ts                      # Already exists
├── services/
│   ├── storage/
│   ├── recurring/
│   ├── importExport.ts                   # Refactored
│   └── platform.ts
└── lib/
    ├── calculations.ts
    ├── validators.ts
    ├── normalization.ts
    └── types.ts
```

## Migration Strategy

### Approach: Gradual Refactoring (Strangler Fig Pattern)
1. **Don't rewrite from scratch** - too risky
2. **Extract piece by piece** - keep app working at all times
3. **Test after each extraction** - catch regressions early
4. **Remove old code incrementally** - prevent duplication

### Principles
- ✅ Each PR is self-contained and testable
- ✅ No "big bang" rewrites
- ✅ Feature development can continue in parallel
- ✅ Rollback is easy if something breaks

## Risk Mitigation

### High-Risk Areas
1. **State synchronization** - contexts must stay in sync
2. **Event handlers** - callbacks must have correct dependencies
3. **Form validation** - must work identically
4. **Auto-save logic** - critical for data integrity

### Testing Strategy
1. **Unit tests** for hooks and services
2. **Integration tests** for contexts
3. **E2E tests** for critical user flows:
   - Add expense → auto-save → reload → verify data
   - Import/export data
   - Record settlement
   - Recurring transaction processing

## Success Metrics

### Code Metrics
- Main component: < 500 lines (currently 4,260)
- Average component: < 300 lines
- Cyclomatic complexity: < 10 per function
- Test coverage: > 80%

### Developer Experience
- New developer can understand codebase in < 1 day
- Can add new view in < 2 hours
- Can add new feature without touching ExpenseTracker.tsx

### Performance
- Time to interactive: < 2 seconds
- Transaction list render: < 100ms (1000 items)
- No jank during interactions

## Priority

**🔴 High Priority**: Phase 1 (State Management)
- Biggest impact on maintainability
- Enables parallel development
- Foundation for other phases

**🟡 Medium Priority**: Phase 2 (View Components)
- Improves organization
- Makes testing easier
- Can be done incrementally

**🟢 Low Priority**: Phase 4 (Performance)
- Only needed if performance issues arise
- Can wait until after refactoring

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create GitHub issues** for each sprint
3. **Set up test infrastructure** (fix vitest config)
4. **Start Sprint 1** - create contexts
5. **Regular code reviews** during migration

---

**Note**: This is a living document. Update as you learn more during refactoring.
