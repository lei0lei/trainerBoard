import type { MouseEvent } from "react";
import { GripHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResizeHandle({
  orientation,
  onMouseDown,
}: {
  orientation: "horizontal" | "vertical";
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label={`Resize ${orientation === "vertical" ? "sidebar" : "panel"}`}
      onMouseDown={onMouseDown}
      className={cn(
        "group relative shrink-0 bg-[#1e1e1e] hover:bg-[#007acc]",
        orientation === "vertical" ? "w-1" : "h-1"
      )}
    >
      {orientation === "vertical" ? (
        <span className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center group-hover:flex">
          <GripVertical className="h-8 w-3 text-white/70" />
        </span>
      ) : (
        <span className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center group-hover:flex">
          <GripHorizontal className="h-3 w-8 text-white/70" />
        </span>
      )}
    </button>
  );
}

