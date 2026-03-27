"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  widthClassName,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  widthClassName?: string;
}>) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-8" onMouseDown={onClose}>
      <div
        className={cn("w-full max-w-lg rounded-lg border border-[#3c3c3c] bg-[#252526] shadow-2xl", widthClassName)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#2a2d2e] px-5 py-4">
          <div className="text-sm font-semibold text-[#f3f3f3]">{title}</div>
          {description ? <div className="mt-1 text-xs leading-5 text-[#9d9d9d]">{description}</div> : null}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-[#2a2d2e] px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

