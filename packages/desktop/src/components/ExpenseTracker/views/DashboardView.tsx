import { useState } from 'react';
import {
  Calendar,
  Activity,
  Zap,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../ui';
import type { Expense, RecurringTransaction, PartnerNames } from '@expenses/shared/types';
import type { Theme } from '../../../lib/theme';
import { getLocalISODate } from '../../../lib/date';

interface ChartDataPoint {
  day: number;
  income: number;
  expense: number;
}

interface TrendDataPoint {
  year: number;
  month: number;
  amount: number;
}

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

interface FrequentExpense {
  description: string;
  category: string;
  amount: number;
}

interface ChartTooltip {
  day: number;
  income: number;
  expense: number;
  x: number;
  y: number;
}

interface DashboardViewProps {
  filteredExpenses: Expense[];
  expenses: Expense[];
  recurring: RecurringTransaction[];
  categories: Record<string, { icon: string; color: string }>;
  partnerNames: PartnerNames;
  theme: Theme;
  selectedMonth: number;
  selectedYear: number;
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
  formatCurrency: (amount: number) => string;
  formatDateLocalized: (date: string) => string;
  formatSigned: (amount: number, type: 'income' | 'expense') => React.ReactNode;
  formatPercent: (value: number) => React.ReactNode;
  withLtr: (content: React.ReactNode) => React.ReactNode;
  getCategoryLabel: (name: string) => string;
  onOpenQuickAdd: (type: 'expense' | 'income') => void;
  onSetShowAddModal: (show: boolean) => void;
  onPrefillForm: (data: {
    description: string;
    category: string;
    amount: string;
    type: 'expense' | 'income';
    date: string;
  }) => void;
  onAddFrequentExpense: (expense: FrequentExpense) => Promise<void>;
  onFilterByCategory: (category: string) => void;
  onViewTransactions: () => void;
  onViewMonth: (month: number, year: number) => void;
  onFilterByDay: (dateStr: string) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteRecurring: (id: number, description: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  savingTransaction: boolean;
}

export function DashboardView({
  filteredExpenses,
  recurring,
  categories,
  partnerNames,
  theme,
  selectedMonth,
  selectedYear,
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
  formatCurrency,
  formatSigned,
  formatPercent,
  withLtr,
  getCategoryLabel,
  onOpenQuickAdd,
  onSetShowAddModal,
  onPrefillForm,
  onAddFrequentExpense,
  onFilterByCategory,
  onViewTransactions,
  onViewMonth,
  onFilterByDay,
  onEditExpense,
  onDeleteRecurring,
  showToast,
}: DashboardViewProps) {
  const { t, i18n } = useTranslation();
  const [chartTooltip, setChartTooltip] = useState<ChartTooltip | null>(null);

  const isRTL = (i18n.dir && i18n.dir() === 'rtl') || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl');

  return (
    <>
      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-12 text-center">
          <div className="text-7xl mb-6">📊</div>
          <h3 className="text-3xl font-bold mb-3">{t('app.welcomeTitle')}</h3>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            {t('app.welcomeBody')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => onOpenQuickAdd('expense')}
              variant="expense"
              iconStart={<TrendingDown className="w-6 h-6" />}
              className="px-8 py-4 text-lg"
            >
              {t('buttons.addFirstExpense')}
            </Button>
            <Button
              onClick={() => onOpenQuickAdd('income')}
              variant="income"
              iconStart={<TrendingUp className="w-6 h-6" />}
              className="px-8 py-4 text-lg"
            >
              {t('buttons.addIncome')}
            </Button>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            {t('app.shortcutHint')}
          </p>
        </div>
      )}

      {filteredExpenses.length > 0 && (
        <>
          {/* Balance, Expense, Income cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl hover:scale-[1.01] transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm font-medium">{t('labels.balance')}</span>
                  <span className="text-blue-400 text-sm font-semibold">{formatPercent(totalIncome > 0 ? (balance / totalIncome) * 100 : 0)}</span>
                </div>
                <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {withLtr(formatCurrency(balance))}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{t('labels.transactionsCount', { count: filteredExpenses.length })}</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-red-950/50 to-orange-950/50 backdrop-blur-xl border border-red-800/30 rounded-2xl p-5 shadow-2xl hover:scale-[1.01] transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-red-200 text-sm font-medium">{t('labels.expense')}</span>
                  <span className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                    <TrendingDown className="w-3 h-3" />
                    {formatPercent(totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {withLtr(`-${formatCurrency(totalExpense)}`)}
                </div>
                <div className="flex items-center gap-2 text-red-200 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {t('labels.transactionsCount', {
                      count: filteredExpenses.filter(e => e.type === 'expense').length
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/50 to-green-950/50 backdrop-blur-xl border border-emerald-800/30 rounded-2xl p-5 shadow-2xl hover:scale-[1.01] transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-green-200 text-sm font-medium">{t('labels.income')}</span>
                  <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                    <TrendingUp className="w-3 h-3" />
                    {formatPercent(totalIncome > 0 ? 100 : 0)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {withLtr(`+${formatCurrency(totalIncome)}`)}
                </div>
                <div className="flex items-center gap-2 text-green-200 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {t('labels.transactionsCount', {
                      count: filteredExpenses.filter(e => e.type === 'income').length
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Frequent Transactions Widget */}
          {frequentExpenses.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold">{t('labels.quickAddFrequent')}</h3>
                <span className="text-xs text-slate-400">{t('messages.mostCommonTransactions')}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {frequentExpenses.map((exp, idx) => (
                  <div key={idx} className="relative group flex-shrink-0">
                    <button
                      onClick={() => {
                          onPrefillForm({
                            description: exp.description,
                            category: exp.category,
                            amount: exp.amount.toString(),
                            type: 'expense',
                            date: getLocalISODate()
                          });
                        onSetShowAddModal(true);
                        showToast(t('toasts.prefilled', { description: exp.description }), 'success');
                      }}
                      className={`bg-slate-700/50 hover:bg-slate-600 px-4 py-3 rounded-xl transition-all hover:scale-105 border border-slate-600 ${theme.colors.cardBorderHover}`}
                      title={t('tooltips.editAndAdd', { description: exp.description })}
                    >
                      <div className="text-2xl mb-1">{categories[exp.category]?.icon}</div>
                      <div className="text-sm font-medium truncate max-w-[120px]">{exp.description}</div>
                      <div className="text-xs text-slate-400">{withLtr(formatCurrency(exp.amount))}</div>
                    </button>
                    {/* Add Again button */}
                    <Button
                      onClick={async () => {
                        await onAddFrequentExpense(exp);
                        showToast(t('toasts.added', { description: exp.description }), 'success');
                      }}
                      variant="accent"
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 !p-2 rounded-full shadow-lg hover:scale-110 !w-auto !h-auto"
                      title={t('tooltips.addTransactionNow')}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights and MoM Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Insights Widget */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t('labels.insights')}
              </h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-slate-400 whitespace-nowrap">{t('labels.largestExpense')}:</span>
                  <span className="font-semibold text-right break-words min-w-0">
                    {insights.largest.amount > 0
                      ? <>{withLtr(formatCurrency(insights.largest.amount))} - {insights.largest.description}</>
                      : t('labels.none')}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 whitespace-nowrap">{t('labels.avgDailySpend')}:</span>
                  <span className="font-semibold">{withLtr(formatCurrency(insights.avgDaily))}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 whitespace-nowrap">{t('labels.topCategory')}:</span>
                  <span className="font-semibold flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0">{categories[insights.topCategory]?.icon || ''}</span>
                    <span className="truncate">{getCategoryLabel(insights.topCategory)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 whitespace-nowrap">{t('labels.daysWithSpending')}:</span>
                  <span className="font-semibold">{t('labels.daysCount', { count: insights.daysWithSpending })}</span>
                </div>
              </div>
            </div>

            {/* Month-over-Month Comparison */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
              <h3 className="text-base sm:text-lg font-bold mb-4">{t('labels.monthOverMonth')}</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categoryDeltas.slice(0, 6).map(delta => (
                  <div key={delta.category} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="text-slate-400 flex items-center gap-2 min-w-0 flex-1">
                      <span className="flex-shrink-0">{categories[delta.category]?.icon || '📌'}</span>
                      <span className="truncate">{getCategoryLabel(delta.category)}</span>
                    </span>
                    <span className={`font-semibold whitespace-nowrap flex-shrink-0 ${delta.delta > 0 ? 'text-red-400' : delta.delta < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                      {withLtr(`${delta.delta > 0 ? '+' : ''}${formatCurrency(Math.abs(delta.delta))}`)}
                    </span>
                  </div>
                ))}
                {categoryDeltas.length === 0 && (
                  <p className="text-slate-500 text-xs sm:text-sm text-center py-4">{t('messages.noPreviousMonthData')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Categories and statistics section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top categories */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('labels.categories')}</h3>
                <div className="flex gap-2 text-xs">
                  <span className="text-yellow-400">● {t('labels.expense')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {sortedCategories.slice(0, 4).map(([category, amount]) => (
                  <button
                    key={category}
                    onClick={() => {
                      onFilterByCategory(category);
                      showToast(t('toasts.filteringBy', { category: getCategoryLabel(category) }), 'success');
                    }}
                    className={`${categories[category]?.color} bg-opacity-20 rounded-xl p-4 border border-opacity-30 hover:border-opacity-100 transition-all hover:scale-105 cursor-pointer text-left`}
                    title={t('tooltips.filterByCategory', { category: getCategoryLabel(category) })}
                  >
                    <div className="text-3xl mb-2">
                      {categories[category]?.icon}
                    </div>
                    <div className="text-xs text-slate-300 mb-1">{getCategoryLabel(category)}</div>
                    <div className="text-sm font-bold">
                      {Math.round((amount / totalExpense) * 100)}%
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex gap-1 mb-1">
                    {sortedCategories.slice(0, 4).map(([category, amount], idx) => (
                      <div
                        key={idx}
                        className={`h-2 ${categories[category]?.color} rounded-full`}
                        style={{ width: `${(amount / totalExpense) * 100}%` }}
                      />
                    ))}
                  </div>
                  <span>
                    {t('charts.others')}{' '}
                    {sortedCategories.length > 4
                      ? Math.round(
                          (sortedCategories
                            .slice(4)
                            .reduce((sum, [, amt]) => sum + amt, 0) /
                            totalExpense) *
                          100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics bar chart */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-950/85 to-slate-900/80 backdrop-blur-xl border border-slate-800/70 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">{t('labels.statistics')}</h3>
                <div className="flex gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    {t('labels.expense')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {t('labels.income')}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 mb-4">{t('labels.thisMonth')}</div>

              <div className="relative h-56 sm:h-64">
                {!hasAnyData && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-500 text-sm">{t('messages.noDataThisMonth')}</p>
                  </div>
                )}

                <div className={`absolute inset-0 flex items-end justify-between gap-1 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {chartData.map((data, idx) => {
                    const expensePct = (data.expense / maxAmount) * 100;
                    const incomePct = (data.income / maxAmount) * 100;

                    const incomeStyle =
                      data.income > 0
                        ? { height: `${incomePct}%`, minHeight: `${MIN_BAR_PX}px` }
                        : { height: '2px', opacity: 0.15 };

                    const expenseStyle =
                      data.expense > 0
                        ? { height: `${expensePct}%`, minHeight: `${MIN_BAR_PX}px` }
                        : { height: '2px', opacity: 0.15 };

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end gap-1 relative cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setChartTooltip({
                            day: data.day,
                            income: data.income,
                            expense: data.expense,
                            x: isRTL ? rect.right - rect.width / 2 : rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={() => setChartTooltip(null)}
                        onClick={() => {
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
                          onFilterByDay(dateStr);
                          showToast(t('toasts.showingTransactionsForDay', { day: data.day }), 'success');
                        }}
                      >
                        <div
                          className="w-full bg-green-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
                          style={{
                            ...incomeStyle,
                            transitionDelay: `${idx * 30}ms`
                          }}
                          title={
                            data.income > 0
                              ? t('charts.incomeDayTitle', {
                                  day: data.day,
                                  value: formatCurrency(data.income)
                                })
                              : t('charts.noIncomeDayTitle', { day: data.day })
                          }
                        />
                        <div
                          className="w-full bg-red-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-700 ease-out"
                          style={{
                            ...expenseStyle,
                            transitionDelay: `${idx * 30}ms`
                          }}
                          title={
                            data.expense > 0
                              ? t('charts.expenseDayTitle', {
                                  day: data.day,
                                  value: formatCurrency(data.expense)
                                })
                              : t('charts.noExpenseDayTitle', { day: data.day })
                          }
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
              <p className="text-xs text-slate-500 mt-3 text-center">
                {t('messages.onlyDaysWithSpending')}
              </p>

              {/* Chart Tooltip Portal */}
              {chartTooltip && (
                <div
                  className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl pointer-events-none"
                  style={{
                    left: `${chartTooltip.x}px`,
                    top: `${chartTooltip.y - 10}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="text-sm font-bold mb-1">
                    {t('charts.day', { day: chartTooltip.day })}
                  </div>
                  {chartTooltip.income > 0 && (
                    <div className="text-xs text-green-400">
                      {t('charts.incomeLabel')}: <span className="ltr-text">{formatCurrency(chartTooltip.income)}</span>
                    </div>
                  )}
                  {chartTooltip.expense > 0 && (
                    <div className="text-xs text-red-400">
                      {t('charts.expenseLabel')}: <span className="ltr-text">{formatCurrency(chartTooltip.expense)}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    {t('charts.clickToView')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spending Trends - 6 month view */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t('labels.spendingTrends')}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <i className="ri-information-line" aria-hidden />
                <span>{t('tooltips.hoverPoints', { defaultValue: 'Hover over points for details' })}</span>
              </div>
            </div>

            <div className="relative h-72">
              {(() => {
                const chartW = 1100;
                const chartH = 260;
                const padX = 70;
                const padYTop = 28;
                const padYBottom = 32;
                const plotW = chartW - padX * 2;
                const plotH = chartH - padYTop - padYBottom;
                const n = renderTrend.length || 1;
                const step = n > 1 ? plotW / (n - 1) : 0;

                const points = renderTrend.map((d, i) => {
                  const idx = isRTL ? n - 1 - i : i;
                  const x = padX + idx * step;
                  const y = padYTop + plotH - (d.amount / maxTrend) * plotH;
                  return { x, y, d };
                });

                const hasPoints = points.length > 0;
                const linePoints = hasPoints ? points.map(p => `${p.x},${p.y}`) : [];
                const pathD = hasPoints
                  ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
                  : '';
                const baseY = padYTop + plotH;
                const areaPath = hasPoints
                  ? `${pathD} L ${points[points.length - 1].x},${baseY} L ${points[0].x},${baseY} Z`
                  : '';

                return (
                  <>
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH}`}
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <line
                          key={i}
                          x1="0"
                          y1={padYTop + (i * plotH) / 4}
                          x2={chartW}
                          y2={padYTop + (i * plotH) / 4}
                          stroke="#334155"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          opacity="0.35"
                        />
                      ))}

                      {/* Area fill */}
                      {hasPoints && <path d={areaPath} fill="url(#trendFill)" opacity="0.9" />}

                      {/* Trend line */}
                      {hasPoints && (
                        <polyline
                          points={linePoints.join(' ')}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-500"
                        />
                      )}

                      {/* Data points */}
                      {points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r="6"
                          stroke="#0f172a"
                          strokeWidth="2"
                          fill="#a855f7"
                          className="hover:r-8 cursor-pointer transition-all"
                          onClick={() => {
                            onViewMonth(p.d.month, p.d.year);
                            showToast(t('toasts.viewingMonth', { month: months[p.d.month], year: p.d.year }), 'success');
                          }}
                        >
                          <title>{t('charts.monthAmount', { month: months[p.d.month], value: formatCurrency(p.d.amount) })}</title>
                        </circle>
                      ))}
                    </svg>

                    {/* Month labels */}
                    <div
                      className={`flex justify-between text-xs text-slate-500 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      style={{
                        paddingLeft: `${(padX / chartW) * 100}%`,
                        paddingRight: `${(padX / chartW) * 100}%`
                      }}
                    >
                      {renderTrend.map(d => (
                        <span key={`${d.year}-${d.month}`}>{months[d.month].slice(0, 3)}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Prediction badge */}
            {prediction > 0 && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border border-purple-700 rounded-lg text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-200">{t('charts.predictedNextLabel')}</span>
                  <span className="font-bold text-purple-100">{withLtr(formatCurrency(prediction))}</span>
                </div>
                <span className="text-xs text-slate-300">{t('charts.predictedNote')}</span>
              </div>
            )}
          </div>

          {/* Recent transactions and upcoming recurring */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent transactions */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('labels.transactions')}</h3>
                <button
                  onClick={onViewTransactions}
                  className="text-purple-400 text-sm hover:text-purple-300"
                >
                  {t('buttons.seeAll')}
                </button>
              </div>

              <div className="space-y-3">
                {filteredExpenses
                  .slice(-6)
                  .reverse()
                  .map(exp => (
                    <div
                      key={exp.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all cursor-pointer"
                      onClick={() => onEditExpense(exp)}
                      title={t('tooltips.clickToEdit')}
                    >
                      <div
                        className={`w-10 h-10 ${categories[exp.category]?.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
                      >
                        {categories[exp.category]?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {exp.description}
                        </div>
                        <div className="text-xs text-slate-400">
                          {exp.paidBy === 'joint'
                            ? t('labels.joint')
                            : exp.paidBy === 'partner1'
                            ? partnerNames.partner1
                            : partnerNames.partner2}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            exp.type === 'income'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {formatSigned(exp.amount, exp.type)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getCategoryLabel(exp.category)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Upcoming recurring items */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('labels.upcoming')}</h3>
                <button
                  className="text-purple-400 text-sm hover:text-purple-300"
                  title={t('buttons.addRecurring')}
                >
                  +
                </button>
              </div>

              <div className="space-y-3">
                {recurring.map(rec => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div
                      className={`w-10 h-10 ${categories[rec.category]?.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
                    >
                      {categories[rec.category]?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {rec.description}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t('labels.recurringMonthly', { day: rec.recurringDay })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            rec.type === 'income'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {withLtr(`${rec.type === 'income' ? '+' : '-'}${formatCurrency(rec.amount)}`)}
                        </div>
                      </div>
                      <IconButton
                        onClick={() => onDeleteRecurring(rec.id, rec.description)}
                        variant="danger"
                        size="sm"
                        title={t('tooltips.deleteTransaction')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                ))}
                {recurring.length === 0 && (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    {t('messages.noRecurring')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
