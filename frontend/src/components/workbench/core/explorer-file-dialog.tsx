"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "./modal";

export type ExplorerDialogMode = "create-file" | "create-folder" | "rename" | "delete";

export type ExplorerDialogState = {
  open: boolean;
  mode: ExplorerDialogMode;
  title: string;
  description: string;
  confirmLabel: string;
  value: string;
  targetLabel: string;
  error: string | null;
  submitting: boolean;
};

export function ExplorerFileDialog({
  dialog,
  onClose,
  onValueChange,
  onSubmit,
}: {
  dialog: ExplorerDialogState | null;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requiresInput = dialog ? dialog.mode !== "delete" : false;

  useEffect(() => {
    if (!dialog?.open || !requiresInput) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [dialog?.open, requiresInput]);

  if (!dialog?.open) return null;

  return (
    <Modal
      open={dialog.open}
      title={dialog.title}
      description={dialog.description}
      onClose={() => {
        if (!dialog.submitting) onClose();
      }}
      footer={
        <>
          <Button
            variant="outline"
            className="border-[#3c3c3c] text-[#d4d4d4] hover:bg-[#2a2d2e]"
            disabled={dialog.submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className={dialog.mode === "delete" ? "bg-[#a1260d] text-white hover:opacity-100 hover:bg-[#c33a22]" : "bg-[#0e639c] text-white hover:opacity-100 hover:bg-[#1177bb]"}
            disabled={dialog.submitting || (requiresInput && !dialog.value.trim())}
            onClick={onSubmit}
          >
            {dialog.submitting ? "Working..." : dialog.confirmLabel}
          </Button>
        </>
      }
    >
      {requiresInput ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#8b8b8b]">
            Name
            <input
              ref={inputRef}
              className="mt-2 w-full rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4] outline-none transition focus:border-[#007acc]"
              value={dialog.value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
            />
          </label>
        </div>
      ) : (
        <div className="rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4]">{dialog.targetLabel}</div>
      )}
      {dialog.error ? <div className="mt-3 rounded-md border border-[#5a1d1d] bg-[#3a1a1a] px-3 py-2 text-sm text-[#ffb4b4]">{dialog.error}</div> : null}
    </Modal>
  );
}

