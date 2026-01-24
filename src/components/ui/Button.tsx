import React from "react";
import { cn, getDir } from "./utils";
import { useTheme } from "../../lib/theme";

const sizeMap = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "success" | "income" | "expense";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof sizeMap;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  dir?: "rtl" | "ltr";
};

export const Button: React.FC<Props> = ({
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  dir,
  className,
  children,
  ...rest
}) => {
  const { theme } = useTheme();
  const direction = dir || getDir();
  const isRTL = direction === "rtl";
  const startIcon = isRTL ? iconEnd : iconStart;
  const endIcon = isRTL ? iconStart : iconEnd;

  // Build variant classes using theme colors
  const getVariantClasses = () => {
    switch (variant) {
      case "accent":
        // Gradient button using theme accent gradient
        return `bg-gradient-to-r ${theme.colors.accentGradient} hover:opacity-90 text-white border border-transparent`;
      case "income":
        // Income gradient button
        return `bg-gradient-to-r ${theme.colors.incomeGradient} hover:opacity-90 text-white border border-transparent`;
      case "expense":
        // Expense gradient button
        return `bg-gradient-to-r ${theme.colors.expenseGradient} hover:opacity-90 text-white border border-transparent`;
      case "success":
        // Success button using theme success color
        return `${theme.colors.successBg} hover:opacity-90 text-white border border-transparent`;
      case "danger":
        // Danger button using theme error color
        return `${theme.colors.errorBg} hover:opacity-90 text-white border border-transparent`;
      case "secondary":
        // Secondary button
        return "bg-slate-800/70 hover:bg-slate-800 text-white border border-slate-700";
      case "ghost":
        // Ghost button
        return "bg-transparent hover:bg-slate-800/40 text-white border border-transparent";
      case "primary":
      default:
        // Primary button using theme accent
        return `${theme.colors.accentPrimary} hover:opacity-90 text-white border border-transparent`;
    }
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 font-medium focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed",
        `focus:${theme.colors.focus}/50`,
        sizeMap[size],
        getVariantClasses(),
        className
      )}
      dir={direction}
      {...rest}
    >
      {startIcon}
      <span className="whitespace-nowrap leading-none">{children}</span>
      {endIcon}
    </button>
  );
};
