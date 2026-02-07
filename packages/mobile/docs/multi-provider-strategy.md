# Multi-Provider Cloud Sync Strategy

## Overview

Support for **Dropbox, Google Drive, and OneDrive** using the same `CloudProvider` interface and canonical encrypted file.

**Current Status:** Dropbox implemented ✅
**Next:** Google Drive → OneDrive (same pattern)

---

## Architecture Principles

### 1. One Canonical File
All providers store the same file: **`expense-tracker.json.encrypted`**

- Same encryption format across all providers
- Desktop and mobile use same filename/path
- No provider-specific format changes needed
- Shared `buildExportObject()` and `encryptData()` logic

### 2. App Folder Scope (Isolated Storage)
Use provider-specific "app data" scopes to avoid user-visible clutter:

| Provider       | Scope/Location                           | Path                                      |
|----------------|------------------------------------------|-------------------------------------------|
| **Dropbox**    | App folder (isolated)                    | `/Apps/[Your App]/expense-tracker.json.encrypted` |
| **Google Drive** | AppDataFolder (hidden from user)       | `appDataFolder/expense-tracker.json.encrypted` |
| **OneDrive**   | Application Data (app-specific folder)   | `/me/drive/special/approot/expense-tracker.json.encrypted` |

**Why app folder?**
- Doesn't clutter user's main folders
- Isolated from other apps
- Still accessible for debugging/export
- Consistent across platforms

### 3. Same CloudProvider Interface
All providers implement the same interface:

```typescript
interface CloudProvider {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, contents: string): Promise<void>;
  getMetadata(path: string): Promise<FileMetadata | null>;
  exists(path: string): Promise<boolean>;
  deleteFile(path: string): Promise<void>;
}
```

**No changes to:**
- `CloudSyncService` (merge, backoff, retry logic)
- `encryption.ts` (AES-256-GCM)
- Tests (use MockCloudProvider)

---

## Implementation Order

### Phase 4.1: Dropbox (Current) ✅
- [x] DropboxProvider implementation
- [x] OAuth with expo-auth-session
- [x] Error mapping (401, 429, 507)
- [x] Device testing checklist
- [x] SYNC_ENABLED flag (default OFF)

### Phase 4.2: Provider Selection UI
- [ ] Settings screen with provider picker
- [ ] Connect/Disconnect buttons per provider
- [ ] Show connected provider in sync status
- [ ] Warn on provider switch (data migration)

### Phase 4.3: Google Drive
- [ ] GoogleDriveProvider implementation
- [ ] OAuth with Google Sign-In
- [ ] AppDataFolder scope
- [ ] Error mapping
- [ ] Device testing

### Phase 4.4: OneDrive
- [ ] OneDriveProvider implementation
- [ ] OAuth with Microsoft Graph
- [ ] Application Data scope
- [ ] Error mapping
- [ ] Device testing

### Phase 4.5: Desktop Parity
- [ ] Add CloudProvider interface to Electron app
- [ ] Implement DropboxProvider (desktop)
- [ ] Implement GoogleDriveProvider (desktop)
- [ ] Implement OneDriveProvider (desktop)
- [ ] Test desktop ↔ mobile round-trip per provider

---

## Provider-Specific Details

### Google Drive

**SDK:** `@react-native-google-signin/google-signin`

**OAuth Scopes:**
```
https://www.googleapis.com/auth/drive.appdata
```

**Redirect URI:**
```
com.juhertra.expenses:/oauth2redirect
```

**File Path:**
```
appDataFolder/expense-tracker.json.encrypted
```

**Implementation:**
```typescript
export class GoogleDriveProvider implements CloudProvider {
  private drive: GoogleDrive;

  async readFile(path: string): Promise<string | null> {
    const files = await this.drive.files.list({
      spaces: 'appDataFolder',
      q: "name='expense-tracker.json.encrypted'",
    });

    if (files.data.files?.length === 0) return null;

    const fileId = files.data.files[0].id;
    const response = await this.drive.files.get({
      fileId,
      alt: 'media',
    });

    return response.data;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    // Check if file exists, update or create
    const files = await this.drive.files.list({
      spaces: 'appDataFolder',
      q: "name='expense-tracker.json.encrypted'",
    });

    if (files.data.files?.length > 0) {
      // Update existing
      await this.drive.files.update({
        fileId: files.data.files[0].id,
        media: { body: contents },
      });
    } else {
      // Create new
      await this.drive.files.create({
        requestBody: {
          name: 'expense-tracker.json.encrypted',
          parents: ['appDataFolder'],
        },
        media: { body: contents },
      });
    }
  }

  // ... rest of interface
}
```

**Error Mapping:**
- 401: `AUTH_ERROR`
- 403: `PERMISSION_DENIED` or `QUOTA_EXCEEDED` (check error message)
- 429: `RATE_LIMIT`
- 404: `NOT_FOUND`

---

### OneDrive

**SDK:** `@react-native-community/msal` (Microsoft Graph)

**OAuth Scopes:**
```
Files.ReadWrite.AppFolder
```

**Redirect URI:**
```
msauth://com.juhertra.expenses/callback
```

**File Path:**
```
/me/drive/special/approot/expense-tracker.json.encrypted
```

**Implementation:**
```typescript
export class OneDriveProvider implements CloudProvider {
  private client: GraphClient;

  async readFile(path: string): Promise<string | null> {
    try {
      const response = await this.client
        .api('/me/drive/special/approot:/expense-tracker.json.encrypted:/content')
        .get();
      return response;
    } catch (error) {
      if (error.statusCode === 404) return null;
      throw this.handleError(error);
    }
  }

  async writeFile(path: string, contents: string): Promise<void> {
    await this.client
      .api('/me/drive/special/approot:/expense-tracker.json.encrypted:/content')
      .put(contents);
  }

  // ... rest of interface
}
```

**Error Mapping:**
- 401: `AUTH_ERROR`
- 403: `PERMISSION_DENIED`
- 429: `RATE_LIMIT`
- 404: `NOT_FOUND`
- 507: `QUOTA_EXCEEDED`

---

## Desktop Parity Implementation

### Electron App Changes

1. **Extract CloudProvider interface to shared:**
   ```bash
   packages/shared/src/sync/CloudProvider.ts
   ```

2. **Implement providers in Electron:**
   ```
   packages/desktop/src/sync/providers/
   ├── DropboxProvider.ts
   ├── GoogleDriveProvider.ts
   └── OneDriveProvider.ts
   ```

3. **Reuse encryption module:**
   - Already in `@expenses/shared`
   - Same AES-256-GCM encryption
   - Same PBKDF2 key derivation

4. **Reuse CloudSyncService:**
   - Copy to `packages/desktop/src/sync/CloudSyncService.ts`
   - Or extract to `packages/shared/src/sync/` (if platform-independent)

5. **OAuth in Electron:**
   - Use `electron-oauth2` or `electron-oauth-helper`
   - Open OAuth in BrowserWindow
   - Capture redirect and extract token
   - Store in electron-store (encrypted)

---

## Provider Selection UI

### Settings Screen
```
Cloud Sync
┌─────────────────────────────────────┐
│ Provider                            │
│ ○ Dropbox                          │
│ ○ Google Drive                     │
│ ○ OneDrive                         │
│                                     │
│ [Connect Dropbox]                  │
└─────────────────────────────────────┘

Status: Not connected
Last sync: Never
```

### After Connection
```
Cloud Sync
┌─────────────────────────────────────┐
│ Provider: Dropbox               ✓  │
│                                     │
│ [Sync Now]  [Disconnect]           │
└─────────────────────────────────────┘

Status: Synced
Last sync: 2m ago
```

### Provider Switch Warning
```
⚠️ Switch Provider?

You're currently syncing with Dropbox.
Switching to Google Drive will:
- Download current data from Dropbox
- Upload to Google Drive
- Future syncs use Google Drive only

Continue?  [Cancel] [Switch Provider]
```

---

## Testing Strategy

### Per-Provider Checklist
For each provider (Dropbox, Drive, OneDrive):

1. **OAuth Flow:**
   - [ ] Connect succeeds
   - [ ] Token stored securely
   - [ ] 401 triggers re-auth

2. **File Operations:**
   - [ ] First sync uploads data
   - [ ] Download syncs from cloud
   - [ ] Merge appends new items

3. **Error Handling:**
   - [ ] Network error → retry with backoff
   - [ ] Rate limit → max backoff (5min)
   - [ ] Quota exceeded → user message
   - [ ] Tamper detection → decryption fails

4. **Desktop ↔ Mobile:**
   - [ ] Add expense on desktop → syncs to mobile
   - [ ] Add expense on mobile → syncs to desktop
   - [ ] Both platforms use same encrypted file

---

## Environment Variables

`.env` example for all providers:
```env
# Enable cloud sync (default: false)
EXPO_PUBLIC_ENABLE_SYNC=false

# Dropbox
EXPO_PUBLIC_DROPBOX_CLIENT_ID=your_dropbox_app_key

# Google Drive (Phase 4.3)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# OneDrive (Phase 4.4)
EXPO_PUBLIC_ONEDRIVE_CLIENT_ID=your_onedrive_client_id
```

---

## Migration Strategy

When switching providers:

1. **Download from old provider:**
   ```typescript
   const oldData = await oldProvider.readFile(FILE_PATH);
   const decrypted = await decryptData(oldData, key);
   ```

2. **Validate data:**
   ```typescript
   const parsed = JSON.parse(decrypted);
   if (!validateExportData(parsed)) throw new Error('Invalid data');
   ```

3. **Upload to new provider:**
   ```typescript
   const encrypted = await encryptData(decrypted, key);
   await newProvider.writeFile(FILE_PATH, encrypted);
   ```

4. **Verify:**
   ```typescript
   const verified = await newProvider.readFile(FILE_PATH);
   if (verified === encrypted) {
     // Success - disconnect old provider
   }
   ```

---

## Summary

**Key Principles:**
- ✅ One file: `expense-tracker.json.encrypted`
- ✅ Same interface: `CloudProvider`
- ✅ App folder scope (isolated storage)
- ✅ Desktop parity (same providers, same file)
- ✅ Reuse encryption, merge, backoff logic

**Implementation Order:**
1. Dropbox ✅
2. Provider selection UI
3. Google Drive
4. OneDrive
5. Desktop providers

**Testing:**
- Per-provider OAuth + file ops
- Desktop ↔ mobile round-trip
- Error handling (401, 429, tamper)
