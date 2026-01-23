import React from "react";
import { cn } from "./utils";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div
    className={cn(
      "rounded-2xl bg-slate-800/40 border border-slate-700 shadow-sm",
      className
    )}
    {...rest}
  >
    {children}
  </div>
);
