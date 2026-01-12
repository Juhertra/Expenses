import type { Expense } from './types';

/**
 * Create canonical form of a description for stable comparison
 * Canonical = lowercase + trim + collapse whitespace
 */
export function canonicalForm(desc: string): string {
  return desc.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalize description: trim, collapse whitespace, apply safe exact-match normalization rules
 * SAFE: Uses exact-match mapping (not regex) to avoid user-entered patterns breaking the app
 */
export function normalizeDescription(
  desc: string,
  rules: Record<string, string>
): string {
  // First pass: trim and collapse whitespace
  const normalized = desc.trim().replace(/\s+/g, ' ');

  // Create canonical key for lookup
  const canonical = canonicalForm(normalized);

  // Apply normalization rules if a canonical match exists
  // Rules map keys must be canonical (lowercase, trimmed, collapsed spaces)
  if (rules[canonical]) {
    return rules[canonical];
  }

  return normalized;
}

/**
 * Check for duplicate transactions (same date, amount, canonical description)
 * Uses canonical form for stable comparison that won't change with normalization rules
 */
export function checkDuplicate(
  expenses: Expense[],
  date: string,
  amount: number,
  normalizedDesc: string,
  excludeId?: string | number
): Expense | null {
  const canonicalDesc = canonicalForm(normalizedDesc);
  
  const duplicate = expenses.find(
    e =>
      e.date === date &&
      Math.abs(e.amount - amount) < 0.01 &&
      canonicalForm(e.description) === canonicalDesc &&
      e.id !== excludeId
  );

  return duplicate || null;
}

