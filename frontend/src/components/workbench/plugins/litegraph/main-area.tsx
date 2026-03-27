"use client";

import { ClipboardPaste, Copy, Maximize2, Play, Redo2, RotateCcw, Undo2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LGraphNode } from "litegraph.js";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { createDefaultTrainerGraph, extractLitegraphSelection, registerTrainerLitegraphNodes } from "./nodes";
import { useWorkbenchStore } from "../../core/store";
import type { LitegraphClipboardNode } from "../../core/store-types";

type LitegraphModule = typeof import("litegraph.js");
const LITEGRAPH_MIN_SCALE = 0.85;
const LITEGRAPH_DEFAULT_SCALE = 1;
const LITEGRAPH_MAX_SCALE = 2.5;
const LITEGRAPH_SCALE_STEPS = [0.85, 0.9, 0.95, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5] as const;

export function LitegraphMainArea() {
  const {
    litegraphGraph,
    litegraphLatestResult,
    litegraphPendingNodeType,
    litegraphPendingAction,
    litegraphDirty,
    litegraphClipboard,
    activeSidebar,
    setLitegraphGraph,
    consumeLitegraphNode,
    consumeLitegraphAction,
    setLitegraphSelectedNode,
    setLitegraphClipboard,
    undoLitegraphHistory,
    redoLitegraphHistory,
    queueLitegraphAction,
  } = useWorkbenchStore(
    useShallow((state) => ({
      litegraphGraph: state.litegraphGraph,
      litegraphLatestResult: state.litegraphLatestResult,
      litegraphPendingNodeType: state.litegraphPendingNodeType,
      litegraphPendingAction: state.litegraphPendingAction,
      litegraphDirty: state.litegraphDirty,
      litegraphClipboard: state.litegraphClipboard,
      activeSidebar: state.activeSidebar,
      setLitegraphGraph: state.setLitegraphGraph,
      consumeLitegraphNode: state.consumeLitegraphNode,
      consumeLitegraphAction: state.consumeLitegraphAction,
      setLitegraphSelectedNode: state.setLitegraphSelectedNode,
      setLitegraphClipboard: state.setLitegraphClipboard,
      undoLitegraphHistory: state.undoLitegraphHistory,
      redoLitegraphHistory: state.redoLitegraphHistory,
      queueLitegraphAction: state.queueLitegraphAction,
    }))
  );

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef<import("litegraph.js").LGraph | null>(null);
  const graphCanvasRef = useRef<import("litegraph.js").LGraphCanvas | null>(null);
  const moduleRef = useRef<LitegraphModule | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastSerializedRef = useRef("");
  const [ready, setReady] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(Math.round(LITEGRAPH_DEFAULT_SCALE * 100));

  function currentSelectedNode(): LGraphNode | null {
    const graphCanvas = graphCanvasRef.current;
    if (!graphCanvas) return null;
    const selected = Object.values(graphCanvas.selected_nodes ?? {});
    return (selected[0] as LGraphNode | undefined) ?? null;
  }

  function syncSelectedNode(node?: LGraphNode | null) {
    setLitegraphSelectedNode(extractLitegraphSelection(node ?? currentSelectedNode()));
  }

  function persistGraph() {
    const serialized = graphRef.current?.serialize() as Record<string, unknown> | undefined;
    if (!serialized) return;
    const text = JSON.stringify(serialized);
    if (text !== lastSerializedRef.current) {
      lastSerializedRef.current = text;
      setLitegraphGraph(serialized);
    }
    syncSelectedNode();
  }

  function syncWidgetsFromProperties(node: LGraphNode) {
    const widgets = ((node as LGraphNode & { widgets?: Array<{ name?: string; value?: unknown; callback?: (value: unknown) => void }> }).widgets ?? []);
    widgets.forEach((widget) => {
      if (!widget.name) return;
      const value = (node.properties ?? {})[widget.name];
      if (value === undefined) return;
      widget.value = value;
      widget.callback?.(value);
    });
  }

  function resizeCanvas() {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const graphCanvas = graphCanvasRef.current;
    if (!host || !canvas || !graphCanvas) return;

    canvas.width = host.clientWidth * window.devicePixelRatio;
    canvas.height = host.clientHeight * window.devicePixelRatio;
    canvas.style.width = `${host.clientWidth}px`;
    canvas.style.height = `${host.clientHeight}px`;
    graphCanvas.resize(host.clientWidth, host.clientHeight);
    graphCanvas.setDirty(true, true);
  }

  function clampCanvasScale() {
    const graphCanvas = graphCanvasRef.current;
    if (!graphCanvas) return;
    if (graphCanvas.ds.scale < LITEGRAPH_MIN_SCALE) {
      graphCanvas.ds.scale = LITEGRAPH_MIN_SCALE;
      setZoomPercent(Math.round(LITEGRAPH_MIN_SCALE * 100));
      graphCanvas.setDirty(true, true);
    }
  }

  function getSnappedScale(currentScale: number, direction: "in" | "out") {
    if (direction === "in") {
      return LITEGRAPH_SCALE_STEPS.find((step) => step > currentScale + 0.001) ?? LITEGRAPH_MAX_SCALE;
    }
    for (let index = LITEGRAPH_SCALE_STEPS.length - 1; index >= 0; index -= 1) {
      const step = LITEGRAPH_SCALE_STEPS[index];
      if (step < currentScale - 0.001) {
        return step;
      }
    }
    return LITEGRAPH_MIN_SCALE;
  }

  function getZoomToFitScale(targetScale: number) {
    for (let index = LITEGRAPH_SCALE_STEPS.length - 1; index >= 0; index -= 1) {
      const step = LITEGRAPH_SCALE_STEPS[index];
      if (step <= targetScale + 0.001) {
        return step;
      }
    }
    return LITEGRAPH_MIN_SCALE;
  }

  function applyScale(nextScale: number, center?: [number, number]) {
    const graphCanvas = graphCanvasRef.current;
    if (!graphCanvas) return;

    const clampedScale = Math.min(Math.max(nextScale, LITEGRAPH_MIN_SCALE), LITEGRAPH_MAX_SCALE);
    if (center) {
      graphCanvas.ds.changeScale(clampedScale, center);
    } else {
      graphCanvas.ds.scale = clampedScale;
    }
    setZoomPercent(Math.round(clampedScale * 100));
    graphCanvas.setDirty(true, true);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const litegraphModule = await import("litegraph.js");
      if (cancelled || !hostRef.current || !canvasRef.current) return;

      moduleRef.current = litegraphModule;
      registerTrainerLitegraphNodes(litegraphModule);

      const { LGraph, LGraphCanvas } = litegraphModule;
      const graph = new LGraph();
      const graphCanvas = new LGraphCanvas(canvasRef.current, graph);

      graphCanvas.background_image = "";
      graphCanvas.allow_dragcanvas = true;
      graphCanvas.allow_searchbox = true;
      graphCanvas.live_mode = false;
      graphCanvas.ds.scale = LITEGRAPH_DEFAULT_SCALE;
      graphCanvas.ds.min_scale = LITEGRAPH_MIN_SCALE;
      graphCanvas.ds.max_scale = LITEGRAPH_MAX_SCALE;
      graphCanvas.ds.offset = [120, 40];
      graphCanvas.title_text_font = "600 14px Inter, Segoe UI, Arial, sans-serif";
      graphCanvas.inner_text_font = "500 12px Inter, Segoe UI, Arial, sans-serif";
      graphCanvas.onNodeSelected = (node) => syncSelectedNode(node);
      graphCanvas.onNodeDeselected = () => syncSelectedNode(null);
      graphCanvas.onDrawForeground = () => clampCanvasScale();
      graphCanvas.processMouseWheel = (event: WheelEvent) => {
        if (!graphCanvas.graph || !graphCanvas.allow_dragcanvas) {
          return;
        }

        graphCanvas.adjustMouseEvent(event as unknown as MouseEvent);

        const bounds = canvasRef.current?.getBoundingClientRect();
        const clientX = event.clientX;
        const clientY = event.clientY;
        const isInsideCanvas =
          !!bounds &&
          clientX >= bounds.left &&
          clientX <= bounds.right &&
          clientY >= bounds.top &&
          clientY <= bounds.bottom;

        if (!isInsideCanvas) {
          return;
        }

        const direction = event.deltaY < 0 ? "in" : "out";
        if (event.deltaY === 0) {
          return false;
        }

        const nextScale = getSnappedScale(graphCanvas.ds.scale, direction);
        applyScale(nextScale, [clientX, clientY]);
        graphCanvas.graph.change();

        event.preventDefault();
        return false;
      };

      graphRef.current = graph;
      graphCanvasRef.current = graphCanvas;

      const nextGraphState = litegraphGraph ?? createDefaultTrainerGraph(litegraphModule);
      graph.configure(nextGraphState);
      graph.start(100);

      resizeObserverRef.current = new ResizeObserver(() => resizeCanvas());
      resizeObserverRef.current.observe(hostRef.current);
      resizeCanvas();
      setZoomPercent(Math.round(graphCanvas.ds.scale * 100));

      const bootSerialized = graph.serialize() as Record<string, unknown>;
      lastSerializedRef.current = JSON.stringify(bootSerialized);
      setLitegraphGraph(bootSerialized, { resetHistory: true, markSaved: !litegraphDirty, skipHistory: true });
      syncSelectedNode();
      setReady(true);
    }

    void boot();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      graphRef.current?.stop();
      graphCanvasRef.current?.unbindEvents();
      graphCanvasRef.current = null;
      graphRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current) return;

    const timer = window.setInterval(() => {
      persistGraph();
    }, 700);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!litegraphPendingNodeType || !graphRef.current || !graphCanvasRef.current || !moduleRef.current || !hostRef.current) return;

    const node = moduleRef.current.LiteGraph.createNode(litegraphPendingNodeType);
    if (node) {
      const graphCanvas = graphCanvasRef.current;
      node.pos = [
        -graphCanvas.ds.offset[0] + hostRef.current.clientWidth * 0.35 / graphCanvas.ds.scale,
        -graphCanvas.ds.offset[1] + hostRef.current.clientHeight * 0.3 / graphCanvas.ds.scale,
      ];
      graphRef.current.add(node);
      graphCanvas.selectNode(node);
      graphCanvas.setDirty(true, true);
      persistGraph();
    }

    consumeLitegraphNode();
  }, [consumeLitegraphNode, litegraphPendingNodeType]);

  useEffect(() => {
    if (!litegraphPendingAction || !graphRef.current || !graphCanvasRef.current || !moduleRef.current) return;

    const graph = graphRef.current;
    const graphCanvas = graphCanvasRef.current;
    const targetNode =
      litegraphPendingAction.type !== "load-graph"
        ? ((graph.getNodeById?.(litegraphPendingAction.nodeId) as LGraphNode | null | undefined) ?? null)
        : null;

    if (litegraphPendingAction.type === "update-node" && targetNode) {
      graph.beforeChange(targetNode);
      if (litegraphPendingAction.title !== undefined) {
        targetNode.title = litegraphPendingAction.title ?? targetNode.title;
      }
      if (litegraphPendingAction.properties) {
        targetNode.properties = {
          ...(targetNode.properties ?? {}),
          ...litegraphPendingAction.properties,
        };
        syncWidgetsFromProperties(targetNode);
      }
      graph.afterChange(targetNode);
      graphCanvas.setDirty(true, true);
      persistGraph();
    }

    if (litegraphPendingAction.type === "delete-node" && targetNode) {
      graph.beforeChange(targetNode);
      graph.remove(targetNode);
      graph.afterChange(targetNode);
      setLitegraphSelectedNode(extractLitegraphSelection(null));
      graphCanvas.setDirty(true, true);
      persistGraph();
    }

    if (litegraphPendingAction.type === "duplicate-node" && targetNode) {
      graph.beforeChange(targetNode);
      const clone = targetNode.clone();
      clone.pos = [targetNode.pos[0] + 40, targetNode.pos[1] + 40];
      graph.add(clone);
      syncWidgetsFromProperties(clone);
      graph.afterChange(targetNode);
      graphCanvas.selectNode(clone);
      graphCanvas.setDirty(true, true);
      persistGraph();
    }

    if (litegraphPendingAction.type === "load-graph") {
      graph.clear();
      graph.configure(litegraphPendingAction.graph);
      setLitegraphSelectedNode(extractLitegraphSelection(null));
      lastSerializedRef.current = JSON.stringify(litegraphPendingAction.graph);
      setLitegraphGraph(litegraphPendingAction.graph, {
        resetHistory: litegraphPendingAction.resetHistory,
        markSaved: litegraphPendingAction.markSaved,
        skipHistory: litegraphPendingAction.skipHistory ?? true,
      });
      graphCanvas.setDirty(true, true);
    }

    consumeLitegraphAction();
  }, [consumeLitegraphAction, litegraphPendingAction, setLitegraphGraph]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeSidebar !== "litegraph") return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        const previousGraph = undoLitegraphHistory();
        if (previousGraph) {
          queueLitegraphAction({ type: "load-graph", graph: previousGraph, skipHistory: true });
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        const nextGraph = redoLitegraphHistory();
        if (nextGraph) {
          queueLitegraphAction({ type: "load-graph", graph: nextGraph, skipHistory: true });
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSidebar, litegraphClipboard, queueLitegraphAction]);

  function centerView() {
    const graphCanvas = graphCanvasRef.current;
    if (!graphCanvas) return;
    graphCanvas.ds.offset = [120, 40];
    applyScale(LITEGRAPH_DEFAULT_SCALE);
  }

  function zoomToFit() {
    const graphCanvas = graphCanvasRef.current;
    const serialized = graphRef.current?.serialize() as { nodes?: Array<{ pos: [number, number]; size?: [number, number] }> } | undefined;
    const nodes = serialized?.nodes ?? [];
    if (!graphCanvas || nodes.length === 0) return;

    const bounds = nodes.reduce(
      (acc, node) => {
        acc.minX = Math.min(acc.minX, node.pos[0]);
        acc.minY = Math.min(acc.minY, node.pos[1]);
        acc.maxX = Math.max(acc.maxX, node.pos[0] + (node.size?.[0] ?? 180));
        acc.maxY = Math.max(acc.maxY, node.pos[1] + (node.size?.[1] ?? 80));
        return acc;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const width = bounds.maxX - bounds.minX + 120;
    const height = bounds.maxY - bounds.minY + 120;
    const host = hostRef.current;
    if (!host) return;

    const targetScale = Math.max(Math.min(host.clientWidth / width, host.clientHeight / height, 1), LITEGRAPH_MIN_SCALE);
    const snappedScale = getZoomToFitScale(targetScale);
    graphCanvas.ds.scale = snappedScale;
    graphCanvas.ds.offset = [
      -bounds.minX + (host.clientWidth / graphCanvas.ds.scale - width) / 2 + 60,
      -bounds.minY + (host.clientHeight / graphCanvas.ds.scale - height) / 2 + 60,
    ];
    setZoomPercent(Math.round(snappedScale * 100));
    graphCanvas.setDirty(true, true);
  }

  function resetGraph() {
    if (!moduleRef.current || !graphRef.current || !graphCanvasRef.current) return;
    const initial = createDefaultTrainerGraph(moduleRef.current);
    graphRef.current.clear();
    graphRef.current.configure(initial);
    lastSerializedRef.current = JSON.stringify(initial);
    setLitegraphGraph(initial, { resetHistory: true, markSaved: true, skipHistory: true });
    graphCanvasRef.current.setDirty(true, true);
    setLitegraphSelectedNode(extractLitegraphSelection(null));
  }

  function copySelection() {
    const graphCanvas = graphCanvasRef.current;
    if (!graphCanvas) return;
    const selected = Object.values(graphCanvas.selected_nodes ?? {}) as LGraphNode[];
    if (selected.length === 0) return;

    const serializedNodes: LitegraphClipboardNode[] = selected.map((node) => {
      const serialized = node.serialize() as Record<string, unknown>;
      return {
        type: String(serialized.type ?? node.type ?? ""),
        title: (serialized.title as string | undefined) ?? node.title,
        pos: Array.isArray(serialized.pos) ? (serialized.pos as [number, number]) : ([...node.pos] as [number, number]),
        size: Array.isArray(serialized.size) ? (serialized.size as [number, number]) : (node.size as [number, number] | undefined),
        properties: (serialized.properties as Record<string, unknown> | undefined) ?? { ...(node.properties ?? {}) },
      };
    });

    setLitegraphClipboard(serializedNodes);
  }

  function pasteClipboard() {
    if (!moduleRef.current || !graphRef.current || !graphCanvasRef.current || !hostRef.current || !litegraphClipboard?.length) return;

    const graph = graphRef.current;
    const graphCanvas = graphCanvasRef.current;
    const minX = Math.min(...litegraphClipboard.map((node) => node.pos?.[0] ?? 0));
    const minY = Math.min(...litegraphClipboard.map((node) => node.pos?.[1] ?? 0));
    const anchorX = -graphCanvas.ds.offset[0] + hostRef.current.clientWidth * 0.4 / graphCanvas.ds.scale;
    const anchorY = -graphCanvas.ds.offset[1] + hostRef.current.clientHeight * 0.3 / graphCanvas.ds.scale;

    graph.beforeChange();
    const pastedNodes: LGraphNode[] = [];
    litegraphClipboard.forEach((item, index) => {
      const nextNode = moduleRef.current?.LiteGraph.createNode(item.type);
      if (!nextNode) return;
      nextNode.title = item.title ?? nextNode.title;
      nextNode.pos = [
        anchorX + ((item.pos?.[0] ?? 0) - minX) + index * 24,
        anchorY + ((item.pos?.[1] ?? 0) - minY) + index * 24,
      ];
      if (item.size) {
        nextNode.size = [...item.size];
      }
      nextNode.properties = {
        ...(nextNode.properties ?? {}),
        ...(item.properties ?? {}),
      };
      syncWidgetsFromProperties(nextNode);
      graph.add(nextNode);
      pastedNodes.push(nextNode);
    });
    graph.afterChange();

    graphCanvas.selectNodes(pastedNodes);
    graphCanvas.setDirty(true, true);
    persistGraph();
  }

  function handleUndo() {
    const previousGraph = undoLitegraphHistory();
    if (previousGraph) {
      queueLitegraphAction({ type: "load-graph", graph: previousGraph, skipHistory: true });
    }
  }

  function handleRedo() {
    const nextGraph = redoLitegraphHistory();
    if (nextGraph) {
      queueLitegraphAction({ type: "load-graph", graph: nextGraph, skipHistory: true });
    }
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#1e1e1e]">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#181818]/90 p-1 backdrop-blur">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Undo" onClick={handleUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Redo" onClick={handleRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Copy selected nodes" onClick={copySelection}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Paste nodes" onClick={pasteClipboard}>
          <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Reset graph" onClick={resetGraph}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Center view" onClick={centerView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" title="Zoom to fit" onClick={zoomToFit}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded border border-[#3c3c3c] bg-[#181818]/90 px-3 py-2 text-xs text-[#9d9d9d] backdrop-blur">
        <div className="flex items-center gap-2 font-medium text-[#d4d4d4]">
          <span>LiteGraph Workflow</span>
          {litegraphDirty && <span className="rounded bg-[#3a3322] px-1.5 py-0.5 text-[10px] uppercase text-[#d7ba7d]">Modified</span>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Play className="h-3.5 w-3.5 text-[#89d185]" />
          {ready ? "Ready for node editing" : "Loading graph canvas..."}
        </div>
        {litegraphLatestResult?.result_summary && <div className="mt-2 max-w-sm text-[#d4d4d4]">{litegraphLatestResult.result_summary}</div>}
      </div>

      <div className="absolute bottom-3 right-3 z-10 rounded border border-[#3c3c3c] bg-[#181818]/90 px-3 py-2 text-xs text-[#9d9d9d] backdrop-blur">
        <div className="text-[10px] uppercase tracking-wide text-[#8b8b8b]">Zoom</div>
        <div className="mt-1 font-medium text-[#d4d4d4]">{zoomPercent}%</div>
      </div>

      <div ref={hostRef} className="h-full w-full overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(0,122,204,0.08),_transparent_48%),_linear-gradient(180deg,#1e1e1e,#161616)]">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}


