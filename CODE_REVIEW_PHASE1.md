# Code Review Phase 1: Security & Data Integrity

## Overview
Review of security-critical files in the Expenses application.

---

## Findings

### CRITICAL Issues

#### 1. XSS Vulnerability in sanitizeInput()
**File:** `src/lib/validators.ts:12-17`
**Severity:** CRITICAL
**Status:** TO FIX

The `sanitizeInput()` function uses regex-based HTML tag removal which is bypassable:
```typescript
const withoutTags = input.replace(/<[^>]*>/g, '');
```

**Problems:**
- Nested tags: `<scr<script>ipt>` → `<script>` after first pass
- Event handlers in malformed tags may survive
- Unicode variants and encoding tricks

**Fix:** Replace with DOMPurify library.

---

### HIGH Priority Issues

#### 2. Amount Validation Missing Infinity Check
**File:** `src/lib/validators.ts:31-34`
**Severity:** HIGH
**Status:** TO FIX

```typescript
const amount = parseFloat(formData.amount);
if (isNaN(amount) || amount <= 0) {
```

`parseFloat("Infinity")` returns `Infinity` which passes this check.

**Fix:** Add `!isFinite(amount)` check.

---

#### 3. Atomic Write Data Loss Risk
**File:** `electron/main.cjs:125-132`
**Severity:** HIGH
**Status:** TO FIX

```javascript
try {
  await fs.unlink(filePath);
} catch (error) {
  // Ignore if file already moved/removed.
}

await fs.rename(tmpPath, filePath);
```

If `unlink` succeeds but `rename` fails, the original file is deleted without replacement.

**Fix:** On Windows, use `fs.rename` with overwrite flag, or copy-then-delete pattern.

---

#### 4. Path Traversal - No Safe Directory Validation
**File:** `electron/main.cjs` (multiple functions)
**Severity:** HIGH
**Status:** ACCEPTED RISK

User-selected file paths from dialog are stored directly without validation that they're within safe directories. However, since paths come from native file dialogs (not user input), the risk is limited to config file tampering.

**Mitigation:** Config file is in user's app data directory. Attack requires local file access.

---

### MEDIUM Priority Issues

#### 5. Import Validation Incomplete
**File:** `src/lib/validators.ts:60-106`
**Severity:** MEDIUM
**Status:** TO FIX

`validateImportData()` validates top-level structure but not individual items:
- Doesn't validate expense objects have required fields (id, amount, date, etc.)
- Doesn't validate amounts are numbers
- Doesn't validate dates are valid

**Fix:** Add item-level validation for imported data.

---

#### 6. Backup Errors Silently Ignored
**File:** `electron/main.cjs:120-124`
**Severity:** MEDIUM
**Status:** ACCEPTED RISK

```javascript
try {
  await fs.copyFile(filePath, bakPath);
} catch (error) {
  // Ignore backup errors to avoid blocking save.
}
```

If backup fails and subsequent write fails, data loss occurs.

**Mitigation:** Atomic write pattern still protects against most failures. Backup is defense-in-depth.

---

#### 7. No Maximum Amount Validation
**File:** `src/lib/validators.ts`
**Severity:** MEDIUM
**Status:** TO FIX

No upper bound on expense amounts. Could cause:
- Display overflow issues
- Potential integer overflow in calculations (though JS uses floats)

**Fix:** Add reasonable maximum (e.g., 1 trillion).

---

### LOW Priority Issues

#### 8. CSP Requires unsafe-inline for Styles
**File:** `electron/main.cjs:10`
**Severity:** LOW
**Status:** ACCEPTED

`style-src 'self' 'unsafe-inline'` is required for Tailwind CSS.

**Mitigation:** Only styles are inline, not scripts.

---

#### 9. Date Validation Not Strict ISO
**File:** `src/lib/validators.ts:44-48`
**Severity:** LOW
**Status:** TO FIX

```typescript
const dateObj = new Date(formData.date);
if (isNaN(dateObj.getTime())) {
```

Accepts many date formats. Should validate ISO 8601 format specifically.

---

## Files Reviewed

| File | Status | Issues |
|------|--------|--------|
| `electron/main.cjs` | ✅ Reviewed | #3, #4, #6, #8 |
| `electron/preload.cjs` | ✅ Reviewed | None (recently fixed) |
| `src/lib/validators.ts` | ✅ Reviewed | #1, #2, #5, #7, #9 |
| `src/lib/storageService.ts` | ✅ Reviewed | None |
| `src/lib/electronStorageAdapter.ts` | ✅ Reviewed | None |
| `src/lib/localStorageAdapter.ts` | ✅ Reviewed | None |
| `vite.config.ts` | ✅ Reviewed | None |
| `index.html` | ✅ Reviewed | None |

---

## Action Items

### To Fix (Code Changes)
- [ ] #1: Replace sanitizeInput() with DOMPurify
- [ ] #2: Add Infinity check to amount validation
- [ ] #3: Fix atomic write to prevent data loss
- [ ] #5: Add item-level import validation
- [ ] #7: Add maximum amount validation
- [ ] #9: Tighten date validation to ISO format

### Accepted Risks
- #4: Path traversal (mitigated by native dialogs)
- #6: Backup errors (defense-in-depth only)
- #8: unsafe-inline for styles (Tailwind requirement)

---

## Next Steps
1. Install DOMPurify package
2. Update validators.ts with all fixes
3. Fix atomic write in main.cjs
4. Run tests to verify no regressions
