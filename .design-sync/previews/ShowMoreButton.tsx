import React from "react";
import { ShowMoreButton } from "expense-tracker";

const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 text-white p-6 ${className}`}>{children}</div>
);

const txns = [
  { name: "Groceries", amount: "-$84.20" },
  { name: "Salary", amount: "+$3,100.00" },
  { name: "Electric bill", amount: "-$72.40" },
  { name: "Coffee", amount: "-$4.80" },
  { name: "Refund", amount: "+$18.00" },
  { name: "Gym", amount: "-$39.00" },
  { name: "Books", amount: "-$26.50" },
];

const Row = (t: { name: string; amount: string }, i: number) => (
  <div
    key={i}
    className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2"
  >
    <span className="text-sm text-slate-200">{t.name}</span>
    <span className={`text-sm font-medium ${t.amount.startsWith("+") ? "text-green-400" : "text-slate-300"}`}>
      {t.amount}
    </span>
  </div>
);

export const Default = () => (
  <Stage className="w-80">
    <div className="space-y-2">
      <ShowMoreButton items={txns} initialDisplay={3} increment={3} renderItem={Row as any} />
    </div>
  </Stage>
);

export const Empty = () => (
  <Stage className="w-80">
    <ShowMoreButton items={[]} renderItem={Row as any} emptyMessage="No transactions yet" />
  </Stage>
);
