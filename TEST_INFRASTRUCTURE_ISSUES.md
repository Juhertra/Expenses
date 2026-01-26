# Test Infrastructure Issues

## Current Status
The test infrastructure is **non-functional**. Vitest cannot parse or run any test files.

## Symptoms
```
Error: No test suite found in file [test-file-path]
```

All test files fail with this error, including:
- `src/lib/__tests__/calculations.test.ts`
- `src/lib/__tests__/normalization.test.ts`
- `src/lib/__tests__/storageService.test.ts`
- `src/lib/__tests__/validators.test.ts`
- `src/services/recurring/__tests__/index.test.ts`

## Root Causes

### 1. TypeScript Module Resolution Conflict
**File**: `tsconfig.json`
**Issue**: Uses `"moduleResolution": "bundler"` which conflicts with vitest's type definitions

TypeScript compilation errors when checking test files:
```
error TS2307: Cannot find module '@vitest/utils/display' or its corresponding type declarations.
Consider updating to 'node16', 'nodenext', or 'bundler'.
```

### 2. Vitest Configuration
**File**: `vite.config.ts`

Current config:
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
  },
}
```

**Potential issues**:
- `globals: true` may conflict with imports
- Setup file may have initialization problems
- jsdom environment may not be loading correctly

### 3. Test File Quality
**Code Review Finding**: Existing test files contain placeholder tests that don't provide meaningful coverage. While they're well-structured, they test basic scenarios without covering edge cases or integration points.

## Attempted Fixes
1. ✅ Created comprehensive test suite for `processRecurringTransactions`
2. ❌ Tests still cannot run due to infrastructure issues
3. ❌ Simple "1+1" test also fails with same error

## Recommended Solutions

### Short-term (Quick Fix)
1. **Update tsconfig.json moduleResolution**:
   ```json
   "moduleResolution": "node16"  // or "nodenext"
   ```

2. **Verify setup file** (`src/test/setup.ts`):
   - Check localStorage mock is not blocking imports
   - Ensure no circular dependencies

3. **Try minimal vitest config**:
   ```typescript
   test: {
     environment: 'jsdom',
   }
   ```

### Medium-term (Proper Fix)
1. Create separate `tsconfig.test.json` for test files:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "moduleResolution": "node16",
       "types": ["vitest/globals", "@testing-library/jest-dom"]
     },
     "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*"]
   }
   ```

2. Update `vite.config.ts` to reference test tsconfig:
   ```typescript
   test: {
     globals: true,
     environment: 'jsdom',
     setupFiles: './src/test/setup.ts',
     typecheck: {
       tsconfig: './tsconfig.test.json'
     }
   }
   ```

3. Rewrite tests to cover actual business logic edge cases

### Long-term (Best Practice)
1. **Add integration tests** for critical user flows
2. **Add E2E tests** using Playwright or Cypress
3. **Set up CI/CD** to run tests on every commit
4. **Add test coverage requirements** (minimum 80% for critical modules)
5. **Document testing strategy** in CONTRIBUTING.md

## Test Files Status

| File | Exists | Quality | Runs |
|------|--------|---------|------|
| calculations.test.ts | ✅ | ⚠️ Basic | ❌ |
| normalization.test.ts | ✅ | ⚠️ Basic | ❌ |
| storageService.test.ts | ✅ | ⚠️ Basic | ❌ |
| validators.test.ts | ✅ | ⚠️ Basic | ❌ |
| recurring/index.test.ts | ✅ | ✅ Comprehensive | ❌ |

## Impact
- **No automated testing** of application logic
- **No regression detection** when making changes
- **Higher risk of bugs** in production
- **Slower development** (manual testing required)

## Next Steps
1. Fix TypeScript module resolution
2. Verify vitest can parse and run a simple test
3. Incrementally enable existing test files
4. Write comprehensive tests for critical paths:
   - Balance calculations with settlements
   - Recurring transaction processing
   - Data import/export validation
   - Form validation
