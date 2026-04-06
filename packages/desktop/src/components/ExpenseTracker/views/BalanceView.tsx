import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2, X } from 'lucide-react';
import type {
  Expense,
  Settlement,
  SettlementAllocation,
  PartnerNames,
  HouseholdSettings,
} from '@expenses/shared/types';
import type { Theme } from '../../../lib/theme';
import { getLocalISODate } from '../../../lib/date';
import { calculateBalanceScopes } from '../../../lib/balanceScopes';
import { Button, IconButton } from '../../ui';

type BalanceMode = 'month' | 'cumulative';

interface BalanceViewProps {
  /** All expenses up to (and including) the selected month — used for cumulative settlement balance. */
  expenses: Expense[];
  /** Only the selected month's expenses — used for the partner card and payment breakdown display. */
  monthExpenses: Expense[];
  selectedMonth: number;
  selectedYear: number;
  settlements: Settlement[];
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;
  theme: Theme;
  formatCurrency: (amount: number) => string;
  formatDateLocalized: (date: string) => string;
  withLtr: (content: React.ReactNode) => React.ReactNode;
  getFocusClasses: () => string;
  onRecordSettlement: (settlement: Settlement) => Promise<void>;
  onDeleteSettlement: (id: number) => Promise<void>;
}

export function BalanceView({
  expenses,
  monthExpenses,
  selectedMonth,
  selectedYear,
  settlements,
  partnerNames,
  householdSettings,
  theme: _theme,
  formatCurrency,
  formatDateLocalized,
  withLtr,
  getFocusClasses,
  onRecordSettlement,
  onDeleteSettlement,
}: BalanceViewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const dir = i18n.dir();

  // Settlement modal state
  const [balanceMode, setBalanceMode] = useState<BalanceMode>('month');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    date: getLocalISODate(),
    amount: '',
    from: 'partner1' as 'partner1' | 'partner2',
    to: 'partner2' as 'partner1' | 'partner2',
    note: '',
    linkedExpenseId: '',
    linkedAmount: '',
  });

  // Split mode: Calculate fair share based on household settings
  const splitRatio = householdSettings.splitMode === 'equal'
    ? 0.5
    : Math.max(0.05, Math.min(0.95, householdSettings.partner1Ratio));

  const linkableExpenses = useMemo(
    () =>
      [...expenses]
        .filter(exp => exp.type === 'expense' && (exp.paidBy === 'partner1' || exp.paidBy === 'partner2'))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses]
  );

  const expenseLookup = useMemo(() => {
    const map = new Map<number, Expense>();
    for (const expense of linkableExpenses) {
      map.set(expense.id, expense);
    }
    return map;
  }, [linkableExpenses]);

  const getReimbursementDirection = (expense: Expense) => {
    if (expense.paidBy === 'partner1') {
      return {
        from: 'partner2' as const,
        to: 'partner1' as const,
        recommendedAmount: expense.amount * (1 - splitRatio),
      };
    }
    if (expense.paidBy === 'partner2') {
      return {
        from: 'partner1' as const,
        to: 'partner2' as const,
        recommendedAmount: expense.amount * splitRatio,
      };
    }
    return null;
  };

  const scopes = calculateBalanceScopes(
    monthExpenses,
    expenses,
    settlements,
    selectedYear,
    selectedMonth,
    splitRatio
  );
  const { month, cumulative, settlementsAffectingMonth, settlementsThroughMonth } = scopes;

  const partner1Paid = month.partner1Paid;
  const partner2Paid = month.partner2Paid;

  const partner1SettlementPaid = settlementsAffectingMonth
    .filter(entry => entry.settlement.from === 'partner1' && entry.settlement.to === 'partner2')
    .reduce((sum, entry) => sum + entry.appliedAmount, 0);
  const partner1SettlementReceived = settlementsAffectingMonth
    .filter(entry => entry.settlement.from === 'partner2' && entry.settlement.to === 'partner1')
    .reduce((sum, entry) => sum + entry.appliedAmount, 0);
  const partner2SettlementPaid = partner1SettlementReceived;
  const partner2SettlementReceived = partner1SettlementPaid;
  const partner1NetOutflow = partner1Paid + partner1SettlementPaid - partner1SettlementReceived;
  const partner2NetOutflow = partner2Paid + partner2SettlementPaid - partner2SettlementReceived;

  const jointPaid = monthExpenses
    .filter(exp => exp.paidBy === 'joint' && exp.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const partner1FairShare = month.partner1FairShare;
  const partner2FairShare = month.partner2FairShare;

  // For progress bar display
  const totalAllPayments = partner1Paid + partner2Paid + jointPaid;

  const partner1Balance = balanceMode === 'month' ? month.partner1Balance : cumulative.partner1Balance;
  const partner2Balance = balanceMode === 'month' ? month.partner2Balance : cumulative.partner2Balance;

  const selectedLinkedExpense = settlementForm.linkedExpenseId
    ? expenseLookup.get(Number(settlementForm.linkedExpenseId))
    : undefined;
  const selectedLinkedDirection = selectedLinkedExpense
    ? getReimbursementDirection(selectedLinkedExpense)
    : null;

  const getLinkedExpenseIds = (settlement: Settlement): number[] => {
    if (!Array.isArray(settlement.allocations)) return [];
    return settlement.allocations
      .map(allocation => Number(allocation.expenseId))
      .filter(id => Number.isFinite(id));
  };

  const getLinkedExpenseSummary = (linkedExpenseIds: number[]): string | null => {
    const uniqueIds = [...new Set(linkedExpenseIds)];
    if (uniqueIds.length === 0) return null;
    const labels = uniqueIds.slice(0, 2).map(id => {
      const expense = expenseLookup.get(id);
      if (!expense) return `#${id}`;
      return `${expense.description} (${formatDateLocalized(expense.date)})`;
    });
    const extraCount = uniqueIds.length - labels.length;
    if (extraCount > 0) {
      labels.push(`+${extraCount}`);
    }
    return labels.join(', ');
  };

  const displayedSettlements = balanceMode === 'month'
    ? settlementsAffectingMonth.map(entry => ({
      settlement: entry.settlement,
      amountToShow: entry.appliedAmount,
      linkedExpenseIds: entry.linkedExpenseIds,
      isPartialForScope: Math.abs(entry.appliedAmount - Number(entry.settlement.amount || 0)) > 0.01,
    }))
    : settlementsThroughMonth.map(settlement => ({
      settlement,
      amountToShow: Number(settlement.amount || 0),
      linkedExpenseIds: getLinkedExpenseIds(settlement),
      isPartialForScope: false,
    }));

  const handleLinkedExpenseChange = (linkedExpenseId: string) => {
    if (!linkedExpenseId) {
      setSettlementForm(prev => ({
        ...prev,
        linkedExpenseId: '',
        linkedAmount: '',
      }));
      return;
    }

    const linkedExpense = expenseLookup.get(Number(linkedExpenseId));
    if (!linkedExpense) {
      setSettlementForm(prev => ({
        ...prev,
        linkedExpenseId: '',
        linkedAmount: '',
      }));
      return;
    }

    const direction = getReimbursementDirection(linkedExpense);
    const suggestedAmount = direction?.recommendedAmount ?? 0;
    const suggestedAmountText = suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '';

    setSettlementForm(prev => ({
      ...prev,
      linkedExpenseId,
      linkedAmount: prev.linkedAmount || prev.amount || suggestedAmountText,
      amount: prev.amount || suggestedAmountText,
      from: direction?.from ?? prev.from,
      to: direction?.to ?? prev.to,
    }));
  };

  const handleRecordSettlement = async () => {
    const amount = parseFloat(settlementForm.amount);
    if (!amount || amount <= 0) {
      alert(t('errors.settlementAmountInvalid'));
      return;
    }
    if (settlementForm.from === settlementForm.to) {
      alert(t('errors.settlementSamePartner'));
      return;
    }

    let allocations: SettlementAllocation[] | undefined;
    if (settlementForm.linkedExpenseId) {
      const linkedExpenseId = Number(settlementForm.linkedExpenseId);
      const linkedAmount = parseFloat(settlementForm.linkedAmount || settlementForm.amount);
      if (!Number.isFinite(linkedExpenseId) || !expenseLookup.has(linkedExpenseId)) {
        alert(t('errors.invalidSelection', 'Please select a valid expense to link'));
        return;
      }
      if (!Number.isFinite(linkedAmount) || linkedAmount <= 0) {
        alert(t('errors.invalidAmount', 'Please enter a valid linked amount'));
        return;
      }
      if (linkedAmount > amount) {
        alert(t('errors.linkedAmountTooHigh', 'Linked amount cannot exceed settlement amount'));
        return;
      }
      allocations = [{ expenseId: linkedExpenseId, amount: linkedAmount }];
    }

    const newSettlement: Settlement = {
      id: Date.now(),
      date: settlementForm.date,
      amount,
      from: settlementForm.from,
      to: settlementForm.to,
      note: settlementForm.note,
      allocations,
    };

    await onRecordSettlement(newSettlement);
    setShowSettlementModal(false);
    setSettlementForm({
      date: getLocalISODate(),
      amount: '',
      from: 'partner1',
      to: 'partner2',
      note: '',
      linkedExpenseId: '',
      linkedAmount: '',
    });
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h3 className="text-lg sm:text-xl font-bold mb-1">{t('labels.balanceSettlement')}</h3>
          <p className="text-xs text-slate-400 mb-4 sm:mb-6">
            {t('labels.monthlyContributions', 'This month\'s contributions')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-slate-800/60 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-900/20">
              <div className="text-slate-400 text-xs sm:text-sm mb-2 truncate">
                {partnerNames.partner1}
              </div>
              <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words">
                {withLtr(formatCurrency(partner1NetOutflow))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.paid')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner1Paid))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.fairShare')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner1FairShare))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.settlementsPaid', 'Settlements paid')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner1SettlementPaid))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.settlementsReceived', 'Settlements received')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner1SettlementReceived))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.netOutflow', 'Net outflow')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner1NetOutflow))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-900/20">
              <div className="text-slate-400 text-xs sm:text-sm mb-2 truncate">
                {partnerNames.partner2}
              </div>
              <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 break-words">
                {withLtr(formatCurrency(partner2NetOutflow))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.paid')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner2Paid))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.fairShare')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner2FairShare))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.settlementsPaid', 'Settlements paid')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner2SettlementPaid))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.settlementsReceived', 'Settlements received')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner2SettlementReceived))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{t('labels.netOutflow', 'Net outflow')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(partner2NetOutflow))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <div className="inline-flex bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setBalanceMode('month')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                  balanceMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t('labels.monthOnly', 'Month only')}
              </button>
              <button
                type="button"
                onClick={() => setBalanceMode('cumulative')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                  balanceMode === 'cumulative'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t('labels.cumulativeWithSettlements', 'Cumulative + settlements')}
              </button>
            </div>
          </div>

          {/* Settlement summary */}
          {Math.abs(partner1Balance) < 0.01 ? (
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h4 className="text-xl font-bold text-green-400 mb-2">{t('messages.perfectBalance')}</h4>
              <p className="text-slate-300">
                {balanceMode === 'month'
                  ? t('messages.monthBalanced', 'Selected month is balanced')
                  : t('messages.allSettled')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {balanceMode === 'month'
                  ? t('labels.monthOnlyScope', 'Selected month (including that month settlements)')
                  : t('labels.cumulativeBalance', 'Running total through selected month')}
              </p>
            </div>
          ) : (
            <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-6">
              <div className="text-center">
                <div className="text-lg font-bold mb-1">{t('messages.settlementRequired')}</div>
                <div className="text-xs text-slate-400 mb-2">
                  {balanceMode === 'month'
                    ? t('labels.monthOnlyScope', 'Selected month (including that month settlements)')
                    : t('labels.cumulativeBalance', 'Running total through selected month')}
                </div>
                {householdSettings.splitMode === 'proportional' && (
                  <div className="text-xs text-slate-400 mb-2">
                    {t('labels.splitRatio')}: {withLtr(`${(splitRatio * 100).toFixed(0)}% / ${((1-splitRatio) * 100).toFixed(0)}%`)}
                  </div>
                )}
                {partner1Balance > 0 ? (
                  <div>
                    <div className="text-2xl font-bold mb-2">
                      {t('messages.partnerOwes', { from: partnerNames.partner2, to: partnerNames.partner1 })}
                    </div>
                    <div className="text-4xl font-bold text-yellow-400">
                      {withLtr(formatCurrency(Math.abs(partner1Balance)))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold mb-2">
                      {t('messages.partnerOwes', { from: partnerNames.partner1, to: partnerNames.partner2 })}
                    </div>
                    <div className="text-4xl font-bold text-yellow-400">
                      {withLtr(formatCurrency(Math.abs(partner2Balance)))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">{t('labels.paymentBreakdown')}</h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex justify-between mb-2 gap-2">
                <span className="font-medium text-sm sm:text-base truncate">{partnerNames.partner1}</span>
                <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{withLtr(formatCurrency(partner1Paid))}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                <div
                  className="bg-blue-500 h-2 sm:h-3 rounded-full transition-all"
                  style={{ width: `${(partner1Paid / (totalAllPayments || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 gap-2">
                <span className="font-medium text-sm sm:text-base truncate">{partnerNames.partner2}</span>
                <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{withLtr(formatCurrency(partner2Paid))}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                <div
                  className="bg-purple-500 h-2 sm:h-3 rounded-full transition-all"
                  style={{ width: `${(partner2Paid / (totalAllPayments || 1)) * 100}%` }}
                />
              </div>
            </div>
            {jointPaid > 0 && (
              <div>
                <div className="flex justify-between mb-2 gap-2">
                  <span className="font-medium text-sm sm:text-base">{t('labels.joint')}</span>
                  <span className="text-slate-400 text-sm sm:text-base whitespace-nowrap">{withLtr(formatCurrency(jointPaid))}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3">
                  <div
                    className="bg-green-500 h-2 sm:h-3 rounded-full transition-all"
                    style={{ width: `${(jointPaid / (totalAllPayments || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settlements section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{t('labels.settlements')}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {balanceMode === 'month'
                  ? t('labels.selectedMonthSettlements', 'Showing settlements from selected month')
                  : t('labels.allSettlements', 'Showing settlements through selected month')}
              </p>
            </div>
            <Button
              onClick={() => setShowSettlementModal(true)}
              variant="accent"
              iconStart={<PlusCircle className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              {t('buttons.recordPayment')}
            </Button>
          </div>

          {displayedSettlements.length === 0 ? (
            <p className="text-slate-400 text-center py-4 text-sm">
              {balanceMode === 'month'
                ? t('messages.noSettlementsInMonth', 'No settlements in selected month')
                : t('messages.noSettlements')}
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {[...displayedSettlements]
                .sort((a, b) => b.settlement.date.localeCompare(a.settlement.date))
                .map(({ settlement, amountToShow, linkedExpenseIds, isPartialForScope }) => (
                  <div
                    key={settlement.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm sm:text-base truncate">
                          {settlement.from === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                        </span>
                        <span className="text-slate-400 flex-shrink-0">{isRTL ? '←' : '→'}</span>
                        <span className="font-medium text-sm sm:text-base truncate">
                          {settlement.to === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 flex-wrap">
                        <span className="whitespace-nowrap">{formatDateLocalized(settlement.date)}</span>
                        {settlement.note && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">{settlement.note}</span>
                          </>
                        )}
                      </div>
                      {linkedExpenseIds.length > 0 && (
                        <div className="text-xs text-slate-400 mt-1 truncate">
                          {t('labels.linkedToExpense', 'Linked to expense')}: {getLinkedExpenseSummary(linkedExpenseIds)}
                        </div>
                      )}
                      {balanceMode === 'month' && isPartialForScope && (
                        <div className="text-xs text-slate-500 mt-1">
                          {t('labels.appliedInSelectedMonth', 'Applied in selected month')}:{' '}
                          {withLtr(
                            `${formatCurrency(amountToShow)} / ${formatCurrency(Number(settlement.amount || 0))}`
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-xl font-bold text-green-400">
                        {withLtr(formatCurrency(amountToShow))}
                      </span>
                      <IconButton
                        onClick={() => onDeleteSettlement(settlement.id)}
                        variant="danger"
                        size="sm"
                        title={t('tooltips.deleteSettlement')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Settlement recording modal */}
      {showSettlementModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowSettlementModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('labels.recordSettlement')}</h3>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.date')}</label>
                <input
                  type="date"
                  value={settlementForm.date}
                  onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  {t('labels.linkExpenseOptional', 'Link to expense (optional)')}
                </label>
                <select
                  value={settlementForm.linkedExpenseId}
                  onChange={(e) => handleLinkedExpenseChange(e.target.value)}
                  dir={dir}
                  className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                >
                  <option value="">{t('labels.noLinkedExpense', 'No linked expense')}</option>
                  {linkableExpenses.map(expense => (
                    <option key={expense.id} value={expense.id}>
                      {`${formatDateLocalized(expense.date)} - ${expense.description} - ${formatCurrency(expense.amount)}`}
                    </option>
                  ))}
                </select>
              </div>

              {settlementForm.linkedExpenseId && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {t('labels.linkedAmount', 'Amount applied to linked expense')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settlementForm.linkedAmount}
                    onChange={(e) => setSettlementForm({ ...settlementForm, linkedAmount: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    placeholder={t('placeholders.amountApplied', '0.00')}
                  />
                  {selectedLinkedExpense && selectedLinkedDirection && (
                    <p className="text-xs text-slate-400 mt-2">
                      {t('labels.recommendedSettlement', 'Recommended for this expense')}:{' '}
                      {withLtr(formatCurrency(selectedLinkedDirection.recommendedAmount))}{' '}
                      ({selectedLinkedDirection.from === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}{' '}
                      {'->'}{' '}
                      {selectedLinkedDirection.to === 'partner1' ? partnerNames.partner1 : partnerNames.partner2})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.from')}</label>
                <select
                  value={settlementForm.from}
                  onChange={(e) => setSettlementForm({ ...settlementForm, from: e.target.value as 'partner1' | 'partner2' })}
                  disabled={Boolean(settlementForm.linkedExpenseId)}
                  dir={dir}
                  className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                >
                  <option value="partner1">{partnerNames.partner1}</option>
                  <option value="partner2">{partnerNames.partner2}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.to')}</label>
                <select
                  value={settlementForm.to}
                  onChange={(e) => setSettlementForm({ ...settlementForm, to: e.target.value as 'partner1' | 'partner2' })}
                  disabled={Boolean(settlementForm.linkedExpenseId)}
                  dir={dir}
                  className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                >
                  <option value="partner1">{partnerNames.partner1}</option>
                  <option value="partner2">{partnerNames.partner2}</option>
                </select>
                {settlementForm.linkedExpenseId && (
                  <p className="text-xs text-slate-500 mt-2">
                    {t('labels.directionLockedByLink', 'Direction is set by the linked expense')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.noteOptional')}</label>
                <input
                  type="text"
                  value={settlementForm.note}
                  onChange={(e) => setSettlementForm({ ...settlementForm, note: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  placeholder={t('placeholders.transferExample')}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowSettlementModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={handleRecordSettlement}
                  variant="accent"
                  className="flex-1"
                >
                  {t('buttons.recordPayment')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
