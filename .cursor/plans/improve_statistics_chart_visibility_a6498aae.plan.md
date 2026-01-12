---
name: Improve Statistics Chart Visibility
overview: Enhance the Statistics panel chart to always show bar structure, add minimum heights for non-zero values, and implement dynamic scaling for better visibility of sparse data.
todos: []
---

# Improve Statistics Chart Visibility

## Problem

The Statistics chart conditionally renders bars only when `data.income > 0` or `data.expense > 0`, so with sparse months (e.g., only day 1 has data), most days render nothing and the chart appears blank. Additionally, `maxAmount` is clamped to `>= 100`, making small amounts visually tiny.

## Solution: Always-Render Bars with Baseline

### 1. Always Render Bar Slots for Every Day

Render both income and expense bars for all 31 days, even when 0, using a faint baseline (2px height, 0.15 opacity) so the chart structure is always visible.

### 2. Add Minimum Bar Height for Non-Zero Values

Use `MIN_BAR_PX = 2` to ensure non-zero values are always visible, even if very small.

### 3. Dynamic "Nice" Max Amount

Replace the hardcoded `Math.max(..., 100)` clamp with a dynamic scaling that's friendly for small amounts:

- If max ≤ 10 → scale to 10
- If max ≤ 50 → scale to 50
- If max ≤ 100 → scale to 100
- Otherwise → round up to nearest 100

### 4. Add Tooltips on Hover

Show exact amounts in native browser tooltips using `title` attribute.

### 5. Optional: "No Data" Overlay

If entire month has zero transactions, show centered "No data for this month yet" message.

## Implementation

### File to Modify

[`src/components/ExpenseTracker.tsx`](src/components/ExpenseTracker.tsx) - Statistics chart section (around lines 749-1040)

### Exact Code Changes

**Replace the chart calculation and rendering:**

```typescript
// Replace maxAmount calculation (around line 750)
const chartData = getChartData();
const computedMax = Math.max(...chartData.map(d => Math.max(d.expense, d.income)), 1);
// Dynamic "nice" max - keeps scaling friendly for small amounts
const maxAmount = computedMax <= 10 ? 10 : computedMax <= 50 ? 50 : computedMax <= 100 ? 100 : Math.ceil(computedMax / 100) * 100;

const MIN_BAR_PX = 2;

// Check if entire month is empty
const hasAnyData = chartData.some(d => d.expense > 0 || d.income > 0);
```

**Replace the chart rendering section (around lines 1011-1040):**

```typescript
<div className="relative h-48">
  {!hasAnyData && (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-slate-500 text-sm">No data for this month yet</p>
    </div>
  )}
  
  <div className="absolute inset-0 flex items-end justify-between gap-1">
    {chartData.map((data, idx) => {
      const expensePct = (data.expense / maxAmount) * 100;
      const incomePct = (data.income / maxAmount) * 100;

      // Convert percent to px min-height when non-zero
      const incomeStyle =
        data.income > 0
          ? { height: `${incomePct}%`, minHeight: `${MIN_BAR_PX}px` }
          : { height: '2px', opacity: 0.15 };

      const expenseStyle =
        data.expense > 0
          ? { height: `${expensePct}%`, minHeight: `${MIN_BAR_PX}px` }
          : { height: '2px', opacity: 0.15 };

      return (
        <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1">
          {/* Always render both bars so the chart never looks empty */}
          <div
            className="w-full bg-green-500 rounded-t transition-colors"
            style={incomeStyle}
            title={data.income > 0 ? `Income (Day ${data.day}): $${data.income.toFixed(2)}` : `No income (Day ${data.day})`}
          />
          <div
            className="w-full bg-red-500 rounded-t transition-colors"
            style={expenseStyle}
            title={data.expense > 0 ? `Expense (Day ${data.day}): $${data.expense.toFixed(2)}` : `No expense (Day ${data.day})`}
          />
        </div>
      );
    })}
  </div>
</div>

<div className="flex justify-between text-xs text-slate-500 mt-2">
  {[1, 5, 10, 15, 20, 25, 30].map(day => (
    <span key={day}>{day}</span>
  ))}
</div>
```



## Benefits

✅ **Chart never looks empty** - baseline bars show structure✅ **Small amounts visible** - MIN_BAR_PX ensures non-zero values show✅ **Better scaling** - dynamic max prevents tiny bars for small amounts✅ **Hover details** - tooltips show exact amounts✅ **Clear feedback** - "No data" message when month is empty