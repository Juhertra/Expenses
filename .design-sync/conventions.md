# Expense Tracker UI — conventions for building with this design system

A small, **dark-themed** React component set (Tailwind CSS) from an expense-tracker
app. Components render light text on dark surfaces and read a runtime theme from
React context. Build on-brand screens by composing the components below on a dark
root.

## Wrapping & setup (required)

1. **Wrap the app/screen root in `ThemeProvider`.** `Button` (and anything using
   it, e.g. `ExternalChangeBanner`) reads `useTheme()` and throws
   "useTheme must be used within ThemeProvider" without it. It needs no props.
2. **Put content on a dark, `text-white` root.** Components assume a dark
   background, and a few headings (`ConfirmDialog`, `ModalBase` titles) have no
   explicit color and inherit it — on a light root they vanish.

```jsx
<ThemeProvider>
  <div className="min-h-screen bg-slate-900 text-white">
    {/* your screen */}
  </div>
</ThemeProvider>
```

Text is already localized (i18next, English) and bundled — no i18n setup needed.

## Styling idiom: Tailwind utility classes (dark palette)

Style your own layout/markup with Tailwind utilities, matching the components'
dark vocabulary. Use these real, shipped families (the compiled stylesheet
contains the classes used by the library — prefer this vocabulary so styles
resolve):

| Purpose | Classes |
|---|---|
| Surfaces | `bg-slate-900`, `bg-slate-800/50`, `bg-slate-800/40` |
| Borders | `border border-slate-700` |
| Text | `text-white`, `text-slate-300` (secondary), `text-slate-400` (muted) |
| Accent | `bg-purple-600`; gradient `bg-gradient-to-r from-purple-600 to-pink-600` |
| Money / status | `text-green-400` (income), `text-red-400` (expense), `text-orange-400` (unsaved), `text-yellow-400` (warning) |
| Radius | `rounded-lg` (controls), `rounded-2xl` (cards/panels) |

No CSS-modules or BEM — it's utility classes plus a runtime theme object on
`Button`. Don't invent design tokens or `var(--*)` custom properties.

## Components & where the truth lives

Primitives: `Button`, `IconButton`, `Input`, `Select`, `Card`, `ModalShell`.
Shared: `ConfirmDialog`, `ModalBase`, `Toast`, `SaveStatusIndicator`,
`ShowMoreButton`, `ExternalChangeBanner`.

- `Button` variants: `primary | secondary | ghost | danger | accent | success |
  income | expense` (the last four are gradient/semantic); `iconStart`/`iconEnd`
  take any node (lucide icons throughout the app).
- Overlays (`ModalShell`, `ModalBase`, `ConfirmDialog`, `Toast`,
  `ExternalChangeBanner`) are `position:fixed` and controlled by an `isOpen`/
  `show` prop.
- Read each component's `<Name>.d.ts` (props contract) and `<Name>.prompt.md`
  (usage) before composing, and the bound `styles.css` (and the `_ds_bundle.css`
  it imports) for the exact class set.

## Idiomatic example

```jsx
<ThemeProvider>
  <div className="min-h-screen bg-slate-900 text-white p-6 space-y-4">
    <Card className="p-5 max-w-xs">
      <div className="text-sm text-slate-400">Total balance</div>
      <div className="text-3xl font-bold mt-1">$4,820.50</div>
      <div className="text-xs text-green-400 mt-2">+$320 this month</div>
    </Card>
    <Button variant="income" iconStart={<Plus className="w-4 h-4" />}>
      Add income
    </Button>
  </div>
</ThemeProvider>
```
