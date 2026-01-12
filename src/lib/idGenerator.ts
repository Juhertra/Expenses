/**
 * Generate unique IDs for transactions using crypto.randomUUID() when available,
 * with a fallback for older browsers
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

