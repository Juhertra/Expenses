# Expenses

A local-first expense tracker for couples who want to manage shared finances without spreadsheets, subscriptions, or sending their data to the cloud.

![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Electron](https://img.shields.io/badge/Electron-35-47848f)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Tests](https://img.shields.io/badge/Tests-46%20passing-success)

## Why This Project Exists

Most finance apps fall into two categories:

1. **Spreadsheets** — flexible but tedious, no insights, easy to mess up
2. **Cloud apps** — convenient but require subscriptions, accounts, and trusting someone else with your financial data

Expenses exists because neither option felt right for tracking household spending between two people.

**This is for you if:**

- You share expenses with a partner and need fair-split calculations
- You want your data on your machine, not someone else's server
- You prefer a focused tool over a feature-bloated "financial platform"
- You value transparency — the data format is plain JSON you can read and edit

## Key Principles

- **Local-first** — Your data stays on your device. No accounts. No backend.
- **Offline by default** — Works without internet. Always.
- **Human-friendly finance** — Categories, splits, and summaries that make sense for real households.
- **Transparent data** — Plain JSON. Export anytime. No lock-in.
- **No subscriptions, no tracking** — Free and open-source. No analytics. No telemetry.

## Features Overview

- **Expense & income tracking** — Add transactions with categories, dates, and partner assignment
- **Smart categories** — 11 built-in categories with icons, filterable and reportable
- **Partner splits** — 50/50 or custom ratio, with automatic fair-share calculation
- **Recurring transactions** — Monthly expenses that auto-generate
- **Duplicate detection** — Prevents accidental double entries
- **Insights & trends** — Dashboard with charts, top categories, and balance overview
- **Settlements** — Track who owes whom and record payments
- **Import / export** — Full JSON backup and restore
- **Bilingual** — English and Hebrew with RTL support
- **Themes** — Dark Purple, Ocean Blue, and Minimal
- **Desktop & web** — Electron app with auto-updates, or run in browser

## Screenshots

### Dashboard View

![Dashboard Overview](screenshots/dashboard.png)
*Balance overview, expense trends, top categories, and recent transactions*

### Transactions View

![Transaction List](screenshots/transactions.png)
*Transaction list with filtering, search, and month navigation*

![Add Transaction Form](screenshots/add-transaction.png)
*Add/edit form with category selection and partner assignment*

### Settings Panel

![Settings Modal](screenshots/settings.png)
*Data management, theme selection, and localization options*

### Theme Options

![Theme Comparison](screenshots/themes.png)
*Dark Purple, Ocean Blue, and Minimal themes*

## How It Works

**Desktop app (Electron):**

- Data stored as a local JSON file
- Default location: `%APPDATA%/expenses/` (Windows) or `~/Library/Application Support/expenses/` (macOS)
- Configurable file location — point it at a cloud-synced folder if you want
- Automatic updates via GitHub Releases

**Web version:**

- Runs entirely in browser
- Data stored in localStorage
- Export/import for backup and transfer

Both versions use the same React codebase. The Electron wrapper adds file system access and native window management.

## Data & Privacy Model

**Where your data lives:**

- Desktop: A single JSON file on your filesystem
- Web: Browser localStorage

**What is never sent anywhere:**

- Your transactions, categories, partner names, settings — everything
- There is no server. No API calls. No analytics.

**Backup guarantees:**

- Export creates a complete, human-readable JSON file
- The file format is documented and stable
- You can edit the JSON directly if needed

**Deleting your data:**

- Desktop: Delete the JSON file
- Web: Clear site data in browser settings
- That's it. There's nothing else.

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| UI Framework | React 18 with hooks and context         |
| Language     | TypeScript 5                            |
| Build Tool   | Vite 7                                  |
| Styling      | Tailwind CSS 3                          |
| Desktop      | Electron 35                             |
| Updates      | electron-updater 6                      |
| i18n         | i18next                                 |
| Security     | DOMPurify (XSS protection), CSP headers |
| Testing      | Vitest with React Testing Library       |

## Project Structure

```text
src/
├── components/          # React components
│   ├── ExpenseTracker/  # Main app shell and views
│   ├── modals/          # Dialogs and overlays
│   ├── shared/          # Reusable components (Toast, Dialog)
│   └── ui/              # Base primitives (Button, Input)
├── contexts/            # React contexts (Data, UI, Modal)
├── hooks/               # Custom React hooks
├── i18n/                # Translation files (en.json, he.json)
├── lib/                 # Utilities, types, calculations
├── services/            # Storage, platform detection, import/export
├── state/               # State management and selectors
└── test/                # Test setup and utilities

electron/
├── main.cjs             # Main process (IPC, window, updates)
└── preload.cjs          # Secure IPC bridge

resources/
└── icon.png             # App icon (1024×1024)
```

## Getting Started (Developers)

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Clone
git clone https://github.com/Juhertra/Expenses.git
cd Expenses

# Install dependencies
npm install

# Run web version
npm run dev

# Run desktop version
npm run electron:dev
```

### Build

```bash
# Production web build
npm run build

# Desktop installers (platform-specific)
npm run electron:build
```

### Test

```bash
npm test              # Run tests
npm run test:ui       # Interactive test UI
npm run test:coverage # Coverage report
```

## Configuration & Settings

Accessed via the Settings panel in-app:

- **Language** — English or Hebrew (switches layout direction)
- **Currency** — Symbol and code for display
- **Partner names** — Customize labels for Partner 1 / Partner 2
- **Split mode** — 50/50 or custom ratio
- **Data location** — (Desktop only) Choose where the JSON file is stored
- **Theme** — Dark Purple, Ocean Blue, or Minimal

## Roadmap

### Short-term

- [ ] Improved keyboard navigation
- [ ] Category customization (add/edit/delete)
- [ ] Monthly budget targets

### Mid-term

- [ ] Multiple currencies with conversion
- [ ] Attachment support (receipts)
- [ ] Search across all transactions

### Ideas / Experimental

- [ ] Optional cloud sync (user-controlled, e.g., via Dropbox/Drive)
- [ ] Mobile companion app
- [ ] Shared household mode (multiple users, same file)

## Contributing

Contributions are welcome from developers of all experience levels.

**Good first contributions:**

- Bug fixes with clear reproduction steps
- Translation improvements or new languages
- Documentation clarifications
- Accessibility improvements

**Before opening a PR:**

1. Run `npm test` — all tests should pass
2. Run `npm run lint` — no lint errors
3. Run `npm run build` — production build succeeds

**For larger changes:**
Open an issue first to discuss the approach. This saves everyone time.

**Code style:**

- TypeScript strict mode
- Functional components with hooks
- Tailwind for styling (no inline styles or CSS modules)
- Tests for business logic

## Design & UX Philosophy

- **Simplicity over features** — Every feature has a cost. We add things only when they solve a real problem.
- **Predictable UI** — No surprises. Actions do what they look like they'll do.
- **Keyboard-first** — Power users shouldn't need a mouse.
- **Accessibility** — Semantic HTML, proper focus management, screen reader support.
- **Consistency across languages** — RTL and LTR layouts should feel equally native.

## Limitations & Non-Goals

**This app intentionally does not:**

- **Sync automatically between devices** — Local-first means you control sync (via Dropbox, Drive, etc.)
- **Connect to banks** — No Plaid, no screen scraping, no API keys
- **Support multiple households** — One file = one household
- **Handle investments or complex assets** — This is for day-to-day expenses, not portfolio tracking
- **Provide financial advice** — It shows you data; you make decisions

**Why:**
These constraints keep the app simple, private, and maintainable. If you need these features, there are other tools that do them well.

## Downloads

**[→ Latest Release (Windows / macOS)](https://github.com/Juhertra/Expenses/releases/latest)**

- **Windows**: `Expenses-setup-<version>.exe`
- **macOS**: `Expenses-<version>-macOS.dmg`

The desktop app auto-updates when new versions are released.

## License

GPL-3.0

This project is licensed under the GNU General Public License v3.0. You are free to use, modify, and distribute this software, but any modifications or derivative works must also be released under the GPL-3.0 license.

See [LICENSE](LICENSE) for the full license text.

## Author

Hernan Trajtemberg
