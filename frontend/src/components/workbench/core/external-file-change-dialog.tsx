"use client";

import { Button } from "@/components/ui/button";
import { MonacoDiffView } from "../explorer/monaco-diff-view";
import { Modal } from "./modal";

export type ExternalFileChangeDialogState = {
  open: boolean;
  tabId: string;
  path: string;
  language: string;
  localContent: string;
  externalContent: string;
  dirty: boolean;
  compareMode: boolean;
};

export function ExternalFileChangeDialog({
  dialog,
  onClose,
  onCompare,
  onReload,
}: {
  dialog: ExternalFileChangeDialogState | null;
  onClose: () => void;
  onCompare: () => void;
  onReload: () => void;
}) {
  if (!dialog?.open) return null;

  return (
    <Modal
      open={dialog.open}
      title="File changed on disk"
      description={
        <div className="space-y-1">
          <div>{dialog.path}</div>
          <div>{dialog.dirty ? "This editor has unsaved changes. You can compare before reloading." : "The opened file was modified outside the editor."}</div>
        </div>
      }
      onClose={onClose}
      widthClassName={dialog.compareMode ? "max-w-6xl" : "max-w-2xl"}
      footer={
        <>
          <Button variant="outline" className="border-[#3c3c3c] text-[#d4d4d4] hover:bg-[#2a2d2e]" onClick={onClose}>
            Keep Current
          </Button>
          <Button variant="outline" className="border-[#3c3c3c] text-[#d4d4d4] hover:bg-[#2a2d2e]" onClick={onCompare}>
            {dialog.compareMode ? "Hide Compare" : "Compare"}
          </Button>
          <Button className="bg-[#0e639c] text-white hover:bg-[#1177bb]" onClick={onReload}>
            Reload
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 text-[#d4d4d4]">Language: {dialog.language}</span>
          {dialog.dirty ? <span className="rounded border border-[#5a4b1d] bg-[#3a3322] px-2 py-1 text-[#d7ba7d]">Unsaved local changes</span> : null}
          <span className="rounded border border-[#23415a] bg-[#0f2435] px-2 py-1 text-[#9cdcfe]">External version available</span>
        </div>

        {!dialog.compareMode ? (
          <div className="rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-3 text-sm text-[#d4d4d4]">
            Reload will replace the current editor contents with the latest file content from disk.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <div className="rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2">External</div>
              <div className="rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2">Current Editor</div>
            </div>
            <div className="h-[480px] overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
              <MonacoDiffView path={dialog.path} original={dialog.externalContent} modified={dialog.localContent} language={dialog.language} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
