import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { ModalBase } from '../shared/ModalBase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../lib/theme';
import { CATEGORY_ICONS, searchIcons, type IconDefinition } from '../../lib/categoryIcons';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: { name: string; icon: string; color: string }) => void;
  existingCategories: string[];
}

// Tailwind color classes matching the design
const COLOR_OPTIONS = [
  { id: 'red', class: 'bg-red-500', name: 'Red' },
  { id: 'orange', class: 'bg-orange-500', name: 'Orange' },
  { id: 'yellow', class: 'bg-yellow-500', name: 'Yellow' },
  { id: 'lime', class: 'bg-lime-500', name: 'Lime' },
  { id: 'green', class: 'bg-green-500', name: 'Green' },
  { id: 'teal', class: 'bg-teal-500', name: 'Teal' },
  { id: 'cyan', class: 'bg-cyan-500', name: 'Cyan' },
  { id: 'blue', class: 'bg-blue-500', name: 'Blue' },
  { id: 'indigo', class: 'bg-indigo-500', name: 'Indigo' },
  { id: 'purple', class: 'bg-purple-500', name: 'Purple' },
  { id: 'pink', class: 'bg-pink-500', name: 'Pink' },
  { id: 'gray', class: 'bg-gray-500', name: 'Gray' },
];

export function AddCategoryModal({
  isOpen,
  onClose,
  onAdd,
  existingCategories,
}: AddCategoryModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRTL = i18n.dir() === 'rtl';

  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconDefinition>(
    CATEGORY_ICONS[9].icons[8] // Default to tag icon
  );
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[9]); // Default to purple
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    return searchQuery ? searchIcons(searchQuery) : null;
  }, [searchQuery]);

  // Group filtered icons by category or show all
  const iconGroupsToDisplay = useMemo(() => {
    if (filteredIcons) {
      // If searching, group filtered results by their original category
      const grouped = new Map<string, IconDefinition[]>();
      filteredIcons.forEach(icon => {
        const category = CATEGORY_ICONS.find(cat =>
          cat.icons.some(i => i.id === icon.id)
        );
        if (category) {
          if (!grouped.has(category.id)) {
            grouped.set(category.id, []);
          }
          grouped.get(category.id)!.push(icon);
        }
      });
      return Array.from(grouped.entries()).map(([id, icons]) => ({
        id,
        icons,
      }));
    }
    return CATEGORY_ICONS;
  }, [filteredIcons]);

  const handleSubmit = () => {
    const trimmedName = categoryName.trim();

    // Validation
    if (!trimmedName) {
      setError(t('category.errors.nameRequired', 'Category name is required'));
      return;
    }

    if (existingCategories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      setError(
        t('category.errors.nameExists', 'A category with this name already exists')
      );
      return;
    }

    // Submit
    onAdd({
      name: trimmedName,
      icon: selectedIcon.emoji,
      color: selectedColor.class,
    });

    // Reset and close
    handleClose();
  };

  const handleClose = () => {
    setCategoryName('');
    setSelectedIcon(CATEGORY_ICONS[9].icons[8]);
    setSelectedColor(COLOR_OPTIONS[9]);
    setSearchQuery('');
    setError('');
    onClose();
  };

  const handleIconSelect = (icon: IconDefinition) => {
    setSelectedIcon(icon);
  };

  const handleColorSelect = (color: typeof COLOR_OPTIONS[0]) => {
    setSelectedColor(color);
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title={t('category.addTitle', 'Add Category')}
    >
      <div className="space-y-6">
        {/* Category Name Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            {t('category.nameLabel', 'Category Name')}
          </label>
          <Input
            value={categoryName}
            onChange={e => {
              setCategoryName(e.target.value);
              setError('');
            }}
            placeholder={t('category.namePlaceholder', 'Enter category name')}
            dir={i18n.dir()}
            className={`w-full ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}`}
          />
          {error && (
            <p className="text-red-400 text-sm mt-1">{error}</p>
          )}
        </div>

        {/* Icon & Emoji Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            {t('category.iconLabel', 'Icon / Emoji')}
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
            {/* Selected Icon Display */}
            <button
              onClick={() => {
                const container = document.getElementById('iconGridContainer');
                container?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              className={`aspect-square w-full bg-gradient-to-br ${theme.colors.accentGradient} bg-opacity-10 border-2 ${theme.colors.cardBorder} hover:${theme.colors.cardBorderHover} rounded-2xl flex items-center justify-center text-6xl transition-all hover:scale-105 cursor-pointer`}
              type="button"
            >
              {selectedIcon.emoji}
            </button>

            {/* Icon Selection Grid */}
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('category.searchPlaceholder', 'Search icons...')}
                  dir={i18n.dir()}
                  className={`w-full ${isRTL ? 'pr-10' : 'pl-10'}`}
                />
              </div>

              {/* Icon Grid Container */}
              <div
                id="iconGridContainer"
                className={`${theme.colors.cardBg} border ${theme.colors.cardBorder} rounded-xl p-4 max-h-[320px] overflow-y-auto space-y-4`}
              >
                {iconGroupsToDisplay.length > 0 ? (
                  iconGroupsToDisplay.map(category => (
                    <div key={category.id}>
                      <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 px-1">
                        {t(`category.iconCategories.${category.id}`, category.id)}
                      </div>
                      <div className="grid grid-cols-8 gap-1.5">
                        {category.icons.map(icon => (
                          <button
                            key={icon.id}
                            onClick={() => handleIconSelect(icon)}
                            className={`aspect-square bg-slate-800/50 border ${
                              selectedIcon.id === icon.id
                                ? `${theme.colors.cardBorderHover} ring-2 ring-purple-500/50 bg-purple-500/20`
                                : theme.colors.cardBorder
                            } rounded-lg hover:bg-purple-500/10 hover:border-purple-500 transition-all flex items-center justify-center text-2xl relative`}
                            type="button"
                            title={icon.id}
                          >
                            {icon.emoji}
                            {selectedIcon.id === icon.id && (
                              <span className="absolute top-0.5 right-0.5 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    {t('category.noIconsFound', 'No icons found matching your search')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            {t('category.colorLabel', 'Label Color')}
          </label>
          <div className="grid grid-cols-6 gap-2.5">
            {COLOR_OPTIONS.map(color => (
              <button
                key={color.id}
                onClick={() => handleColorSelect(color)}
                className={`aspect-square ${color.class} rounded-xl transition-all hover:scale-105 ${
                  selectedColor.id === color.id
                    ? 'ring-4 ring-white shadow-lg scale-105'
                    : 'shadow-md'
                } relative`}
                type="button"
                title={color.name}
              >
                {selectedColor.id === color.id && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold drop-shadow-md">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className={`bg-gradient-to-br ${theme.colors.cardBg} border ${theme.colors.cardBorder} rounded-xl p-5`}>
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">
              {t('category.preview', 'Preview')}
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`${selectedColor.class} w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-lg`}
              >
                {selectedIcon.emoji}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-white">
                  {categoryName || t('category.previewPlaceholder', 'Category name')}
                </div>
                <div className="text-sm text-slate-400">
                  {t('category.customCategory', 'Custom category')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {t('buttons.cancel', 'Cancel')}
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!categoryName.trim()}
            className="flex-1"
          >
            {t('buttons.addCategory', 'Add Category')}
          </Button>
        </div>
      </div>
    </ModalBase>
  );
}
