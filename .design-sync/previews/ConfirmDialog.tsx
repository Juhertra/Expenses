import React from "react";
import { ConfirmDialog } from "expense-tracker";

// ConfirmDialog is a fixed inset-0 overlay. Two things the app provides that an
// isolated preview must replicate:
//  1. a `text-white` themed root — the dialog's title heading has no explicit
//     color and inherits it (black on dark = invisible otherwise);
//  2. a full-height flowed element — the single-mode card mounts inside a
//     `transform`ed wrapper, which becomes the containing block for `fixed`;
//     with only fixed children that wrapper collapses to 0 height and `inset-0`
//     has nothing to fill, so the `min-h-screen` spacer gives it viewport height
//     (and doubles as the dark backdrop behind the dialog's dimming layer).
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white">
    <div className="min-h-screen w-full bg-slate-900" />
    {children}
  </div>
);
const noop = () => {};

export const Danger = () => (
  <Frame>
    <ConfirmDialog
      isOpen
      variant="danger"
      title="Delete this expense?"
      message="“Grocery run — $84.20” will be permanently removed. This can’t be undone."
      confirmLabel="Delete"
      cancelLabel="Keep it"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);

export const Warning = () => (
  <Frame>
    <ConfirmDialog
      isOpen
      variant="warning"
      title="Discard unsaved changes?"
      message="You have edits to this month’s budget that haven’t been saved yet."
      confirmLabel="Discard"
      cancelLabel="Go back"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);

export const Processing = () => (
  <Frame>
    <ConfirmDialog
      isOpen
      variant="danger"
      isProcessing
      title="Clearing all data"
      message="Removing every transaction and category from this device."
      confirmLabel="Clear data"
      cancelLabel="Cancel"
      onConfirm={noop}
      onCancel={noop}
    />
  </Frame>
);
