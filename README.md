# Expenses

A modern, bilingual (English/Hebrew) expense tracking application for managing household finances between two partners. Available as a web app or desktop application with automatic updates.

![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Electron](https://img.shields.io/badge/Electron-35-47848f)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Tests](https://img.shields.io/badge/Tests-46%20passing-success)

## Features

### Dashboard

- Real-time financial overview with balance, expenses, and income totals
- Interactive chart showing daily expenses and income trends
- Top spending categories with visual breakdown
- Recent transactions and upcoming recurring items

### Transaction Management

- Add, edit, and delete expenses and income
- 11 customizable categories with icons
- Assign transactions to Partner 1, Partner 2, or Joint account
- **Duplicate detection** to prevent accidental double entries
- Month/year filtering with quick navigation

### Recurring Transactions

- Set up monthly recurring expenses or income
- Automatic processing at the start of each month
- Smart date handling (day 31 adjusts to last day of shorter months)

### Balance & Settlements

- Automatic fair-share calculation between partners
- Support for 50/50 or proportional split modes
- Settlement tracking and recommendations
- Individual income and expense breakdown

### Data Management

- **Desktop**: File-based storage with configurable location
- **Web**: Browser localStorage with import/export
- Cloud drive detection (OneDrive, Google Drive, Dropbox, iCloud)
- External file change detection with reload prompt
- **Atomic writes** with race condition protection
- JSON export/import for backup and portability

### Security

- **Content Security Policy (CSP)** — defense against XSS and injection attacks
- **Input sanitization** — DOMPurify-based HTML/script stripping on all user input
- **IPC validation** — Electron preload bridge validates all main↔renderer communication
- **Atomic storage writes** — prevents data corruption from concurrent writes or crashes
- **Path sanitization** — prevents directory traversal attacks in file operations

### Internationalization

- Full English and Hebrew support
- RTL layout for Hebrew
- Localized date and currency formatting

### Themes

- Dark Purple (default)
- Ocean Blue
- Minimal

## Releases & Updates

### Desktop App Downloads

Download the latest release for your platform:

**[→ Latest Release (Windows / macOS)](https://github.com/Juhertra/Expenses/releases/latest)**

- **Windows**: `Expenses-setup-<version>.exe` (NSIS installer)
- **macOS**: `Expenses-<version>-macOS.dmg` (DMG image)

### Automatic Updates

The desktop app checks for updates automatically on launch. When a new version is available:

1. A notification appears prompting you to update
2. Click "Download" to fetch the update in the background
3. Restart the app to apply the update

Updates are served directly from GitHub Releases via [electron-updater](https://www.electron.build/auto-update).

## Installation (Development)

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Juhertra/Expenses.git
cd Expenses

# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start development server (desktop)
npm run electron:dev
```

## Scripts

| Command                | Description                                     |
|------------------------|-------------------------------------------------|
| `npm run dev`          | Start Vite development server (port 3000)       |
| `npm run build`        | Build production bundle (TypeScript check + Vite build) |
| `npm run preview`      | Preview production build                        |
| `npm run lint`         | Run ESLint                                      |
| `npm run test`         | Run tests with Vitest                           |
| `npm run test:ui`      | Run tests with Vitest UI                        |
| `npm run test:coverage`| Generate test coverage report                   |
| `npm run electron:dev` | Start Electron development                      |
| `npm run electron:build`| Build platform-specific desktop installers     |

## Desktop App

The Electron build stores data in the app's user data folder by default:

- **Windows**: `%APPDATA%/expenses/expenses-data.json`
- **macOS**: `~/Library/Application Support/expenses/expenses-data.json`
- **Linux**: `~/.config/expenses/expenses-data.json`

You can configure a custom data file location in **Settings → Data**.

### Building Installers Locally

```bash
npm run electron:build
```

This creates platform-specific installers in the `dist` folder:

- **Windows**: `.exe` installer with NSIS
- **macOS**: `.dmg` image (on macOS only)
- **Linux**: `.AppImage`, `.deb`, `.rpm` (on Linux only)

electron-builder only produces installers for the OS it's running on (no cross-compilation without extra setup).

### Release Process (Maintainers)

Releases are automated via GitHub Actions:

1. Bump version in `package.json`
2. Commit: `git commit -am "Bump version to X.Y.Z"`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push && git push --tags`
5. GitHub Actions builds Windows + macOS installers in parallel and publishes to Releases
6. electron-updater serves the new version to existing installs

## Testing

The project uses **Vitest** for unit testing with **@testing-library/react** for component tests.

### Test Coverage

- **46 tests** across 5 test suites
- All core business logic covered:
  - ✓ Financial calculations (splits, balances, fair-share)
  - ✓ Input validators (amount, date, settlement)
  - ✓ Recurring transaction processing
  - ✓ Duplicate detection & normalization
  - ✓ Storage service (atomic writes, race conditions)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage

# Open interactive UI
npm run test:ui
```

Coverage reports are generated in `coverage/` using V8.

## Project Structure

```text
src/
├── components/
│   ├── ExpenseTracker/       # Main app component and views
│   │   ├── views/            # Dashboard, Transactions, Categories, Balance
│   │   ├── modals/           # Settings modal
│   │   └── widgets/          # Settings panel, etc.
│   ├── modals/               # Welcome, folder selection modals
│   ├── shared/               # Reusable components (Toast, Dialog, etc.)
│   └── ui/                   # Base UI components (Button, Input, etc.)
├── contexts/                 # React contexts (Data, UI, Modal)
├── hooks/                    # Custom React hooks
├── i18n/                     # Translation files (en.json, he.json)
├── lib/                      # Utilities, types, calculations
├── services/                 # Storage, platform, import/export
├── state/                    # State management and selectors
└── test/                     # Test setup and utilities
electron/
├── main.cjs                  # Electron main process (IPC, window management, updates)
└── preload.cjs               # Preload script for secure IPC bridge
resources/
└── icon.png                  # App icon (1024x1024, auto-converted to .ico/.icns)
.github/
└── workflows/
    └── release.yml           # Automated release builds (Windows + macOS)
```

## Technology Stack

- **React 18** - UI framework with hooks and context
- **TypeScript 5** - Type-safe development
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 3** - Utility-first styling
- **Electron 35** - Desktop application wrapper
- **electron-updater 6** - Automatic updates from GitHub Releases
- **i18next** - Internationalization
- **DOMPurify** - XSS protection
- **Anime.js** - Smooth animations
- **Vitest** - Testing framework with V8 coverage

## Data Format

Expenses are stored as JSON with the following structure:

```json
{
  "schemaVersion": 2,
  "expenses": [...],
  "recurring": [...],
  "settlements": [...],
  "partnerNames": { "partner1": "Alice", "partner2": "Bob" },
  "householdSettings": {
    "currencyCode": "USD",
    "currencySymbol": "$",
    "splitMode": "50-50",
    "splitRatio": [50, 50]
  }
}
```

The schema version allows for future migrations. All writes are atomic (write to temp file → rename) to prevent corruption.

## Contributing

Contributions are welcome! Before submitting a PR:

1. Run tests: `npm test`
2. Run lint: `npm run lint`
3. Ensure build succeeds: `npm run build`

For larger changes, open an issue first to discuss the approach.

## License

ISC

## Author

Hernan Trajtemberg
