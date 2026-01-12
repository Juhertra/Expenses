# Household Expense Tracker

A beautiful, full-featured expense tracking application for managing household finances between two partners. Built with React, TypeScript, Tailwind CSS, and localStorage persistence.

![Dashboard View](https://img.shields.io/badge/Status-Production_Ready-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Features

### 📊 Dashboard View
- Real-time financial overview with balance, expenses, and income
- Interactive statistics chart showing daily expenses and income
- Top spending categories with visual breakdown
- Recent transactions preview
- Upcoming recurring transactions

### 💰 Transaction Management
- Add and edit expenses and income
- Categorize transactions (Housing, Food, Transportation, Utilities, etc.)
- Assign payments to Partner 1, Partner 2, or Joint account
- Date-based tracking with month/year filtering
- Automatic recurring transaction processing

### 📅 Recurring Transactions
- Set up monthly recurring expenses or income
- Choose specific day of month for automatic processing
- Smart date handling (e.g., day 31 adjusts to last day of shorter months)
- Automatic creation of transactions at the start of each month

### 📈 Categories & Analytics
- 11 predefined categories with icons and color coding
- Category spending breakdown with percentages
- Visual progress bars and charts

### ⚖️ Balance Settlement
- Automatic calculation of fair share between partners
- Payment breakdown showing who paid what
- Settlement recommendations (who owes whom)
- Individual income and expense tracking

### ⚙️ Settings
- Customize partner names
- Persistent storage across sessions

## Installation

### Prerequisites
- Node.js 16+ and npm

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

The app will automatically open in your browser at `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build production bundle (TypeScript check + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks

## Storage Architecture

The application uses browser `localStorage` for data persistence with three main storage keys:

### Storage Keys

#### `household-expenses`
Stores array of all transactions (expenses and income):
```json
[
  {
    "id": 1234567890,
    "description": "Monthly Rent",
    "amount": 1500,
    "category": "Housing",
    "type": "expense",
    "date": "2026-01-01",
    "paidBy": "joint",
    "isAuto": false
  }
]
```

#### `household-recurring`
Stores recurring transaction templates:
```json
[
  {
    "id": 1234567891,
    "description": "Rent",
    "amount": 1500,
    "category": "Housing",
    "type": "expense",
    "paidBy": "joint",
    "recurringDay": 1,
    "lastProcessed": "2026-01-01T00:00:00.000Z"
  }
]
```

#### `household-partner-names`
Stores customizable partner names:
```json
{
  "partner1": "Hernan",
  "partner2": "Partner"
}
```

### Storage Adapter

The app uses a custom `window.storage` adapter that wraps localStorage:

```typescript
interface StorageAdapter {
  get(key: string, secure?: boolean): Promise<{ value: string } | null>;
  set(key: string, value: string, secure?: boolean): Promise<void>;
}
```

- **Async interface**: Consistent with native storage APIs
- **Raw string storage**: No JSON processing in adapter layer
- **Graceful error handling**: Returns null on missing/invalid data
- **Seed data**: Automatically populates sample data on first run

## Recurring Transaction Logic

### How It Works

1. **Setup**: Create a recurring transaction with a specific day of month (1-31)
2. **Processing**: At the start of each month, the app checks all recurring items
3. **Automatic Creation**: If not already processed for current month, creates a new expense/income
4. **Date Handling**: If `recurringDay` exceeds days in month (e.g., day 31 in February), it's clamped to the last day of that month
5. **Tracking**: Updates `lastProcessed` timestamp to prevent duplicates

### Testing Recurring Transactions

**Option 1: Manual localStorage Edit**
1. Open browser DevTools → Application/Storage → localStorage
2. Find `household-recurring` key
3. Edit `lastProcessed` date to previous month
4. Refresh the app - transactions will auto-create

**Option 2: Wait for Month Change**
- Recurring transactions automatically process on the first load of each new month

**Example:**
```json
{
  "recurringDay": 31,
  "lastProcessed": "2025-12-15T00:00:00.000Z"
}
```
- In January (31 days): Creates transaction on day 31
- In February (28/29 days): Creates transaction on day 28/29

## Input Validation

The app includes client-side validation:

- **Description**: Required, cannot be empty
- **Amount**: Must be a positive number greater than 0
- **Recurring Day**: Automatically clamped between 1 and 31
- **Date**: Must be valid ISO date format (YYYY-MM-DD)

Validation errors display as alerts without modifying the UI design.

## Categories

The app includes 11 predefined categories:

| Category | Icon | Color |
|----------|------|-------|
| Housing | 🏠 | Orange |
| Food | 🍔 | Green |
| Transportation | 🚗 | Blue |
| Utilities | ⚡ | Yellow |
| Healthcare | 🏥 | Red |
| Entertainment | 🎮 | Purple |
| Shopping | 🛍️ | Pink |
| Education | 📚 | Indigo |
| Insurance | 🛡️ | Cyan |
| Savings | 💰 | Emerald |
| Other | 📌 | Gray |

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── ExpenseTracker.tsx    # Main application component
│   │   └── ErrorBoundary.tsx     # React error boundary
│   ├── lib/
│   │   ├── types.ts               # TypeScript type definitions
│   │   ├── storage.ts             # Storage adapter interface
│   │   ├── localStorageAdapter.ts # localStorage implementation
│   │   └── initStorage.ts         # Storage initialization & seeding
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Tailwind directives
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.cjs            # Tailwind CSS configuration
├── postcss.config.cjs             # PostCSS configuration
└── package.json                   # Dependencies and scripts
```

## Technology Stack

- **React 18.2** - UI framework with hooks
- **TypeScript 5.2** - Type-safe JavaScript
- **Vite 5.0** - Fast build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **localStorage** - Browser-native persistence

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern browser with localStorage support

## Development Notes

### Error Handling
- React Error Boundary catches component errors
- Storage errors log to console and fail gracefully
- Invalid JSON in storage returns null instead of crashing

### Performance
- Vite's Hot Module Replacement (HMR) for instant updates
- Optimized production builds with code splitting
- Minimal dependencies for fast load times

### Type Safety
- Strict TypeScript configuration
- Full type coverage for state and props
- Interface definitions in `src/lib/types.ts`

## Future Enhancements

Potential features for future versions:
- Export to CSV/PDF
- Budget targets and alerts
- Multi-currency support
- Dark/light theme toggle
- Data backup and restore
- Advanced filtering and search
- Custom categories
- Mobile app version

## License

This project is private and intended for personal use.

## Support

For issues or questions, please contact the development team or check the project repository.

---

**Built with ❤️ for better household financial management**

