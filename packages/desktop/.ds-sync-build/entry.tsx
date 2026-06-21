// Design-sync entry barrel — re-exports the scoped design-system surface for
// the claude.ai/design importable bundle. Hand-authored (the app has no
// component-library dist), so the converter bundles exactly these exports
// rather than `export *`-ing the whole src tree (which would make IconButton
// — present in both ui/ and shared/ — an ambiguous, undefined re-export).
//
// The leading i18n import is a SIDE EFFECT: src/i18n/index.ts calls
// i18n.use(initReactI18next).init(...), registering the global instance so
// every useTranslation() in the bundled components resolves real English
// strings without an <I18nextProvider> wrapper.
import "../src/i18n";

// Provider for the runtime theme context (Button / ExternalChangeBanner read
// useTheme()). Wired as cfg.provider so previews render themed.
export { ThemeProvider } from "../src/lib/theme";

// UI primitives (src/components/ui)
export { Button } from "../src/components/ui/Button";
export { Card } from "../src/components/ui/Card";
export { IconButton } from "../src/components/ui/IconButton";
export { Input } from "../src/components/ui/Input";
export { ModalShell } from "../src/components/ui/ModalShell";
export { Select } from "../src/components/ui/Select";

// Shared cross-cutting components (src/components/shared)
export { ConfirmDialog } from "../src/components/shared/ConfirmDialog";
export { Toast } from "../src/components/shared/Toast";
export { ModalBase } from "../src/components/shared/ModalBase";
export { SaveStatusIndicator } from "../src/components/shared/SaveStatusIndicator";
export { ShowMoreButton } from "../src/components/shared/ShowMoreButton";
export { ExternalChangeBanner } from "../src/components/shared/ExternalChangeBanner";
