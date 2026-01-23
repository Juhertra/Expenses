import React from "react";
import { cn, getDir } from "./utils";

const sizeMap = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

const variantMap = {
  primary: "bg-purple-600 hover:bg-purple-700 text-white border border-transparent",
  secondary: "bg-slate-800/70 hover:bg-slate-800 text-white border border-slate-700",
  ghost: "bg-transparent hover:bg-slate-800/40 text-white border border-transparent",
  danger: "bg-red-600 hover:bg-red-700 text-white border border-transparent",
} as const;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantMap;
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
  const direction = dir || getDir();
  const isRTL = direction === "rtl";
  const startIcon = isRTL ? iconEnd : iconStart;
  const endIcon = isRTL ? iconStart : iconEnd;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed",
        sizeMap[size],
        variantMap[variant],
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
