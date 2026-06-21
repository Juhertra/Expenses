import React from "react";
import { Toast } from "expense-tracker";

// The static capture freezes the clock, which would strand Toast's animejs mount
// animation (slideFadeInUp) at opacity:0. The component honors
// prefers-reduced-motion by rendering the final state instantly — emulate that
// here so the capture shows the settled toast.
if (typeof window !== "undefined" && window.matchMedia) {
  const real = window.matchMedia.bind(window);
  window.matchMedia = ((q: string) =>
    /prefers-reduced-motion/.test(q)
      ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
      : real(q)) as typeof window.matchMedia;
}

// Toast is fixed top-4 right-4; the min-h-screen spacer gives the transformed
// single-mode wrapper height so the toast anchors to the corner correctly.
// A long duration keeps it from auto-dismissing before the capture settles.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white">
    <div className="min-h-screen w-full bg-slate-900" />
    {children}
  </div>
);
const noop = () => {};

export const Success = () => (
  <Frame>
    <Toast type="success" message="Transaction saved" duration={100000} onClose={noop} />
  </Frame>
);

export const Error = () => (
  <Frame>
    <Toast type="error" message="Couldn’t save — check your folder permissions" duration={100000} onClose={noop} />
  </Frame>
);
