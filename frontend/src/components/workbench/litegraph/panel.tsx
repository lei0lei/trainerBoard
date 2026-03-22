"use client";

import { Ban, Download, FolderDown, RefreshCw, RotateCcw, Save, Trash2, Upload, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  cancelLitegraphQueueItem,
  clearLitegraphQueue,
  enqueueLitegraphWorkflow,
  getLitegraphQueueItem,
  getLitegraphQueueWebSocketUrl,
  listLitegraphWorkflows,
  loadLitegraphWorkflow,
  retryLitegraphQueueItem,
  saveLitegraphWorkflow,
} from "../core/api";
import { useWorkbenchStore } from "../core/store";

export function LitegraphPanel() {
  const {
    litegraphGraph,
    litegraphWorkflowName,
    litegraphWorkflows,
    litegraphQueue,
    litegraphLatestResult,
    litegraphDirty,
    setLitegraphWorkflowName,
    setLitegraphWorkflows,
    setLitegraphQueue,
    setLitegraphLatestResult,
    markLitegraphSaved,
    queueLitegraphAction,
    addSessionEvent,
  } = useWorkbenchStore(
    useShallow((state) => ({
      litegraphGraph: state.litegraphGraph,
      litegraphWorkflowName: state.litegraphWorkflowName,
      litegraphWorkflows: state.litegraphWorkflows,
      litegraphQueue: state.litegraphQueue,
      litegraphLatestResult: state.litegraphLatestResult,
      litegraphDirty: state.litegraphDirty,
      setLitegraphWorkflowName: state.setLitegraphWorkflowName,
      setLitegraphWorkflows: state.setLitegraphWorkflows,
      setLitegraphQueue: state.setLitegraphQueue,
      setLitegraphLatestResult: state.setLitegraphLatestResult,
      markLitegraphSaved: state.markLitegraphSaved,
      queueLitegraphAction: state.queueLitegraphAction,
      addSessionEvent: state.addSessionEvent,
    }))
  );

  const importRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshWorkflows() {
    try {
      const items = await listLitegraphWorkflows();
      setLitegraphWorkflows(items);
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to load LiteGraph workflows.", "warning");
    }
  }

  useEffect(() => {
    void refreshWorkflows();
    const wsUrl = getLitegraphQueueWebSocketUrl();
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);
    socket.onmessage = async (event) => {
      const payload = JSON.parse(event.data) as {
        type?: string;
        items?: typeof litegraphQueue;
        latest_completed?: string | null;
      };
      if (payload.type !== "queue_snapshot") return;
      setLitegraphQueue(payload.items ?? []);
      if (payload.latest_completed) {
        const fullItem = await getLitegraphQueueItem(payload.latest_completed);
        setLitegraphLatestResult(fullItem);
      } else {
        setLitegraphLatestResult(null);
      }
    };
    socket.onerror = () => addSessionEvent("LiteGraph queue websocket disconnected, manual refresh may be needed.", "warning");
    return () => socket.close();
  }, []);

  async function handleSaveBackend() {
    if (!litegraphGraph) return;
    setLoading(true);
    try {
      const result = await saveLitegraphWorkflow(litegraphWorkflowName, litegraphGraph);
      markLitegraphSaved(litegraphGraph);
      addSessionEvent(`Saved LiteGraph workflow ${result.name}`, "success");
      await refreshWorkflows();
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to save LiteGraph workflow.", "warning");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunQueue() {
    if (!litegraphGraph) return;
    setLoading(true);
    try {
      const item = await enqueueLitegraphWorkflow(litegraphGraph, litegraphWorkflowName);
      addSessionEvent(`Queued LiteGraph workflow ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to enqueue LiteGraph workflow.", "warning");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelQueueItem(itemId: string) {
    try {
      const item = await cancelLitegraphQueueItem(itemId);
      addSessionEvent(`Cancelled LiteGraph queue item ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to cancel LiteGraph workflow.", "warning");
    }
  }

  async function handleRetryQueueItem(itemId: string) {
    try {
      const item = await retryLitegraphQueueItem(itemId);
      addSessionEvent(`Retried LiteGraph queue item ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to retry LiteGraph workflow.", "warning");
    }
  }

  async function handleClearQueue(mode: "finished" | "all") {
    try {
      const items = await clearLitegraphQueue(mode);
      setLitegraphQueue(items);
      if (mode === "all" || items.every((item) => item.id !== litegraphLatestResult?.id)) {
        setLitegraphLatestResult(items.find((item) => item.status === "completed") ?? null);
      }
      addSessionEvent(mode === "all" ? "Cleared all LiteGraph queue items." : "Cleared finished LiteGraph queue items.", "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to clear LiteGraph queue.", "warning");
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-[#2a2d2e] bg-[#181818]">
      <div className="flex h-9 items-center justify-between border-b border-[#2a2d2e] bg-[#202020] px-3 text-xs text-[#9d9d9d]">
        <div className="flex items-center gap-2">
          <span>LITEGRAPH PANEL</span>
          {litegraphDirty && <span className="rounded bg-[#3a3322] px-1.5 py-0.5 text-[10px] uppercase text-[#d7ba7d]">Dirty</span>}
        </div>
        <button className="rounded p-1 hover:bg-[#2a2d2e] hover:text-white" onClick={() => void refreshWorkflows()}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const graph = JSON.parse(await file.text()) as Record<string, unknown>;
            setLitegraphWorkflowName(file.name.replace(/\.json$/i, "") || "trainer-workflow");
            queueLitegraphAction({ type: "load-graph", graph, markSaved: true, resetHistory: true });
            addSessionEvent(`Imported LiteGraph workflow ${file.name}`, "success");
          } catch (error) {
            addSessionEvent(error instanceof Error ? error.message : "Failed to import workflow JSON.", "warning");
          } finally {
            event.target.value = "";
          }
        }}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_320px] gap-0 overflow-hidden">
        <div className="overflow-y-auto border-r border-[#2a2d2e] p-4">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Workflow</div>
            <input
              className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4]"
              value={litegraphWorkflowName}
              onChange={(event) => setLitegraphWorkflowName(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 rounded border border-[#3c3c3c] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e]" onClick={() => importRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded border border-[#3c3c3c] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e]"
                onClick={() => {
                  if (!litegraphGraph) return;
                  const blob = new Blob([JSON.stringify(litegraphGraph, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = `${litegraphWorkflowName || "workflow"}.json`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                disabled={loading || !litegraphGraph}
                className="flex items-center justify-center gap-2 rounded bg-[#0e639c] px-3 py-2 text-sm text-white hover:bg-[#1177bb] disabled:opacity-50"
                onClick={() => void handleSaveBackend()}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                disabled={loading || !litegraphGraph}
                className="flex items-center justify-center gap-2 rounded bg-[#237b4b] px-3 py-2 text-sm text-white hover:bg-[#2c8f59] disabled:opacity-50"
                onClick={() => void handleRunQueue()}
              >
                <WandSparkles className="h-4 w-4" />
                Run
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Saved Workflows</div>
              <button className="rounded p-1 text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white" onClick={() => void refreshWorkflows()}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {litegraphWorkflows.length === 0 ? (
                <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#9d9d9d]">No saved workflows yet.</div>
              ) : (
                litegraphWorkflows.map((item) => (
                  <button
                    key={item.name}
                    className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-left hover:border-[#007acc] hover:bg-[#232328]"
                    onClick={async () => {
                      try {
                        const payload = await loadLitegraphWorkflow(item.name);
                        setLitegraphWorkflowName(payload.name);
                        queueLitegraphAction({ type: "load-graph", graph: payload.graph, markSaved: true, resetHistory: true });
                        addSessionEvent(`Loaded LiteGraph workflow ${payload.name}`, "success");
                      } catch (error) {
                        addSessionEvent(error instanceof Error ? error.message : "Failed to load workflow.", "warning");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[#d4d4d4]">
                      <FolderDown className="h-4 w-4 text-[#4fc1ff]" />
                      {item.name}
                    </div>
                    <div className="mt-1 text-xs text-[#8b8b8b]">{new Date(item.updated_at).toLocaleString()}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Execution Queue</div>
            <div className="flex items-center gap-1">
              <button className="rounded p-1 text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white" title="Clear finished" onClick={() => void handleClearQueue("finished")}>
                <Trash2 className="h-4 w-4" />
              </button>
              <button className="rounded p-1 text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white" title="Clear all" onClick={() => void handleClearQueue("all")}>
                <Ban className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {litegraphQueue.length === 0 ? (
              <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#9d9d9d]">No queued runs yet.</div>
            ) : (
              litegraphQueue.map((item) => (
                <div key={item.id} className="rounded border border-[#2a2d2e] bg-[#1e1e1e] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[#d4d4d4]">{item.workflow_name}</div>
                      <div className="mt-1 text-xs text-[#8b8b8b]">{item.checkpoint}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.status === "queued" || item.status === "running") && item.cancellable !== false ? (
                        <button
                          className="rounded border border-[#5a1d1d] px-2 py-1 text-[11px] uppercase tracking-wide text-[#ffb4b4] hover:bg-[#5a1d1d]/50"
                          onClick={() => void handleCancelQueueItem(item.id)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            Cancel
                          </span>
                        </button>
                      ) : null}
                      {(item.status === "completed" || item.status === "failed" || item.status === "cancelled") ? (
                        <button
                          className="rounded border border-[#3c3c3c] px-2 py-1 text-[11px] uppercase tracking-wide text-[#d4d4d4] hover:bg-[#2a2d2e]"
                          onClick={() => void handleRetryQueueItem(item.id)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </span>
                        </button>
                      ) : null}
                      <span
                        className={`rounded px-2 py-1 text-[11px] uppercase tracking-wide ${
                          item.status === "completed"
                            ? "bg-[#1f3a28] text-[#89d185]"
                            : item.status === "running"
                              ? "bg-[#263238] text-[#4fc1ff]"
                              : item.status === "failed" || item.status === "cancelled"
                                ? "bg-[#452727] text-[#ffb4b4]"
                                : "bg-[#3a3322] text-[#d7ba7d]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[#9d9d9d]">{item.prompt}</div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[#8b8b8b]">
                      <span>{item.cancel_requested && item.status !== "cancelled" ? "Cancellation requested" : "Progress"}</span>
                      <span>{Math.max(0, Math.min(100, Math.round(item.progress ?? 0)))}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#252526]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === "completed"
                            ? "bg-[#89d185]"
                            : item.status === "failed" || item.status === "cancelled"
                              ? "bg-[#f48771]"
                              : "bg-[#4fc1ff]"
                        }`}
                        style={{ width: `${Math.max(4, Math.min(100, item.progress ?? 0))}%` }}
                      />
                    </div>
                  </div>
                  {item.logs?.length ? <div className="mt-2 text-xs text-[#8b8b8b]">{item.logs[item.logs.length - 1]}</div> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-y-auto border-l border-[#2a2d2e] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">Latest Result</div>
          {litegraphLatestResult?.preview_url ? (
            <div className="mt-3 space-y-3">
              <img src={litegraphLatestResult.preview_url} alt="LiteGraph preview" className="w-full rounded border border-[#3c3c3c] bg-[#101010]" />
              <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#d4d4d4]">{litegraphLatestResult.result_summary}</div>
              <div className="space-y-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-xs text-[#9d9d9d]">
                {(litegraphLatestResult.logs ?? []).map((log, index) => (
                  <div key={`${litegraphLatestResult.id}-${index}`}>{log}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#9d9d9d]">Run the workflow queue to generate a preview result.</div>
          )}
        </div>
      </div>
    </section>
  );
}
