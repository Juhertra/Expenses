import React from "react";
import { Button } from "expense-tracker";
import { Plus, ArrowRight, Trash2, Check } from "lucide-react";

// Components are designed for a dark surface (default theme: dark-purple).
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-slate-900 p-6 flex flex-wrap items-center gap-3">{children}</div>
);

export const Variants = () => (
  <Stage>
    <Button variant="primary">Add expense</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="ghost">Skip</Button>
    <Button variant="danger">Delete</Button>
  </Stage>
);

export const SemanticGradients = () => (
  <Stage>
    <Button variant="accent">Upgrade plan</Button>
    <Button variant="income">Add income</Button>
    <Button variant="expense">Add expense</Button>
    <Button variant="success">All saved</Button>
  </Stage>
);

export const WithIcons = () => (
  <Stage>
    <Button variant="primary" iconStart={<Plus className="w-4 h-4" />}>New transaction</Button>
    <Button variant="secondary" iconEnd={<ArrowRight className="w-4 h-4" />}>Next step</Button>
    <Button variant="danger" iconStart={<Trash2 className="w-4 h-4" />}>Remove</Button>
  </Stage>
);

export const SizesAndStates = () => (
  <Stage>
    <Button size="sm" variant="primary">Small</Button>
    <Button size="md" variant="primary">Medium</Button>
    <Button variant="primary" disabled>Disabled</Button>
    <Button variant="success" iconStart={<Check className="w-4 h-4" />}>Confirm</Button>
  </Stage>
);
