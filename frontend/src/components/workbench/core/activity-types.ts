import type { ComponentType, DragEvent, ReactNode } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import type { CapabilitiesResponse } from "./api";
import type { WorkbenchCommand } from "./commands";
import type { ExplorerUiState } from "./store-types";
import type { FileSystemCapabilities } from "../explorer";
import type {
  DiagnosticMarker,
  DragState,
  DropIndicator,
  EditorTab,
  FileNode,
  LitegraphQueueItem,
  SidebarKey,
  TerminalPreferences,
  WorkspaceRoot,
} from "./types";

export type ActivityRenderContext = {
  workspace: WorkspaceRoot;
  allOpenEditors: EditorTab[];
  activeEditorTab: EditorTab | null;
  currentSecondaryTab: EditorTab | null;
  groups: EditorTab[][];
  activeIds: (string | null)[];
  focusedGroupIndex: number;
  dragState: DragState;
  dropIndicator: DropIndicator;
  activePanelTab: string;
  diagnostics: DiagnosticMarker[];
  sessionEvents: Array<{ id: string; message: string; level: "info" | "success" | "warning"; createdAt: string }>;
  terminalPreferences: TerminalPreferences;
  capabilities: CapabilitiesResponse | null;
  fileSystemCapabilities: FileSystemCapabilities | null;
  litegraphGraph: Record<string, unknown> | null;
  litegraphWorkflowName: string;
  litegraphQueue: LitegraphQueueItem[];
  explorerUiState: ExplorerUiState | null;
  onOpenFile: (node: FileNode) => Promise<void> | void;
  onExpandDirectory: (node: FileNode, options?: { force?: boolean }) => Promise<void> | void;
  onCreateFile: (parent: FileNode | WorkspaceRoot) => Promise<void> | void;
  onCreateFolder: (parent: FileNode | WorkspaceRoot) => Promise<void> | void;
  onRenameNode: (node: FileNode) => Promise<void> | void;
  onDeleteNode: (node: FileNode) => Promise<void> | void;
  onRefreshNode: (node?: FileNode | WorkspaceRoot | null) => Promise<void> | void;
  onOpenFolder: () => Promise<void> | void;
  onOpenWorkspace: () => void;
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
  onChangePanelTab: (tab: string) => void;
  onChangeTerminalPreferences: (patch: Partial<TerminalPreferences>) => void;
  onSessionEvent: (message: string, level?: "info" | "success" | "warning") => void;
  onSetExplorerExpandedPaths: (expandedPaths: string[]) => void;
  onSetExplorerSelectedPath: (path: string | null) => void;
  onSetExplorerScrollTop: (scrollTop: number) => void;
  onLitegraphSaveWorkflow: () => Promise<void> | void;
  onLitegraphRunWorkflow: () => Promise<void> | void;
  onLitegraphCancelQueueItem: (itemId: string) => Promise<void> | void;
  onLitegraphRetryQueueItem: (itemId: string) => Promise<void> | void;
  onLitegraphClearQueue: (mode: "finished" | "all") => Promise<void> | void;
};

export type ActivityCapabilities = {
  primarySidebar: boolean;
  secondarySidebar: boolean;
  panel: boolean;
};

export type ActivityManifest = {
  key: SidebarKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  capabilities: ActivityCapabilities;
};

export type ActivityContribution = {
  manifest: ActivityManifest;
  getCommands?: (context: ActivityRenderContext) => WorkbenchCommand[];
  renderPrimarySidebar?: (context: ActivityRenderContext) => ReactNode;
  renderMainArea: (context: ActivityRenderContext) => ReactNode;
  renderSecondarySidebar?: (context: ActivityRenderContext) => ReactNode;
  renderPanel?: (context: ActivityRenderContext) => ReactNode;
};
