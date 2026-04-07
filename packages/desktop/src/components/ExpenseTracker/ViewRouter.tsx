import React from 'react';
import type {
  Expense,
  FormData,
  RecurringTransaction,
  PartnerNames,
  HouseholdSettings,
  Settlement,
  ChartDataPoint,
} from '@expenses/shared/types';
import type { TFunction } from 'i18next';
import { getExpensesThroughMonth, parseDateParts } from '@expenses/shared/calculations';
import type { Theme } from '../../lib/theme';
import { getLocalISODate } from '../../lib/date';
import { BalanceView, CategoriesView, DashboardView, TransactionsView } from './views';

type ViewType = 'dashboard' | 'transactions' | 'categories' | 'balance';

// Local type definitions (matching DashboardView)
interface InsightsData {
  largest: {
    amount: number;
    description: string;
  };
  avgDaily: number;
  topCategory: string;
  daysWithSpending: number;
}

interface CategoryDelta {
  category: string;
  delta: number;
}

interface TrendDataPoint {
  year: number;
  month: number;
  amount: number;
}

interface FrequentExpense {
  description: string;
  category: string;
  amount: number;
}

interface CategoryData {
  name: string;
  icon: string;
  color: string;
}

interface FilterPreset {
  name: string;
  filters: {
    categories?: string[];
  };
}

interface InlineEditData {
  description?: string;
  amount?: number;
  category?: string;
}

interface ViewRouterProps {
  currentView: ViewType;

  // Common data props
  filteredExpenses: Expense[];
  expenses: Expense[];
  recurring: RecurringTransaction[];
  settlements: Settlement[];
  categories: Record<string, { icon: string; color: string }>;
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;
  theme: Theme;

  // View-specific state
  selectedMonth: number;
  selectedYear: number;
  searchQuery: string;
  selectedCategory: string | null;
  bulkMode: boolean;
  selectedIds: Set<number>;
  inlineEditId: number | null;
  inlineEditData: InlineEditData;
  transactionPage: number;
  filterPresets: FilterPreset[];

  // Calculated values
  totalExpense: number;
  totalIncome: number;
  balance: number;
  insights: InsightsData;
  categoryDeltas: CategoryDelta[];
  sortedCategories: [string, number][];
  frequentExpenses: FrequentExpense[];
  chartData: ChartDataPoint[];
  maxAmount: number;
  hasAnyData: boolean;
  renderTrend: TrendDataPoint[];
  maxTrend: number;
  prediction: number;
  months: string[];
  MIN_BAR_PX: number;
  ITEMS_PER_PAGE: number;

  // UI state
  savingTransaction: boolean;
  deletingItem: boolean;
  savingSettings: boolean;

  // Setters
  setShowAddModal: (show: boolean) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setExpenses: (expenses: Expense[]) => void;
  setDirty: (dirty: boolean) => void;
  setSavingTransaction: (saving: boolean) => void;
  setBulkMode: (mode: boolean) => void;
  setSelectedIds: (ids: Set<number>) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTransactionPage: (page: number) => void;
  setInlineEditId: (id: number | null) => void;
  setInlineEditData: (data: InlineEditData) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setCurrentView: (view: ViewType) => void;
  setSettlements: (settlements: Settlement[]) => void;

  // Utility functions
  formatCurrency: (amount: number) => string;
  formatDateLocalized: (date: string) => string;
  formatSigned: (amount: number, type: 'income' | 'expense') => React.ReactNode;
  formatPercent: (value: number) => React.ReactNode;
  withLtr: (content: React.ReactNode) => React.ReactNode;
  getCategoryLabel: (name: string) => string;
  getFocusClasses: () => string;
  showToast: (message: string, type: 'success' | 'error') => void;

  // Actions
  openQuickAdd: (type: 'expense' | 'income') => void;
  toggleSelection: (id: number) => void;
  bulkCategorize: () => void;
  bulkDelete: () => void;
  saveInlineEdit: (id: number) => void;
  openCreateRecurringRule: () => void;
  openEditRecurringRule: (rule: RecurringTransaction) => void;
  openExpenseAction: (expense: Expense) => void;
  confirmDeleteExpense: (id: number, description: string) => void;
  confirmDeleteRecurring: (id: number, description: string) => void;
  deleteSettlement: (id: number) => Promise<void>;
  addCategory: (categoryData: CategoryData) => Promise<void>;
  editCategory: (oldName: string, categoryData: CategoryData) => Promise<void>;
  confirmDeleteCategory: (name: string) => void;
  updateTransactionCategory: (txId: number, newCategory: string) => Promise<void>;
  persistExpenses: (expenses: Expense[]) => Promise<boolean>;
  persistSettlements: (settlements: Settlement[]) => Promise<boolean>;

  // Translation
  t: TFunction;
}

export function ViewRouter({
  currentView,
  filteredExpenses,
  expenses,
  recurring,
  settlements,
  categories,
  partnerNames,
  householdSettings,
  theme,
  selectedMonth,
  selectedYear,
  searchQuery,
  selectedCategory,
  bulkMode,
  selectedIds,
  inlineEditId,
  inlineEditData,
  transactionPage,
  filterPresets,
  totalExpense,
  totalIncome,
  balance,
  insights,
  categoryDeltas,
  sortedCategories,
  frequentExpenses,
  chartData,
  maxAmount,
  hasAnyData,
  renderTrend,
  maxTrend,
  prediction,
  months,
  MIN_BAR_PX,
  ITEMS_PER_PAGE,
  savingTransaction,
  deletingItem,
  savingSettings,
  setShowAddModal,
  setFormData,
  setExpenses,
  setDirty,
  setSavingTransaction,
  setBulkMode,
  setSelectedIds,
  setSelectedCategory,
  setSearchQuery,
  setTransactionPage,
  setInlineEditId,
  setInlineEditData,
  setSelectedMonth,
  setSelectedYear,
  setCurrentView,
  setSettlements,
  formatCurrency,
  formatDateLocalized,
  formatSigned,
  formatPercent,
  withLtr,
  getCategoryLabel,
  getFocusClasses,
  showToast,
  openQuickAdd,
  toggleSelection,
  bulkCategorize,
  bulkDelete,
  saveInlineEdit,
  openCreateRecurringRule,
  openEditRecurringRule,
  openExpenseAction,
  confirmDeleteExpense,
  confirmDeleteRecurring,
  deleteSettlement,
  addCategory,
  editCategory,
  confirmDeleteCategory,
  updateTransactionCategory,
  persistExpenses,
  persistSettlements,
  t,
}: ViewRouterProps) {
  switch (currentView) {
    case 'dashboard':
      return (
        <DashboardView
          filteredExpenses={filteredExpenses}
          expenses={expenses}
          recurring={recurring}
          categories={categories}
          partnerNames={partnerNames}
          theme={theme}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          totalExpense={totalExpense}
          totalIncome={totalIncome}
          balance={balance}
          insights={insights}
          categoryDeltas={categoryDeltas}
          sortedCategories={sortedCategories}
          frequentExpenses={frequentExpenses}
          chartData={chartData}
          maxAmount={maxAmount}
          hasAnyData={hasAnyData}
          renderTrend={renderTrend}
          maxTrend={maxTrend}
          prediction={prediction}
          months={months}
          MIN_BAR_PX={MIN_BAR_PX}
          formatCurrency={formatCurrency}
          formatDateLocalized={formatDateLocalized}
          formatSigned={formatSigned}
          formatPercent={formatPercent}
          withLtr={withLtr}
          getCategoryLabel={getCategoryLabel}
          onOpenQuickAdd={openQuickAdd}
          onSetShowAddModal={setShowAddModal}
          onPrefillForm={(data) => {
            setFormData((prev) => ({
              ...prev,
              ...data
            }));
          }}
          onAddFrequentExpense={async (exp) => {
            setSavingTransaction(true);
            try {
              const newExpense: Expense = {
                id: Date.now(),
                description: exp.description,
                amount: exp.amount,
                category: exp.category,
                type: 'expense',
                date: getLocalISODate(),
                paidBy: 'partner1',
                isAuto: false
              };
              const updated = [...expenses, newExpense];
              setExpenses(updated);
              await persistExpenses(updated);
              setDirty(true);
            } catch (error) {
              showToast(t('errors.addTransactionFailed'), 'error');
            } finally {
              setSavingTransaction(false);
            }
          }}
          onFilterByCategory={(category) => {
            setSelectedCategory(category);
            setCurrentView('transactions');
          }}
          onViewTransactions={() => setCurrentView('transactions')}
          onViewMonth={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
            setCurrentView('transactions');
            setTransactionPage(1);
            setSearchQuery('');
          }}
          onFilterByDay={(dateStr) => {
            setSearchQuery(dateStr);
            setCurrentView('transactions');
          }}
          onEditExpense={openExpenseAction}
          onCreateRecurringRule={openCreateRecurringRule}
          onEditRecurringRule={openEditRecurringRule}
          onDeleteRecurring={confirmDeleteRecurring}
          showToast={showToast}
          savingTransaction={savingTransaction}
        />
      );

    case 'transactions':
      return (
        <TransactionsView
          filteredExpenses={filteredExpenses}
          expenses={expenses}
          categories={categories}
          partnerNames={partnerNames}
          householdSettings={householdSettings}
          theme={theme}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          bulkMode={bulkMode}
          selectedIds={selectedIds}
          inlineEditId={inlineEditId}
          inlineEditData={inlineEditData}
          transactionPage={transactionPage}
          filterPresets={filterPresets}
          totalExpense={totalExpense}
          totalIncome={totalIncome}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          savingTransaction={savingTransaction}
          deletingItem={deletingItem}
          setShowAddModal={setShowAddModal}
          setBulkMode={setBulkMode}
          setSelectedIds={setSelectedIds}
          setSelectedCategory={setSelectedCategory}
          setSearchQuery={setSearchQuery}
          setTransactionPage={setTransactionPage}
          setInlineEditId={setInlineEditId}
          setInlineEditData={setInlineEditData}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
          formatCurrency={formatCurrency}
          formatDateLocalized={formatDateLocalized}
          formatSigned={formatSigned}
          withLtr={withLtr}
          getCategoryLabel={getCategoryLabel}
          showToast={showToast}
          toggleSelection={toggleSelection}
          bulkCategorize={bulkCategorize}
          bulkDelete={bulkDelete}
          saveInlineEdit={saveInlineEdit}
          editExpense={openExpenseAction}
          confirmDeleteExpense={confirmDeleteExpense}
        />
      );

    case 'categories':
      return (
        <CategoriesView
          expenses={filteredExpenses}
          householdSettings={householdSettings}
          theme={theme}
          formatCurrency={formatCurrency}
          withLtr={withLtr}
          getCategoryLabel={getCategoryLabel}
          savingSettings={savingSettings}
          onAddCategory={async (categoryData) => {
            await addCategory(categoryData);
          }}
          onEditCategory={async (oldName, categoryData) => {
            await editCategory(oldName, categoryData);
          }}
          onDeleteCategory={confirmDeleteCategory}
          onUpdateTransactionCategory={updateTransactionCategory}
          onOpenQuickAdd={openQuickAdd}
          onFilterByCategory={(category) => {
            setSelectedCategory(category);
            setCurrentView('transactions');
          }}
          showToast={showToast}
        />
      );

    case 'balance': {
      const balanceExpenses = getExpensesThroughMonth(expenses, selectedYear, selectedMonth);
      // monthExpenses: only the selected month (no category/search filters) for display values
      const balanceMonthExpenses = expenses.filter(e => {
        const { year, month } = parseDateParts(e.date);
        return year === selectedYear && month === selectedMonth;
      });
      // BalanceView handles settlement scope per mode:
      // - month mode: selected month settlements
      // - cumulative mode: settlements through selected month
      return (
        <BalanceView
          expenses={balanceExpenses}
          monthExpenses={balanceMonthExpenses}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          settlements={settlements}
          partnerNames={partnerNames}
          householdSettings={householdSettings}
          theme={theme}
          formatCurrency={formatCurrency}
          formatDateLocalized={formatDateLocalized}
          withLtr={withLtr}
          getFocusClasses={getFocusClasses}
          onRecordSettlement={async (settlement) => {
            const newSettlements = [...settlements, settlement];
            await persistSettlements(newSettlements);
            setSettlements(newSettlements);
            setDirty(true);
          }}
          onUpdateSettlement={async (updatedSettlement) => {
            const newSettlements = settlements.map(settlement =>
              settlement.id === updatedSettlement.id ? updatedSettlement : settlement
            );
            await persistSettlements(newSettlements);
            setSettlements(newSettlements);
            setDirty(true);
          }}
          onDeleteSettlement={deleteSettlement}
        />
      );
    }

    default:
      return null;
  }
}
