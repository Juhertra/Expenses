import React from "react";
import { Select } from "expense-tracker";

const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 text-white p-6 ${className}`}>{children}</div>
);

const categories = (
  <>
    <option value="food">Food &amp; groceries</option>
    <option value="transport">Transport</option>
    <option value="bills">Bills &amp; utilities</option>
    <option value="fun">Entertainment</option>
  </>
);

export const Default = () => (
  <Stage className="w-64">
    <Select defaultValue="food">{categories}</Select>
  </Stage>
);

export const Sizes = () => (
  <Stage className="w-64 space-y-3">
    <Select size="sm" defaultValue="transport">{categories}</Select>
    <Select size="md" defaultValue="bills">{categories}</Select>
  </Stage>
);

export const Disabled = () => (
  <Stage className="w-64">
    <Select disabled defaultValue="fun">{categories}</Select>
  </Stage>
);
