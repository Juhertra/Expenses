import { storage as electronStorage } from '../../lib/electron-bridge';

/**
 * Raw storage adapter exposed through a service boundary.
 * Components should not import electron bridge directly.
 */
export const storage = electronStorage;
