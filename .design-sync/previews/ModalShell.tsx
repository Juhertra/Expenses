import React from "react";
import { ModalShell, Input, Select, Button } from "expense-tracker";

// Overlay component: the min-h-screen flowed spacer gives the transformed
// single-mode card wrapper viewport height so the fixed overlay fills it;
// text-white themes any inherited-color text.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white">
    <div className="min-h-screen w-full bg-slate-900" />
    {children}
  </div>
);
const noop = () => {};

export const Default = () => (
  <Frame>
    <ModalShell isOpen onClose={noop} title="Add transaction" subtitle="Record a new expense or income">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Description</label>
          <Input placeholder="e.g. Grocery run" defaultValue="Grocery run" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Amount</label>
            <Input type="number" defaultValue={84.2} />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Category</label>
            <Select defaultValue="food">
              <option value="food">Food &amp; groceries</option>
              <option value="transport">Transport</option>
              <option value="bills">Bills &amp; utilities</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save transaction</Button>
        </div>
      </div>
    </ModalShell>
  </Frame>
);
