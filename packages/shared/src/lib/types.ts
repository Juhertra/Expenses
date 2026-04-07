/**
 * Type definitions for the Expense Tracker application
 */

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  splits?: Array<{
    category: string;
    amount: number;
  }>;
  type: 'expense' | 'income';
  date: string;
  paidBy: 'partner1' | 'partner2' | 'joint';
  isAuto?: boolean;
  recurringId?: number;
}

export interface RecurringTransaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  splits?: Array<{
    category: string;
    amount: number;
  }>;
  type: 'expense' | 'income';
  paidBy: 'partner1' | 'partner2' | 'joint';
  recurringDay: number;
  lastProcessed?: string;
}

export interface PartnerNames {
  partner1: string;
  partner2: string;
}

export interface FormData {
  description: string;
  amount: string;
  category: string;
  type: 'expense' | 'income';
  date: string;
  paidBy: 'partner1' | 'partner2' | 'joint';
  isRecurring: boolean;
  recurringDay: number;
}

export interface Category {
  icon: string;
  color: string;
}

export interface ChartDataPoint {
  day: number;
  expense: number;
  income: number;
}

export type SplitMode = 'equal' | 'proportional';

export interface HouseholdSettings {
  currencyCode: string;
  currencySymbol: string;
  splitMode: SplitMode;
  partner1Ratio: number;
  budgets: { [category: string]: number };
  normalizationRules: { [key: string]: string };
  categories: { [categoryName: string]: Category };
  activePartner?: 'partner1' | 'partner2';
  autoUpdate?: boolean;
}

export interface Settlement {
  id: number;
  date: string;
  amount: number;
  from: 'partner1' | 'partner2';
  to: 'partner1' | 'partner2';
  note?: string;
  allocations?: SettlementAllocation[];
  remainderMode?: SettlementRemainderMode;
  /** YYYY-MM, used when remainderMode === 'specific_month' */
  remainderMonth?: string;
}

export interface SettlementAllocation {
  expenseId: number;
  amount: number;
}

export type SettlementRemainderMode =
  | 'payment_month'
  | 'specific_month'
  | 'oldest_open_debt';

