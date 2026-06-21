import React from "react";
import { Card } from "expense-tracker";

const Stage = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 text-white p-6 ${className}`}>{children}</div>
);

export const Default = () => (
  <Stage>
    <Card className="p-5 max-w-xs">
      <div className="text-sm text-slate-400">Total balance</div>
      <div className="text-3xl font-bold text-white mt-1">$4,820.50</div>
      <div className="text-xs text-green-400 mt-2">+$320 this month</div>
    </Card>
  </Stage>
);

export const StatGrid = () => (
  <Stage className="grid grid-cols-2 gap-4 max-w-lg">
    <Card className="p-4">
      <div className="text-xs text-slate-400">Income</div>
      <div className="text-xl font-bold text-green-400 mt-1">$6,200</div>
    </Card>
    <Card className="p-4">
      <div className="text-xs text-slate-400">Expenses</div>
      <div className="text-xl font-bold text-red-400 mt-1">$1,380</div>
    </Card>
  </Stage>
);

export const ListCard = () => (
  <Stage>
    <Card className="p-4 max-w-sm divide-y divide-slate-700">
      {[
        { name: "Groceries", amount: "-$84.20" },
        { name: "Salary", amount: "+$3,100" },
        { name: "Electric bill", amount: "-$72.40" },
      ].map((row) => (
        <div key={row.name} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
          <span className="text-sm text-slate-200">{row.name}</span>
          <span className={`text-sm font-medium ${row.amount.startsWith("+") ? "text-green-400" : "text-slate-300"}`}>
            {row.amount}
          </span>
        </div>
      ))}
    </Card>
  </Stage>
);
