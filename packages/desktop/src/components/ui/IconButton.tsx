import React from "react";
import { cn, getDir } from "./utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  dir?: "rtl" | "ltr";
};

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
};

const variantMap = {
  primary: "bg-purple-600 hover:bg-purple-700 text-white",
  secondary: "bg-slate-800/70 hover:bg-slate-800 text-white border border-slate-700",
  ghost: "bg-transparent hover:bg-slate-800/40 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export const IconButton: React.FC<Props> = ({
  size = "md",
  variant = "secondary",
  className,
  dir,
  children,
  ...rest
}) => {
  const direction = dir || getDir();
  return (
    <button
      dir={direction}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed",
        sizeMap[size],
        variantMap[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};
