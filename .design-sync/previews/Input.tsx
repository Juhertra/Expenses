import React from "react";
import { Input } from "expense-tracker";

const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 text-white p-6 ${className}`}>{children}</div>
);

export const Default = () => (
  <Stage className="w-80">
    <Input placeholder="Search transactions…" />
  </Stage>
);

export const WithValue = () => (
  <Stage className="w-80 space-y-3">
    <Input defaultValue="Grocery run" />
    <Input type="number" defaultValue={84.2} />
  </Stage>
);

export const Sizes = () => (
  <Stage className="w-80 space-y-3">
    <Input size="sm" placeholder="Small" />
    <Input size="md" placeholder="Medium" />
  </Stage>
);

export const Disabled = () => (
  <Stage className="w-80">
    <Input disabled defaultValue="Locked field" />
  </Stage>
);
