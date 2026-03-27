import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChromeToggleIcon({ position, active }: { position: "left" | "bottom" | "right"; active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.95" />
      {position === "left" && <rect x="3.2" y="3.6" width="3.1" height="8.8" rx="0.5" fill="currentColor" opacity={active ? 1 : 0.3} />}
      {position === "right" && <rect x="9.7" y="3.6" width="3.1" height="8.8" rx="0.5" fill="currentColor" opacity={active ? 1 : 0.3} />}
      {position === "bottom" && <rect x="3.2" y="9.1" width="9.6" height="3.3" rx="0.5" fill="currentColor" opacity={active ? 1 : 0.3} />}
    </svg>
  );
}

export function SplitEditorIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <line x1="8" y1="3.2" x2="8" y2="12.8" stroke="currentColor" strokeWidth="1.1" opacity="0.95" />
      <rect x="3.2" y="3.6" width="3.4" height="8.8" rx="0.5" fill="currentColor" opacity="0.18" />
      <rect x="9.3" y="3.6" width="3.4" height="8.8" rx="0.5" fill="currentColor" opacity={active ? 1 : 0.38} />
    </svg>
  );
}

export function VscodeIconButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-[#8f8f8f] transition-colors hover:bg-[#2a2d2e] hover:text-[#ffffff] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#8f8f8f]",
        active && "bg-[#2a2d2e] text-white"
      )}
    >
      {children}
    </button>
  );
}

