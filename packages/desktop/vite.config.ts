import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@expenses/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@expenses/shared/calculations': fileURLToPath(new URL('../shared/src/lib/calculations.ts', import.meta.url)),
      '@expenses/shared/defaults': fileURLToPath(new URL('../shared/src/lib/defaults.ts', import.meta.url)),
      '@expenses/shared/importExport': fileURLToPath(new URL('../shared/src/services/importExport.ts', import.meta.url)),
      '@expenses/shared/normalization': fileURLToPath(new URL('../shared/src/lib/normalization.ts', import.meta.url)),
      '@expenses/shared/recurring': fileURLToPath(new URL('../shared/src/services/recurring/index.ts', import.meta.url)),
      '@expenses/shared/types': fileURLToPath(new URL('../shared/src/lib/types.ts', import.meta.url)),
      '@expenses/shared/validators': fileURLToPath(new URL('../shared/src/lib/validators.ts', import.meta.url)),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
    },
  },
});
