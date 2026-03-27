import { useCallback } from "react";
import {
  cancelLitegraphQueueItem,
  clearLitegraphQueue,
  enqueueLitegraphWorkflow,
  retryLitegraphQueueItem,
  saveLitegraphWorkflow,
} from "./api";
import type { LitegraphQueueItem, BackendConnectionProfile } from "./types";

export function useWorkbenchLitegraphActions({
  backendProfile,
  litegraphGraph,
  litegraphWorkflowName,
  setLitegraphLatestResult,
  setLitegraphQueue,
  markLitegraphSaved,
  addSessionEvent,
}: {
  backendProfile?: BackendConnectionProfile | null;
  litegraphGraph: Record<string, unknown> | null;
  litegraphWorkflowName: string;
  setLitegraphLatestResult: (item: LitegraphQueueItem | null) => void;
  setLitegraphQueue: (items: LitegraphQueueItem[]) => void;
  markLitegraphSaved: (graph?: Record<string, unknown> | null) => void;
  addSessionEvent: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  const handleSaveLitegraphWorkflow = useCallback(async () => {
    if (!litegraphGraph) {
      addSessionEvent("No LiteGraph workflow to save.", "warning");
      return;
    }

    try {
      const result = await saveLitegraphWorkflow(litegraphWorkflowName, litegraphGraph, backendProfile);
      markLitegraphSaved(litegraphGraph);
      addSessionEvent(`Saved LiteGraph workflow ${result.name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to save LiteGraph workflow.", "warning");
    }
  }, [addSessionEvent, backendProfile, litegraphGraph, litegraphWorkflowName, markLitegraphSaved]);

  const handleRunLitegraphWorkflow = useCallback(async () => {
    if (!litegraphGraph) {
      addSessionEvent("No LiteGraph workflow to run.", "warning");
      return;
    }

    try {
      const item = await enqueueLitegraphWorkflow(litegraphGraph, litegraphWorkflowName, backendProfile);
      addSessionEvent(`Queued LiteGraph workflow ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to queue LiteGraph workflow.", "warning");
    }
  }, [addSessionEvent, backendProfile, litegraphGraph, litegraphWorkflowName]);

  const handleCancelLitegraphQueue = useCallback(
    async (itemId: string) => {
      try {
        const item = await cancelLitegraphQueueItem(itemId, backendProfile);
        addSessionEvent(`Cancelled LiteGraph queue item ${item.workflow_name}`, "success");
      } catch (error) {
        addSessionEvent(error instanceof Error ? error.message : "Failed to cancel LiteGraph queue item.", "warning");
      }
    },
    [addSessionEvent, backendProfile]
  );

  const handleRetryLitegraphQueue = useCallback(
    async (itemId: string) => {
      try {
        const item = await retryLitegraphQueueItem(itemId, backendProfile);
        addSessionEvent(`Retried LiteGraph queue item ${item.workflow_name}`, "success");
      } catch (error) {
        addSessionEvent(error instanceof Error ? error.message : "Failed to retry LiteGraph queue item.", "warning");
      }
    },
    [addSessionEvent, backendProfile]
  );

  const handleClearLitegraphQueue = useCallback(
    async (mode: "finished" | "all") => {
      try {
        const items = await clearLitegraphQueue(mode, backendProfile);
        setLitegraphQueue(items);
        const latestCompleted = items.find((item) => item.status === "completed") ?? null;
        setLitegraphLatestResult(latestCompleted);
        addSessionEvent(mode === "all" ? "Cleared all LiteGraph queue items." : "Cleared finished LiteGraph queue items.", "success");
      } catch (error) {
        addSessionEvent(error instanceof Error ? error.message : "Failed to clear LiteGraph queue.", "warning");
      }
    },
    [addSessionEvent, backendProfile, setLitegraphLatestResult, setLitegraphQueue]
  );

  return {
    handleSaveLitegraphWorkflow,
    handleRunLitegraphWorkflow,
    handleCancelLitegraphQueue,
    handleRetryLitegraphQueue,
    handleClearLitegraphQueue,
  };
}
