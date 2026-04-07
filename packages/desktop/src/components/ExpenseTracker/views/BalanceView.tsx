import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, HelpCircle, Pencil, PlusCircle, Trash2, X } from 'lucide-react';
import type {
  Expense,
  Settlement,
  SettlementAllocation,
  SettlementRemainderMode,
  PartnerNames,
  HouseholdSettings,
} from '@expenses/shared/types';
import type { Theme } from '../../../lib/theme';
import { getLocalISODate } from '../../../lib/date';
import {
  getLinkableExpenseAvailabilities,
  getReimbursementDirectionForExpense,
} from '../../../lib/settlementAllocation';
import {
  buildBalanceViewModel,
  type BalanceMode,
  type DisplayedSettlementModel,
} from '../../../lib/balanceViewModel';
import { Button, IconButton } from '../../ui';

interface SettlementAllocationFormRow {
  id: number;
  expenseId: string;
  amount: string;
}

type SettlementDirection = {
  from: 'partner1' | 'partner2';
  to: 'partner1' | 'partner2';
};

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
  onUpdateSettlement: (settlement: Settlement) => Promise<void>;
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
  formatCurrency,
  formatDateLocalized,
  withLtr,
  getFocusClasses,
  onRecordSettlement,
  onUpdateSettlement,
  onDeleteSettlement,
}: BalanceViewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const dir = i18n.dir();

  const createAllocationRow = (): SettlementAllocationFormRow => ({
    id: Date.now() + Math.floor(Math.random() * 10000),
    expenseId: '',
    amount: '',
  });
  const roundDownToCents = (value: number): number =>
    Math.floor((Math.max(0, value) + 1e-9) * 100) / 100;
  const toAmountInput = (value: number): string => roundDownToCents(value).toFixed(2);

  const toYearMonth = (isoDate: string): string => {
    if (!isoDate || isoDate.length < 7) return getLocalISODate().slice(0, 7);
    return isoDate.slice(0, 7);
  };

  // Settlement modal state
  const [balanceMode, setBalanceMode] = useState<BalanceMode>('month');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [editingSettlementId, setEditingSettlementId] = useState<number | null>(null);
  const [showAllEligibleExpenses, setShowAllEligibleExpenses] = useState(false);
  const createDefaultSettlementForm = () => ({
    date: getLocalISODate(),
    amount: '',
    from: 'partner1' as 'partner1' | 'partner2',
    to: 'partner2' as 'partner1' | 'partner2',
    note: '',
    remainderMode: 'payment_month' as SettlementRemainderMode,
    remainderMonth: toYearMonth(getLocalISODate()),
    allocationRows: [] as SettlementAllocationFormRow[],
  });
  const [settlementForm, setSettlementForm] = useState({
    ...createDefaultSettlementForm(),
  });

  // Split mode: Calculate fair share based on household settings
  const splitRatio = householdSettings.splitMode === 'equal'
    ? 0.5
    : Math.max(0.05, Math.min(0.95, householdSettings.partner1Ratio));

  const allLinkableExpenses = useMemo(
    () =>
      [...expenses]
        .filter(exp => exp.type === 'expense' && (exp.paidBy === 'partner1' || exp.paidBy === 'partner2'))
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          if (byDate !== 0) return byDate;
          return a.id - b.id;
        }),
    [expenses]
  );

  const linkableExpenseAvailabilities = useMemo(
    () =>
      getLinkableExpenseAvailabilities(
        allLinkableExpenses,
        settlements,
        splitRatio,
        editingSettlementId
      ),
    [allLinkableExpenses, settlements, splitRatio, editingSettlementId]
  );

  const linkableExpenseAvailabilityById = useMemo(() => {
    const map = new Map<number, (typeof linkableExpenseAvailabilities)[number]>();
    for (const availability of linkableExpenseAvailabilities) {
      map.set(availability.expense.id, availability);
    }
    return map;
  }, [linkableExpenseAvailabilities]);

  const expenseLookup = useMemo(() => {
    const map = new Map<number, Expense>();
    for (const expense of allLinkableExpenses) {
      map.set(expense.id, expense);
    }
    return map;
  }, [allLinkableExpenses]);

  const getReimbursementDirection = (expense: Expense) =>
    getReimbursementDirectionForExpense(expense, splitRatio);

  const viewModel = useMemo(
    () =>
      buildBalanceViewModel({
        monthExpenses,
        expenses,
        settlements,
        selectedYear,
        selectedMonth,
        splitRatio,
        balanceMode,
      }),
    [monthExpenses, expenses, settlements, selectedYear, selectedMonth, splitRatio, balanceMode]
  );

  const activeScopeExpenses = balanceMode === 'month' ? monthExpenses : expenses;
  const activeScopeExpenseIds = useMemo(
    () => new Set(activeScopeExpenses.map(expense => expense.id)),
    [activeScopeExpenses]
  );
  const scopeFirstLinkableExpenseAvailabilities = useMemo(
    () =>
      linkableExpenseAvailabilities.filter(availability =>
        activeScopeExpenseIds.has(availability.expense.id)
      ),
    [linkableExpenseAvailabilities, activeScopeExpenseIds]
  );
  const historicalLinkableExpenseAvailabilities = useMemo(
    () =>
      linkableExpenseAvailabilities.filter(
        availability => !activeScopeExpenseIds.has(availability.expense.id)
      ),
    [linkableExpenseAvailabilities, activeScopeExpenseIds]
  );
  const hasHistoricalEligibleExpenses = historicalLinkableExpenseAvailabilities.some(
    availability => !availability.isFullyLinked
  );

  const { topSummary, paymentBreakdown, explanation, expenseShareBreakdown, reconciliation } = viewModel;
  const partner1Paid = paymentBreakdown.partner1Paid;
  const partner2Paid = paymentBreakdown.partner2Paid;
  const partner1SettlementPaid = explanation.partner1.settlementsPaid;
  const partner1SettlementReceived = explanation.partner1.settlementsReceived;
  const partner2SettlementPaid = explanation.partner2.settlementsPaid;
  const partner2SettlementReceived = explanation.partner2.settlementsReceived;
  const partner1ExpenseDelta = explanation.partner1.expenseDelta;
  const partner2ExpenseDelta = explanation.partner2.expenseDelta;
  const partner1EquationResult = explanation.partner1.finalBalance;
  const partner2EquationResult = explanation.partner2.finalBalance;
  const jointPaid = paymentBreakdown.jointPaid;
  const totalAllPayments = paymentBreakdown.totalAllPayments;

  const getDirectionForExpenseId = (expenseIdRaw: string) => {
    const expense = expenseLookup.get(Number(expenseIdRaw));
    if (!expense) return null;
    return getReimbursementDirection(expense);
  };

  const resolveLinkedDirection = (rows: SettlementAllocationFormRow[]) => {
    let resolved: SettlementDirection | null = null;
    for (const row of rows) {
      if (!row.expenseId) continue;
      const direction = getDirectionForExpenseId(row.expenseId);
      if (!direction) continue;
      if (!resolved) {
        resolved = { from: direction.from, to: direction.to };
        continue;
      }
      if (resolved.from !== direction.from || resolved.to !== direction.to) {
        return 'mixed' as const;
      }
    }
    return resolved;
  };

  const availabilityMatchesDirection = (
    expense: Expense,
    direction: SettlementDirection | null
  ) => {
    if (!direction) return true;
    const reimbursementDirection = getReimbursementDirection(expense);
    return (
      reimbursementDirection?.from === direction.from &&
      reimbursementDirection?.to === direction.to
    );
  };

  const getAllocatedExpenseSummary = (linkedExpenseIds: number[]): string | null => {
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

  const getRemainderModeLabel = (settlement: Settlement): string => {
    if (settlement.remainderMode === 'specific_month') {
      return settlement.remainderMonth
        ? t('labels.remainderSpecificMonthValue', 'Remainder -> {{month}}', { month: settlement.remainderMonth })
        : t('labels.remainderSpecificMonth', 'Apply to selected month');
    }
    if (settlement.remainderMode === 'oldest_open_debt') {
      return t('labels.remainderOldestDebt', 'Apply to oldest open debt');
    }
    return t('labels.remainderPaymentMonth', 'Apply to payment month');
  };

  const displayedSettlements = viewModel.displayedSettlements;
  const unallocatedSettlements = viewModel.unallocatedSettlements;

  const linkedDirection = resolveLinkedDirection(settlementForm.allocationRows);
  const hasLinkedRows = settlementForm.allocationRows.some(row => row.expenseId);
  const hasAllocationDirectionConflict = linkedDirection === 'mixed';
  const effectiveAllocationDirection: SettlementDirection | null =
    linkedDirection && linkedDirection !== 'mixed'
      ? linkedDirection
      : {
          from: settlementForm.from,
          to: settlementForm.to,
        };
  const isAllocationDirectionControlledByRows =
    hasLinkedRows && linkedDirection !== 'mixed' && linkedDirection !== null;

  const getSelectableAvailabilities = (selectedExpenseId: number | null) => {
    const selectedAvailability =
      selectedExpenseId !== null ? linkableExpenseAvailabilityById.get(selectedExpenseId) : undefined;
    const items = new Map<number, (typeof linkableExpenseAvailabilities)[number]>();

    const pushAvailabilities = (availabilities: typeof linkableExpenseAvailabilities) => {
      for (const availability of availabilities) {
        const isSelected = availability.expense.id === selectedExpenseId;
        if (availability.isFullyLinked && !isSelected) continue;
        if (hasAllocationDirectionConflict) {
          if (isSelected) {
            items.set(availability.expense.id, availability);
          }
          continue;
        }
        if (!isSelected && !availabilityMatchesDirection(availability.expense, effectiveAllocationDirection)) {
          continue;
        }
        items.set(availability.expense.id, availability);
      }
    };

    pushAvailabilities(scopeFirstLinkableExpenseAvailabilities);
    if (showAllEligibleExpenses) {
      pushAvailabilities(historicalLinkableExpenseAvailabilities);
    } else if (selectedAvailability && !activeScopeExpenseIds.has(selectedAvailability.expense.id)) {
      items.set(selectedAvailability.expense.id, selectedAvailability);
    }

    return [...items.values()];
  };

  const availableDirectionalAvailabilities = getSelectableAvailabilities(null);
  const linkedDraftTotal = settlementForm.allocationRows.reduce((sum, row) => {
    const rowAmount = Number(row.amount);
    return Number.isFinite(rowAmount) && rowAmount > 0 ? sum + rowAmount : sum;
  }, 0);
  const hasAvailableLinkableExpenses =
    !hasAllocationDirectionConflict && availableDirectionalAvailabilities.length > 0;
  const settlementAmountDraft = Number(settlementForm.amount);
  const unallocatedRemainderDraft = Number.isFinite(settlementAmountDraft)
    ? settlementAmountDraft - linkedDraftTotal
    : 0;
  const hasPositiveRemainderDraft =
    Number.isFinite(unallocatedRemainderDraft) && unallocatedRemainderDraft > 0.000001;

  const getAllocationStatusLabel = (status: DisplayedSettlementModel['allocationStatus']) =>
    t(`labels.settlementAllocationStatus.${status}`, status);

  const getAllocationStatusClasses = (status: DisplayedSettlementModel['allocationStatus']) => {
    if (status === 'fully_allocated') {
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    }
    if (status === 'partially_allocated') {
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    }
    return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  };

  const getAutoAllocationCandidates = () => {
    if (hasAllocationDirectionConflict) return [];
    const direction =
      effectiveAllocationDirection ?? {
        from: settlementForm.from,
        to: settlementForm.to,
      };

    const scopedCandidates = scopeFirstLinkableExpenseAvailabilities.filter(availability => {
      if (availability.isFullyLinked) return false;
      return availabilityMatchesDirection(availability.expense, direction);
    });

    if (!showAllEligibleExpenses) return scopedCandidates;

    const historicalCandidates = historicalLinkableExpenseAvailabilities.filter(availability => {
      if (availability.isFullyLinked) return false;
      return availabilityMatchesDirection(availability.expense, direction);
    });

    return [...scopedCandidates, ...historicalCandidates];
  };
  const autoAllocationCandidates = getAutoAllocationCandidates();

  const syncFormDirectionFromRows = (rows: SettlementAllocationFormRow[]) => {
    const direction = resolveLinkedDirection(rows);
    setSettlementForm(prev => {
      if (direction === 'mixed' || !direction) {
        return { ...prev, allocationRows: rows };
      }
      return {
        ...prev,
        allocationRows: rows,
        from: direction.from,
        to: direction.to,
      };
    });
  };

  const addAllocationRow = () => {
    syncFormDirectionFromRows([...settlementForm.allocationRows, createAllocationRow()]);
  };

  const removeAllocationRow = (rowId: number) => {
    syncFormDirectionFromRows(settlementForm.allocationRows.filter(row => row.id !== rowId));
  };

  const updateAllocationRow = (
    rowId: number,
    patch: Partial<Omit<SettlementAllocationFormRow, 'id'>>
  ) => {
    const rows = settlementForm.allocationRows.map(row => {
      if (row.id !== rowId) return row;

      const nextRow = { ...row, ...patch };
      if (patch.expenseId !== undefined && patch.expenseId) {
        const expenseId = Number(patch.expenseId);
        const expense = expenseLookup.get(expenseId);
        const direction = expense ? getReimbursementDirection(expense) : null;
        const availability = linkableExpenseAvailabilityById.get(expenseId);
        const suggestedAmount = Math.max(
          0,
          Math.min(
            direction?.recommendedAmount ?? 0,
            availability?.remaining ?? 0
          )
        );
        if (!nextRow.amount && suggestedAmount > 0) {
          nextRow.amount = toAmountInput(suggestedAmount);
        }
      }
      return nextRow;
    });

    syncFormDirectionFromRows(rows);
  };

  const autoAllocateOldestFirst = () => {
    if (!Number.isFinite(settlementAmountDraft) || settlementAmountDraft <= 0) return;

    let remainingToAllocate = settlementAmountDraft;
    const rows: SettlementAllocationFormRow[] = [];
    for (const availability of getAutoAllocationCandidates()) {
      if (remainingToAllocate <= 0) break;

      const allocatedAmount = roundDownToCents(
        Math.min(availability.remaining, remainingToAllocate)
      );
      if (allocatedAmount <= 0) continue;

      rows.push({
        id: Date.now() + rows.length,
        expenseId: String(availability.expense.id),
        amount: toAmountInput(allocatedAmount),
      });
      remainingToAllocate -= allocatedAmount;
    }

    if (rows.length > 0) {
      syncFormDirectionFromRows(rows);
    }
  };

  const closeSettlementModal = () => {
    setShowSettlementModal(false);
    setEditingSettlementId(null);
    setShowAllEligibleExpenses(false);
    setSettlementForm(createDefaultSettlementForm());
  };

  const openNewSettlementModal = () => {
    setEditingSettlementId(null);
    setShowAllEligibleExpenses(false);
    setSettlementForm(createDefaultSettlementForm());
    setShowSettlementModal(true);
  };

  const openEditSettlementModal = (settlement: Settlement) => {
    const allocationRows: SettlementAllocationFormRow[] = Array.isArray(settlement.allocations)
      ? settlement.allocations.map((allocation, index) => ({
        id: Date.now() + index,
        expenseId: String(allocation.expenseId),
        amount: String(allocation.amount),
      }))
      : [];

    setEditingSettlementId(settlement.id);
    setShowAllEligibleExpenses(false);
    const settlementDate = settlement.date || getLocalISODate();
    setSettlementForm({
      date: settlementDate,
      amount: String(settlement.amount ?? ''),
      from: settlement.from,
      to: settlement.to,
      note: settlement.note || '',
      remainderMode: settlement.remainderMode || 'payment_month',
      remainderMonth: settlement.remainderMonth || toYearMonth(settlementDate),
      allocationRows,
    });
    setShowSettlementModal(true);
  };

  const handleSaveSettlement = async () => {
    const amount = parseFloat(settlementForm.amount);
    if (!amount || amount <= 0) {
      alert(t('errors.settlementAmountInvalid'));
      return;
    }

    const activeRows = settlementForm.allocationRows.filter(row => row.expenseId || row.amount);
    const parsedAllocations: SettlementAllocation[] = [];
    let linkedDirectionCandidate: { from: 'partner1' | 'partner2'; to: 'partner1' | 'partner2' } | null = null;

    for (const row of activeRows) {
      if (!row.expenseId || !row.amount) {
        alert(t('errors.invalidSelection', 'Please complete each linked expense row'));
        return;
      }

      const linkedExpenseId = Number(row.expenseId);
      const linkedAmount = Number(row.amount);
      if (!Number.isFinite(linkedExpenseId) || !expenseLookup.has(linkedExpenseId)) {
        alert(t('errors.invalidSelection', 'Please select a valid expense to allocate'));
        return;
      }
      if (!Number.isFinite(linkedAmount) || linkedAmount <= 0) {
        alert(t('errors.invalidAmount', 'Please enter a valid allocated amount'));
        return;
      }
      const linkedAvailability = linkableExpenseAvailabilityById.get(linkedExpenseId);
      if (!linkedAvailability || linkedAvailability.isFullyLinked) {
        alert(t('errors.invalidSelection', 'Please select a valid expense to allocate'));
        return;
      }
      if (linkedAmount - linkedAvailability.remaining > 0.000001) {
        alert(
          t(
            'errors.linkedAmountExceedsRemaining',
            'Allocated amount exceeds the remaining amount available for this expense'
          )
        );
        return;
      }
      if (parsedAllocations.some(allocation => allocation.expenseId === linkedExpenseId)) {
        alert(t('errors.invalidSelection', 'You cannot link the same expense twice in one settlement'));
        return;
      }

      const linkedExpense = expenseLookup.get(linkedExpenseId)!;
      const direction = getReimbursementDirection(linkedExpense);
      if (!direction) {
        alert(t('errors.invalidSelection', 'Linked expense must be paid by one partner'));
        return;
      }
      if (!linkedDirectionCandidate) {
        linkedDirectionCandidate = { from: direction.from, to: direction.to };
      } else if (
        linkedDirectionCandidate.from !== direction.from ||
        linkedDirectionCandidate.to !== direction.to
      ) {
        alert(
          t(
            'errors.linkedDirectionMismatch',
            'Allocated expenses with opposite reimbursement directions must be split into separate settlements'
          )
        );
        return;
      }

      parsedAllocations.push({ expenseId: linkedExpenseId, amount: linkedAmount });
    }

    const totalLinked = parsedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (totalLinked - amount > 0.000001) {
      alert(t('errors.linkedAmountTooHigh', 'Allocated amount cannot exceed settlement amount'));
      return;
    }
    const hasRemainder = amount - totalLinked > 0.000001;
    const remainderMode = settlementForm.remainderMode;
    const remainderMonthValue =
      remainderMode === 'specific_month' ? settlementForm.remainderMonth.trim() : '';
    if (hasRemainder && remainderMode === 'specific_month' && !/^\d{4}-\d{2}$/.test(remainderMonthValue)) {
      alert(t('errors.invalidSelection', 'Please select a valid month for remainder allocation'));
      return;
    }

    const from = linkedDirectionCandidate ? linkedDirectionCandidate.from : settlementForm.from;
    const to = linkedDirectionCandidate ? linkedDirectionCandidate.to : settlementForm.to;
    if (from === to) {
      alert(t('errors.settlementSamePartner'));
      return;
    }

    const allocations = parsedAllocations.length > 0 ? parsedAllocations : undefined;

    const newSettlement: Settlement = {
      id: editingSettlementId ?? Date.now(),
      date: settlementForm.date,
      amount,
      from,
      to,
      note: settlementForm.note,
      allocations,
      remainderMode,
      remainderMonth: remainderMode === 'specific_month' ? remainderMonthValue : undefined,
    };

    if (editingSettlementId !== null) {
      await onUpdateSettlement(newSettlement);
    } else {
      await onRecordSettlement(newSettlement);
    }

    closeSettlementModal();
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h3 className="text-lg sm:text-xl font-bold mb-1">{t('labels.balanceOverview', 'Balance overview')}</h3>
          <p className="text-xs text-slate-400 mb-4 sm:mb-6">
            {balanceMode === 'month'
              ? t('labels.monthlyContributions', 'This month\'s contributions')
              : t('labels.cumulativeContributions', 'Cumulative contributions through selected month')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-slate-800/60 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-900/20">
              <div className="flex items-center gap-2 text-slate-200 text-xs sm:text-sm mb-3">
                <span>{t('labels.cashFlow', 'Cash flow')}</span>
                <span
                  title={t('tooltips.cashFlow', 'Cash flow = paid + settlements paid - settlements received')}
                  aria-label={t('tooltips.cashFlow', 'Cash flow = paid + settlements paid - settlements received')}
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{partnerNames.partner1}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(viewModel.cashFlow.partner1))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{partnerNames.partner2}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(viewModel.cashFlow.partner2))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2 border-t border-slate-700 pt-2">
                  <span className="text-slate-400">{t('labels.paid')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(viewModel.activeScope.partner1Paid + viewModel.activeScope.partner2Paid))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-900/20">
              <div className="flex items-center gap-2 text-slate-200 text-xs sm:text-sm mb-3">
                <span>{t('labels.fairSplitResult', 'Fair split result')}</span>
                <span
                  title={t('tooltips.fairSplitResult', 'Fair split result = paid - fair share (before settlements)')}
                  aria-label={t('tooltips.fairSplitResult', 'Fair split result = paid - fair share (before settlements)')}
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{partnerNames.partner1}</span>
                  <span className={`font-medium break-words text-right ${viewModel.fairSplitResult.partner1 >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                    {withLtr(formatCurrency(viewModel.fairSplitResult.partner1))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-slate-400">{partnerNames.partner2}</span>
                  <span className={`font-medium break-words text-right ${viewModel.fairSplitResult.partner2 >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                    {withLtr(formatCurrency(viewModel.fairSplitResult.partner2))}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2 border-t border-slate-700 pt-2">
                  <span className="text-slate-400">{t('labels.fairShare')}</span>
                  <span className="font-medium break-words text-right">
                    {withLtr(formatCurrency(viewModel.activeScope.partner1FairShare + viewModel.activeScope.partner2FairShare))}
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
          {topSummary.isBalanced ? (
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h4 className="text-xl font-bold text-green-400 mb-2">{t('messages.balanced', 'Balanced')}</h4>
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
                {topSummary.from === 'partner2' && topSummary.to === 'partner1' ? (
                  <div>
                    <div className="text-2xl font-bold mb-2">
                      {t('messages.partnerOwes', { from: partnerNames.partner2, to: partnerNames.partner1 })}
                    </div>
                    <div className="text-4xl font-bold text-yellow-400">
                      {withLtr(formatCurrency(topSummary.amount))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold mb-2">
                      {t('messages.partnerOwes', { from: partnerNames.partner1, to: partnerNames.partner2 })}
                    </div>
                    <div className="text-4xl font-bold text-yellow-400">
                      {withLtr(formatCurrency(topSummary.amount))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {reconciliation.showWarning && (
            <div className="mt-4 rounded-xl border border-amber-600/70 bg-amber-900/20 p-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-amber-200 font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('labels.reconciliationWarning', 'Reconciliation warning')}</span>
              </div>
              <div className="text-slate-200 space-y-1">
                <div className="flex justify-between gap-2">
                  <span>{partnerNames.partner1}</span>
                  <span>{withLtr(formatCurrency(reconciliation.partner1Balance))}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{partnerNames.partner2}</span>
                  <span>{withLtr(formatCurrency(reconciliation.partner2Balance))}</span>
                </div>
                <div className="flex justify-between gap-2 border-t border-amber-700/50 pt-1">
                  <span>{t('labels.netMismatch', 'Net mismatch')}</span>
                  <span>{withLtr(formatCurrency(reconciliation.netMismatch))}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Balance explanation */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h3 className="text-lg sm:text-xl font-bold mb-1">
            {t('labels.balanceExplanation', 'Why this balance')}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {balanceMode === 'month'
              ? t('labels.monthOnlyScope', 'Selected month (including that month settlements)')
              : t('labels.cumulativeBalance', 'Running total through selected month')}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            {t('labels.finalBalanceEquation', 'final balance = expense delta + settlements paid - settlements received')}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5 text-xs sm:text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-100">{partnerNames.partner1}</div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.owedFromPartner2Expenses', '{{name}} share from {{other}}-paid expenses', {
                    name: partnerNames.partner1,
                    other: partnerNames.partner2,
                  })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(expenseShareBreakdown.partner1OwesTotal))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.creditFromPartner1Expenses', '{{name}} credit from own-paid shared expenses', {
                    name: partnerNames.partner1,
                  })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(expenseShareBreakdown.partner2OwesTotal))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span
                  className="text-slate-400 inline-flex items-center gap-1"
                  title={t('tooltips.expenseDelta', 'Expense delta = paid - fair share')}
                >
                  {t('labels.expenseDelta', 'Expense delta (paid - fair share)')}
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                </span>
                <span className={`font-medium ${partner1ExpenseDelta >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                  {withLtr(formatCurrency(partner1ExpenseDelta))}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.settlementsPaidBy', 'Settlements paid by {{name}}', { name: partnerNames.partner1 })}{' '}
                  <span
                    className="inline-flex align-middle"
                    title={t('tooltips.settlementEffect', 'Settlements paid increase this partner final balance in this equation')}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                </span>
                <span className="font-medium">{withLtr(formatCurrency(partner1SettlementPaid))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.settlementsReceivedBy', 'Settlements received by {{name}}', { name: partnerNames.partner1 })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(partner1SettlementReceived))}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between gap-2">
                <span className="text-slate-300 font-semibold">
                  {t('labels.finalBalanceFor', 'Final balance for {{name}}', { name: partnerNames.partner1 })}
                </span>
                <span className={`font-semibold ${partner1EquationResult >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                  {withLtr(formatCurrency(partner1EquationResult))}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-100">{partnerNames.partner2}</div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.owedFromPartner2Expenses', '{{name}} share from {{other}}-paid expenses', {
                    name: partnerNames.partner2,
                    other: partnerNames.partner1,
                  })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(expenseShareBreakdown.partner2OwesTotal))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.creditFromPartner1Expenses', '{{name}} credit from own-paid shared expenses', {
                    name: partnerNames.partner2,
                  })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(expenseShareBreakdown.partner1OwesTotal))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span
                  className="text-slate-400 inline-flex items-center gap-1"
                  title={t('tooltips.expenseDelta', 'Expense delta = paid - fair share')}
                >
                  {t('labels.expenseDelta', 'Expense delta (paid - fair share)')}
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                </span>
                <span className={`font-medium ${partner2ExpenseDelta >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                  {withLtr(formatCurrency(partner2ExpenseDelta))}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.settlementsPaidBy', 'Settlements paid by {{name}}', { name: partnerNames.partner2 })}{' '}
                  <span
                    className="inline-flex align-middle"
                    title={t('tooltips.settlementEffect', 'Settlements paid increase this partner final balance in this equation')}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                </span>
                <span className="font-medium">{withLtr(formatCurrency(partner2SettlementPaid))}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">
                  {t('labels.settlementsReceivedBy', 'Settlements received by {{name}}', { name: partnerNames.partner2 })}
                </span>
                <span className="font-medium">{withLtr(formatCurrency(partner2SettlementReceived))}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between gap-2">
                <span className="text-slate-300 font-semibold">
                  {t('labels.finalBalanceFor', 'Final balance for {{name}}', { name: partnerNames.partner2 })}
                </span>
                <span className={`font-semibold ${partner2EquationResult >= 0 ? 'text-green-300' : 'text-amber-300'}`}>
                  {withLtr(formatCurrency(partner2EquationResult))}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              data-testid="why-balance-expenses-partner1"
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-3"
            >
              <div className="text-xs text-slate-400 mb-2">
                {t('labels.expensesPaidBy', 'Expenses paid by {{name}}', { name: partnerNames.partner1 })}
              </div>
              {expenseShareBreakdown.partner2OwesItems.length === 0 ? (
                <p className="text-xs text-slate-500">{t('messages.noExpensesFound', 'No expenses in this scope')}</p>
              ) : (
                <div className="space-y-1">
                  {expenseShareBreakdown.partner2OwesItems.slice(0, 6).map(({ expense, shareAmount }) => (
                    <div key={expense.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">
                        {formatDateLocalized(expense.date)} - {expense.description}
                      </span>
                      <span className="whitespace-nowrap text-green-300">
                        {withLtr(formatCurrency(shareAmount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              data-testid="why-balance-expenses-partner2"
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-3"
            >
              <div className="text-xs text-slate-400 mb-2">
                {t('labels.expensesPaidBy', 'Expenses paid by {{name}}', { name: partnerNames.partner2 })}
              </div>
              {expenseShareBreakdown.partner1OwesItems.length === 0 ? (
                <p className="text-xs text-slate-500">{t('messages.noExpensesFound', 'No expenses in this scope')}</p>
              ) : (
                <div className="space-y-1">
                  {expenseShareBreakdown.partner1OwesItems.slice(0, 6).map(({ expense, shareAmount }) => (
                    <div key={expense.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">
                        {formatDateLocalized(expense.date)} - {expense.description}
                      </span>
                      <span className="whitespace-nowrap text-amber-300">
                        {withLtr(formatCurrency(shareAmount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {unallocatedSettlements.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
            <div data-testid="unallocated-settlements-section">
              <h3 className="text-lg sm:text-xl font-bold mb-1">
                {t('labels.unallocatedSettlements', 'Unallocated settlements')}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {balanceMode === 'month'
                  ? t('labels.unallocatedSettlementsMonthScope', 'Payments affecting the selected month that are not fully allocated')
                  : t(
                      'labels.unallocatedSettlementsCumulativeScope',
                      'Payments affecting months through the selected month that are not fully allocated'
                    )}
              </p>

              <div className="space-y-2">
                {[...unallocatedSettlements]
                  .sort((a, b) => b.settlement.date.localeCompare(a.settlement.date))
                  .map(({ settlement, amountToShow, linkedAppliedAmount, unallocatedAppliedAmount, allocationStatus, linkedExpenseIds }) => (
                    <div
                      key={`unallocated-${settlement.id}`}
                      data-testid="unallocated-settlement-row"
                      className="rounded-xl border border-slate-700 bg-slate-800/40 p-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm sm:text-base truncate">
                              {settlement.from === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                            </span>
                            <span className="text-slate-400 flex-shrink-0">{isRTL ? 'â†' : 'â†’'}</span>
                            <span className="font-medium text-sm sm:text-base truncate">
                              {settlement.to === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}
                            </span>
                            <span
                              data-testid="settlement-allocation-status-badge"
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAllocationStatusClasses(allocationStatus)}`}
                            >
                              {getAllocationStatusLabel(allocationStatus)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDateLocalized(settlement.date)}
                            {settlement.note ? ` • ${settlement.note}` : ''}
                          </div>
                          {linkedExpenseIds.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                              {t('labels.allocatedTo', 'Allocated to')}: {getAllocatedExpenseSummary(linkedExpenseIds)}
                            </div>
                          )}
                          {settlement.remainderMode && (
                            <div className="text-xs text-slate-500 mt-1">
                              {getRemainderModeLabel(settlement)}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => openEditSettlementModal(settlement)}
                          variant="secondary"
                          className="w-full sm:w-auto"
                        >
                          {t('labels.editSettlement', 'Edit settlement')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          <div className="text-slate-500">{t('labels.amountAffectingScope', 'Amount affecting this scope')}</div>
                          <div className="font-medium text-slate-100">{withLtr(formatCurrency(amountToShow))}</div>
                        </div>
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          <div className="text-slate-500">{t('labels.allocatedInScope', 'Allocated in this scope')}</div>
                          <div className="font-medium text-slate-100">{withLtr(formatCurrency(linkedAppliedAmount))}</div>
                        </div>
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          <div className="text-slate-500">{t('labels.unallocatedInScope', 'Unallocated in this scope')}</div>
                          <div className="font-medium text-sky-300">{withLtr(formatCurrency(unallocatedAppliedAmount))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment breakdown */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
            {balanceMode === 'month'
              ? t('labels.paymentBreakdown')
              : t('labels.cumulativePaymentBreakdown', 'Cumulative payment breakdown')}
          </h3>
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
        <div
          data-testid="settlements-section"
          className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{t('labels.settlements')}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {balanceMode === 'month'
                  ? t('labels.selectedMonthSettlements', 'Showing settlements from selected month')
                  : t('labels.cumulativeAffectingSettlements', 'Showing settlements affecting months through selected month')}
              </p>
            </div>
            <Button
              onClick={openNewSettlementModal}
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
                .map(({ settlement, amountToShow, linkedExpenseIds, isPartialForScope, allocationStatus }) => (
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
                        <span
                          data-testid="settlement-allocation-status-badge"
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAllocationStatusClasses(allocationStatus)}`}
                        >
                          {getAllocationStatusLabel(allocationStatus)}
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
                          {t('labels.allocatedTo', 'Allocated to')}: {getAllocatedExpenseSummary(linkedExpenseIds)}
                        </div>
                      )}
                      {settlement.remainderMode && (
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {getRemainderModeLabel(settlement)}
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
                        onClick={() => openEditSettlementModal(settlement)}
                        variant="ghost"
                        size="sm"
                        title={t('tooltips.editSettlement', 'Edit settlement')}
                      >
                        <Pencil className="w-4 h-4" />
                      </IconButton>
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
          onClick={closeSettlementModal}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 my-8 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {editingSettlementId !== null
                  ? t('labels.editSettlement', 'Edit settlement')
                  : t('labels.recordSettlement')}
              </h3>
              <button
                onClick={closeSettlementModal}
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
                  onChange={(e) => setSettlementForm({
                    ...settlementForm,
                    date: e.target.value,
                    remainderMonth:
                      settlementForm.remainderMode === 'payment_month'
                        ? toYearMonth(e.target.value)
                        : settlementForm.remainderMonth,
                  })}
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

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="block text-sm text-slate-400">
                      {t('labels.settlementAllocationsOptional', 'Settlement allocations (optional)')}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasHistoricalEligibleExpenses && (
                        <button
                          type="button"
                          onClick={() => setShowAllEligibleExpenses(prev => !prev)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700"
                        >
                          {showAllEligibleExpenses
                            ? t('buttons.showScopeExpenses', 'Show current-scope expenses')
                            : t('buttons.showAllEligibleExpenses', 'Show all eligible expenses')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={autoAllocateOldestFirst}
                        disabled={
                          hasAllocationDirectionConflict ||
                          !Number.isFinite(settlementAmountDraft) ||
                          settlementAmountDraft <= 0 ||
                          autoAllocationCandidates.length === 0
                        }
                        className={`text-xs px-3 py-1.5 rounded-lg border border-slate-600 ${
                          Number.isFinite(settlementAmountDraft) &&
                          settlementAmountDraft > 0 &&
                          autoAllocationCandidates.length > 0
                            ? 'text-slate-200 hover:bg-slate-700'
                            : 'text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {t('buttons.autoAllocateOldestFirst', 'Auto-allocate oldest first')}
                      </button>
                      <button
                        type="button"
                        onClick={addAllocationRow}
                        disabled={!hasAvailableLinkableExpenses}
                        className={`text-xs px-3 py-1.5 rounded-lg border border-slate-600 ${
                          hasAvailableLinkableExpenses
                            ? 'text-slate-200 hover:bg-slate-700'
                            : 'text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {t('buttons.addAllocation', 'Add allocation')}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {showAllEligibleExpenses
                      ? t('labels.showingAllEligibleExpenses', 'Showing eligible expenses from the full visible history.')
                      : t('labels.scopeFirstAllocationHint', 'Showing current-scope expenses first. Reveal older eligible expenses when needed.')}
                  </p>
                  {!hasAllocationDirectionConflict && effectiveAllocationDirection && (
                    <p className="text-xs text-slate-500">
                      {t(
                        'labels.allocationDirectionHint',
                        'Only expenses paid by {{name}} can be allocated for this direction.',
                        {
                          name:
                            effectiveAllocationDirection.to === 'partner1'
                              ? partnerNames.partner1
                              : partnerNames.partner2,
                        }
                      )}
                    </p>
                  )}
                  {isAllocationDirectionControlledByRows && (
                    <p className="text-xs text-slate-500">
                      {t(
                        'labels.allocationDirectionControlledByRows',
                        'Selected allocations currently determine the effective settlement direction until they are cleared.'
                      )}
                    </p>
                  )}
                  {hasAllocationDirectionConflict && (
                    <p className="text-xs text-rose-300">
                      {t(
                        'labels.allocationDirectionConflict',
                        'This settlement contains allocations with opposite reimbursement directions. Remove conflicting rows before adding new allocations.'
                      )}
                    </p>
                  )}
                </div>
                {!hasAvailableLinkableExpenses && !hasAllocationDirectionConflict && (
                  <p className="text-xs text-slate-500">
                    {t('labels.allExpensesFullyAllocated', 'All eligible expenses are already fully allocated')}
                  </p>
                )}

                {settlementForm.allocationRows.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {t('labels.noSettlementAllocations', 'No settlement allocations')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settlementForm.allocationRows.map(row => {
                      const selectedExpenseId = Number(row.expenseId);
                      const selectableAvailabilities = getSelectableAvailabilities(
                        Number.isFinite(selectedExpenseId) ? selectedExpenseId : null
                      );
                      const selectedExpense = row.expenseId
                        ? expenseLookup.get(selectedExpenseId)
                        : undefined;
                      const selectedDirection = selectedExpense
                        ? getReimbursementDirection(selectedExpense)
                        : null;
                      const selectedAvailability = row.expenseId
                        ? linkableExpenseAvailabilityById.get(selectedExpenseId)
                        : undefined;
                      return (
                        <div key={row.id} className="rounded-lg border border-slate-700 p-2 space-y-2">
                          <select
                            value={row.expenseId}
                            onChange={(e) => updateAllocationRow(row.id, { expenseId: e.target.value })}
                            aria-label={t('labels.selectExpense', 'Select expense')}
                            dir={dir}
                            className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                          >
                            <option value="">{t('labels.selectExpense', 'Select expense')}</option>
                            {selectableAvailabilities.map(({ expense, remaining }) => (
                              <option key={expense.id} value={expense.id}>
                                {`${formatDateLocalized(expense.date)} - ${expense.description} - ${formatCurrency(expense.amount)} (${t('labels.remainingToAllocate', 'remaining to allocate')}: ${formatCurrency(remaining)})`}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => updateAllocationRow(row.id, { amount: e.target.value })}
                              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                              placeholder={t('labels.allocatedAmount', 'Amount allocated')}
                            />
                            <button
                              type="button"
                              onClick={() => removeAllocationRow(row.id)}
                              className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700"
                            >
                              {t('buttons.remove', 'Remove')}
                            </button>
                          </div>

                          {selectedDirection && (
                            <p className="text-xs text-slate-500">
                              {t('labels.recommendedSettlement', 'Recommended for this expense')}:{' '}
                              {withLtr(formatCurrency(selectedDirection.recommendedAmount))}{' '}
                              ({selectedDirection.from === 'partner1' ? partnerNames.partner1 : partnerNames.partner2}{' '}
                              {'->'}{' '}
                              {selectedDirection.to === 'partner1' ? partnerNames.partner1 : partnerNames.partner2})
                              {selectedAvailability && (
                                <>
                                  {' | '}
                                  {t('labels.remainingToAllocate', 'remaining to allocate')}:{' '}
                                  {withLtr(formatCurrency(selectedAvailability.remaining))}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasLinkedRows && (
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      {t('labels.allocatedAmount', 'Amount allocated')}:{' '}
                      {withLtr(formatCurrency(linkedDraftTotal))}
                    </p>
                    <p>
                      {t('labels.unallocatedRemainder', 'Unallocated remainder')}:{' '}
                      {withLtr(formatCurrency(Math.max(0, unallocatedRemainderDraft)))}
                    </p>
                  </div>
                )}

                {hasPositiveRemainderDraft && (
                  <div className="space-y-2 rounded-lg border border-slate-700 p-3">
                    <label className="block text-xs text-slate-400">
                      {t('labels.remainderAllocationMode', 'Remainder allocation')}
                    </label>
                    <select
                      value={settlementForm.remainderMode}
                      onChange={(e) => {
                        const nextMode = e.target.value as SettlementRemainderMode;
                        setSettlementForm(prev => ({
                          ...prev,
                          remainderMode: nextMode,
                          remainderMonth:
                            nextMode === 'payment_month'
                              ? toYearMonth(prev.date)
                              : prev.remainderMonth,
                        }));
                      }}
                      dir={dir}
                      className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${
                        isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'
                      } py-2 ${getFocusClasses()} outline-none transition-all`}
                    >
                      <option value="payment_month">
                        {t('labels.remainderPaymentMonth', 'Apply to payment month')}
                      </option>
                      <option value="specific_month">
                        {t('labels.remainderSpecificMonth', 'Apply to selected month')}
                      </option>
                      <option value="oldest_open_debt">
                        {t('labels.remainderOldestDebt', 'Apply to oldest open debt')}
                      </option>
                    </select>

                    {settlementForm.remainderMode === 'specific_month' && (
                      <input
                        type="month"
                        value={settlementForm.remainderMonth}
                        onChange={(e) => setSettlementForm({
                          ...settlementForm,
                          remainderMonth: e.target.value,
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                      />
                    )}

                    <p className="text-xs text-slate-500">
                      {t(
                        'labels.remainderCapHint',
                        'Remainder is capped to open debt in the same direction. Any extra stays unapplied.'
                      )}
                    </p>
                  </div>
                )}

                {linkedDirection === 'mixed' && (
                  <p className="text-xs text-rose-300">
                    {t(
                      'errors.linkedDirectionMismatch',
                      'Allocated expenses with opposite reimbursement directions must be split into separate settlements'
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('labels.from')}</label>
                <select
                  value={settlementForm.from}
                  onChange={(e) => setSettlementForm({ ...settlementForm, from: e.target.value as 'partner1' | 'partner2' })}
                  aria-label={t('labels.from')}
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
                  aria-label={t('labels.to')}
                  dir={dir}
                  className={`w-full bg-slate-700 border border-slate-600 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-4 pr-10'} py-2 ${getFocusClasses()} outline-none transition-all`}
                >
                  <option value="partner1">{partnerNames.partner1}</option>
                  <option value="partner2">{partnerNames.partner2}</option>
                </select>
                {isAllocationDirectionControlledByRows && (
                  <p className="text-xs text-slate-500 mt-2">
                    {t(
                      'labels.allocationDirectionControlledByRows',
                      'Selected allocations currently determine the effective settlement direction until they are cleared.'
                    )}
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
                  onClick={closeSettlementModal}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={handleSaveSettlement}
                  variant="accent"
                  className="flex-1"
                >
                  {editingSettlementId !== null
                    ? t('buttons.save', 'Save')
                    : t('buttons.recordPayment')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
