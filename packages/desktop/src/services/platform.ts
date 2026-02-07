import { fileSystem, getModifierKey, getModifierKeyName, isElectron, isMac, isWindows } from '../lib/electron-bridge';

export { isElectron, isMac, isWindows };

export const isWeb = () => !isElectron();

export const getPrimaryModifierKey = getModifierKey;
export const getPrimaryModifierKeyName = getModifierKeyName;

export async function pickDirectory() {
  return fileSystem.showDirectoryPicker();
}

export function supportsDirectoryPicker() {
  return fileSystem.supportsDirectoryPicker();
}
