---
name: Expense Tracker Setup
overview: Set up a complete Vite + React + TypeScript + Tailwind project with localStorage persistence adapter, making the ExpenseTracker component fully runnable with npm install && npm run dev.
todos:
  - id: project-config
    content: Create project configuration files (package.json, vite.config.ts, tsconfig, tailwind.config, postcss.config, index.html)
    status: completed
  - id: storage-adapter
    content: Implement storage adapter layer with TypeScript interfaces and localStorage implementation
    status: completed
  - id: storage-init
    content: Create storage initialization with seed data for first-time users
    status: completed
  - id: react-structure
    content: Set up React app structure (main.tsx, App.tsx, ErrorBoundary, index.css)
    status: completed
  - id: convert-component
    content: Convert ExpenseTracker.jsx to TypeScript with types and input validation
    status: completed
  - id: documentation
    content: Create README with setup instructions and feature documentation
    status: completed
---

# Complete Expense Tracker App

Setup

## Project Structure

```javascript
/Users/hernan.trajtemberg/Documents/Personal/Expenses/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── README.md
├── .eslintrc.cjs (optional)
├── src/
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component
│   ├── index.css                     # Tailwind directives
│   ├── vite-env.d.ts                 # Vite types
│   ├── components/
│   │   ├── ExpenseTracker.tsx        # Main component (converted)
│   │   └── ErrorBoundary.tsx         # Error handling
│   └── lib/
│       ├── storage.ts                # Storage adapter interface
│       ├── localStorageAdapter.ts    # localStorage implementation
│       └── initStorage.ts            # Window storage setup
```



## Implementation Steps

### 1. Project Configuration Files

**[package.json](package.json)** - Dependencies and scripts:

- React 18, TypeScript, Vite
- Tailwind CSS + PostCSS + Autoprefixer
- lucide-react for icons
- Scripts: dev, build, preview, lint

**[vite.config.ts](vite.config.ts) **- Vite configuration with React plugin**[tsconfig.json](tsconfig.json)** & **[tsconfig.node.json](tsconfig.node.json) **- TypeScript compiler options**[tailwind.config.js](tailwind.config.js) **- Tailwind with content paths for src/**/*.{js,ts,jsx,tsx}**[postcss.config.js](postcss.config.js) **- PostCSS with Tailwind and Autoprefixer**[index.html](index.html)** - HTML entry point with root div

### 2. Storage Adapter Layer

**[src/lib/storage.ts](src/lib/storage.ts)** - Define TypeScript interfaces:

```typescript
interface StorageResult {
  value: string;
}

interface StorageAdapter {
  get(key: string, secure?: boolean): Promise<StorageResult | null>;
  set(key: string, value: string, secure?: boolean): Promise<void>;
}
```

**[src/lib/localStorageAdapter.ts](src/lib/localStorageAdapter.ts)** - Implement localStorage adapter:

- `get()`: Read from localStorage, return `{ value: string }` or null
- `set()`: Write to localStorage
- Handle JSON parsing errors gracefully
- Ignore `secure` parameter (browser-only)

**[src/lib/initStorage.ts](src/lib/initStorage.ts)** - Initialize window.storage:

- Attach adapter to `window.storage`
- Seed default data if storage is empty:
- `household-partner-names`: `{ "partner1": "Hernan", "partner2": "Partner" }`
- `household-expenses`: Sample transactions (2-3 entries with varied dates, categories)
- `household-recurring`: Empty array `[]`
- Add TypeScript declaration for `window.storage`

### 3. React App Structure

**[src/main.tsx](src/main.tsx)** - Entry point:

1. Import storage initialization
2. Call `initStorage()`
3. Render `<App />` with React 18 createRoot
4. Import index.css

**[src/App.tsx](src/App.tsx)** - Root component:

- Wrap ExpenseTracker in ErrorBoundary
- Simple container, no extra styling

**[src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx)** - Error boundary component:

- Catch React errors
- Display friendly error message
- Log to console

**[src/index.css](src/index.css)** - Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```



### 4. Expense Tracker Component

**[src/components/ExpenseTracker.tsx](src/components/ExpenseTracker.tsx)** - Convert from .jsx:

- Change file extension to .tsx
- Add TypeScript types for state, form data, expenses
- Add input validation:
- Amount must be > 0
- Description required (non-empty)
- RecurringDay clamped 1-31
- Keep ALL existing functionality intact
- Maintain identical UI/UX

### 5. Documentation

**[README.md](README.md)** - Include:

- Project description
- Installation: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Storage keys explanation (household-expenses, household-recurring, household-partner-names)
- Recurring transaction logic explanation
- How to test recurring: Manually adjust lastProcessed date in localStorage or wait for month change
- Features list

### 6. Type Declarations

**[src/vite-env.d.ts](src/vite-env.d.ts)** - Extend Window interface:

```typescript
interface Window {
  storage: {
    get(key: string, secure?: boolean): Promise<{ value: string } | null>;
    set(key: string, value: string, secure?: boolean): Promise<void>;
  };
}
```



## Key Technical Decisions

1. **Vite over CRA**: Faster dev server, better TypeScript support, modern tooling
2. **localStorage**: Simple, synchronous browser storage wrapped in async interface for consistency
3. **Seed data**: Include sample transactions for better UX on first load
4. **Type safety**: Strict TypeScript for storage adapter, component props, state
5. **Validation**: Basic client-side validation in the component without changing UI behavior

## Testing Checklist

After implementation, verify:

- ✓ `npm install` runs without errors
- ✓ `npm run dev` starts dev server
- ✓ Dashboard loads with seed data
- ✓ Can add expense/income transactions