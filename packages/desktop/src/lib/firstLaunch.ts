/**
 * First launch detection utility
 * Manages whether the user has seen the welcome screen
 */

const WELCOME_SEEN_KEY = 'expenses-welcome-seen';

/**
 * Check if this is the user's first launch
 */
export function isFirstLaunch(): boolean {
  try {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    return seen !== 'true';
  } catch {
    // If localStorage is unavailable, assume not first launch
    return false;
  }
}

/**
 * Mark that the user has seen the welcome screen
 */
export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
  } catch (err) {
    console.error('Failed to mark welcome as seen:', err);
  }
}

/**
 * Reset first launch state (for testing)
 */
export function resetFirstLaunch(): void {
  try {
    localStorage.removeItem(WELCOME_SEEN_KEY);
  } catch (err) {
    console.error('Failed to reset first launch:', err);
  }
}
