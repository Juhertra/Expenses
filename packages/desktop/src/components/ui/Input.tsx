import React from "react";
import { cn, getDir } from "./utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "dir"> & {
  size?: "sm" | "md";
  dir?: "rtl" | "ltr";
};

const sizeMap: Record<"sm" | "md", string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Input: React.FC<Props> = ({ size = "md", className, dir, ...rest }) => {
  const direction = dir || getDir();
  return (
    <input
      dir={direction}
      className={cn(
        "w-full rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors",
        sizeMap[size],
        className
      )}
      {...rest}
    />
  );
};
