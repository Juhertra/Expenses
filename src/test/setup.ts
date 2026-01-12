import { afterEach } from 'vitest';

type Store = Map<string, string>;

const store: Store = new Map();

const localStorageMock = {
  getItem(key: string) {
    return store.has(key) ? store.get(key) ?? null : null;
  },
  setItem(key: string, value: string) {
    store.set(key, value);
  },
  removeItem(key: string) {
    store.delete(key);
  },
  clear() {
    store.clear();
  },
  key(index: number) {
    return Array.from(store.keys())[index] ?? null;
  },
  get length() {
    return store.size;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = (globalThis as any).localStorage || localStorageMock;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window || {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window.storage = {
  async get(key: string) {
    const value = localStorageMock.getItem(key);
    return value ? { value } : null;
  },
  async set(key: string, value: string) {
    localStorageMock.setItem(key, value);
  },
};

afterEach(() => {
  localStorageMock.clear();
});
