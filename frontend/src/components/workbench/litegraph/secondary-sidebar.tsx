"use client";

import { CopyPlus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../core/store";

export function LitegraphSecondarySidebar() {
  const { litegraphSelectedNode, queueLitegraphAction } = useWorkbenchStore(
    useShallow((state) => ({
      litegraphSelectedNode: state.litegraphSelectedNode,
      queueLitegraphAction: state.queueLitegraphAction,
    }))
  );

  const entries = useMemo(() => Object.entries(litegraphSelectedNode.properties), [litegraphSelectedNode.properties]);

  function parseValue(previous: string | number | boolean | null, next: string) {
    if (typeof previous === "number") {
      const parsed = Number(next);
      return Number.isFinite(parsed) ? parsed : previous;
    }
    if (typeof previous === "boolean") {
      return next === "true";
    }
    return next;
  }

  return (
    <aside className="flex h-full flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>NODE PROPERTIES</span>
        <span className="text-[#8b8b8b]">{litegraphSelectedNode.type ?? "none"}</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {!litegraphSelectedNode.id ? (
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4 text-sm text-[#9d9d9d]">
            Select a node in the LiteGraph canvas to edit its properties.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Title</span>
                <input
                  className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#d4d4d4]"
                  defaultValue={litegraphSelectedNode.title ?? ""}
                  onBlur={(event) =>
                    queueLitegraphAction({
                      type: "update-node",
                      nodeId: litegraphSelectedNode.id!,
                      title: event.target.value.trim() || litegraphSelectedNode.type,
                    })
                  }
                />
              </label>
              <div className="mt-2 text-xs text-[#8b8b8b]">
                #{litegraphSelectedNode.id} ? {litegraphSelectedNode.type}
              </div>
            </div>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#9d9d9d]">
                  This node does not expose editable properties.
                </div>
              ) : (
                entries.map(([key, value]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">{key}</span>
                    {typeof value === "boolean" ? (
                      <select
                        className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#d4d4d4]"
                        value={String(value)}
                        onChange={(event) =>
                          queueLitegraphAction({
                            type: "update-node",
                            nodeId: litegraphSelectedNode.id!,
                            properties: { [key]: event.target.value === "true" },
                          })
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#d4d4d4]"
                        defaultValue={value === null ? "" : String(value)}
                        onBlur={(event) =>
                          queueLitegraphAction({
                            type: "update-node",
                            nodeId: litegraphSelectedNode.id!,
                            properties: { [key]: parseValue(value, event.target.value) },
                          })
                        }
                      />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {litegraphSelectedNode.id && (
        <div className="border-t border-[#2a2d2e] p-3">
          <div className="flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded border border-[#3c3c3c] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e]"
              onClick={() => queueLitegraphAction({ type: "duplicate-node", nodeId: litegraphSelectedNode.id! })}
            >
              <CopyPlus className="h-4 w-4" />
              Duplicate
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded border border-[#5a2e2e] px-3 py-2 text-sm text-[#ffb4b4] hover:bg-[#3a1f1f]"
              onClick={() => queueLitegraphAction({ type: "delete-node", nodeId: litegraphSelectedNode.id! })}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
