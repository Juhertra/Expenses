# Phase 4 Device Testing Guide

**You're ready to test!** This guide walks you through device testing step-by-step.

---

## Pre-Test Setup (5 minutes)

### 1. Create .env File
```bash
cd packages/mobile
cp .env.example .env
```

Edit `.env`:
```env
# Keep sync DISABLED for initial build
EXPO_PUBLIC_ENABLE_SYNC=false

# Add your Dropbox App Key from: https://www.dropbox.com/developers/apps
EXPO_PUBLIC_DROPBOX_CLIENT_ID=YOUR_KEY_HERE
```

### 2. Verify Dependencies
```bash
npm install
```

### 3. Run Prebuild (One-Time)
```bash
npx expo prebuild
```

**Expected output:**
- Creates `ios/` folder (macOS)
- Creates `android/` folder
- Installs native dependencies

---

## Testing Workflow

### Phase A: Build Without Sync (Verify App Works)

**Goal:** Ensure app runs with sync disabled.

**Steps:**
1. **Build and run:**
   ```bash
   # iOS
   npx expo run:ios

   # Android
   npx expo run:android
   ```

2. **Test Quick Add (Phase 3 functionality):**
   - [ ] Add expense: Amount `10`, Description `Test`, Category `Food`
   - [ ] Form clears after save
   - [ ] Add second expense
   - [ ] Both expenses visible

3. **Verify sync is hidden:**
   - [ ] No "Sync Now" button visible
   - [ ] No "Cloud Sync" settings
   - [ ] App works normally (local-only)

**✅ Pass Criteria:** App works, sync UI hidden

---

### Phase B: Enable Sync Flag

**Goal:** Enable sync and verify Dropbox connection.

**Steps:**
1. **Stop app** (if running)

2. **Enable sync in `.env`:**
   ```env
   EXPO_PUBLIC_ENABLE_SYNC=true
   EXPO_PUBLIC_DROPBOX_CLIENT_ID=YOUR_KEY_HERE
   ```

3. **Restart Metro:**
   ```bash
   # Stop Metro (Ctrl+C)
   npx expo start --clear
   ```

4. **Rebuild app** (native modules changed):
   ```bash
   # iOS
   npx expo run:ios

   # Android
   npx expo run:android
   ```

**✅ Pass Criteria:** App builds and runs with sync enabled

---

### Phase C: Device Test Checklist

Run each test below and check off:

#### Test 1: Dropbox OAuth
- [ ] Open Settings → Cloud Sync
- [ ] See "Connect Dropbox" button
- [ ] Tap button
- [ ] Browser opens with Dropbox login
- [ ] Login with Dropbox account
- [ ] Authorize app
- [ ] Returns to app
- [ ] See "Connected to Dropbox ✓"

**If fails:**
- Check redirect URI in Dropbox app settings
- Expected: `com.juhertra.expenses://auth`

#### Test 2: First Sync (Upload)
- [ ] Add 2 expenses locally
- [ ] Tap "Sync Now" button
- [ ] See sync spinner/indicator
- [ ] Success message: "Synced"
- [ ] Open Dropbox app/web
- [ ] Navigate to: Apps/[Your App Name]
- [ ] File exists: `expense-tracker.json.encrypted`
- [ ] File is encrypted (gibberish if opened)

#### Test 3: Download Sync (Add on Desktop)
**Requires desktop app running same file**

- [ ] On desktop: Add expense "Desktop Test", $50
- [ ] Desktop: Sync/save
- [ ] On mobile: Tap "Sync Now"
- [ ] Mobile: See "Desktop Test" expense appear
- [ ] Amount and details correct

#### Test 4: Merge (Both Devices Offline)
- [ ] Mobile: Enable airplane mode
- [ ] Mobile: Add expense "Mobile Offline", $15
- [ ] Desktop: Add expense "Desktop Offline", $20
- [ ] Mobile: Disable airplane mode
- [ ] Mobile: Tap "Sync Now"
- [ ] Both expenses visible (ID 15 + ID 20)
- [ ] No data loss

#### Test 5: 401 Re-Authentication
- [ ] Go to: https://www.dropbox.com/account/connected_apps
- [ ] Revoke access for your app
- [ ] In mobile app: Tap "Sync Now"
- [ ] Error message: "Authentication failed"
- [ ] Tap "Re-connect" or "Connect Dropbox"
- [ ] OAuth flow starts again
- [ ] After auth: Sync succeeds

#### Test 6: Rate Limit Backoff
**Hard to test without API hammering**

Manual verification:
- [ ] Check CloudSyncService code has backoff logic
- [ ] Check tests pass: `CloudSyncService.test.ts`
- [ ] Mock test passes 429 scenario

#### Test 7: Tamper Detection
**Test decryption failure on corrupted data**

- [ ] On desktop or web: Open `expense-tracker.json.encrypted`
- [ ] Edit file: Change random characters
- [ ] Save corrupted file
- [ ] Mobile: Tap "Sync Now"
- [ ] Error: "Decryption failed" or "Invalid data format"
- [ ] Local data unchanged (not corrupted)

#### Test 8: Offline Mode
- [ ] Mobile: Enable airplane mode
- [ ] Add expense "Offline Test", $8
- [ ] Expense saves locally
- [ ] Tap "Sync Now"
- [ ] Error: "Network error. Sync will retry when online."
- [ ] Expense still visible locally
- [ ] Disable airplane mode
- [ ] Tap "Sync Now" again
- [ ] Sync succeeds

---

## Test Results Template

Copy this and fill out after testing:

```
# Phase 4 Device Testing Results
Date: [YYYY-MM-DD]
Device: [iPhone/Android model]
OS Version: [iOS 17.x / Android 13.x]

## Phase A: Build Without Sync
- App builds: [✅/❌]
- Quick Add works: [✅/❌]
- Sync UI hidden: [✅/❌]

## Phase B: Enable Sync
- App builds with sync: [✅/❌]
- Metro restart successful: [✅/❌]

## Phase C: Device Tests
1. OAuth: [✅/❌] - Notes:
2. First Sync: [✅/❌] - Notes:
3. Download: [✅/❌] - Notes:
4. Merge: [✅/❌] - Notes:
5. Re-auth (401): [✅/❌] - Notes:
6. Rate Limit: [✅/❌] - Notes:
7. Tamper Detection: [✅/❌] - Notes:
8. Offline Mode: [✅/❌] - Notes:

## Issues Found
[List any bugs, errors, or unexpected behavior]

## Logs
[Paste relevant logs if errors occurred]
```

---

## Common Issues & Solutions

### Issue: "native module not found"
```bash
cd ios && pod install && cd ..
npx expo run:ios
```

### Issue: "OAuth redirect didn't work"
Check Dropbox app settings:
- Redirect URI: `com.juhertra.expenses://auth`
- OAuth 2 enabled
- App folder permissions granted

### Issue: "Decryption failed"
Check encryption key:
- Same key used for encrypt/decrypt
- Key derivation parameters match
- File wasn't manually edited

### Issue: Metro won't start (port 8081 used)
```bash
# macOS/Linux
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID [PID] /F

# Restart
npx expo start --clear
```

---

## After Testing

### If All Tests Pass ✅
1. Enable sync flag by default:
   ```typescript
   // features.ts
   const syncEnabled = process.env.EXPO_PUBLIC_ENABLE_SYNC !== 'false';
   ```

2. Merge to main:
   ```bash
   git checkout main
   git merge feature/cloud-sync
   git push origin main
   ```

### If Tests Fail ❌
1. Share error logs with me (paste in chat)
2. I'll help debug specific issues
3. We'll fix and re-test

---

## Need Help?

**During testing, share:**
1. Which test failed (Test 1-8)
2. Error message (exact text)
3. Console logs (native logs if possible)
4. Steps to reproduce

I'll help debug and provide fixes!

---

**Ready to start? Begin with Phase A!** 🚀
