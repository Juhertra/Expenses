import React from "react";
import { ModalBase, Input, Button } from "expense-tracker";

// The static capture freezes the clock, which would strand ModalBase's animejs
// mount animation (fadeScaleIn) at opacity:0. The component honors
// prefers-reduced-motion by rendering the final state instantly — emulate that
// here so the capture shows the settled modal (its true resting look).
if (typeof window !== "undefined" && window.matchMedia) {
  const real = window.matchMedia.bind(window);
  window.matchMedia = ((q: string) =>
    /prefers-reduced-motion/.test(q)
      ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
      : real(q)) as typeof window.matchMedia;
}

// Overlay component (see ModalShell preview for the Frame rationale). ModalBase's
// title <h2> has no text-color class, so the text-white ancestor is required.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white">
    <div className="min-h-screen w-full bg-slate-900" />
    {children}
  </div>
);
const noop = () => {};

export const Default = () => (
  <Frame>
    <ModalBase isOpen onClose={noop} title="Edit category">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">Rename this category or change how it’s grouped.</p>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Category name</label>
          <Input defaultValue="Food & groceries" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save changes</Button>
        </div>
      </div>
    </ModalBase>
  </Frame>
);

export const Compact = () => (
  <Frame>
    <ModalBase isOpen onClose={noop} title="Quick note" maxWidth="sm">
      <p className="text-sm text-slate-300">
        A smaller modal (maxWidth="sm") for short, focused content.
      </p>
    </ModalBase>
  </Frame>
);
