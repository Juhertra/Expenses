# Custom Development Client Setup

Phase 4 (Cloud Sync with Encryption) requires a **custom development client** because:
- `react-native-quick-crypto` has native modules (not in Expo Go)
- Encryption requires native binaries
- Dropbox SDK needs custom build configuration

**Web testing won't work for Phase 4** - encryption requires native crypto modules.

---

## Prerequisites

### macOS (iOS Development)
- Xcode 14+ installed
- Xcode Command Line Tools: `xcode-select --install`
- iOS Simulator or physical device
- CocoaPods: `sudo gem install cocoapods`

### Windows/Linux (Android Development)
- Android Studio installed with SDK
- Android SDK Platform 33+ (API Level 33)
- Android Emulator or physical device with USB debugging
- Java JDK 17+

---

## Step 1: Install Dependencies

From project root:
```bash
npm install
```

---

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` in `packages/mobile`:
```bash
cd packages/mobile
cp .env.example .env
```

Edit `.env` with your Dropbox OAuth credentials:
```env
EXPO_PUBLIC_DROPBOX_CLIENT_ID=your_dropbox_app_key_here
```

### Getting Dropbox Credentials

1. **Create Dropbox App:**
   - Visit https://www.dropbox.com/developers/apps/create
   - Choose "Scoped access" → "App folder" access type
   - Name: `Expenses Tracker` (or your choice)
   - Click "Create app"

2. **Configure OAuth Settings:**
   - In app settings, add **Redirect URIs**:
     ```
     exp://localhost:19000/--/auth          (Development - Expo Go)
     com.juhertra.expenses://auth           (Production iOS)
     com.juhertra.expenses://auth           (Production Android)
     ```

3. **Set Permissions:**
   - Go to "Permissions" tab
   - Enable: `files.content.read`, `files.content.write`
   - Click "Submit" to save

4. **Copy App Key:**
   - Find "App key" on the Settings tab
   - This is your `EXPO_PUBLIC_DROPBOX_CLIENT_ID`

---

## Step 3: Run Expo Prebuild

Generate native projects (iOS/Android):
```bash
cd packages/mobile
npx expo prebuild
```

This creates:
- `ios/` folder with Xcode project
- `android/` folder with Gradle project

**⚠️ Important:** After prebuild, Expo Go **will no longer work**. You must use the custom dev client.

---

## Step 4: Build and Run Custom Dev Client

### iOS (macOS only)
```bash
npx expo run:ios
```

**Options:**
- Run on simulator (default)
- Run on device: `npx expo run:ios --device`
- Select simulator: `npx expo run:ios --simulator "iPhone 15 Pro"`

**First-time setup:**
- If prompted, open Xcode and sign the app with your Apple ID
- Go to: `ios/` → Open `expensestracker.xcworkspace` in Xcode
- Select target → Signing & Capabilities → Team: Add your Apple ID

### Android
```bash
npx expo run:android
```

**Options:**
- Run on emulator (if running)
- Run on device: Connect via USB, enable USB debugging

**First-time setup:**
- Android Studio will install required SDK packages automatically
- Accept Android SDK licenses if prompted

---

## Step 5: Development Workflow

Once the dev client is built and running:

1. **Make code changes** in `src/`
2. **Fast Refresh** will update automatically (like Expo Go)
3. **Shake device** or press `Cmd+D` (iOS) / `Cmd+M` (Android) for dev menu

**No need to rebuild** unless:
- You install new native dependencies
- You change `app.json` configuration
- You modify native code in `ios/` or `android/`

---

## Common Issues

### iOS Build Fails: "Command PhaseScriptExecution failed"
```bash
cd ios
pod install
cd ..
npx expo run:ios
```

### Android Build Fails: "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk     # macOS
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk  # Windows
```

### Metro Bundler Port Conflict (8081)
```bash
# Stop existing Metro
lsof -ti:8081 | xargs kill -9    # macOS/Linux
netstat -ano | findstr :8081     # Windows (then kill PID)

# Restart
npx expo start --clear
```

### Native Module Not Found After Install
```bash
# iOS
cd ios && pod install && cd ..
npx expo run:ios

# Android
npx expo run:android
```

---

## Device Testing Checklist

### Phase 4 Smoke Tests

#### 1. **Dropbox Authentication**
- [ ] Open app → Settings → Cloud Sync
- [ ] Tap "Connect Dropbox"
- [ ] OAuth flow opens in browser
- [ ] Authorize app
- [ ] Returns to app with success message

#### 2. **Manual Sync (First Time)**
- [ ] Add 2 expenses locally
- [ ] Tap "Sync Now" button
- [ ] See "Syncing..." indicator
- [ ] Success: "Synced 2 items"
- [ ] Check Dropbox app folder: `expense-tracker.json.encrypted` exists

#### 3. **Download Sync**
- [ ] Add expense on desktop app
- [ ] On mobile, tap "Sync Now"
- [ ] Verify desktop expense appears in mobile list

#### 4. **Merge Conflict (Append)**
- [ ] Airplane mode ON
- [ ] Add expense on mobile (ID: 100)
- [ ] On desktop, add different expense (ID: 101)
- [ ] Airplane mode OFF
- [ ] Mobile: "Sync Now"
- [ ] Both expenses visible (no data loss)

#### 5. **401 Re-Authentication**
- [ ] Revoke Dropbox access via https://www.dropbox.com/account/connected_apps
- [ ] In app, tap "Sync Now"
- [ ] Error: "Authentication failed. Please re-connect."
- [ ] Tap "Re-connect" → OAuth flow → Success

#### 6. **429 Rate Limit Backoff**
- [ ] Trigger 60+ sync attempts rapidly (if possible)
- [ ] See: "Too many sync attempts. Try again later."
- [ ] Or simulate with mock: `mockProvider.setFailureMode(true, CloudProviderError.RATE_LIMIT)`
- [ ] Backoff increases: 30s → 60s → 120s → 240s → 300s

#### 7. **Tamper Detection**
- [ ] Manually corrupt `expense-tracker.json.encrypted` in Dropbox
- [ ] Tap "Sync Now"
- [ ] Error: "Decryption failed" or "Invalid data format"
- [ ] Local data unchanged (not corrupted)

#### 8. **Offline Mode**
- [ ] Airplane mode ON
- [ ] Add expense locally
- [ ] Tap "Sync Now"
- [ ] Error: "Network error. Sync will retry when online."
- [ ] Expense saved locally
- [ ] Airplane mode OFF → Auto-retry succeeds

---

## Debugging Tips

### View Native Logs

**iOS:**
```bash
npx react-native log-ios
```

**Android:**
```bash
npx react-native log-android
# or
adb logcat *:S ReactNative:V ReactNativeJS:V
```

### Inspect Encrypted File

The cloud file is encrypted, but you can test decryption:
```typescript
import { decryptData } from './src/sync/encryption';

const encrypted = await cloudProvider.readFile('expense-tracker.json.encrypted');
const decrypted = await decryptData(encrypted, yourKey);
console.log(JSON.parse(decrypted));
```

### Test Sync Without Cloud

Use `MockCloudProvider` in development:
```typescript
import { MockCloudProvider } from './src/sync/__mocks__/MockCloudProvider';

const mockProvider = new MockCloudProvider();
mockProvider.seedFile('test.json', 'data');

const syncService = new CloudSyncService(mockProvider, testKey);
await syncService.syncNow();
```

---

## Production Builds

When ready for production (Phase 5+):

### EAS Build (Recommended)
```bash
npm install -g eas-cli
eas login
eas build:configure

# Build for TestFlight/Internal Testing
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Local Builds
```bash
# iOS (macOS only)
cd ios
xcodebuild -workspace expensestracker.xcworkspace -scheme expensestracker -configuration Release

# Android
cd android
./gradlew assembleRelease
```

---

## Summary

1. **Prebuild** generates native projects
2. **Set environment variables** (Dropbox client ID)
3. **Run dev client** with `expo run:ios` or `expo run:android`
4. **Test encryption** and sync with device checklist
5. **Debug** with native logs and mock providers
6. **Production builds** via EAS when ready

**Questions?** Check [Expo Prebuild Docs](https://docs.expo.dev/workflow/prebuild/)
