import React from "react";
import { ChevronDown } from "lucide-react";
import { cn, getDir } from "./utils";

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size" | "dir"> & {
  size?: "sm" | "md";
  dir?: "rtl" | "ltr";
};

const sizeMap: Record<"sm" | "md", string> = {
  sm: "h-9 text-sm",
  md: "h-10 text-sm",
};

export const Select: React.FC<Props> = ({ size = "md", className, children, dir, ...rest }) => {
  const direction = dir || getDir();
  const isRTL = direction === "rtl";
  return (
    <div
      dir={direction}
      className={cn(
        "relative w-full",
        sizeMap[size]
      )}
    >
      <select
        className={cn(
          "w-full h-full appearance-none rounded-lg bg-slate-800/50 border border-slate-700 text-white ps-3 pe-9 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className={cn(
          "absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4",
          isRTL ? "left-2" : "right-2"
        )}
      />
    </div>
  );
};
