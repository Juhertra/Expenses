# Device Testing Notes

## Phase 3 Status (Current)

**SDK Version:** Expo SDK 52
**Testing Method:** Web browser (React Native Web)
**Device Testing:** Deferred until Phase 4

## Why Not Expo Go?

Expo Go requires exact SDK version matching between the app and the Expo Go app installed on your device. This creates constant version compatibility issues:

- Expo Go on iOS updates to latest SDK automatically
- Our app uses SDK 52 (stable, works on web)
- SDK 54 has compatibility issues with both Expo Go and web
- Version mismatches cause runtime errors (TurboModuleRegistry, PlatformConstants, etc.)

**Conclusion:** Expo Go is not viable for active development due to version dependencies.

## Device Testing Strategy (Phase 4+)

When encryption is added (Phase 4) and real device testing is required, use a **custom development client**:

### iOS Testing
```bash
cd packages/mobile
npx expo prebuild
npx expo run:ios
```

**Requirements:**
- macOS with Xcode installed
- iOS Simulator or physical device
- Apple Developer account (for physical device)

### Android Testing
```bash
cd packages/mobile
npx expo prebuild
npx expo run:android
```

**Requirements:**
- Android Studio with SDK installed
- Android Emulator or physical device
- USB debugging enabled (for physical device)

## Custom Dev Client Benefits

1. **Full native module support** - No SDK version restrictions
2. **Encryption support** - Can use `@craftzdog/react-native-quick-crypto`
3. **Stable testing** - No version drift from Expo Go updates
4. **Real device behavior** - Tests actual native APIs (AsyncStorage, etc.)

## Phase 3 Web Testing (Current)

Web testing is sufficient for Phase 3 validation:
- ✅ UI/UX works identically
- ✅ React Native Web provides same APIs
- ✅ AsyncStorage uses localStorage (same behavior)
- ✅ Form validation works
- ✅ State management works
- ✅ No native modules required yet

**Note:** Once encryption is added in Phase 4, web testing will no longer be sufficient since `@craftzdog/react-native-quick-crypto` requires native modules.

## Timeline

- **Phase 3 (Current):** Web testing only
- **Phase 4 (Cloud Sync):** Switch to custom dev client for encryption testing
- **Phase 5+ (Production):** Build standalone apps via EAS Build

---

**TL;DR:** Use web for now, build custom dev client when we add encryption.
