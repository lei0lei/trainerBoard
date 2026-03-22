import type { StateCreator } from "zustand";
import type {
  DiagnosticMarker,
  DragState,
  DropIndicator,
  EditorTab,
  FileNode,
  LitegraphNodeSelection,
  LitegraphQueueItem,
  LitegraphWorkflowSummary,
  RecentWorkspace,
  ResizeState,
  SidebarKey,
  TerminalPreferences,
  WorkspaceRoot,
} from "./types";

export type SessionEvent = {
  id: string;
  message: string;
  level: "info" | "success" | "warning";
  createdAt: string;
};

export type SessionLevel = SessionEvent["level"];

export type LitegraphPendingAction =
  | { type: "update-node"; nodeId: number; title?: string | null; properties?: Record<string, string | number | boolean | null> }
  | { type: "delete-node"; nodeId: number }
  | { type: "duplicate-node"; nodeId: number }
  | { type: "load-graph"; graph: Record<string, unknown>; markSaved?: boolean; resetHistory?: boolean; skipHistory?: boolean }
  | null;

export type LitegraphClipboardNode = {
  type: string;
  title?: string | null;
  pos?: [number, number];
  size?: [number, number];
  properties?: Record<string, unknown>;
};

export type ExplorerUiState = {
  expandedPaths: string[];
  selectedPath: string | null;
  scrollTop: number;
};

export type WorkspaceIndex = {
  nodeByPath: Record<string, FileNode>;
  parentByPath: Record<string, string | null>;
  childPathsByPath: Record<string, string[]>;
};

export type LayoutSlice = {
  showPrimarySidebar: boolean;
  showSecondarySidebar: boolean;
  showPanel: boolean;
  activeSidebar: SidebarKey;
  activePanelTab: string;
  primarySidebarWidth: number;
  secondarySidebarWidth: number;
  panelHeight: number;
  resizeState: ResizeState;
  dragState: DragState;
  dropIndicator: DropIndicator;
  explorerUiByWorkspace: Record<string, ExplorerUiState>;
  setShowPrimarySidebar: (value: boolean) => void;
  setShowSecondarySidebar: (value: boolean) => void;
  setShowPanel: (value: boolean) => void;
  setActiveSidebar: (value: SidebarKey) => void;
  setActivePanelTab: (value: string) => void;
  setPrimarySidebarWidth: (value: number) => void;
  setSecondarySidebarWidth: (value: number) => void;
  setPanelHeight: (value: number) => void;
  setResizeState: (value: ResizeState) => void;
  setDragState: (value: DragState) => void;
  setDropIndicator: (value: DropIndicator) => void;
  setExplorerExpandedPaths: (workspaceKey: string, expandedPaths: string[]) => void;
  setExplorerSelectedPath: (workspaceKey: string, selectedPath: string | null) => void;
  setExplorerScrollTop: (workspaceKey: string, scrollTop: number) => void;
};

export type WorkspaceSlice = {
  workspace: WorkspaceRoot;
  workspaceIndex: WorkspaceIndex | null;
  recentWorkspaces: RecentWorkspace[];
  terminalPreferences: TerminalPreferences;
  setWorkspace: (workspace: WorkspaceRoot) => void;
  updateWorkspaceDirectory: (path: string, children: FileNode[]) => void;
  renameWorkspaceNodePath: (oldPath: string, newPath: string, newName: string) => void;
  removeWorkspaceNodePath: (path: string) => void;
  setTerminalPreferences: (patch: Partial<TerminalPreferences>) => void;
  resetWorkbenchWithWorkspace: (workspace: WorkspaceRoot) => void;
};

export type SessionSlice = {
  sessionEvents: SessionEvent[];
  addSessionEvent: (message: string, level?: SessionEvent["level"]) => void;
};

export type EditorSlice = {
  diagnosticsByTab: Record<string, DiagnosticMarker[]>;
  tabsById: Record<string, EditorTab>;
  groupTabIds: string[][];
  activeIds: (string | null)[];
  focusedGroupIndex: number;
  setTabDiagnostics: (tabId: string, diagnostics: DiagnosticMarker[]) => void;
  setFocusedGroup: (value: number) => void;
  setActiveTab: (groupIndex: number, tabId: string) => void;
  openNodeInEditor: (node: FileNode) => void;
  closeTab: (groupIndex: number, tabId: string) => void;
  updateTabContent: (groupIndex: number, tabId: string, content: string) => void;
  markTabSaved: (tabId: string, content?: string) => void;
  moveTabWithinGroup: (groupIndex: number, direction: "left" | "right") => void;
  moveTabToOtherGroup: (groupIndex: number) => void;
  toggleSplitLayout: (groupIndex: number) => void;
  moveDraggedTab: (targetGroupIndex: number, targetTabId?: string) => void;
};

export type LitegraphSlice = {
  litegraphGraph: Record<string, unknown> | null;
  litegraphWorkflowName: string;
  litegraphWorkflows: LitegraphWorkflowSummary[];
  litegraphQueue: LitegraphQueueItem[];
  litegraphLatestResult: LitegraphQueueItem | null;
  litegraphPendingNodeType: string | null;
  litegraphSelectedNode: LitegraphNodeSelection;
  litegraphPendingAction: LitegraphPendingAction;
  litegraphDirty: boolean;
  litegraphSavedGraphText: string | null;
  litegraphHistoryPast: string[];
  litegraphHistoryFuture: string[];
  litegraphClipboard: LitegraphClipboardNode[] | null;
  setLitegraphGraph: (graph: Record<string, unknown>, options?: { resetHistory?: boolean; markSaved?: boolean; skipHistory?: boolean }) => void;
  setLitegraphWorkflowName: (name: string) => void;
  setLitegraphWorkflows: (items: LitegraphWorkflowSummary[]) => void;
  setLitegraphQueue: (items: LitegraphQueueItem[]) => void;
  setLitegraphLatestResult: (item: LitegraphQueueItem | null) => void;
  queueLitegraphNode: (nodeType: string) => void;
  consumeLitegraphNode: () => void;
  setLitegraphSelectedNode: (node: LitegraphNodeSelection) => void;
  queueLitegraphAction: (action: NonNullable<LitegraphPendingAction>) => void;
  consumeLitegraphAction: () => void;
  setLitegraphClipboard: (nodes: LitegraphClipboardNode[] | null) => void;
  markLitegraphSaved: (graph?: Record<string, unknown> | null) => void;
  undoLitegraphHistory: () => Record<string, unknown> | null;
  redoLitegraphHistory: () => Record<string, unknown> | null;
};

export type WorkbenchState = LayoutSlice & WorkspaceSlice & SessionSlice & EditorSlice & LitegraphSlice;
export type WorkbenchSliceCreator<T> = StateCreator<WorkbenchState, [["zustand/persist", unknown]], [], T>;
