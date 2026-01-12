---
name: Phase 1 UX Transformation
overview: "Implement 10 high-impact UX improvements for desktop: FABs, Animations, Tooltips, Empty States, Keyboard Shortcuts, Auto-Save Indicator, plus Frequent Transactions widget, Click-to-filter categories, Click-to-edit transactions, and FAB bounce animation."
todos: []
---

# Phase 1:

Complete UX Transformation (Desktop)Transform the expense tracker with 10 high-impact features that dramatically improve desktop usability, discoverability, and productivity.

## Core Features (Original 6)

1. Floating Action Buttons - Quick add expense/income
2. Smart Animations - Smooth transitions for data changes
3. Tooltips Everywhere - Hover hints for all icon buttons
4. Smart Empty States - Helpful prompts when no data
5. Keyboard Shortcuts - Power user shortcuts + help panel
6. Auto-Save Indicator - Visual feedback on save status

## Bonus Features (Added 4)

7. Frequent Transactions - One-click repeat common expenses
8. Click-to-Filter Categories - Click category card to filter
9. Click Transaction to Edit - Quick edit from any transaction list
10. FAB Bounce Animation - Subtle attention-getter

---

## Implementation Details

### 1. Floating Action Buttons (Quick Add)

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)Add state to remember last-used categories:

```tsx
const [lastExpenseCategory, setLastExpenseCategory] = useState<string>('Housing');
const [lastIncomeCategory, setLastIncomeCategory] = useState<string>('Other');
```

Quick add helper function:

```tsx
const openQuickAdd = (type: 'expense' | 'income') => {
  setFormData({
    ...formData,
    type,
    date: new Date().toISOString().split('T')[0],
    category: type === 'expense' ? lastExpenseCategory : lastIncomeCategory
  });
  setShowAddModal(true);
};
```

Update `addExpense` to remember last category:

```tsx
// Inside addExpense, after successful save:
if (newExpense.type === 'expense') {
  setLastExpenseCategory(newExpense.category);
} else {
  setLastIncomeCategory(newExpense.category);
}
```

FAB component with bounce animation (feature #10):

```tsx
{/* Floating Action Buttons */}
<div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
  <button
    onClick={() => openQuickAdd('income')}
    className="w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-bounce-slow group"
    title="Quick Income (Shortcut: I)"
  >
    <TrendingUp className="w-6 h-6 text-white" />
    <span className="absolute right-full mr-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
      Quick Income (I)
    </span>
  </button>
  
  <button
    onClick={() => openQuickAdd('expense')}
    className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-bounce-slow group"
    title="Quick Expense (Shortcut: E)"
  >
    <TrendingDown className="w-6 h-6 text-white" />
    <span className="absolute right-full mr-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
      Quick Expense (E)
    </span>
  </button>
</div>
```

Add bounce animation CSS to `tailwind.config.cjs`:

```js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(-100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite'
      }
    }
  }
}
```

---

### 2. Smart Animations & Transitions

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)

#### A) Number Change Animations

```tsx
// Balance card
<div className="text-3xl font-bold mb-1 transition-all duration-500">
  {formatCurrency(balance)}
</div>

// Expense/Income cards
<div className="text-3xl font-bold text-red-400 mb-1 transition-all duration-500">
  -{formatCurrency(totalExpense)}
</div>
```



#### B) Chart Bar Stagger Animation

```tsx
{chartData.map((data, idx) => {
  // ... existing logic ...
  
  return (
    <div key={data.day} className="flex-1 flex flex-col justify-end gap-0.5">
      {data.income > 0 && (
        <div 
          className="w-full bg-green-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
          style={{ 
            height: `${incomeHeight}%`,
            transitionDelay: `${idx * 30}ms`
          }}
        />
      )}
      {data.expense < 0 && (
        <div 
          className="w-full bg-red-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
          style={{ 
            height: `${expenseHeight}%`,
            transitionDelay: `${idx * 30}ms`
          }}
        />
      )}
    </div>
  );
})}
```



#### C) Card Hover Effects

```tsx
<div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-800/70 hover:border-slate-600 hover:shadow-lg">
```



#### D) Toast Notifications

Add toast state:

```tsx
const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};
```

Toast UI:

```tsx
{toast && (
  <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in flex items-center gap-3 ${
    toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  }`}>
    {toast.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
    <span className="font-medium">{toast.message}</span>
  </div>
)}
```

Replace all `alert()` calls with `showToast()`.---

### 3. Tooltips Everywhere

Add `title` attributes to all icon buttons:

```tsx
{/* Header buttons */}
<button title="Save changes (Cmd+S / Ctrl+S)">
  <Save className="w-5 h-5" />
</button>

<button title="Settings - Currency, Split Mode, Export/Import (Cmd+K)">
  <Settings className="w-5 h-5" />
</button>

{/* Transaction actions */}
<button title="Edit this transaction">
  <Edit2 className="w-4 h-4" />
</button>

<button title="Delete this transaction">
  <Trash2 className="w-4 h-4" />
</button>
```

Add informational help icons with `HelpCircle`:

```tsx
<div className="flex items-center gap-2">
  <label>Split Mode</label>
  <button
    type="button"
    className="text-slate-500 hover:text-slate-300"
    title="Equal: 50/50 split. Proportional: Custom ratio."
  >
    <HelpCircle className="w-3.5 h-3.5" />
  </button>
</div>
```

---

### 4. Smart Empty States

#### Dashboard - No Transactions

```tsx
{currentView === 'dashboard' && filteredExpenses.length === 0 && (
  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-12 text-center">
    <div className="text-7xl mb-6">💰</div>
    <h3 className="text-3xl font-bold mb-3">Welcome to Your Expense Tracker!</h3>
    <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
      Start tracking your household expenses to get insights on spending patterns.
    </p>
    <div className="flex gap-4 justify-center">
      <button onClick={() => openQuickAdd('expense')} className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-3">
        <TrendingDown className="w-6 h-6" />
        Add First Expense
      </button>
      <button onClick={() => openQuickAdd('income')} className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-3">
        <TrendingUp className="w-6 h-6" />
        Add Income
      </button>
    </div>
    <p className="text-slate-500 text-sm mt-6">
      Or press <kbd className="px-2 py-1 bg-slate-700 rounded">E</kbd> for expense 
      or <kbd className="px-2 py-1 bg-slate-700 rounded">I</kbd> for income
    </p>
  </div>
)}
```



#### Transactions - No Results

```tsx
{currentView === 'transactions' && filteredExpenses.length === 0 && expenses.length > 0 && (
  <div className="text-center py-16">
    <div className="text-6xl mb-4">🔍</div>
    <h4 className="text-xl font-semibold mb-2">No transactions found</h4>
    <p className="text-slate-400 mb-6">
      {searchQuery ? `No results for "${searchQuery}"` : 'No transactions in this month'}
    </p>
    <div className="flex gap-3 justify-center">
      {searchQuery && (
        <button onClick={() => setSearchQuery('')} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
          Clear search
        </button>
      )}
      <button onClick={() => setShowAddModal(true)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
        Add Transaction
      </button>
    </div>
  </div>
)}
```



#### Categories - No Expenses

```tsx
{currentView === 'categories' && totalExpense === 0 && (
  <div className="text-center py-16">
    <div className="text-6xl mb-4">📊</div>
    <h4 className="text-xl font-semibold mb-2">No expenses this month</h4>
    <p className="text-slate-400 mb-6">Add expenses to see category breakdown</p>
    <button onClick={() => openQuickAdd('expense')} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg inline-flex items-center gap-2">
      <TrendingDown className="w-5 h-5" />
      Add Expense
    </button>
  </div>
)}
```



#### Balance - All Settled

```tsx
{Math.abs(partner1Balance) < 0.01 && (
  <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
    <div className="text-5xl mb-3">✅</div>
    <h4 className="text-xl font-bold text-green-400 mb-2">Perfect Balance!</h4>
    <p className="text-slate-300">All expenses are evenly split. No settlements needed.</p>
  </div>
)}
```

---

### 5. Keyboard Shortcuts + Help Panel

Add state:

```tsx
const [showShortcuts, setShowShortcuts] = useState(false);
```

Keyboard listener:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (dirty && !exportingData) exportData();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      setShowAddModal(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowSettingsModal(true);
    }
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      openQuickAdd('expense');
    }
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      openQuickAdd('income');
    }
    if (e.key === 'Escape') {
      setShowAddModal(false);
      setShowSettingsModal(false);
      setShowSettlementModal(false);
      setShowShortcuts(false);
      setDeleteConfirm(null);
    }
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setShowShortcuts(true);
    }
    if (e.key >= '1' && e.key <= '4' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const views: Array<'dashboard' | 'transactions' | 'categories' | 'balance'> = 
        ['dashboard', 'transactions', 'categories', 'balance'];
      setCurrentView(views[parseInt(e.key) - 1]);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [dirty, exportingData]);
```

Shortcuts modal:

```tsx
{showShortcuts && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-slate-800 rounded-2xl p-8 max-w-3xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold mb-1">⌨️ Keyboard Shortcuts</h3>
          <p className="text-slate-400 text-sm">Boost your productivity</p>
        </div>
        <button onClick={() => setShowShortcuts(false)} className="p-2 hover:bg-slate-700 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Navigation */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Navigation</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { keys: ['1'], desc: 'Dashboard' },
              { keys: ['2'], desc: 'Transactions' },
              { keys: ['3'], desc: 'Categories' },
              { keys: ['4'], desc: 'Balance' }
            ].map((s, i) => (
              <div key={i} className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-300">{s.desc}</span>
                <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">{s.keys[0]}</kbd>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { keys: ['⌘', 'N'], desc: 'New transaction' },
              { keys: ['E'], desc: 'Quick expense' },
              { keys: ['I'], desc: 'Quick income' },
              { keys: ['⌘', 'S'], desc: 'Save/Export' },
              { keys: ['⌘', 'K'], desc: 'Settings' },
              { keys: ['Esc'], desc: 'Close modal' }
            ].map((s, i) => (
              <div key={i} className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-300">{s.desc}</span>
                <div className="flex gap-1">
                  {s.keys.map((k, j) => (
                    <kbd key={j} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Help */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Help</h4>
          <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
            <span className="text-sm text-slate-300">Show this panel</span>
            <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs font-mono">?</kbd>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          <kbd className="px-2 py-1 bg-slate-700 rounded">⌘</kbd> = Cmd on Mac, Ctrl on Win/Linux
        </p>
      </div>
    </div>
  </div>
)}
```

Add help button to header:

```tsx
<button onClick={() => setShowShortcuts(true)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg" title="Shortcuts (?)">
  <HelpCircle className="w-5 h-5" />
</button>
```

---

### 6. Auto-Save Indicator

Add to header:

```tsx
<div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
  {!dirty && (
    <>
      <Check className="w-3.5 h-3.5 text-green-400" />
      <span className="text-slate-300">All saved</span>
    </>
  )}
  {dirty && !exportingData && (
    <>
      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      <span className="text-slate-300">Unsaved changes</span>
    </>
  )}
  {exportingData && (
    <>
      <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-300">Saving...</span>
    </>
  )}
</div>
```

---

### 7. Frequent Transactions Widget (NEW)

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)Add useMemo to compute frequent expenses:

```tsx
const frequentExpenses = useMemo(() => {
  const counts: Record<string, number> = {};
  
  expenses.forEach(exp => {
    const key = `${exp.description}|${exp.category}|${exp.amount}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => {
      const [description, category, amount] = key.split('|');
      return { description, category, amount: parseFloat(amount) };
    });
}, [expenses]);
```

Add widget to Dashboard view (after summary cards):

```tsx
{currentView === 'dashboard' && frequentExpenses.length > 0 && (
  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
    <div className="flex items-center gap-2 mb-4">
      <Zap className="w-5 h-5 text-yellow-400" />
      <h3 className="text-lg font-bold">Quick Add (Frequent)</h3>
      <span className="text-xs text-slate-400">Your most common transactions</span>
    </div>
    <div className="flex gap-3 overflow-x-auto">
      {frequentExpenses.map((exp, idx) => (
        <button
          key={idx}
          onClick={() => {
            setFormData({
              ...formData,
              description: exp.description,
              category: exp.category,
              amount: exp.amount.toString(),
              type: 'expense',
              date: new Date().toISOString().split('T')[0]
            });
            setShowAddModal(true);
            showToast(`Pre-filled ${exp.description}`, 'success');
          }}
          className="flex-shrink-0 bg-slate-700/50 hover:bg-slate-600 px-4 py-3 rounded-xl transition-all hover:scale-105 border border-slate-600 hover:border-purple-500"
        >
          <div className="text-2xl mb-1">{categories[exp.category]?.icon}</div>
          <div className="text-sm font-medium truncate max-w-[120px]">{exp.description}</div>
          <div className="text-xs text-slate-400">{formatCurrency(exp.amount)}</div>
        </button>
      ))}
    </div>
  </div>
)}
```

Import `Zap` from lucide-react.---

### 8. Click-to-Filter Categories (NEW)

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)Add state:

```tsx
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

Update category cards in Dashboard to be clickable:

```tsx
{sortedCategories.slice(0, 4).map(([category, amount]) => (
  <button
    key={category}
    onClick={() => {
      setSelectedCategory(category);
      setCurrentView('transactions');
      showToast(`Filtering by ${category}`, 'success');
    }}
    className={`${categories[category]?.color} bg-opacity-20 rounded-xl p-4 border border-opacity-30 hover:border-opacity-100 transition-all hover:scale-105 cursor-pointer ${
      selectedCategory === category ? 'ring-2 ring-white' : ''
    }`}
    title={`Click to filter by ${category}`}
  >
    {/* ... existing category card content ... */}
  </button>
))}
```

Add clear filter button in Transactions view:

```tsx
{selectedCategory && (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-sm text-slate-400">Filtered by:</span>
    <button
      onClick={() => {
        setSelectedCategory(null);
        showToast('Filter cleared', 'success');
      }}
      className="px-3 py-1 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"
    >
      {categories[selectedCategory]?.icon} {selectedCategory}
      <X className="w-3 h-3" />
    </button>
  </div>
)}
```

Update `filteredExpenses` to respect `selectedCategory`:

```tsx
const filteredExpenses = expenses.filter(exp => {
  const expDate = new Date(exp.date);
  const matchesDate = expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
  if (!matchesDate) return false;
  
  // NEW: Category filter
  if (selectedCategory && exp.category !== selectedCategory) return false;
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    return exp.description.toLowerCase().includes(query) || 
           exp.category.toLowerCase().includes(query) ||
           exp.paidBy.toLowerCase().includes(query);
  }
  
  return true;
});
```

---

### 9. Click Transaction to Edit (NEW)

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)Make all transaction list items clickable:**In Dashboard recent transactions:**

```tsx
<div 
  key={exp.id} 
  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-all cursor-pointer"
  onClick={() => {
    setFormData({
      description: exp.description,
      amount: exp.amount.toString(),
      category: exp.category,
      type: exp.type,
      date: exp.date,
      paidBy: exp.paidBy,
      isRecurring: false,
      recurringDay: 1
    });
    setEditingId(exp.id);
    setShowAddModal(true);
  }}
  title="Click to edit"
>
  {/* ... existing transaction display ... */}
</div>
```

**In Transactions view:**Update transaction rows to be clickable (currently only delete button works):

```tsx
<div
  key={exp.id}
  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all cursor-pointer group"
  onClick={(e) => {
    // Don't trigger if clicking delete button
    if ((e.target as HTMLElement).closest('button[data-action="delete"]')) return;
    
    setFormData({
      description: exp.description,
      amount: exp.amount.toString(),
      category: exp.category,
      type: exp.type,
      date: exp.date,
      paidBy: exp.paidBy,
      isRecurring: false,
      recurringDay: 1
    });
    setEditingId(exp.id);
    setShowAddModal(true);
  }}
  title="Click to edit transaction"
>
  {/* ... existing content ... */}
  <button
    data-action="delete"
    onClick={(e) => {
      e.stopPropagation();
      confirmDeleteExpense(exp.id, exp.description);
    }}
    className="p-2 hover:bg-red-600 rounded-lg transition-all"
    title="Delete"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

Add visual hint (pencil icon on hover):

```tsx
{/* Add to transaction row */}
<Edit2 className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
```

---

### 10. FAB Bounce Animation (Already in #1)

See Feature #1 - the `animate-bounce-slow` class is already applied to FABs.---

## Additional Imports Needed

```tsx
import {
  // ... existing imports ...
  Check,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
```

---

## Testing Checklist

Core Features:

- [ ] FABs appear with bounce animation
- [ ] FAB tooltips work
- [ ] Quick add pre-selects last category
- [ ] Chart bars animate with stagger
- [ ] Toast notifications replace alerts
- [ ] All buttons have tooltips
- [ ] Empty states show correctly
- [ ] Keyboard shortcuts work
- [ ] Shortcuts help panel displays
- [ ] Save indicator updates

Bonus Features:

- [ ] Frequent transactions widget shows on dashboard (when data exists)
- [ ] Clicking frequent transaction pre-fills modal
- [ ] Clicking category card filters transactions
- [ ] Category filter shows in transactions view
- [ ] Clicking transaction opens edit modal
- [ ] Delete button still works in transaction lists
- [ ] Edit pencil icon appears on hover

---

## Estimated Time

Core (Original 6):

- FABs: 20 min
- Animations & Toasts: 40 min
- Tooltips: 30 min
- Empty States: 45 min
- Keyboard Shortcuts: 60 min