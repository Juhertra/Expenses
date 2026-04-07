import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PartnerNames } from '@expenses/shared/types';
import type { RecurringRuleDraft } from '../../../lib/recurringRules';
import { Button, ModalShell } from '../../ui';

interface RecurringRuleModalProps {
  isOpen: boolean;
  draft: RecurringRuleDraft;
  categories: Record<string, { icon: string; color: string }>;
  partnerNames: PartnerNames;
  saving: boolean;
  isEditing: boolean;
  getCategoryLabel: (name: string) => string;
  getFocusClasses: () => string;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<RecurringRuleDraft>>;
  onSave: () => void;
}

export function RecurringRuleModal({
  isOpen,
  draft,
  categories,
  partnerNames,
  saving,
  isEditing,
  getCategoryLabel,
  getFocusClasses,
  onClose,
  onChange,
  onSave,
}: RecurringRuleModalProps) {
  const { t, i18n } = useTranslation();
  const dir = (i18n.dir && i18n.dir()) || (typeof document !== 'undefined' ? document.documentElement.dir : 'ltr') || 'ltr';
  const isRTL = dir === 'rtl';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('labels.editRecurringRule') : t('labels.createRecurringRule')}
      subtitle={t('messages.recurringRuleFutureOnly')}
      dir={dir as 'rtl' | 'ltr'}
      className="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.description')}</label>
          <input
            type="text"
            value={draft.description}
            onChange={e => onChange(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
            placeholder={t('placeholders.descriptionExample')}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.amount')}</label>
          <input
            type="number"
            value={draft.amount}
            onChange={e => onChange(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
            placeholder={t('placeholders.amount')}
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.category')}</label>
          <select
            value={draft.category}
            onChange={e => onChange(prev => ({ ...prev, category: e.target.value }))}
            dir={dir}
            className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
          >
            {Object.keys(categories).map(category => (
              <option key={category} value={category}>
                {categories[category].icon} {getCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.type')}</label>
          <select
            value={draft.type}
            onChange={e => onChange(prev => ({ ...prev, type: e.target.value as 'expense' | 'income' }))}
            dir={dir}
            className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
          >
            <option value="expense">{t('labels.expense')}</option>
            <option value="income">{t('labels.income')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.paidBy')}</label>
          <select
            value={draft.paidBy}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                paidBy: e.target.value as 'partner1' | 'partner2' | 'joint',
              }))
            }
            dir={dir}
            className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-3' : 'pl-3 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
          >
            <option value="partner1">{partnerNames.partner1}</option>
            <option value="partner2">{partnerNames.partner2}</option>
            <option value="joint">{t('labels.joint')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">{t('labels.dayOfMonth')}</label>
          <input
            type="number"
            min="1"
            max="31"
            value={draft.recurringDay}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                recurringDay: Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)),
              }))
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            {t('buttons.cancel')}
          </Button>
          <Button onClick={onSave} disabled={saving} variant="accent" className="flex-1">
            {saving ? t('buttons.saving') : isEditing ? t('buttons.update') : t('buttons.createRecurringRule')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
