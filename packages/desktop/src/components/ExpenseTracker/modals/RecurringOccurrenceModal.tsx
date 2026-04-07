import { useTranslation } from 'react-i18next';
import type { Expense } from '@expenses/shared/types';
import { Button, ModalShell } from '../../ui';

interface RecurringOccurrenceModalProps {
  isOpen: boolean;
  expense: Expense | null;
  canEditRule: boolean;
  isAmbiguousLegacyMatch: boolean;
  missingExplicitRule: boolean;
  onClose: () => void;
  onEditOccurrence: () => void;
  onEditRecurringRule: () => void;
}

export function RecurringOccurrenceModal({
  isOpen,
  expense,
  canEditRule,
  isAmbiguousLegacyMatch,
  missingExplicitRule,
  onClose,
  onEditOccurrence,
  onEditRecurringRule,
}: RecurringOccurrenceModalProps) {
  const { t, i18n } = useTranslation();
  const dir = (i18n.dir && i18n.dir()) || (typeof document !== 'undefined' ? document.documentElement.dir : 'ltr') || 'ltr';

  if (!expense) return null;

  let helperText = t('messages.recurringOccurrenceChoiceDefault');
  if (isAmbiguousLegacyMatch) {
    helperText = t('messages.recurringOccurrenceAmbiguousRule');
  } else if (missingExplicitRule) {
    helperText = t('messages.recurringOccurrenceMissingRule');
  } else if (!canEditRule) {
    helperText = t('messages.recurringOccurrenceNoRule');
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t('labels.recurringOccurrence')}
      subtitle={expense.description}
      dir={dir as 'rtl' | 'ltr'}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">{helperText}</p>
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={onEditOccurrence} variant="secondary">
            {t('buttons.editOccurrence')}
          </Button>
          {canEditRule && (
            <Button onClick={onEditRecurringRule} variant="accent">
              {t('buttons.editRecurringRule')}
            </Button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
