import React from "react";
import { IconButton } from "expense-tracker";
import { Plus, Pencil, Trash2, Settings, ChevronLeft } from "lucide-react";

const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 text-white p-6 flex flex-wrap items-center gap-3 ${className}`}>{children}</div>
);

export const Variants = () => (
  <Stage>
    <IconButton variant="primary" aria-label="Add"><Plus className="w-5 h-5" /></IconButton>
    <IconButton variant="secondary" aria-label="Edit"><Pencil className="w-5 h-5" /></IconButton>
    <IconButton variant="ghost" aria-label="Settings"><Settings className="w-5 h-5" /></IconButton>
    <IconButton variant="danger" aria-label="Delete"><Trash2 className="w-5 h-5" /></IconButton>
  </Stage>
);

export const Sizes = () => (
  <Stage>
    <IconButton size="sm" variant="primary" aria-label="Add small"><Plus className="w-4 h-4" /></IconButton>
    <IconButton size="md" variant="primary" aria-label="Add medium"><Plus className="w-5 h-5" /></IconButton>
    <IconButton size="md" variant="secondary" aria-label="Back"><ChevronLeft className="w-5 h-5" /></IconButton>
    <IconButton size="md" variant="danger" disabled aria-label="Delete disabled"><Trash2 className="w-5 h-5" /></IconButton>
  </Stage>
);
