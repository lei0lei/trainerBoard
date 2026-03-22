import type { DragEvent } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { ChevronLeft, ChevronRight, GripHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SplitEditorIcon } from "../core/icons";
import { MonacoEditorView } from "./monaco-editor-view";
import type { DragState, DropIndicator, EditorTab } from "../core/types";

export function EditorArea({
  groups,
  activeIds,
  focusedGroupIndex,
  dragState,
  dropIndicator,
  onSetActiveTab,
  onCloseTab,
  onFocusGroup,
  onMoveTabWithinGroup,
  onToggleSplitLayout,
  onTabDragStart,
  onTabDragEnd,
  onTabDragOver,
  onTabDrop,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onContentChange,
  onValidateTab,
}: {
  groups: EditorTab[][];
  activeIds: (string | null)[];
  focusedGroupIndex: number;
  dragState: DragState;
  dropIndicator: DropIndicator;
  onSetActiveTab: (groupIndex: number, tabId: string) => void;
  onCloseTab: (groupIndex: number, tabId: string) => void;
  onFocusGroup: (groupIndex: number) => void;
  onMoveTabWithinGroup: (groupIndex: number, direction: "left" | "right") => void;
  onToggleSplitLayout: (groupIndex: number) => void;
  onTabDragStart: (groupIndex: number, tabId: string) => void;
  onTabDragEnd: () => void;
  onTabDragOver: (event: DragEvent<HTMLButtonElement>, groupIndex: number, tabId: string) => void;
  onTabDrop: (event: DragEvent<HTMLButtonElement>, groupIndex: number, tabId: string) => void;
  onGroupDragOver: (event: DragEvent<HTMLDivElement>, groupIndex: number) => void;
  onGroupDragLeave: (event: DragEvent<HTMLDivElement>, groupIndex: number) => void;
  onGroupDrop: (groupIndex: number) => void;
  onContentChange: (groupIndex: number, tabId: string, content: string) => void;
  onValidateTab: (tabId: string, markers: MonacoEditor.IMarker[]) => void;
}) {
  const visibleGroups = groups.map((tabs, index) => ({ tabs, index })).filter((group) => group.tabs.length > 0);

  if (visibleGroups.length === 0) {
    return <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-[#8c8c8c]">Open a file from Explorer to start editing.</div>;
  }

  return (
    <div className={cn("grid min-h-0 flex-1", visibleGroups.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
      {visibleGroups.map((group, visibleIndex) => {
        const activeId = activeIds[group.index] ?? group.tabs[0]?.id ?? null;
        const activeTab = group.tabs.find((tab) => tab.id === activeId) ?? group.tabs[0];
        if (!activeTab) return null;

        return (
          <div key={group.index} className={cn("relative flex min-h-0 flex-col", visibleIndex > 0 && "border-l border-[#2a2d2e]")}>
            <div className={cn("flex h-9 items-stretch border-b bg-[#252526]", focusedGroupIndex === group.index ? "border-b-[#007acc]" : "border-b-[#2a2d2e]")}>
              <div
                className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
                onMouseDown={() => onFocusGroup(group.index)}
                onDragOver={(event) => onGroupDragOver(event, group.index)}
                onDragLeave={(event) => onGroupDragLeave(event, group.index)}
                onDrop={() => onGroupDrop(group.index)}
              >
                {group.tabs.map((tab) => {
                  const active = tab.id === activeTab.id;
                  return (
                    <button
                      key={tab.id}
                      draggable
                      onDragStart={() => onTabDragStart(group.index, tab.id)}
                      onDragEnd={onTabDragEnd}
                      onDragOver={(event) => onTabDragOver(event, group.index, tab.id)}
                      onDrop={(event) => onTabDrop(event, group.index, tab.id)}
                      onClick={() => onSetActiveTab(group.index, tab.id)}
                      className={cn(
                        "group relative flex min-w-[160px] items-center gap-2 border-r border-[#2a2d2e] px-3 text-sm",
                        active ? "bg-[#1e1e1e] text-[#cccccc]" : "bg-[#2d2d2d] text-[#9d9d9d] hover:bg-[#323233]",
                        dragState?.tabId === tab.id && "opacity-60"
                      )}
                    >
                      {dropIndicator?.groupIndex === group.index && dropIndicator?.tabId === tab.id && dropIndicator.edge === "before" && <span className="absolute inset-y-1 left-0 w-0.5 rounded bg-[#007acc]" />}
                      <GripHorizontal className="h-3.5 w-3.5 shrink-0 opacity-40" />
                      <span className="truncate">{tab.title}</span>
                      {tab.dirty && <span className="text-[10px] leading-none text-[#4fc1ff]">●</span>}
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseTab(group.index, tab.id);
                        }}
                        className="ml-auto rounded p-0.5 opacity-60 hover:bg-[#3a3d41] hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                      {dropIndicator?.groupIndex === group.index && dropIndicator?.tabId === tab.id && dropIndicator.edge === "after" && <span className="absolute inset-y-1 right-0 w-0.5 rounded bg-[#007acc]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 px-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-[#9d9d9d] hover:bg-[#3a3d41] hover:text-white" onClick={() => onMoveTabWithinGroup(group.index, "left")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-[#9d9d9d] hover:bg-[#3a3d41] hover:text-white" onClick={() => onMoveTabWithinGroup(group.index, "right")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={visibleGroups.length > 1 ? "Close split editor" : "Open split editor"}
                  className={cn("h-7 w-7 rounded-md text-[#9d9d9d] hover:bg-[#3a3d41] hover:text-white", visibleGroups.length > 1 && "bg-[#3a3d41] text-white")}
                  onClick={() => onToggleSplitLayout(group.index)}
                >
                  <SplitEditorIcon active={visibleGroups.length > 1} />
                </Button>
              </div>
            </div>

            <div className="flex h-8 items-center justify-between border-b border-[#2a2d2e] bg-[#1f1f1f] px-3 text-xs text-[#8c8c8c]">
              <span>{activeTab.path}</span>
              <span>{activeTab.language}</span>
            </div>

            {dropIndicator?.groupIndex === group.index && dropIndicator.edge === "group" && <div className="pointer-events-none absolute inset-0 z-10 border-2 border-[#007acc] bg-[#007acc]/10" />}

            <div className="min-h-0 flex-1">
              <MonacoEditorView
                path={activeTab.path}
                language={activeTab.language}
                value={activeTab.content}
                onFocus={() => onFocusGroup(group.index)}
                onChange={(content) => onContentChange(group.index, activeTab.id, content)}
                onValidate={(markers) => onValidateTab(activeTab.id, markers)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
