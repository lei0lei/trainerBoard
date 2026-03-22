"use client";

import { Boxes, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { litegraphNodeCatalog } from "./nodes";
import { useWorkbenchStore } from "../core/store";

export function LitegraphPrimarySidebar() {
  const { litegraphSelectedNode, queueLitegraphNode } = useWorkbenchStore(
    useShallow((state) => ({
      litegraphSelectedNode: state.litegraphSelectedNode,
      queueLitegraphNode: state.queueLitegraphNode,
    }))
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return litegraphNodeCatalog;
    return litegraphNodeCatalog.filter((item) =>
      `${item.label} ${item.category} ${item.description}`.toLowerCase().includes(normalized)
    );
  }, [query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
      acc[item.category] ??= [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <aside className="flex h-full flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>LITEGRAPH</span>
        <span className="text-[#8b8b8b]">ComfyUI style</span>
      </div>

      <div className="border-b border-[#2a2d2e] p-2">
        <label className="flex items-center gap-2 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#cccccc]">
          <Search className="h-4 w-4 text-[#8b8b8b]" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-[#6f6f6f]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes..."
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="mb-4 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Selection</div>
          <div className="mt-2 text-sm text-[#d4d4d4]">{litegraphSelectedNode.title ?? "No node selected"}</div>
          <div className="mt-1 text-xs text-[#6f6f6f]">
            {litegraphSelectedNode.id ? `Node #${litegraphSelectedNode.id} ? ${litegraphSelectedNode.type}` : "Click a node in the graph canvas."}
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">{category}</div>
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.type}
                    className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-left hover:border-[#007acc] hover:bg-[#232328]"
                    onClick={() => queueLitegraphNode(item.type)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[#d4d4d4]">
                      <Boxes className="h-4 w-4 text-[#4fc1ff]" />
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs text-[#8b8b8b]">{item.description}</div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="border-t border-[#2a2d2e] p-3">
        <Button className="w-full" variant="outline" onClick={() => queueLitegraphNode("trainer/preview")}>
          Add Preview Node
        </Button>
      </div>
    </aside>
  );
}
