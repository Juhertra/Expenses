import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Mock window.storage
const mockStorage = {
  async get(key: string) {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  async set(key: string, value: string) {
    localStorage.setItem(key, value);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).window = (global as any).window || {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).window.storage = mockStorage;

