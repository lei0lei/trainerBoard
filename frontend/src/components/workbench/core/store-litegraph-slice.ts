import type { LitegraphNodeSelection } from "./types";
import type { LitegraphSlice, WorkbenchSliceCreator } from "./store-types";

const defaultLitegraphSelectedNode: LitegraphNodeSelection = {
  id: null,
  title: null,
  type: null,
  properties: {},
};

function serializeGraph(graph: Record<string, unknown> | null) {
  return graph ? JSON.stringify(graph) : null;
}

export const createLitegraphSlice: WorkbenchSliceCreator<LitegraphSlice> = (set, get) => ({
  litegraphGraph: null,
  litegraphWorkflowName: "trainer-workflow",
  litegraphWorkflows: [],
  litegraphQueue: [],
  litegraphLatestResult: null,
  litegraphPendingNodeType: null,
  litegraphSelectedNode: defaultLitegraphSelectedNode,
  litegraphPendingAction: null,
  litegraphDirty: false,
  litegraphSavedGraphText: null,
  litegraphHistoryPast: [],
  litegraphHistoryFuture: [],
  litegraphClipboard: null,
  setLitegraphGraph: (graph, options) =>
    set((state) => {
      const nextText = serializeGraph(graph);
      const currentText = serializeGraph(state.litegraphGraph);
      const shouldResetHistory = options?.resetHistory;
      const shouldSkipHistory = options?.skipHistory;
      const shouldMarkSaved = options?.markSaved;

      const nextHistoryPast = shouldResetHistory
        ? []
        : !shouldSkipHistory && currentText && currentText !== nextText
          ? [...state.litegraphHistoryPast, currentText].slice(-100)
          : state.litegraphHistoryPast;

      const nextHistoryFuture = shouldResetHistory || (!shouldSkipHistory && currentText !== nextText) ? [] : state.litegraphHistoryFuture;
      const nextSavedGraphText = shouldMarkSaved ? nextText : state.litegraphSavedGraphText;

      return {
        litegraphGraph: graph,
        litegraphDirty: nextText !== nextSavedGraphText,
        litegraphSavedGraphText: nextSavedGraphText,
        litegraphHistoryPast: nextHistoryPast,
        litegraphHistoryFuture: nextHistoryFuture,
      };
    }),
  setLitegraphWorkflowName: (name) => set({ litegraphWorkflowName: name }),
  setLitegraphWorkflows: (items) => set({ litegraphWorkflows: items }),
  setLitegraphQueue: (items) => set({ litegraphQueue: items }),
  setLitegraphLatestResult: (item) => set({ litegraphLatestResult: item }),
  queueLitegraphNode: (nodeType) => set({ litegraphPendingNodeType: nodeType }),
  consumeLitegraphNode: () => set({ litegraphPendingNodeType: null }),
  setLitegraphSelectedNode: (node) => set({ litegraphSelectedNode: node }),
  queueLitegraphAction: (action) => set({ litegraphPendingAction: action }),
  consumeLitegraphAction: () => set({ litegraphPendingAction: null }),
  setLitegraphClipboard: (nodes) => set({ litegraphClipboard: nodes }),
  markLitegraphSaved: (graph) =>
    set((state) => {
      const targetGraph = graph ?? state.litegraphGraph;
      const savedText = serializeGraph(targetGraph);
      return {
        litegraphSavedGraphText: savedText,
        litegraphDirty: serializeGraph(state.litegraphGraph) !== savedText,
      };
    }),
  undoLitegraphHistory: () => {
    const state = get();
    if (state.litegraphHistoryPast.length === 0 || !state.litegraphGraph) return null;
    const currentText = serializeGraph(state.litegraphGraph);
    const previousText = state.litegraphHistoryPast[state.litegraphHistoryPast.length - 1];
    const previousGraph = JSON.parse(previousText) as Record<string, unknown>;
    set({
      litegraphGraph: previousGraph,
      litegraphHistoryPast: state.litegraphHistoryPast.slice(0, -1),
      litegraphHistoryFuture: currentText ? [currentText, ...state.litegraphHistoryFuture].slice(0, 100) : state.litegraphHistoryFuture,
      litegraphDirty: previousText !== state.litegraphSavedGraphText,
    });
    return previousGraph;
  },
  redoLitegraphHistory: () => {
    const state = get();
    if (state.litegraphHistoryFuture.length === 0 || !state.litegraphGraph) return null;
    const currentText = serializeGraph(state.litegraphGraph);
    const nextText = state.litegraphHistoryFuture[0];
    const nextGraph = JSON.parse(nextText) as Record<string, unknown>;
    set({
      litegraphGraph: nextGraph,
      litegraphHistoryPast: currentText ? [...state.litegraphHistoryPast, currentText].slice(-100) : state.litegraphHistoryPast,
      litegraphHistoryFuture: state.litegraphHistoryFuture.slice(1),
      litegraphDirty: nextText !== state.litegraphSavedGraphText,
    });
    return nextGraph;
  },
});

