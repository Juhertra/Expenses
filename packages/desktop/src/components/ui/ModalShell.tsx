import React from "react";
import { X } from "lucide-react";
import { cn, getDir } from "./utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  dir?: "rtl" | "ltr";
}

export const ModalShell: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className,
  dir,
  ...rest
}) => {
  const direction = dir || getDir();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div
        dir={direction}
        className={cn(
          "relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/85 shadow-2xl",
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
        {...rest}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-700 bg-slate-900/60">
          <div className="flex-1 min-w-0">
            {title && <div className="text-lg font-bold text-white truncate">{title}</div>}
            {subtitle && <div className="text-xs text-slate-400 truncate">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800/70 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-200" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  );
};
