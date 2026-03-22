"use client";

import { Command, CornerDownLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkbenchCommand } from "./commands";
import { Modal } from "./modal";

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: WorkbenchCommand[];
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return commands;

    return commands.filter((command) => {
      const haystacks = [
        command.title,
        command.description ?? "",
        command.section ?? "",
        Array.isArray(command.shortcut) ? command.shortcut.join(" ") : command.shortcut ?? "",
        ...(command.keywords ?? []),
      ];
      return haystacks.some((item) => normalize(item).includes(needle));
    });
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, Math.max(filteredCommands.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const command = filteredCommands[selectedIndex];
        if (!command || command.disabled) return;
        void Promise.resolve(command.run())
          .catch(() => undefined)
          .finally(onClose);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, onClose, open, selectedIndex]);

  if (!open) return null;

  return (
    <Modal open={open} title="Command Palette" description="Search workbench, Explorer, and LiteGraph actions." onClose={onClose} widthClassName="max-w-2xl">
      <div className="overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
        <div className="flex items-center gap-3 border-b border-[#2a2d2e] px-3 py-3">
          <Command className="h-4 w-4 text-[#8b8b8b]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command"
            className="w-full bg-transparent text-sm text-[#d4d4d4] outline-none placeholder:text-[#6f6f6f]"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[#8b8b8b]">No matching commands.</div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                className={cn(
                  "flex w-full items-center justify-between gap-4 px-3 py-2 text-left",
                  index === selectedIndex ? "bg-[#04395e]" : "hover:bg-[#2a2d2e]",
                  command.disabled && "cursor-not-allowed opacity-50"
                )}
                disabled={command.disabled}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => {
                  if (command.disabled) return;
                  void Promise.resolve(command.run())
                    .catch(() => undefined)
                    .finally(onClose);
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-[#d4d4d4]">{command.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8b8b8b]">
                    {command.section ? <span>{command.section}</span> : null}
                    {command.description ? <span className="truncate">{command.description}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-[#8b8b8b]">
                  {command.shortcut ? <span>{Array.isArray(command.shortcut) ? command.shortcut[0] : command.shortcut}</span> : null}
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
