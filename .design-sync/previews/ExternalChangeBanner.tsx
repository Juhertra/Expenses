import React from "react";
import { ExternalChangeBanner } from "expense-tracker";

// Banner is fixed top-0 left/right-0; the min-h-screen spacer gives the
// transformed single-mode wrapper height so the banner spans the top edge.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white">
    <div className="min-h-screen w-full bg-slate-900" />
    {children}
  </div>
);
const noop = () => {};

export const Default = () => (
  <Frame>
    <ExternalChangeBanner
      show
      changedAt={new Date("2024-05-15T12:00:00Z").toISOString()}
      onReload={noop}
      onDismiss={noop}
    />
  </Frame>
);
