# design-sync NOTES — expense-tracker (desktop UI)

Repo-specific gotchas for syncing the desktop design system to claude.ai/design.
Read this first on every re-sync.

## What's synced
- Source: `packages/desktop` (React + Vite + Electron **app**, not a published
  component library). Scope = UI primitives + shared cross-cutting components.
- Shape: **package**, in **synth-entry mode** (no component-library `dist/`).

## Build inputs (under `packages/desktop/.ds-sync-build/`)
- `entry.tsx` — hand-authored barrel re-exporting exactly the 12 scoped
  components + `ThemeProvider`, with a side-effect `import "../src/i18n"`.
  Wired via `cfg.entry`. Hand-authored because the app has no library dist and
  a bare `export *` over `src/` would make `IconButton` an **ambiguous,
  undefined** re-export (it exists in both `ui/` and `shared/`).
  **Committed** (not gitignored — this file is hand-authored).
- `styles.css` — compiled Tailwind (gitignored — generated artifact). Regenerate
  from the package dir before every build:
  `node ../../node_modules/tailwindcss/lib/cli.js -c tailwind.config.cjs -i src/index.css -o .ds-sync-build/styles.css`
  Wired via `cfg.cssEntry`. **Must be regenerated whenever component source or
  `theme.ts` changes** — Tailwind only emits classes it finds in `src/**`.

## Cloud project
- Project: **Expense Tracker Design System** (`projectId`: `960fcc0e-f09c-4c52-b469-fb4e50902bda`)
- URL: https://claude.ai/design/p/960fcc0e-f09c-4c52-b469-fb4e50902bda
- First synced: 2026-06-21 — 12 components, all grades good, render check clean.

## Playwright
- Chromium installed at `%LOCALAPPDATA%\ms-playwright\chromium-1228` (playwright
  installed in `.ds-sync/node_modules` via `npm i -D playwright`).
- Re-running `npx playwright install chromium` from `.ds-sync/` on a fresh
  clone if the cache is absent.

## Gotchas
- **IconButton collision**: `src/components/ui/IconButton.tsx` (the real button)
  and `src/components/shared/IconButton.tsx` (a thin `LucideIcon`-typed variant)
  share the name. Only the **ui** one is synced. If shared/IconButton is ever
  wanted, re-export it from the barrel under a distinct name.
- **i18n**: `Toast`, `SaveStatusIndicator`, `ExternalChangeBanner`,
  `ConfirmDialog` call `useTranslation()`. Satisfied by the barrel's side-effect
  `import "../src/i18n"` (registers the global i18next instance, default `en`) —
  NOT by an `<I18nextProvider>`. Don't drop that import.
- **Theme/provider**: only `Button` (and `ExternalChangeBanner` via `Button`)
  reads `useTheme()`. `cfg.provider = ThemeProvider`. Default theme is
  `dark-purple` → components are **dark-themed** (`text-white` on dark). Authored
  previews must render on a **dark surface** or text is invisible.
- **node_modules**: deps are hoisted to the **repo root** `node_modules`
  (`packages/desktop/node_modules` is sparse). Pass `--node-modules` = repo root.
- **Dynamic Tailwind class**: `Button` builds `focus:${theme.colors.focus}/50`
  at runtime, so that one composite focus-ring class is NOT in the compiled CSS
  (Tailwind can't see runtime-built strings). Focus-only, not visible in static
  screenshots — accepted.

- **Hebrew fonts** (`Rubik`, `Heebo`, `Assistant`): referenced only by
  `body[data-lang='he']` in `index.css` as a preferred Hebrew family list. The
  app never ships `@font-face` for them — it relies on the OS. Declared via
  `cfg.runtimeFontPrefixes` (host-provided) so `[FONT_MISSING]` is suppressed.
  Default English/LTR previews use the system stack (`-apple-system`, …). To
  make Hebrew previews pixel-exact, add the woff2 + `@font-face` via
  `cfg.extraFonts` (not done — out of scope for the English-default DS).

## Preview authoring patterns (calibration learnings)
- **Dark stage required**: components assume a dark surface; wrap every preview
  cell in `bg-slate-900 text-white p-6 …`. White text is invisible otherwise.
- **Overlay components** (`ConfirmDialog`, `ModalShell`, `ModalBase`, `Toast`,
  `ExternalChangeBanner`) render `position:fixed`. The single-mode preview card
  mounts inside a `transform:translateZ(0)` wrapper, which becomes the containing
  block for `fixed`. With only fixed children that wrapper collapses to 0 height
  and `inset-0` has nothing to fill (dialog clips at the top). **Fix**: include a
  flowed `min-h-screen w-full bg-slate-900` spacer in the preview Frame so the
  wrapper gets viewport height; it also serves as the dark backdrop. Use
  `cfg.overrides.<Name> = {cardMode:"single", primaryStory, viewport:"WxH"}`.
- **Uncolored headings**: `ConfirmDialog` (`<h3>`) and `ModalBase` (`<h2>`) titles
  have NO text-color class — they inherit. The preview Frame must set `text-white`
  on an ancestor (the app provides this via its themed root). → conventions header.
- **Mount animations + frozen capture clock**: `ModalBase` (`fadeScaleIn`) and
  `Toast` (`slideFadeInUp`) animate from `opacity:0` via animejs. The capture
  freezes the clock (`setFixedTime`), stranding the animation at 0 → blank card.
  Both helpers honor `prefers-reduced-motion: reduce` by rendering the final
  state instantly, so those two previews emulate it (override `window.matchMedia`
  at module load). Other overlays (ModalShell, ConfirmDialog, ExternalChangeBanner)
  have no mount animation and need no such workaround.

## Re-sync risks
- `styles.css` is a generated artifact tied to current `src/`; stale CSS =
  missing component styles. Always regenerate before building (see command above).
- The compiled CSS contains only utility classes used in `src/**`. New markup the
  design agent writes with *other* Tailwind classes won't be styled — inherent to
  shipping precompiled Tailwind. Documented in the conventions header.
- `entry.tsx` is committed — update it if components are added, removed, or the
  `IconButton` collision is resolved (currently only `ui/IconButton` is synced).
- Re-sync driver (`resync.mjs`) requires the remote anchor at
  `.design-sync/.cache/remote-sync.json`. Fetch it before running the driver:
  use `DesignSync(get_file, path: "_ds_sync.json")` and save locally.
