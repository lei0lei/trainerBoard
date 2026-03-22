import { formatEventTime } from "./content-insights";
import { placeholderByActivity, panelTabs } from "../core/config";
import { TerminalView } from "./terminal-view";
import type { DiagnosticMarker, EditorTab, SidebarKey, TerminalPreferences, WorkspaceRoot } from "../core/types";
import { cn } from "@/lib/utils";

type CapabilitySummary = {
  app_env: string;
  file_browser_base_dir: string;
  platform: string;
} | null;

function severityColor(severity: number) {
  if (severity >= 8) return "bg-[#f14c4c]";
  if (severity >= 4) return "bg-[#d7ba7d]";
  return "bg-[#4fc1ff]";
}

function severityLabel(severity: number) {
  if (severity >= 8) return "Error";
  if (severity >= 4) return "Warning";
  return "Info";
}

export function Panel({
  activity,
  activeTab,
  activeEditor,
  workspace,
  diagnostics,
  sessionEvents,
  terminalPreferences,
  capabilities,
  onChange,
  onChangeTerminalPreferences,
  onSessionEvent,
}: {
  activity: SidebarKey;
  activeTab: string;
  activeEditor?: EditorTab | null;
  workspace: WorkspaceRoot;
  diagnostics: DiagnosticMarker[];
  sessionEvents: Array<{ id: string; message: string; level: "info" | "success" | "warning"; createdAt: string }>;
  terminalPreferences: TerminalPreferences;
  capabilities?: CapabilitySummary;
  onChange: (tab: string) => void;
  onChangeTerminalPreferences: (patch: Partial<TerminalPreferences>) => void;
  onSessionEvent?: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  if (activity !== "explorer") {
    const placeholder = placeholderByActivity[activity as keyof typeof placeholderByActivity] ?? {
      title: "Panel is empty",
      description: "This activity does not expose a panel.",
    };
    return (
      <section className="flex h-full flex-col border-t border-[#2a2d2e] bg-[#181818]">
        <div className="flex h-9 items-center border-b border-[#2a2d2e] bg-[#202020] px-2 text-xs text-[#9d9d9d]">PANEL</div>
        <div className="flex flex-1 items-center px-4 text-sm text-[#9d9d9d]">{placeholder.description}</div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col border-t border-[#2a2d2e] bg-[#181818]">
      <div className="flex h-9 items-center border-b border-[#2a2d2e] bg-[#202020] px-2">
        {panelTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={cn(
              "rounded px-3 py-1.5 text-xs",
              activeTab === tab ? "bg-[#2a2d2e] text-white" : "text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Terminal" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <TerminalView preferences={terminalPreferences} onChangePreferences={onChangeTerminalPreferences} onSessionEvent={onSessionEvent} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-sm text-[#d4d4d4]">
          {activeTab === "Problems" && (
            <div className="space-y-2">
              {!activeEditor ? (
                <div className="text-[#9d9d9d]">No active editor.</div>
              ) : diagnostics.length === 0 ? (
                <div className="text-[#89d185]">No Monaco diagnostics reported for {activeEditor.title}.</div>
              ) : (
                diagnostics.map((problem, index) => (
                  <div key={`${problem.startLineNumber}-${problem.startColumn}-${index}`} className="flex items-start gap-3 rounded border border-[#2a2d2e] bg-[#1e1e1e] px-3 py-2">
                    <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", severityColor(problem.severity))} />
                    <div className="min-w-0">
                      <div className="text-sm text-[#d4d4d4]">{problem.message}</div>
                      <div className="text-xs text-[#8b8b8b]">
                        {severityLabel(problem.severity)} ? {activeEditor.path} ? line {problem.startLineNumber}, col {problem.startColumn}
                      </div>
                      {(problem.source || problem.code) && (
                        <div className="text-xs text-[#6f6f6f]">{[problem.source, problem.code].filter(Boolean).join(" ? ")}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "Output" && (
            <div className="space-y-3">
              <div className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Workspace</div>
                <div className="mt-1 break-all text-sm text-[#d4d4d4]">{workspace?.root_path ?? "No workspace open"}</div>
              </div>
              <div className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Active Editor</div>
                <div className="mt-1 text-sm text-[#d4d4d4]">{activeEditor ? `${activeEditor.title} ? ${activeEditor.language}` : "No active editor"}</div>
                {activeEditor && <div className="mt-1 break-all text-xs text-[#8b8b8b]">{activeEditor.path}</div>}
              </div>
              <div className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Recent Activity</div>
                <div className="mt-2 space-y-1">
                  {sessionEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <span className="shrink-0 text-[#8b8b8b]">{formatEventTime(event.createdAt)}</span>
                      <span>{event.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Ports" && (
            <div className="space-y-3">
              <div className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Current Origin</div>
                <div className="mt-1 text-sm text-[#d4d4d4]">{typeof window !== "undefined" ? window.location.origin : ""}</div>
              </div>
              <div className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Environment</div>
                <div className="mt-1 text-sm text-[#d4d4d4]">{capabilities ? `${capabilities.app_env} ? ${capabilities.platform}` : "Unavailable"}</div>
                {capabilities && <div className="mt-1 break-all text-xs text-[#8b8b8b]">Base dir: {capabilities.file_browser_base_dir}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
