# Expenses

A modern, bilingual (English/Hebrew) expense tracking application for managing household finances between two partners. Available as a web app or desktop application.

![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Electron](https://img.shields.io/badge/Electron-35-47848f)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

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
- Duplicate detection to prevent accidental double entries
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
- JSON export/import for backup and portability

### Internationalization
- Full English and Hebrew support
- RTL layout for Hebrew
- Localized date and currency formatting

### Themes
- Dark Purple (default)
- Ocean Blue
- Minimal

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

```bash
# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start development server (desktop)
npm run electron:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run electron:dev` | Start Electron development |
| `npm run electron:build` | Build desktop installers |

## Desktop App

The Electron build stores data in the app's user data folder by default. You can configure a custom data file location in Settings > Data.

### Building Installers

```bash
npm run electron:build
```

This creates platform-specific installers in the `dist` folder.

## Project Structure

```
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
└── state/                    # State management and selectors
electron/
├── main.cjs                  # Electron main process
└── preload.cjs               # Preload script for IPC
```

## Technology Stack

- **React 18** - UI framework with hooks and context
- **TypeScript 5** - Type-safe development
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 3** - Utility-first styling
- **Electron 35** - Desktop application wrapper
- **i18next** - Internationalization
- **Anime.js** - Animations
- **Vitest** - Testing framework

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

## License

ISC

## Author

Hernan Trajtemberg
