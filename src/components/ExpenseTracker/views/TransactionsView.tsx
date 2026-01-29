import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, X, Check, Edit2, Trash2 } from 'lucide-react';
import type {
  Expense,
  PartnerNames,
  HouseholdSettings,
} from '../../../lib/types';
import type { Theme } from '../../../lib/theme';
import { Button } from '../../ui';

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

interface TransactionsViewProps {
  filteredExpenses: Expense[];
  expenses: Expense[];
  categories: Record<string, { icon: string; color: string }>;
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;
  theme: Theme;
  searchQuery: string;
  selectedCategory: string | null;
  bulkMode: boolean;
  selectedIds: Set<number>;
  inlineEditId: number | null;
  inlineEditData: InlineEditData;
  transactionPage: number;
  filterPresets: FilterPreset[];
  totalExpense: number;
  totalIncome: number;
  selectedMonth: number;
  selectedYear: number;
  ITEMS_PER_PAGE: number;
  savingTransaction: boolean;
  deletingItem: boolean;
  setShowAddModal: (show: boolean) => void;
  setBulkMode: (mode: boolean) => void;
  setSelectedIds: (ids: Set<number>) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTransactionPage: (page: number) => void;
  setInlineEditId: (id: number | null) => void;
  setInlineEditData: (data: InlineEditData) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  formatCurrency: (amount: number) => string;
  formatDateLocalized: (date: string) => string;
  formatSigned: (amount: number, type: 'income' | 'expense') => React.ReactNode;
  withLtr: (content: React.ReactNode) => React.ReactNode;
  getCategoryLabel: (name: string) => string;
  showToast: (message: string, type: 'success' | 'error') => void;
  toggleSelection: (id: number) => void;
  bulkCategorize: () => void;
  bulkDelete: () => void;
  saveInlineEdit: (id: number) => void;
  editExpense: (expense: Expense) => void;
  confirmDeleteExpense: (id: number, description: string) => void;
}

export function TransactionsView({
  filteredExpenses,
  expenses,
  categories,
  partnerNames,
  householdSettings,
  theme: _theme,
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
  selectedMonth,
  selectedYear,
  ITEMS_PER_PAGE,
  savingTransaction,
  deletingItem,
  setShowAddModal,
  setBulkMode,
  setSelectedIds,
  setSelectedCategory,
  setSearchQuery,
  setTransactionPage,
  setInlineEditId,
  setInlineEditData,
  setSelectedMonth,
  setSelectedYear,
  formatCurrency,
  formatDateLocalized,
  formatSigned,
  withLtr,
  getCategoryLabel,
  showToast,
  toggleSelection,
  bulkCategorize,
  bulkDelete,
  saveInlineEdit,
  editExpense,
  confirmDeleteExpense,
}: TransactionsViewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">{t('labels.myTransactions')}</h3>
        <div className="flex gap-2">
          {/* Add Transaction Button */}
          <Button
            onClick={() => setShowAddModal(true)}
            variant="accent"
            size="md"
            iconStart={<PlusCircle className="w-4 h-4" />}
            title={t('buttons.addTransaction')}
            className="shadow-lg shadow-purple-500/30"
          >
            {t('buttons.addTransaction')}
          </Button>
          {/* Bulk Mode Toggle (Phase 2 Feature #10) */}
          <Button
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedIds(new Set());
            }}
            variant={bulkMode ? 'accent' : 'secondary'}
            size="sm"
          >
            {bulkMode ? t('buttons.exitBulkMode') : t('buttons.bulkSelect')}
          </Button>
        </div>
      </div>

      {/* Category Filter Indicator (Phase 1 Feature #8) */}
      {selectedCategory && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-slate-400">{t('labels.filteredBy')}:</span>
          <Button
            onClick={() => {
              setSelectedCategory(null);
              showToast(t('toasts.filterCleared'), 'success');
            }}
            variant="accent"
            size="sm"
            iconEnd={<X className="w-3 h-3" />}
            className="gap-2"
          >
            <span>{categories[selectedCategory]?.icon}</span>
            <span>{getCategoryLabel(selectedCategory)}</span>
          </Button>
        </div>
      )}

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('messages.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
        />
      </div>

      {/* Bulk Actions Bar (Phase 2 Feature #10) */}
      {bulkMode && (
        <div className="sticky top-0 z-10 bg-purple-900 border border-purple-700 rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{t('labels.selectedCount', { count: selectedIds.size })}</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-purple-300 hover:text-white"
            >
              {t('buttons.clear')}
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={bulkCategorize}
              disabled={selectedIds.size === 0 || savingTransaction}
              variant="accent"
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              {t('buttons.changeCategory')}
            </Button>
            <Button
              onClick={bulkDelete}
              disabled={selectedIds.size === 0 || deletingItem}
              variant="danger"
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              {t('buttons.deleteSelected')}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Filter Chips (Phase 2 Feature #3) */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => {
            const now = new Date();
            setSelectedMonth(now.getMonth());
            setSelectedYear(now.getFullYear());
            showToast(t('toasts.showingThisMonth'), 'success');
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
        >
          {t('labels.thisMonth')}
        </button>
        <button
          onClick={() => {
            const now = new Date();
            const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            setSelectedMonth(prevMonth);
            setSelectedYear(prevYear);
            showToast(t('toasts.showingLastMonth'), 'success');
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
        >
          {t('labels.lastMonth')}
        </button>
        <button
          onClick={() => {
            setSearchQuery('');
            const largeExpenses = expenses.filter(e =>
              e.type === 'expense' &&
              e.amount >= 1000 &&
              new Date(e.date).getMonth() === selectedMonth &&
              new Date(e.date).getFullYear() === selectedYear
            );
            if (largeExpenses.length > 0) {
              showToast(t('toasts.foundLargeExpenses', { count: largeExpenses.length }), 'success');
            } else {
              showToast(t('toasts.noLargeExpensesThisMonth'), 'error');
            }
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs whitespace-nowrap transition-colors"
        >
          {t('labels.largeExpenses')} (&gt; {householdSettings.currencySymbol}1000)
        </button>
        {filterPresets.map(preset => (
          <Button
            key={preset.name}
            onClick={() => {
              // Apply preset filters
              if (preset.filters.categories && preset.filters.categories.length > 0) {
                setSelectedCategory(preset.filters.categories[0]);
              }
              showToast(t('toasts.appliedFilter', { name: preset.name }), 'success');
            }}
            variant="accent"
            size="sm"
            className="rounded-full text-xs whitespace-nowrap"
          >
            {preset.name}
          </Button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 bg-red-400 rounded-full"></span>
          <span>{withLtr(formatCurrency(totalExpense))}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 bg-green-400 rounded-full"></span>
          <span>{withLtr(formatCurrency(totalIncome))}</span>
        </div>
      </div>

      {/* Empty State (Phase 1 Feature #4) */}
      {filteredExpenses.length === 0 && expenses.length > 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h4 className="text-xl font-semibold mb-2">{t('messages.noTransactionsFound')}</h4>
          <p className="text-slate-400 mb-6">
            {searchQuery
              ? t('messages.noResultsFor', { query: searchQuery })
              : selectedCategory
              ? t('messages.noTransactionsInCategory', { category: getCategoryLabel(selectedCategory) })
              : t('messages.noTransactions')
            }
          </p>
          <div className="flex gap-3 justify-center">
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                {t('buttons.clearFilters')}
              </button>
            )}
            <Button
              onClick={() => setShowAddModal(true)}
              variant="accent"
            >
              {t('buttons.addTransaction')}
            </Button>
          </div>
        </div>
      )}

      {/* Pagination info (Phase 2 Feature #12) */}
      {filteredExpenses.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mb-4 text-sm text-slate-400">
          <span>
            {t('messages.showingRange', {
              start: ((transactionPage - 1) * ITEMS_PER_PAGE) + 1,
              end: Math.min(transactionPage * ITEMS_PER_PAGE, filteredExpenses.length),
              total: filteredExpenses.length
            })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setTransactionPage(Math.max(1, transactionPage - 1))}
              disabled={transactionPage === 1}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {t('buttons.previous')}
            </button>
            <span className="px-3 py-1">
              {t('messages.pageOf', {
                page: transactionPage,
                total: Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)
              })}
            </span>
            <button
              onClick={() => setTransactionPage(Math.min(Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE), transactionPage + 1))}
              disabled={transactionPage >= Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {t('buttons.next')}
            </button>
          </div>
        </div>
      )}

      {/* Transaction list (Phase 1 Feature #9 - Click to edit, Phase 2 Feature #7 - Inline edit, Phase 2 Feature #12 - Paginated) */}
      <div className="space-y-2">
        {filteredExpenses
          .slice((transactionPage - 1) * ITEMS_PER_PAGE, transactionPage * ITEMS_PER_PAGE)
          .map(exp => (
          inlineEditId === exp.id ? (
            // INLINE EDIT MODE (Phase 2 Feature #7)
            <div key={exp.id} className="bg-slate-700/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={inlineEditData.description ?? exp.description}
                  onChange={(e) => setInlineEditData({...inlineEditData, description: e.target.value})}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  placeholder={t('labels.description')}
                />
                <input
                  type="number"
                  value={inlineEditData.amount ?? exp.amount}
                  onChange={(e) => setInlineEditData({...inlineEditData, amount: parseFloat(e.target.value)})}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  placeholder={t('labels.amount')}
                  step="0.01"
                />
                <select
                  value={inlineEditData.category ?? exp.category}
                  onChange={(e) => setInlineEditData({...inlineEditData, category: e.target.value})}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>
                      {categories[cat].icon} {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <Button
                    onClick={() => saveInlineEdit(exp.id)}
                    disabled={savingTransaction}
                    variant="success"
                    size="sm"
                    iconStart={<Check className="w-4 h-4" />}
                    title={t('tooltips.saveChanges')}
                    className="flex-1"
                  >
                    {t('buttons.save')}
                  </Button>
                  <button
                    onClick={() => {
                      setInlineEditId(null);
                      setInlineEditData({});
                    }}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
                    title={t('buttons.cancel')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // NORMAL VIEW MODE (Phase 2 Feature #11 - Draggable)
            <div
              key={exp.id}
              draggable={!bulkMode}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('transactionId', exp.id.toString());
              }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer group"
              onClick={(e) => {
                // Don't trigger if clicking action buttons
                if ((e.target as HTMLElement).closest('button[data-action]')) return;
                editExpense(exp);
              }}
              onDoubleClick={() => {
                setInlineEditId(exp.id);
                setInlineEditData({});
              }}
              title={bulkMode ? t('tooltips.selectTransaction') : t('tooltips.transactionRow')}
            >
            {/* Checkbox (Bulk Mode - Phase 2 Feature #10) */}
            {bulkMode && (
              <input
                type="checkbox"
                checked={selectedIds.has(exp.id)}
                onChange={() => toggleSelection(exp.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 flex-shrink-0 cursor-pointer"
              />
            )}

            {/* Icon + Info */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${categories[exp.category]?.color} rounded-xl flex items-center justify-center text-xl sm:text-2xl`}
              >
                {categories[exp.category]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {exp.description}
                  <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                  <span className="truncate">{getCategoryLabel(exp.category)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">{formatDateLocalized(exp.date)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate">
                      {exp.paidBy === 'joint'
                        ? t('labels.joint')
                        : exp.paidBy === 'partner1'
                        ? partnerNames.partner1
                        : partnerNames.partner2}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount + Actions */}
            <div className={`flex items-center justify-between sm:justify-end gap-3 sm:gap-4 ${isRTL ? 'pr-13 sm:pr-0' : 'pl-13 sm:pl-0'}`}>
              <div
                className={`text-base sm:text-lg font-bold whitespace-nowrap ${
                  exp.type === 'income' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatSigned(exp.amount, exp.type)}
              </div>
              {!exp.isAuto && (
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    data-action="inline-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditId(exp.id);
                      setInlineEditData({});
                    }}
                    className="p-1.5 sm:p-2 hover:bg-blue-600 rounded-lg transition-colors"
                    title={t('tooltips.quickEdit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    data-action="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteExpense(exp.id, exp.description);
                    }}
                    className="p-1.5 sm:p-2 hover:bg-red-600 rounded-lg transition-colors"
                    title={t('tooltips.deleteTransaction')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
