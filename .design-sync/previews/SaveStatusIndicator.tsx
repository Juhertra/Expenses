import React from "react";
import { SaveStatusIndicator } from "expense-tracker";

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-slate-900 p-6 flex flex-wrap items-center gap-4">{children}</div>
);

// A minimal stand-in for the browser FileSystemDirectoryHandle the app passes.
const folder = { name: "Dropbox" } as unknown as FileSystemDirectoryHandle;
const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString();

export const Saved = () => (
  <Stage>
    <SaveStatusIndicator dirty={false} saving={false} lastSaveDate={twoMinAgo} saveDirectory={folder} />
  </Stage>
);

export const Saving = () => (
  <Stage>
    <SaveStatusIndicator dirty={false} saving={true} lastSaveDate={twoMinAgo} saveDirectory={folder} />
  </Stage>
);

export const Unsaved = () => (
  <Stage>
    <SaveStatusIndicator dirty={true} saving={false} lastSaveDate={twoMinAgo} saveDirectory={folder} />
  </Stage>
);

export const NeedsFolder = () => (
  <Stage>
    <SaveStatusIndicator dirty={false} saving={false} lastSaveDate={null} saveDirectory={null} />
  </Stage>
);
