/**
 * Theme system for the app.
 */
import React, { useState, useEffect, createContext, useContext } from 'react';

export type ThemeMode = 'dark-purple' | 'ocean-blue' | 'minimal' | 'custom';

export interface Theme {
  id: ThemeMode;
  name: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    cardBg: string;
    cardBgHover: string;
    cardBorder: string;
    cardBorderHover: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGradient: string;
    success: string;
    successBg: string;
    error: string;
    errorBg: string;
    warning: string;
    warningBg: string;
    info: string;
    infoBg: string;
    income: string;
    incomeBg: string;
    incomeGradient: string;
    expense: string;
    expenseBg: string;
    expenseGradient: string;
    balance: string;
    balanceBg: string;
    balanceGradient: string;
    hover: string;
    active: string;
    focus: string;
    chartLine: string;
    chartFill: string;
    chartGrid: string;
    chartPrediction: string;
  };
}

const darkPurple: Theme = {
  id: 'dark-purple',
  name: 'Dark Purple',
  colors: {
    bgPrimary: 'from-slate-950 via-purple-950 to-slate-950',
    bgSecondary: 'from-slate-900 via-purple-900 to-slate-900',
    bgTertiary: 'from-slate-800 via-purple-800 to-slate-800',
    cardBg: 'bg-slate-800/50',
    cardBgHover: 'hover:bg-slate-800/70',
    cardBorder: 'border-slate-700',
    cardBorderHover: 'hover:border-slate-600',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textTertiary: 'text-slate-400',
    accentPrimary: 'bg-purple-600',
    accentSecondary: 'bg-pink-600',
    accentGradient: 'from-purple-600 to-pink-600',
    success: 'text-green-400',
    successBg: 'bg-green-600',
    error: 'text-red-400',
    errorBg: 'bg-red-600',
    warning: 'text-yellow-400',
    warningBg: 'bg-yellow-600',
    info: 'text-blue-400',
    infoBg: 'bg-blue-600',
    income: 'text-green-400',
    incomeBg: 'bg-emerald-950/50',
    incomeGradient: 'from-emerald-500 to-green-500',
    expense: 'text-red-400',
    expenseBg: 'bg-red-950/50',
    expenseGradient: 'from-red-500 to-orange-500',
    balance: 'text-blue-400',
    balanceBg: 'bg-slate-900/90',
    balanceGradient: 'from-blue-400 to-cyan-400',
    hover: 'hover:bg-slate-700',
    active: 'bg-slate-700',
    focus: 'ring-purple-500',
    chartLine: '#a855f7',
    chartFill: 'rgba(168, 85, 247, 0.3)',
    chartGrid: '#334155',
    chartPrediction: '#fbbf24',
  },
};

export const themes: Record<ThemeMode, Theme> = {
  'dark-purple': darkPurple,
  'ocean-blue': {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    colors: {
      bgPrimary: 'from-slate-950 via-blue-950 to-slate-950',
      bgSecondary: 'from-slate-900 via-blue-900 to-slate-900',
      bgTertiary: 'from-slate-800 via-blue-800 to-slate-800',
      cardBg: 'bg-slate-800/50',
      cardBgHover: 'hover:bg-slate-800/70',
      cardBorder: 'border-slate-700',
      cardBorderHover: 'hover:border-blue-600',
      textPrimary: 'text-white',
      textSecondary: 'text-slate-300',
      textTertiary: 'text-slate-400',
      accentPrimary: 'bg-blue-600',
      accentSecondary: 'bg-cyan-600',
      accentGradient: 'from-blue-600 to-cyan-600',
      success: 'text-green-400',
      successBg: 'bg-green-600',
      error: 'text-red-400',
      errorBg: 'bg-red-600',
      warning: 'text-amber-400',
      warningBg: 'bg-amber-600',
      info: 'text-cyan-400',
      infoBg: 'bg-cyan-600',
      income: 'text-green-400',
      incomeBg: 'bg-emerald-950/50',
      incomeGradient: 'from-emerald-500 to-teal-500',
      expense: 'text-orange-400',
      expenseBg: 'bg-orange-950/50',
      expenseGradient: 'from-orange-500 to-red-500',
      balance: 'text-cyan-400',
      balanceBg: 'bg-slate-900/90',
      balanceGradient: 'from-cyan-400 to-blue-400',
      hover: 'hover:bg-slate-700',
      active: 'bg-slate-700',
      focus: 'ring-blue-500',
      chartLine: '#3b82f6',
      chartFill: 'rgba(59, 130, 246, 0.3)',
      chartGrid: '#334155',
      chartPrediction: '#fbbf24',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Dark',
    colors: {
      bgPrimary: 'from-slate-950 to-slate-900',
      bgSecondary: 'from-slate-900 to-slate-800',
      bgTertiary: 'from-slate-800 to-slate-700',
      cardBg: 'bg-slate-800/50',
      cardBgHover: 'hover:bg-slate-800/70',
      cardBorder: 'border-slate-700',
      cardBorderHover: 'hover:border-slate-500',
      textPrimary: 'text-white',
      textSecondary: 'text-slate-300',
      textTertiary: 'text-slate-400',
      accentPrimary: 'bg-slate-600',
      accentSecondary: 'bg-slate-500',
      accentGradient: 'from-slate-600 to-slate-500',
      success: 'text-green-400',
      successBg: 'bg-green-600',
      error: 'text-red-400',
      errorBg: 'bg-red-600',
      warning: 'text-yellow-400',
      warningBg: 'bg-yellow-600',
      info: 'text-blue-400',
      infoBg: 'bg-blue-600',
      income: 'text-green-400',
      incomeBg: 'bg-slate-800/50',
      incomeGradient: 'from-green-600 to-green-500',
      expense: 'text-red-400',
      expenseBg: 'bg-slate-800/50',
      expenseGradient: 'from-red-600 to-red-500',
      balance: 'text-slate-100',
      balanceBg: 'bg-slate-900/90',
      balanceGradient: 'from-slate-400 to-slate-300',
      hover: 'hover:bg-slate-700',
      active: 'bg-slate-700',
      focus: 'ring-slate-500',
      chartLine: '#64748b',
      chartFill: 'rgba(100, 116, 139, 0.3)',
      chartGrid: '#334155',
      chartPrediction: '#94a3b8',
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    colors: { ...darkPurple.colors },
  },
};

interface ThemeContextType {
  currentTheme: ThemeMode;
  theme: Theme;
  setTheme: (theme: ThemeMode) => void;
  themes: Record<ThemeMode, Theme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeMode) || 'dark-purple';
  });

  const theme = themes[currentTheme];

  const setTheme = (newTheme: ThemeMode) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if ((window as any).electronTheme?.setTheme) {
      (window as any).electronTheme.setTheme(newTheme);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { currentTheme, theme, setTheme, themes } },
    children,
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const getThemeClass = (theme: Theme, key: keyof Theme['colors']): string => {
  return theme.colors[key];
};

export const generateThemeCSS = (theme: Theme): string => {
  return `
    :root[data-theme="${theme.id}"] {
      --chart-line-color: ${theme.colors.chartLine};
      --chart-fill-color: ${theme.colors.chartFill};
      --chart-grid-color: ${theme.colors.chartGrid};
      --chart-prediction-color: ${theme.colors.chartPrediction};
    }
  `;
};

export const getAllThemesCSS = (): string => {
  return Object.values(themes)
    .map(theme => generateThemeCSS(theme))
    .join('\n');
};

declare global {
  interface Window {
    electronTheme?: {
      getTheme: () => ThemeMode;
      setTheme: (theme: ThemeMode) => void;
    };
  }
}
