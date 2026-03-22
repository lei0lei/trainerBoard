import { useCallback } from "react";
import {
  cancelLitegraphQueueItem,
  clearLitegraphQueue,
  enqueueLitegraphWorkflow,
  retryLitegraphQueueItem,
  saveLitegraphWorkflow,
} from "./api";
import type { LitegraphQueueItem } from "./types";

export function useWorkbenchLitegraphActions({
  litegraphGraph,
  litegraphWorkflowName,
  setLitegraphLatestResult,
  setLitegraphQueue,
  markLitegraphSaved,
  addSessionEvent,
}: {
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
      const result = await saveLitegraphWorkflow(litegraphWorkflowName, litegraphGraph);
      markLitegraphSaved(litegraphGraph);
      addSessionEvent(`Saved LiteGraph workflow ${result.name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to save LiteGraph workflow.", "warning");
    }
  }, [addSessionEvent, litegraphGraph, litegraphWorkflowName, markLitegraphSaved]);

  const handleRunLitegraphWorkflow = useCallback(async () => {
    if (!litegraphGraph) {
      addSessionEvent("No LiteGraph workflow to run.", "warning");
      return;
    }

    try {
      const item = await enqueueLitegraphWorkflow(litegraphGraph, litegraphWorkflowName);
      addSessionEvent(`Queued LiteGraph workflow ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to queue LiteGraph workflow.", "warning");
    }
  }, [addSessionEvent, litegraphGraph, litegraphWorkflowName]);

  const handleCancelLitegraphQueue = useCallback(async (itemId: string) => {
    try {
      const item = await cancelLitegraphQueueItem(itemId);
      addSessionEvent(`Cancelled LiteGraph queue item ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to cancel LiteGraph queue item.", "warning");
    }
  }, [addSessionEvent]);

  const handleRetryLitegraphQueue = useCallback(async (itemId: string) => {
    try {
      const item = await retryLitegraphQueueItem(itemId);
      addSessionEvent(`Retried LiteGraph queue item ${item.workflow_name}`, "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to retry LiteGraph queue item.", "warning");
    }
  }, [addSessionEvent]);

  const handleClearLitegraphQueue = useCallback(async (mode: "finished" | "all") => {
    try {
      const items = await clearLitegraphQueue(mode);
      setLitegraphQueue(items);
      const latestCompleted = items.find((item) => item.status === "completed") ?? null;
      setLitegraphLatestResult(latestCompleted);
      addSessionEvent(mode === "all" ? "Cleared all LiteGraph queue items." : "Cleared finished LiteGraph queue items.", "success");
    } catch (error) {
      addSessionEvent(error instanceof Error ? error.message : "Failed to clear LiteGraph queue.", "warning");
    }
  }, [addSessionEvent, setLitegraphLatestResult, setLitegraphQueue]);

  return {
    handleSaveLitegraphWorkflow,
    handleRunLitegraphWorkflow,
    handleCancelLitegraphQueue,
    handleRetryLitegraphQueue,
    handleClearLitegraphQueue,
  };
}
