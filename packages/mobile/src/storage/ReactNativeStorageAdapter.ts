import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage result interface matching desktop's StorageAdapter
 */
export interface StorageResult {
  value: string;
}

/**
 * React Native storage adapter using AsyncStorage
 * Implements same interface as desktop's StorageAdapter for consistency
 */
export class ReactNativeStorageAdapter {
  async get(key: string): Promise<StorageResult | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? { value } : null;
    } catch (error) {
      console.error(`AsyncStorage get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`AsyncStorage set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`AsyncStorage delete error for key ${key}:`, error);
      throw error;
    }
  }

  async list(prefix?: string): Promise<{ keys: string[] }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keys: string[] = prefix ? allKeys.filter(k => k.startsWith(prefix)) : [...allKeys];
      return { keys };
    } catch (error) {
      console.error('AsyncStorage list error:', error);
      return { keys: [] };
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageAdapter = new ReactNativeStorageAdapter();
