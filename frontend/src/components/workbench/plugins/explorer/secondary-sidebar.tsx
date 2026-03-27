import { extractOutline } from "./content-insights";
import type { EditorTab } from "../../core/types";

export function SecondarySidebar({
  activeTab,
  openEditors,
}: {
  activeTab?: EditorTab | null;
  openEditors: EditorTab[];
}) {
  const outline = extractOutline(activeTab);

  return (
    <aside className="flex h-full flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>SECONDARY SIDEBAR</span>
        <span className="text-[#8b8b8b]">Outline</span>
      </div>
      <div className="space-y-4 overflow-y-auto overflow-x-hidden p-4 text-sm text-[#cccccc]">
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-[#8b8b8b]">ACTIVE FILE</div>
          <div className="overflow-hidden rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 break-all">{activeTab?.path ?? "No file selected"}</div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-[#8b8b8b]">OUTLINE</div>
          {outline.length === 0 ? (
            <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-[#9d9d9d]">No symbols or sections detected in the active file.</div>
          ) : (
            <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] py-1">
              {outline.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[#2a2d2e]">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[#d4d4d4]">{item.label}</div>
                    <div className="text-[11px] uppercase tracking-wide text-[#8b8b8b]">
                      {item.kind}
                      {item.detail ? ` ? ${item.detail}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-[#8b8b8b]">L{item.line}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-[#8b8b8b]">OPEN EDITORS</div>
          {openEditors.length === 0 ? (
            <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-[#9d9d9d]">No open editors</div>
          ) : (
            openEditors.map((tab) => (
              <div key={tab.id} className="overflow-hidden rounded px-2 py-1.5 hover:bg-[#2a2d2e]">
                <div className="truncate">{tab.title}</div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-[#8b8b8b]">DETAILS</div>
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-[#9d9d9d]">
            Explorer owns the editor tabs. Other activities can later provide their own secondary sidebar.
          </div>
        </div>
      </div>
    </aside>
  );
}


