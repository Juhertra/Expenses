import { useState } from 'react';
import { PlusCircle, Edit2, Trash2, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';
import type { Expense, HouseholdSettings, ThemeDefinition } from '../../../lib/types';
import { CATEGORY_LABELS_HE } from '../../../i18n';

interface CategoriesViewProps {
  expenses: Expense[];
  householdSettings: HouseholdSettings;
  theme: ThemeDefinition;
  formatCurrency: (amount: number) => string;
  withLtr: (content: React.ReactNode) => React.ReactNode;
  getCategoryLabel: (name: string) => string;
  savingSettings: boolean;
  onAddCategory: (categoryData: { name: string; icon: string; color: string }) => Promise<void>;
  onEditCategory: (oldName: string, categoryData: { name: string; icon: string; color: string }) => Promise<void>;
  onDeleteCategory: (categoryName: string) => void;
  onUpdateTransactionCategory: (txId: number, newCategory: string) => Promise<void>;
  onOpenQuickAdd: (type: 'expense' | 'income') => void;
  onFilterByCategory: (category: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function CategoriesView({
  expenses,
  householdSettings,
  theme,
  formatCurrency,
  withLtr,
  getCategoryLabel,
  savingSettings,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onUpdateTransactionCategory,
  onOpenQuickAdd,
  onFilterByCategory,
  showToast,
}: CategoriesViewProps) {
  const { t, i18n } = useTranslation();

  // Local modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    color: 'bg-purple-500'
  });

  const categories = householdSettings.categories;

  // Calculate totals
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((exp) => {
    if (exp.type === 'expense') {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }
  });

  const totalExpense = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);

  // Pie chart helper functions
  const createPieSlice = (anglePercent: number, startAngle: number): string => {
    const centerX = 100;
    const centerY = 100;
    const radius = 80;

    const angle = (anglePercent / 100) * 2 * Math.PI;
    const start = (startAngle / 100) * 2 * Math.PI - Math.PI / 2;
    const end = start + angle;

    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);

    const largeArc = angle > Math.PI ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const calculateLabelPosition = (anglePercent: number, startAngle: number): { x: number; y: number } => {
    const centerX = 100;
    const centerY = 100;
    const labelRadius = 60;

    const midAngle = ((startAngle + anglePercent / 2) / 100) * 2 * Math.PI - Math.PI / 2;

    return {
      x: centerX + labelRadius * Math.cos(midAngle),
      y: centerY + labelRadius * Math.sin(midAngle)
    };
  };

  // Get currently used emojis (excluding the one being edited)
  const getUsedEmojis = (): Set<string> => {
    const used = new Set<string>();
    Object.values(categories).forEach(cat => used.add(cat.icon));
    if (editingCategory && categories[editingCategory]) {
      used.delete(categories[editingCategory].icon);
    }
    return used;
  };

  const usedEmojis = getUsedEmojis();

  // Available emojis for category selection
  const AVAILABLE_EMOJIS = ['🍕', '🚗', '🏠', '💊', '🎬', '🛒', '✈️', '🎓', '👔', '🎁', '📱', '🍽️', '🔌', '🏋️', '🐕', '🚰', '📺', '🧹', '🛠️', '🎨'];

  // Available colors for categories
  const AVAILABLE_COLORS = [
    'bg-orange-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-gray-500',
  ];

  // Map Tailwind color classes to actual hex colors for SVG
  const colorMap: Record<string, string> = {
    'orange-500': '#f97316',
    'green-500': '#22c55e',
    'blue-500': '#3b82f6',
    'yellow-500': '#eab308',
    'red-500': '#ef4444',
    'purple-500': '#a855f7',
    'pink-500': '#ec4899',
    'indigo-500': '#6366f1',
    'cyan-500': '#06b6d4',
    'emerald-500': '#10b981',
    'gray-500': '#6b7280'
  };

  const handleAddCategory = async () => {
    const trimmedName = categoryForm.name.trim();

    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!categoryForm.icon) {
      showToast(t('errors.categoryEmojiRequired'), 'error');
      return;
    }
    if (categories[trimmedName]) {
      showToast(t('errors.categoryAlreadyExists'), 'error');
      return;
    }

    await onAddCategory({
      name: trimmedName,
      icon: categoryForm.icon,
      color: categoryForm.color
    });

    setShowCategoryModal(false);
    setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    const trimmedName = categoryForm.name.trim();

    // Validation
    if (!trimmedName) {
      showToast(t('errors.categoryNameRequired'), 'error');
      return;
    }
    if (!categoryForm.icon) {
      showToast(t('errors.categoryEmojiRequired'), 'error');
      return;
    }
    if (trimmedName !== editingCategory && categories[trimmedName]) {
      showToast(t('errors.categoryNameExists'), 'error');
      return;
    }

    await onEditCategory(editingCategory, {
      name: trimmedName,
      icon: categoryForm.icon,
      color: categoryForm.color
    });

    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
  };

  const handleCategoryClick = (category: string) => {
    onFilterByCategory(category);
    showToast(t('toasts.filteringBy', { category: getCategoryLabel(category) }), 'success');
  };

  return (
    <>
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{t('labels.expensesByCategory')}</h3>
          <Button
            onClick={() => {
              setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            variant="accent"
            iconStart={<PlusCircle className="w-4 h-4" />}
            title={t('buttons.addCategory')}
          >
            {t('buttons.addCategory')}
          </Button>
        </div>

        {/* Empty State */}
        {totalExpense === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4" aria-hidden="true">🔍</div>
            <h4 className="text-xl font-semibold mb-2">{t('messages.noExpensesThisMonth')}</h4>
            <p className="text-slate-400 mb-6">{t('messages.addExpensesForCategoryBreakdown')}</p>
            <Button
              onClick={() => onOpenQuickAdd('expense')}
              variant="expense"
              iconStart={<TrendingDown className="w-5 h-5" />}
              className="px-6 py-3"
            >
              {t('buttons.addExpense')}
            </Button>
          </div>
        )}

        {totalExpense > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals).map(([category, amount]) => {
                return (
                  <div
                    key={category}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const txId = parseInt(e.dataTransfer.getData('transactionId'));
                      await onUpdateTransactionCategory(txId, category);
                      showToast(t('toasts.movedToCategory', { category }), 'success');
                    }}
                    className={`bg-slate-700/50 rounded-xl p-6 border-2 border-dashed border-transparent ${theme.colors.cardBorderHover} transition-colors relative group`}
                    title={t('tooltips.dropToRecategorize')}
                  >
                    {/* Edit & Delete Buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryForm({
                            name: getCategoryLabel(category),
                            icon: categories[category].icon,
                            color: categories[category].color
                          });
                          setEditingCategory(category);
                          setShowCategoryModal(true);
                        }}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors bg-slate-800/90"
                        title={t('tooltips.editCategory')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(category);
                        }}
                        className="p-2 hover:bg-red-600 rounded-lg transition-colors bg-slate-800/90"
                        title={t('tooltips.deleteCategory')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-16 h-16 ${categories[category]?.color} rounded-xl flex items-center justify-center text-3xl`}
                      >
                        {categories[category]?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-400 text-sm">{getCategoryLabel(category)}</div>
                        <div className="text-2xl font-bold">{withLtr(formatCurrency(amount))}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{t('labels.percentage')}</span>
                        <span className="font-medium">
                          {withLtr(`${((amount / totalExpense) * 100).toFixed(1)}%`)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className={`${categories[category]?.color} h-2 rounded-full`}
                          style={{ width: `${(amount / totalExpense) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie Chart Visualization */}
            <div className="mt-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">{t('labels.categoryDistribution')}</h3>
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Visual Pie Chart using SVG */}
                <div className="relative w-64 h-64 flex-shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    {Object.entries(categoryTotals)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount], idx, arr) => {
                        const percentage = (amount / totalExpense) * 100;
                        const startAngle = arr
                          .slice(0, idx)
                          .reduce((sum, [, amt]) => sum + (amt / totalExpense) * 100, 0);

                        const path = createPieSlice(percentage, startAngle);
                        const labelPos = calculateLabelPosition(percentage, startAngle);
                        const color = categories[category]?.color.replace('bg-', '');

                        return (
                          <g key={category}>
                            <path
                              d={path}
                              fill={colorMap[color] || '#6b7280'}
                              className="hover:opacity-80 cursor-pointer transition-opacity"
                              onClick={() => handleCategoryClick(category)}
                            >
                              <title>{`${getCategoryLabel(category)}: ${percentage.toFixed(1)}%`}</title>
                            </path>
                            {percentage > 2 && (
                              <text
                                x={labelPos.x}
                                y={labelPos.y}
                                className="text-xs fill-white font-bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(90 ${labelPos.x} ${labelPos.y})`}
                              >
                                {percentage.toFixed(1)}%
                              </text>
                            )}
                          </g>
                        );
                      })}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2 w-full">
                  {Object.entries(categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => {
                      const percentage = (amount / totalExpense) * 100;
                      return (
                        <div
                          key={category}
                          className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleCategoryClick(category)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full ${categories[category]?.color} flex-shrink-0`} />
                            <span className="text-sm truncate">
                              {categories[category]?.icon} {getCategoryLabel(category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-medium">{withLtr(formatCurrency(amount))}</span>
                            <span className="text-xs text-slate-400 w-12 text-right">{withLtr(`${percentage.toFixed(1)}%`)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6">
                {editingCategory ? t('labels.editCategoryTitle') : t('labels.addCategoryTitle')}
              </h3>

              <div className="space-y-6">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('labels.categoryName')}
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    placeholder={t('labels.categoryNamePlaceholder')}
                    autoFocus
                  />
                </div>

                {/* Emoji Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('labels.categoryIcon')}
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {AVAILABLE_EMOJIS.map((emoji) => {
                      const isUsed = usedEmojis.has(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => !isUsed && setCategoryForm({ ...categoryForm, icon: emoji })}
                          disabled={isUsed}
                          className={`
                            text-2xl p-2 rounded-lg transition-all
                            ${categoryForm.icon === emoji ? 'ring-2 ring-purple-500 bg-slate-600 scale-110' : ''}
                            ${isUsed ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-600 hover:scale-110'}
                          `}
                          title={isUsed ? t('labels.iconInUse') : ''}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('labels.categoryColor')}
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`
                          w-10 h-10 ${color} rounded-lg transition-transform
                          ${categoryForm.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}
                        `}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${categoryForm.color} rounded-xl flex items-center justify-center text-3xl shadow-lg`}>
                      {categoryForm.icon || '🏷️'}
                    </div>
                    <div className="text-lg font-medium">
                      {categoryForm.name ? getCategoryLabel(categoryForm.name) : t('labels.categoryNamePlaceholder')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: '', icon: '', color: 'bg-purple-500' });
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={() => editingCategory ? handleEditCategory() : handleAddCategory()}
                  disabled={savingSettings || !categoryForm.name.trim()}
                  variant="accent"
                  className="flex-1"
                >
                  {savingSettings ? t('buttons.saving') : (editingCategory ? t('buttons.update') : t('buttons.add'))}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
