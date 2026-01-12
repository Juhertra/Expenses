---
name: Phase 2 Advanced Features
overview: "Implement all 12 Phase 2 features: Command Palette, Interactive Charts, Inline Editing, Templates, Bulk Operations, Pie Chart, Trends, Smart Filters, Drag & Drop, Breadcrumbs, Auto-suggestions, and Virtual Scrolling for a complete productivity transformation."
todos:
  - id: command-palette
    content: Command Palette (⌘K) - search & navigation
    status: completed
  - id: breadcrumbs
    content: Breadcrumb Navigation - context awareness
    status: completed
  - id: smart-filters
    content: Smart Filters & Quick Chips - filtering system
    status: completed
  - id: interactive-charts
    content: Interactive Chart Tooltips - hover feedback
    status: completed
  - id: pie-chart
    content: Category Pie Chart - visual breakdown
    status: completed
  - id: trends-chart
    content: Spending Trends Line Chart - 6-month view
    status: completed
  - id: inline-edit
    content: Inline Editing - quick edits in list
    status: completed
  - id: templates
    content: Recent Templates & Add Again - faster data entry
    status: completed
  - id: auto-suggest
    content: Auto-suggestions - smart autocomplete
    status: completed
  - id: bulk-ops
    content: Bulk Selection & Actions - multi-select
    status: completed
  - id: drag-drop
    content: Drag & Drop Categories - visual reorganization
    status: completed
  - id: virtual-scroll
    content: Virtual Scrolling - performance optimization
    status: completed
---

# Phase 2: Advanced Features & Productivity Boost

Implement 12 powerful features that transform the expense tracker into a productivity powerhouse with advanced search, visualization, and editing capabilities.

## Implementation Strategy

Features are grouped into 4 stages for logical dependency management:**Stage 1: Command & Search** (Features 1-3) - Foundation for power users**Stage 2: Visualization** (Features 4-6) - Enhanced data insights**Stage 3: Editing & Templates** (Features 7-9) - Faster data entry**Stage 4: Advanced Operations** (Features 10-12) - Bulk actions & performance---

## Stage 1: Command & Search (Foundation)

### 1. Command Palette (⌘K)

**File:** [`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx)Add state for command palette:

```tsx
const [showCommandPalette, setShowCommandPalette] = useState(false);
const [commandQuery, setCommandQuery] = useState('');
```

Update keyboard shortcuts to open palette with Cmd+K:

```tsx
// Modify existing Cmd+K handler
if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
  e.preventDefault();
  setShowCommandPalette(true); // NEW: open command palette instead of settings
}
```

Command palette component with fuzzy search:

```tsx
{showCommandPalette && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32 p-4 z-50">
    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl">
      {/* Search Input */}
      <div className="p-4 border-b border-slate-700">
        <input
          type="text"
          value={commandQuery}
          onChange={(e) => setCommandQuery(e.target.value)}
          placeholder="Search transactions, categories, or commands..."
          className="w-full bg-slate-700 border-0 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
      </div>
      
      {/* Results */}
      <div className="max-h-96 overflow-y-auto p-2">
        {filteredCommands.map((cmd, idx) => (
          <button
            key={idx}
            onClick={() => executeCommand(cmd)}
            className="w-full text-left p-3 hover:bg-slate-700 rounded-lg flex items-center gap-3"
          >
            <cmd.icon className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <div className="font-medium">{cmd.label}</div>
              <div className="text-xs text-slate-400">{cmd.description}</div>
            </div>
            {cmd.shortcut && (
              <kbd className="text-xs px-2 py-1 bg-slate-900 rounded">{cmd.shortcut}</kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

Command definitions and search logic:

```tsx
const commands = useMemo(() => [
  // Navigation
  { icon: BarChart3, label: 'Go to Dashboard', description: 'View overview', action: () => setCurrentView('dashboard'), keywords: ['home', 'overview'] },
  { icon: Activity, label: 'Go to Transactions', description: 'View all transactions', action: () => setCurrentView('transactions'), keywords: ['list', 'all'] },
  { icon: PieChart, label: 'Go to Categories', description: 'View by category', action: () => setCurrentView('categories'), keywords: ['breakdown'] },
  { icon: DollarSign, label: 'Go to Balance', description: 'View settlement', action: () => setCurrentView('balance'), keywords: ['settlement', 'owe'] },
  
  // Actions
  { icon: PlusCircle, label: 'Add Transaction', description: 'Create new entry', action: () => setShowAddModal(true), shortcut: 'Cmd+N' },
  { icon: TrendingDown, label: 'Add Expense', description: 'Quick expense', action: () => openQuickAdd('expense'), shortcut: 'E' },
  { icon: TrendingUp, label: 'Add Income', description: 'Quick income', action: () => openQuickAdd('income'), shortcut: 'I' },
  { icon: Settings, label: 'Open Settings', description: 'Configure app', action: () => setShowSettingsModal(true), shortcut: 'Cmd+,' },
  { icon: Save, label: 'Export Data', description: 'Save backup', action: () => exportData(), shortcut: 'Cmd+S' },
  
  // Search transactions
  ...filteredExpenses.slice(0, 5).map(exp => ({
    icon: categories[exp.category]?.icon || '📌',
    label: exp.description,
    description: `${formatCurrency(exp.amount)} on ${exp.date}`,
    action: () => { editExpense(exp); setShowCommandPalette(false); },
    keywords: [exp.category, exp.paidBy]
  }))
], [filteredExpenses, currentView]);

const filteredCommands = useMemo(() => {
  if (!commandQuery) return commands;
  const query = commandQuery.toLowerCase();
  return commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query) ||
    cmd.description?.toLowerCase().includes(query) ||
    cmd.keywords?.some(k => k.toLowerCase().includes(query))
  );
}, [commands, commandQuery]);
```



### 2. Breadcrumb Navigation

Add breadcrumb state tracking:

```tsx
const [navigationPath, setNavigationPath] = useState<Array<{label: string; action: () => void}>>([
  { label: 'Dashboard', action: () => setCurrentView('dashboard') }
]);
```

Breadcrumb component in header:

```tsx
{/* Breadcrumb Navigation - below main header */}
<div className="flex items-center gap-2 text-sm mb-4">
  {navigationPath.map((crumb, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && <span className="text-slate-500">/</span>}
      <button
        onClick={crumb.action}
        className={`hover:text-purple-400 transition-colors ${
          idx === navigationPath.length - 1 ? 'text-white font-medium' : 'text-slate-400'
        }`}
      >
        {crumb.label}
      </button>
    </React.Fragment>
  ))}
  
  {/* Show active filters as breadcrumb items */}
  {selectedCategory && (
    <>
      <span className="text-slate-500">/</span>
      <span className="text-purple-400 flex items-center gap-1">
        {categories[selectedCategory]?.icon} {selectedCategory}
      </span>
    </>
  )}
  {searchQuery && (
    <>
      <span className="text-slate-500">/</span>
      <span className="text-purple-400">Search: "{searchQuery}"</span>
    </>
  )}
</div>
```



### 3. Smart Filters & Views

Add filter presets state:

```tsx
const [filterPresets, setFilterPresets] = useState<Array<{
  name: string;
  filters: {
    categories?: string[];
    minAmount?: number;
    maxAmount?: number;
    dateRange?: { start: string; end: string };
    paidBy?: string[];
  };
}>>([]);
const [showFilterModal, setShowFilterModal] = useState(false);
```

Quick filter chips below search:

```tsx
{/* Quick Filter Chips */}
<div className="flex gap-2 mb-4 overflow-x-auto pb-2">
  <button
    onClick={() => applyQuickFilter('thisMonth')}
    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap"
  >
    This Month
  </button>
  <button
    onClick={() => applyQuickFilter('lastMonth')}
    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap"
  >
    Last Month
  </button>
  <button
    onClick={() => applyQuickFilter('large', { minAmount: 1000 })}
    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap"
  >
    Large Expenses (&gt; ₪1000)
  </button>
  {filterPresets.map(preset => (
    <button
      key={preset.name}
      onClick={() => applyFilterPreset(preset)}
      className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded-full text-xs whitespace-nowrap"
    >
      {preset.name}
    </button>
  ))}
  <button
    onClick={() => setShowFilterModal(true)}
    className="px-3 py-1 border border-slate-600 hover:border-slate-500 rounded-full text-xs whitespace-nowrap"
  >
    + Save Filter
  </button>
</div>
```

---

## Stage 2: Visualization Enhancements

### 4. Interactive Charts with Tooltips

Add chart tooltip state:

```tsx
const [chartTooltip, setChartTooltip] = useState<{
  day: number;
  income: number;
  expense: number;
  x: number;
  y: number;
} | null>(null);
```

Update chart bars with hover handlers:

```tsx
<div 
  key={data.day}
  className="flex-1 flex flex-col justify-end gap-0.5 relative"
  onMouseEnter={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setChartTooltip({
      day: data.day,
      income: data.income,
      expense: Math.abs(data.expense),
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }}
  onMouseLeave={() => setChartTooltip(null)}
  onClick={() => {
    // Click bar to filter to that day
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
    setSearchQuery(dateStr);
    setCurrentView('transactions');
    showToast(`Showing transactions for day ${data.day}`, 'success');
  }}
  style={{ cursor: 'pointer' }}
>
  {/* bars... */}
</div>

{/* Tooltip Portal */}
{chartTooltip && (
  <div
    className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl pointer-events-none"
    style={{
      left: `${chartTooltip.x}px`,
      top: `${chartTooltip.y - 10}px`,
      transform: 'translate(-50%, -100%)'
    }}
  >
    <div className="text-sm font-bold mb-1">Day {chartTooltip.day}</div>
    {chartTooltip.income > 0 && (
      <div className="text-xs text-green-400">Income: {formatCurrency(chartTooltip.income)}</div>
    )}
    {chartTooltip.expense > 0 && (
      <div className="text-xs text-red-400">Expense: {formatCurrency(chartTooltip.expense)}</div>
    )}
    <div className="text-xs text-slate-500 mt-1">Click to view transactions</div>
  </div>
)}
```



### 5. Category Pie Chart

Add to Categories view after the grid:

```tsx
{/* Pie Chart Visualization */}
<div className="mt-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
  <h3 className="text-lg font-bold mb-4">Category Distribution</h3>
  <div className="flex flex-col lg:flex-row gap-6 items-center">
    {/* SVG Pie Chart */}
    <svg viewBox="0 0 200 200" className="w-64 h-64">
      {sortedCategories.map(([category, amount], idx) => {
        const percentage = (amount / totalExpense) * 100;
        const angle = (percentage / 100) * 360;
        // Calculate pie slice path
        return (
          <g key={category}>
            <path
              d={createPieSlice(angle, previousAngles[idx])}
              fill={categories[category]?.color}
              className="hover:opacity-80 cursor-pointer transition-opacity"
              onClick={() => {
                setSelectedCategory(category);
                setCurrentView('transactions');
              }}
            />
            <text
              x={calculateLabelX(angle, previousAngles[idx])}
              y={calculateLabelY(angle, previousAngles[idx])}
              className="text-xs fill-white"
            >
              {percentage.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
    
    {/* Legend */}
    <div className="flex-1 space-y-2">
      {sortedCategories.map(([category, amount]) => (
        <div
          key={category}
          className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer"
          onClick={() => {
            setSelectedCategory(category);
            setCurrentView('transactions');
          }}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${categories[category]?.color}`} />
            <span className="text-sm">{categories[category]?.icon} {category}</span>
          </div>
          <span className="text-sm font-medium">{formatCurrency(amount)}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```



### 6. Spending Trends Chart

Add line chart to Dashboard after statistics:

```tsx
{/* Spending Trends - 6 month view */}
<div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
  <h3 className="text-lg font-bold mb-4">Spending Trends</h3>
  <div className="relative h-48">
    <svg viewBox="0 0 600 150" className="w-full h-full">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={i}
          x1="0"
          y1={i * 30}
          x2="600"
          y2={i * 30}
          stroke="#334155"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}
      
      {/* Trend line */}
      <polyline
        points={trendData.map((d, i) => `${i * 100},${150 - (d.amount / maxTrend) * 130}`).join(' ')}
        fill="none"
        stroke="#a855f7"
        strokeWidth="3"
        className="transition-all duration-500"
      />
      
      {/* Data points */}
      {trendData.map((d, i) => (
        <circle
          key={i}
          cx={i * 100}
          cy={150 - (d.amount / maxTrend) * 130}
          r="5"
          fill="#a855f7"
          className="hover:r-8 cursor-pointer transition-all"
          onClick={() => {
            setSelectedMonth(d.month);
            setSelectedYear(d.year);
            showToast(`Viewing ${months[d.month]} ${d.year}`, 'success');
          }}
        />
      ))}
    </svg>
  </div>
  
  {/* Month labels */}
  <div className="flex justify-between text-xs text-slate-500 mt-2">
    {trendData.map(d => (
      <span key={`${d.year}-${d.month}`}>{months[d.month].slice(0, 3)}</span>
    ))}
  </div>
  
  {/* Prediction badge */}
  {prediction && (
    <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700 rounded-lg text-sm">
      <span className="text-purple-400">Predicted next month: </span>
      <span className="font-bold">{formatCurrency(prediction)}</span>
      <span className="text-xs text-slate-400 ml-2">(based on 6-month average)</span>
    </div>
  )}
</div>
```

---

## Stage 3: Editing & Templates

### 7. Inline Editing

Add inline editing state:

```tsx
const [inlineEditId, setInlineEditId] = useState<number | null>(null);
const [inlineEditData, setInlineEditData] = useState<Partial<Expense>>({});
```

Update transaction list with inline edit mode:

```tsx
{filteredExpenses.map(exp => (
  <div key={exp.id} className="bg-slate-700/30 rounded-lg p-4">
    {inlineEditId === exp.id ? (
      // INLINE EDIT MODE
      <div className="grid grid-cols-4 gap-2">
        <input
          type="text"
          value={inlineEditData.description || exp.description}
          onChange={(e) => setInlineEditData({...inlineEditData, description: e.target.value})}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        />
        <input
          type="number"
          value={inlineEditData.amount || exp.amount}
          onChange={(e) => setInlineEditData({...inlineEditData, amount: parseFloat(e.target.value)})}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        />
        <select
          value={inlineEditData.category || exp.category}
          onChange={(e) => setInlineEditData({...inlineEditData, category: e.target.value})}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        >
          {Object.keys(categories).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => saveInlineEdit(exp.id)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setInlineEditId(null)}
            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : (
      // NORMAL VIEW MODE
      <div className="flex items-center justify-between group">
        {/* existing display... */}
        <button
          onClick={() => {
            setInlineEditId(exp.id);
            setInlineEditData({});
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Quick edit (double-click row)"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
))}
```



### 8. Recent/Frequent Templates

Enhance frequent transactions widget with "Add Again":

```tsx
{/* Add to each recent transaction */}
<button
  onClick={() => addAgain(exp)}
  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1"
  title="Add this transaction again"
>
  <Copy className="w-3 h-3" />
  Add Again
</button>
```

Add "Templates" section in dashboard:

```tsx
{/* Transaction Templates */}
<div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-bold">Quick Templates</h3>
    <button
      onClick={() => setShowTemplateManager(true)}
      className="text-sm text-purple-400 hover:text-purple-300"
    >
      Manage
    </button>
  </div>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {templates.map(template => (
      <button
        key={template.id}
        onClick={() => applyTemplate(template)}
        className="p-3 bg-slate-700/50 hover:bg-slate-600 rounded-lg text-left"
      >
        <div className="text-2xl mb-1">{categories[template.category]?.icon}</div>
        <div className="text-sm font-medium truncate">{template.name}</div>
        <div className="text-xs text-slate-400">{formatCurrency(template.amount)}</div>
      </button>
    ))}
  </div>
</div>
```



### 9. Auto-suggestions

Add autocomplete to description field:

```tsx
const [suggestions, setSuggestions] = useState<string[]>([]);

// In the add/edit modal description input
<div className="relative">
  <input
    type="text"
    value={formData.description}
    onChange={(e) => {
      setFormData({ ...formData, description: e.target.value });
      // Generate suggestions
      const query = e.target.value.toLowerCase();
      if (query.length >= 2) {
        const matches = [...new Set(expenses.map(e => e.description))]
          .filter(d => d.toLowerCase().includes(query))
          .slice(0, 5);
        setSuggestions(matches);
      } else {
        setSuggestions([]);
      }
    }}
    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
  />
  
  {/* Suggestion dropdown */}
  {suggestions.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-10 max-h-48 overflow-y-auto">
      {suggestions.map((suggestion, idx) => {
        const matchingExp = expenses.find(e => e.description === suggestion);
        return (
          <button
            key={idx}
            onClick={() => {
              setFormData({
                ...formData,
                description: suggestion,
                category: matchingExp?.category || formData.category,
                amount: matchingExp?.amount.toString() || formData.amount
              });
              setSuggestions([]);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-700 flex items-center justify-between"
          >
            <span>{suggestion}</span>
            {matchingExp && (
              <span className="text-xs text-slate-400">
                {categories[matchingExp.category]?.icon} {formatCurrency(matchingExp.amount)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  )}
</div>
```

---

## Stage 4: Advanced Operations

### 10. Bulk Operations

Add multi-select state:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const [bulkMode, setBulkMode] = useState(false);
```

Bulk selection UI in transactions view:

```tsx
{/* Bulk Actions Bar */}
{bulkMode && (
  <div className="sticky top-0 z-10 bg-purple-900 border border-purple-700 rounded-lg p-3 mb-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <button
        onClick={() => setSelectedIds(new Set())}
        className="text-xs text-purple-300 hover:text-white"
      >
        Clear
      </button>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => bulkCategorize()}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
      >
        Change Category
      </button>
      <button
        onClick={() => bulkDelete()}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
      >
        Delete Selected
      </button>
    </div>
  </div>
)}

{/* Add checkbox to each transaction */}
{bulkMode && (
  <input
    type="checkbox"
    checked={selectedIds.has(exp.id)}
    onChange={() => toggleSelection(exp.id)}
    className="w-4 h-4"
  />
)}
```



### 11. Drag & Drop

Install react-beautiful-dnd or use native HTML5 drag:

```tsx
// Add to transaction rows
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('transactionId', exp.id.toString());
  }}
  className="cursor-move"
>
  {/* transaction content */}
</div>

// Add drop zones in categories view
{Object.keys(categories).map(category => (
  <div
    key={category}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      const txId = parseInt(e.dataTransfer.getData('transactionId'));
      updateTransactionCategory(txId, category);
      showToast(`Moved to ${category}`, 'success');
    }}
    className="p-6 border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-xl transition-colors"
  >
    {/* category content */}
  </div>
))}
```



### 12. Virtual Scrolling

Install react-window for performance with large datasets:

```tsx
import { FixedSizeList } from 'react-window';

// Replace transaction list with virtual list
<FixedSizeList
  height={600}
  itemCount={filteredExpenses.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => {
    const exp = filteredExpenses[index];
    return (
      <div style={style} className="px-2">
        {/* transaction row content */}
      </div>
    );
  }}
</FixedSizeList>
```

---

## Additional Dependencies

Add to package.json:

```json
{
  "dependencies": {
    "react-window": "^1.8.10"
  }
}
```

Run: `npm install react-window`---

## Implementation Order (Todos)

1. Command Palette (⌘K) - search & navigation foundation
2. Breadcrumb Navigation - context awareness
3. Smart Filters & Quick Chips - filtering system
4. Interactive Chart Tooltips - hover feedback
5. Category Pie Chart - visual breakdown
6. Spending Trends Line Chart - 6-month view with prediction
7. Inline Editing - quick edits in list
8. Recent Templates & Add Again - faster data entry
9. Auto-suggestions - smart autocomplete
10. Bulk Selection & Actions - multi-select operations
11. Drag & Drop Categories - visual reorganization
12. Virtual Scrolling - performance optimization

---

## Testing Checklist

Command & Search:

- Command palette opens with Cmd+K
- Fuzzy search finds transactions and commands
- Executing commands works correctly
- Breadcrumbs show current context
- Quick filter chips apply filters correctly

Visualization:

- Chart bars show tooltips on hover
- Clicking bars filters to that day
- Pie chart renders correctly with animations
- Pie slices are clickable to filter
- Trends chart shows 6-month history
- Prediction displays for next month

Editing & Templates:

- Double-click enables inline edit
- Inline edits save correctly
- Add Again button creates duplicate
- Templates apply correctly
- Auto-suggestions appear and work

Advanced Operations:

- Bulk mode selects multiple transactions
- Bulk categorize works
- Bulk delete works
- Drag & drop changes categories
- Virtual scrolling performs well with 1000+ items

---

## Estimated Time