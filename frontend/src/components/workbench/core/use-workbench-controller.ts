"use client";

import type { ChangeEvent, DragEvent, InputHTMLAttributes, MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  fetchBackendHealth,
  fetchCapabilities,
  fetchServerFile,
  fetchServerWorkspace,
  type FileSystemWatchEvent,
  type CapabilitiesResponse,
  type HealthResponse,
} from "./api";
import {
  activityContributions,
  getActivityContribution,
  getAvailableActivityContributions,
  type ActivityRenderContext,
} from "./activity-registry";
import type { ActivityContribution } from "./activity-types";
import type { WorkbenchResolvedCommand } from "./command-registry";
import type { WorkbenchCommand } from "./commands";
import type { WorkbenchMenuNode } from "./commands";
import type { ExternalFileChangeDialogState } from "./external-file-change-dialog";
import type { ExplorerDialogState } from "./explorer-file-dialog";
import { useWorkbenchLayoutEffects } from "./use-workbench-layout-effects";
import { useWorkbenchCommandRegistry } from "./use-workbench-command-registry";
import { useExplorerDialog } from "./use-explorer-dialog";
import { buildTreeFromDirectoryHandle, buildTreeFromFileList } from "./file-system";
import { buildBackendConnectionProfile } from "./backend-connection";
import { getFileSystemProvider } from "./file-system-provider";
import { parentPathOf } from "./path-utils";
import type { BackendConnectionProfile, FileNode, WorkspaceRoot } from "./types";
import { useWorkbenchStore } from "./store";
import { applyWorkspaceWatchEvents, buildWorkspaceIndex, createId, updateWorkspaceDirectoryChildren } from "./store-helpers";
import { useWorkbenchSelectedState } from "./use-workbench-selected-state";
import { useWorkbenchFsWatch } from "./use-workbench-fs-watch";
import { useWorkbenchLitegraphActions } from "./use-workbench-litegraph-actions";

export const directoryInputProps = { webkitdirectory: "", directory: "" } as unknown as InputHTMLAttributes<HTMLInputElement>;
const EMPTY_EXPLORER_UI_STATE = {
  expandedPaths: [] as string[],
  selectedPath: null,
  scrollTop: 0,
};

export type WorkbenchController = {
  folderInputRef: MutableRefObject<HTMLInputElement | null>;
  workspaceInputRef: MutableRefObject<HTMLInputElement | null>;
  serverDialogOpen: boolean;
  setServerDialogOpen: (value: boolean) => void;
  commandPaletteOpen: boolean;
  commandPaletteCommands: WorkbenchCommand[];
  menuCommands: Map<string, WorkbenchResolvedCommand>;
  menuNodes: Record<string, WorkbenchMenuNode[]>;
  explorerDialog: ExplorerDialogState | null;
  externalFileChangeDialog: ExternalFileChangeDialogState | null;
  setCommandPaletteOpen: (value: boolean) => void;
  directoryInputProps: InputHTMLAttributes<HTMLInputElement>;
  showPrimarySidebar: boolean;
  showSecondarySidebar: boolean;
  showPanel: boolean;
  primarySidebarWidth: number;
  secondarySidebarWidth: number;
  panelHeight: number;
  activeSidebar: ReturnType<typeof useWorkbenchStore.getState>["activeSidebar"];
  activeContribution: ActivityContribution;
  availableContributions: ActivityContribution[];
  activityContext: ActivityRenderContext;
  recentWorkspaces: ReturnType<typeof useWorkbenchStore.getState>["recentWorkspaces"];
  backendProfiles: BackendConnectionProfile[];
  activeBackendProfile: BackendConnectionProfile | null;
  backendConnectionState: "idle" | "connecting" | "connected" | "error";
  backendConnectionError: string | null;
  backendHealth: HealthResponse | null;
  connectionDialogOpen: boolean;
  canSaveActiveTab: boolean;
  canOpenServerFolder: boolean;
  onSelectActivity: (key: ReturnType<typeof useWorkbenchStore.getState>["activeSidebar"]) => void;
  onTogglePrimarySidebar: () => void;
  onToggleSecondarySidebar: () => void;
  onTogglePanel: () => void;
  onOpenFolder: () => Promise<void>;
  onOpenWorkspace: () => void;
  onOpenServerFolder: () => void;
  onOpenRecentWorkspace: (workspaceEntry: ReturnType<typeof useWorkbenchStore.getState>["recentWorkspaces"][number]) => void;
  onSave: () => Promise<void>;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onOpenConnectionDialog: () => void;
  onCloseConnectionDialog: () => void;
  onActivateBackendProfile: (profileId: string) => void;
  onDeleteBackendProfile: (profileId: string) => void;
  onSaveBackendProfile: (draft: {
    id: string | null;
    name: string;
    kind: BackendConnectionProfile["kind"];
    httpBaseUrl: string;
    wsBaseUrl: string;
    description: string;
  }) => string;
  onTestBackendProfile: (draft: {
    id: string | null;
    name: string;
    kind: BackendConnectionProfile["kind"];
    httpBaseUrl: string;
    wsBaseUrl: string;
    description: string;
  }) => Promise<{ health: HealthResponse; capabilities: CapabilitiesResponse }>;
  onCloseExplorerDialog: () => void;
  onCloseExternalFileChangeDialog: () => void;
  onToggleExternalFileCompare: () => void;
  onReloadExternalFile: () => Promise<void>;
  onExplorerDialogValueChange: (value: string) => void;
  onSubmitExplorerDialog: () => Promise<void>;
  onCloseServerDialog: () => void;
  onSelectServerWorkspace: (path: string) => Promise<void>;
  onStartPrimaryResize: (clientX: number) => void;
  onStartSecondaryResize: (clientX: number) => void;
  onStartPanelResize: (clientY: number) => void;
  onFolderInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onWorkspaceInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export function useWorkbenchController(): WorkbenchController {
  const {
    showPrimarySidebar,
    showSecondarySidebar,
    showPanel,
    activeSidebar,
    backendProfiles,
    activeBackendProfileId,
    workspace,
    recentWorkspaces,
    sessionEvents,
    diagnosticsByTab,
    terminalPreferences,
    groups,
    activeIds,
    focusedGroupIndex,
    activePanelTab,
    primarySidebarWidth,
    secondarySidebarWidth,
    panelHeight,
    resizeState,
    dragState,
    dropIndicator,
    explorerUiByWorkspace,
    disabledPluginIds,
    extensionSearchQuery,
    extensionCategoryFilter,
    extensionStatusFilter,
    selectedExtensionId,
    litegraphGraph,
    litegraphWorkflowName,
    litegraphQueue,
    setLitegraphLatestResult,
    setLitegraphQueue,
    setShowPrimarySidebar,
    setShowSecondarySidebar,
    setShowPanel,
    setActiveSidebar,
    saveBackendProfile,
    removeBackendProfile,
    setActiveBackendProfile,
    setWorkspace,
    renameWorkspaceNodePath,
    removeWorkspaceNodePath,
    setTabDiagnostics,
    setTerminalPreferences,
    setFocusedGroup,
    setActivePanelTab,
    setPrimarySidebarWidth,
    setSecondarySidebarWidth,
    setPanelHeight,
    setResizeState,
    setDragState,
    setDropIndicator,
    setExplorerExpandedPaths,
    setExplorerSelectedPath,
    setExplorerScrollTop,
    enablePlugin,
    disablePlugin,
    togglePluginEnabled,
    setExtensionSearchQuery,
    setExtensionCategoryFilter,
    setExtensionStatusFilter,
    setSelectedExtensionId,
    resetWorkbenchWithWorkspace,
    addSessionEvent,
    setActiveTab,
    openNodeInEditor,
    closeTab,
    updateTabContent,
    markTabSaved,
    moveTabWithinGroup,
    toggleSplitLayout,
    moveDraggedTab,
    markLitegraphSaved,
  } = useWorkbenchSelectedState();

  const dragMovedRef = useRef(false);
  const previousBackendProfileIdRef = useRef<string | null>(activeBackendProfileId || null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceInputRef = useRef<HTMLInputElement | null>(null);
  const fsWatchPendingPathsRef = useRef<Set<string>>(new Set());
  const fsWatchRefreshingRef = useRef(false);
  const externalChangeCheckInFlightRef = useRef<Promise<void> | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendConnectionState, setBackendConnectionState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [backendConnectionError, setBackendConnectionError] = useState<string | null>(null);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [externalFileChangeDialog, setExternalFileChangeDialog] = useState<ExternalFileChangeDialogState | null>(null);

  const allOpenEditors = useMemo(() => groups.flat(), [groups]);

  const activeEditorTab = useMemo(() => {
    const activeId = activeIds[focusedGroupIndex];
    const focusedGroup = groups[focusedGroupIndex] ?? [];
    return focusedGroup.find((tab) => tab.id === activeId) ?? focusedGroup[0] ?? null;
  }, [activeIds, focusedGroupIndex, groups]);

  const currentSecondaryTab = useMemo(() => {
    if (activeEditorTab) return activeEditorTab;
    const fallbackId = activeIds.find((id) => Boolean(id));
    return (fallbackId ? groups.flat().find((tab) => tab.id === fallbackId) : null) ?? null;
  }, [activeEditorTab, activeIds, groups]);

  const activeBackendProfile = useMemo(() => backendProfiles.find((item) => item.id === activeBackendProfileId) ?? backendProfiles[0] ?? null, [activeBackendProfileId, backendProfiles]);
  const fsProvider = useMemo(() => getFileSystemProvider(workspace, activeBackendProfile), [activeBackendProfile, workspace]);
  const preferServerFolderDialog = capabilities?.server_file_browser && capabilities.app_env === "linux";
  const canOpenServerFolder = capabilities?.server_file_browser ?? false;
  const canSaveActiveTab =
    !!activeEditorTab &&
    !!fsProvider?.capabilities.canSave &&
    !!fsProvider.canSaveFile(activeEditorTab.path);
  const activeDiagnostics = activeEditorTab ? diagnosticsByTab[activeEditorTab.id] ?? [] : [];
  const availableContributions = useMemo(
    () => getAvailableActivityContributions(disabledPluginIds),
    [disabledPluginIds]
  );
  const activeContribution = getActivityContribution(activeSidebar, availableContributions);
  const supportsSecondarySidebar = activeContribution.manifest.capabilities.secondarySidebar;
  const supportsPanel = activeContribution.manifest.capabilities.panel;
  const workspaceKey = workspace?.root_path ?? workspace?.id ?? "";
  const explorerUiState = workspaceKey ? explorerUiByWorkspace[workspaceKey] ?? EMPTY_EXPLORER_UI_STATE : null;
  const watchedDirectoryPaths = useMemo(() => {
    if (workspace?.source !== "server" || !workspace.root_path) return [];
    return Array.from(new Set([workspace.root_path, ...(explorerUiState?.expandedPaths ?? [])]));
  }, [explorerUiState?.expandedPaths, workspace?.root_path, workspace?.source]);
  const {
    handleSaveLitegraphWorkflow,
    handleRunLitegraphWorkflow,
    handleCancelLitegraphQueue,
    handleRetryLitegraphQueue,
    handleClearLitegraphQueue,
  } = useWorkbenchLitegraphActions({
    backendProfile: activeBackendProfile,
    litegraphGraph,
    litegraphWorkflowName,
    setLitegraphLatestResult,
    setLitegraphQueue,
    markLitegraphSaved,
    addSessionEvent,
  });

  useEffect(() => {
    const previousBackendProfileId = previousBackendProfileIdRef.current;
    const nextBackendProfileId = activeBackendProfile?.id ?? null;

    if (
      previousBackendProfileId &&
      nextBackendProfileId &&
      previousBackendProfileId !== nextBackendProfileId &&
      workspace?.source === "server"
    ) {
      resetWorkbenchWithWorkspace(null);
      addSessionEvent(`Switched backend to ${activeBackendProfile?.name ?? nextBackendProfileId}. Cleared server workspace context.`);
    }

    previousBackendProfileIdRef.current = nextBackendProfileId;
  }, [activeBackendProfile?.id, activeBackendProfile?.name, addSessionEvent, resetWorkbenchWithWorkspace, workspace?.source]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setBackendConnectionState("connecting");
        setBackendConnectionError(null);
        const [nextHealth, nextCapabilities] = await Promise.all([
          fetchBackendHealth(activeBackendProfile),
          fetchCapabilities(activeBackendProfile),
        ]);
        if (cancelled) return;
        setBackendHealth(nextHealth);
        setCapabilities(nextCapabilities);
        setBackendConnectionState("connected");

        if (workspace?.source === "server" && workspace.root_path) {
          const freshWorkspace = await fetchServerWorkspace(workspace.root_path, 1, activeBackendProfile);
          if (!cancelled) {
            setWorkspace(freshWorkspace);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setBackendHealth(null);
          setCapabilities(null);
          setBackendConnectionState("error");
          setBackendConnectionError(error instanceof Error ? error.message : "Failed to connect to backend.");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [activeBackendProfile, setWorkspace, workspace?.root_path, workspace?.source]);

  useWorkbenchLayoutEffects({
    resizeState,
    primarySidebarWidth,
    secondarySidebarWidth,
    panelHeight,
    setPrimarySidebarWidth,
    setSecondarySidebarWidth,
    setPanelHeight,
    setShowPrimarySidebar,
    setShowSecondarySidebar,
    setShowPanel,
    setResizeState,
    showPrimarySidebar,
    showSecondarySidebar,
    showPanel,
  });

  useEffect(() => {
    if (availableContributions.length === 0) return;
    const exists = availableContributions.some((item) => item.manifest.key === activeSidebar);
    if (!exists) {
      const fallback = availableContributions.find((item) => item.manifest.key === "extensions") ?? availableContributions[0];
      if (fallback) {
        setActiveSidebar(fallback.manifest.key);
      }
    }
  }, [activeSidebar, availableContributions, setActiveSidebar]);

  useEffect(() => {
    if (workspaceKey && currentSecondaryTab?.path) {
      setExplorerSelectedPath(workspaceKey, currentSecondaryTab.path);
    }
  }, [currentSecondaryTab?.path, setExplorerSelectedPath, workspaceKey]);

  useEffect(() => {
    setExternalFileChangeDialog((current) => {
      if (!current || !activeEditorTab || current.tabId !== activeEditorTab.id) return current;
      if (activeEditorTab.content === current.externalContent) {
        return null;
      }
      return {
        ...current,
        localContent: activeEditorTab.content,
        dirty: !!activeEditorTab.dirty,
        language: activeEditorTab.language,
      };
    });
  }, [activeEditorTab?.content, activeEditorTab?.dirty, activeEditorTab?.id, activeEditorTab?.language]);

  const refreshWorkspacePaths = useCallback(
    async (paths: string[], source: "manual" | "watch" = "manual") => {
      const currentWorkspace = useWorkbenchStore.getState().workspace;
      const currentProvider = getFileSystemProvider(currentWorkspace, activeBackendProfile);
      if (!currentWorkspace || !currentWorkspace.root_path || !currentProvider) return;

      const targetPaths = Array.from(new Set(paths.filter(Boolean))).sort((left, right) => {
        const leftDepth = left.replace(/\\/g, "/").split("/").filter(Boolean).length;
        const rightDepth = right.replace(/\\/g, "/").split("/").filter(Boolean).length;
        return leftDepth - rightDepth || left.localeCompare(right);
      });

      let nextWorkspace: WorkspaceRoot = currentWorkspace;
      let nextWorkspaceIndex = useWorkbenchStore.getState().workspaceIndex;

      for (const targetPath of targetPaths) {
        if (!nextWorkspace) break;
        if (targetPath !== nextWorkspace.root_path) {
          const targetNode = nextWorkspaceIndex?.nodeByPath[targetPath];
          if (!targetNode || targetNode.kind !== "directory") {
            continue;
          }
        }

        try {
          const children = await currentProvider.readDirectory(targetPath);
          nextWorkspace =
            targetPath === nextWorkspace.root_path
              ? { ...nextWorkspace, children }
              : updateWorkspaceDirectoryChildren(nextWorkspace, targetPath, children, nextWorkspaceIndex);
          nextWorkspaceIndex = buildWorkspaceIndex(nextWorkspace);
        } catch (error) {
          if (source === "manual") {
            addSessionEvent(error instanceof Error ? error.message : "Failed to refresh explorer node.", "warning");
            throw error;
          }
        }
      }

      if (nextWorkspace && nextWorkspace !== currentWorkspace) {
        setWorkspace(nextWorkspace);
      }
    },
    [activeBackendProfile, addSessionEvent, setWorkspace]
  );

  const refreshWorkspaceNode = useCallback(
    async (node?: FileNode | WorkspaceRoot | null) => {
      const target = node ?? workspace;
      if (!target) return;
      const targetPath = "kind" in target ? target.path : target.root_path;
      if (!targetPath) return;
      await refreshWorkspacePaths([targetPath], "manual");
    },
    [refreshWorkspacePaths, workspace]
  );

  const queueWatchedPathRefresh = useCallback(
    (paths: string[]) => {
      for (const path of paths) {
        if (path) {
          fsWatchPendingPathsRef.current.add(path);
        }
      }
      if (fsWatchRefreshingRef.current) return;

      fsWatchRefreshingRef.current = true;
      void (async () => {
        try {
          while (fsWatchPendingPathsRef.current.size > 0) {
            const pendingPaths = Array.from(fsWatchPendingPathsRef.current);
            fsWatchPendingPathsRef.current.clear();
            await refreshWorkspacePaths(pendingPaths, "watch");
          }
        } finally {
          fsWatchRefreshingRef.current = false;
        }
      })();
    },
    [refreshWorkspacePaths]
  );

  const applyIncrementalWatchEvents = useCallback((payload: FileSystemWatchEvent) => {
    if (!payload.events?.length) return;
    const currentWorkspace = useWorkbenchStore.getState().workspace;
    if (currentWorkspace?.source !== "server") return;

    const structuralEvents = payload.events.filter((event) => event.event_type === "created" || event.event_type === "deleted" || event.event_type === "moved");
    if (structuralEvents.length === 0) return;

    const nextWorkspace = applyWorkspaceWatchEvents(currentWorkspace, structuralEvents);
    if (nextWorkspace !== currentWorkspace) {
      setWorkspace(nextWorkspace);
    }
  }, [setWorkspace]);

  const checkActiveEditorForExternalChanges = useCallback(
    (changedPaths: string[]) => {
      if (externalChangeCheckInFlightRef.current) return;

      externalChangeCheckInFlightRef.current = (async () => {
        try {
          const state = useWorkbenchStore.getState();
          const activeId = state.activeIds[state.focusedGroupIndex];
          const activeTab = activeId ? state.tabsById[activeId] ?? null : null;
          const currentWorkspace = state.workspace;
          if (!activeTab || activeTab.origin !== "server" || currentWorkspace?.source !== "server") return;

          const shouldCheck = changedPaths.some((changedPath) => {
            if (!changedPath) return false;
            return (
              changedPath === activeTab.path ||
              changedPath === parentPathOf(activeTab.path) ||
              activeTab.path.startsWith(`${changedPath.replace(/[\\/]$/, "")}/`)
            );
          });
          if (!shouldCheck) return;

          const latestFile = await fetchServerFile(activeTab.path, activeBackendProfile);
          if (latestFile.content === activeTab.content) return;

          setExternalFileChangeDialog((current) => {
            if (current?.path === activeTab.path && current.externalContent === latestFile.content) {
              return current;
            }
            return {
              open: true,
              tabId: activeTab.id,
              path: activeTab.path,
              language: latestFile.language,
              localContent: activeTab.content,
              externalContent: latestFile.content,
              dirty: !!activeTab.dirty,
              compareMode: current?.path === activeTab.path ? current.compareMode : false,
            };
          });
        } catch {
          // ignore deleted/unreadable files during watch refresh
        } finally {
          externalChangeCheckInFlightRef.current = null;
        }
      })();
    },
    [activeBackendProfile]
  );

  useWorkbenchFsWatch({
    enabled: workspace?.source === "server",
    rootPath: workspace?.root_path,
    watchedPaths: watchedDirectoryPaths,
    backendProfile: activeBackendProfile,
    onEvent: useCallback(
      (payload: FileSystemWatchEvent) => {
        applyIncrementalWatchEvents(payload);
      },
      [applyIncrementalWatchEvents]
    ),
    onChanged: useCallback(
      (payload, changedPaths) => {
        const structuralRefreshPaths = Array.from(
          new Set(
            (payload.events ?? []).flatMap((event) => {
              if (event.event_type === "modified") {
                return [];
              }
              return [
                event.parent_path,
                event.old_parent_path,
                event.is_directory && event.event_type !== "deleted" ? event.path : undefined,
              ].filter((path): path is string => Boolean(path));
            })
          )
        );

        if (structuralRefreshPaths.length > 0) {
          queueWatchedPathRefresh(structuralRefreshPaths);
        } else if (!payload.events?.length) {
          queueWatchedPathRefresh(changedPaths);
        }
        checkActiveEditorForExternalChanges(changedPaths);
      },
      [checkActiveEditorForExternalChanges, queueWatchedPathRefresh]
    ),
  });

  function resolveParent(parent: FileNode | WorkspaceRoot | null | undefined) {
    if (!parent) return null;
    if ("kind" in parent) {
      return parent.kind === "directory" ? parent : null;
    }
    return parent.root_path ? ({ kind: "directory", path: parent.root_path, id: parent.id, name: parent.name, origin: parent.source } as FileNode) : null;
  }

  const {
    explorerDialog,
    setExplorerDialog,
    closeExplorerDialog,
    submitExplorerDialog,
    openCreateFileDialog,
    openCreateFolderDialog,
    openRenameDialog,
    openDeleteDialog,
  } = useExplorerDialog({
    workspace,
    fsProvider,
    resolveParent,
    refreshWorkspaceNode,
    renameWorkspaceNodePath,
    removeWorkspaceNodePath,
    addSessionEvent,
  });

  function handleActivityClick(next: typeof activeSidebar) {
    const nextContribution = getActivityContribution(next, availableContributions);
    const nextLayout = nextContribution.manifest.defaultLayout;
    const supportsPrimarySidebar = nextContribution.manifest.capabilities.primarySidebar;
    const supportsSecondarySidebar = nextContribution.manifest.capabilities.secondarySidebar;
    const supportsPanel = nextContribution.manifest.capabilities.panel;

    if (activeSidebar === next && supportsPrimarySidebar && showPrimarySidebar) {
      setShowPrimarySidebar(false);
      return;
    }

    setActiveSidebar(next);
    setShowPrimarySidebar(supportsPrimarySidebar ? (nextLayout?.showPrimarySidebar ?? true) : false);
    setShowSecondarySidebar(supportsSecondarySidebar ? (nextLayout?.showSecondarySidebar ?? true) : false);
    setShowPanel(supportsPanel ? (nextLayout?.showPanel ?? true) : false);

    if (nextLayout?.primarySidebarWidth) {
      setPrimarySidebarWidth(nextLayout.primarySidebarWidth);
    }
    if (nextLayout?.secondarySidebarWidth) {
      setSecondarySidebarWidth(nextLayout.secondarySidebarWidth);
    }
    if (nextLayout?.panelHeight) {
      setPanelHeight(nextLayout.panelHeight);
    }
    if (nextLayout?.activePanelTab) {
      setActivePanelTab(nextLayout.activePanelTab);
    }
  }

  async function handleOpenFile(node: FileNode) {
    try {
      if (node.kind !== "file") return;

      if (fsProvider && (node.origin === "server" || (node.origin === "local" && !node.content && fsProvider.canSaveFile(node.path)))) {
        const nextFile = await fsProvider.readFile(node);
        openNodeInEditor({
          ...node,
          name: nextFile.name,
          content: nextFile.content,
          language: nextFile.language,
          origin: fsProvider.source,
        });
        if (workspaceKey) {
          setExplorerSelectedPath(workspaceKey, node.path);
        }
        addSessionEvent(`Opened ${fsProvider.source} file ${node.path}`);
        return;
      }

      openNodeInEditor(node);
      if (workspaceKey) {
        setExplorerSelectedPath(workspaceKey, node.path);
      }
      addSessionEvent(`Opened file ${node.path}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to open file.");
    }
  }

  async function handleExpandDirectory(node: FileNode) {
    if (node.kind !== "directory" || !node.path) return;

    try {
      await refreshWorkspacePaths([node.path], "manual");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to expand directory.");
    }
  }

  function handleSetActiveTab(groupIndex: number, tabId: string) {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setActiveTab(groupIndex, tabId);
  }

  function handleMoveDraggedTab(targetGroupIndex: number, targetTabId?: string) {
    moveDraggedTab(targetGroupIndex, targetTabId);
    dragMovedRef.current = true;
  }

  function updateDropIndicatorFromTab(event: DragEvent<HTMLButtonElement>, groupIndex: number, tabId: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const edge = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
    setDropIndicator({ groupIndex, tabId, edge });
  }

  function handleTabDrop(event: DragEvent<HTMLButtonElement>, groupIndex: number, tabId: string) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const edge = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
    const tabs = groups[groupIndex];
    const targetIndex = tabs.findIndex((tab) => tab.id === tabId);
    const targetTabId = edge === "after" ? tabs[targetIndex + 1]?.id : tabId;
    handleMoveDraggedTab(groupIndex, targetTabId);
  }

  async function openFolder() {
    if (preferServerFolderDialog) {
      setServerDialogOpen(true);
      return;
    }

    try {
      const pickerWindow = window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> };
      if (pickerWindow.showDirectoryPicker) {
        const handle = await pickerWindow.showDirectoryPicker();
        const nextWorkspace = await buildTreeFromDirectoryHandle(handle);
        resetWorkbenchWithWorkspace(nextWorkspace);
        return;
      }
    } catch {
      if (canOpenServerFolder) {
        setServerDialogOpen(true);
        return;
      }
    }

    folderInputRef.current?.click();
  }

  function openWorkspace() {
    workspaceInputRef.current?.click();
  }

  async function handleFolderInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const rootName = files[0].webkitRelativePath?.split("/")[0] || "folder";
    const nextWorkspace = await buildTreeFromFileList(files, rootName);
    if (nextWorkspace) {
      resetWorkbenchWithWorkspace({ ...nextWorkspace, type: "folder" });
    }
    event.target.value = "";
  }

  async function handleWorkspaceInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const nextWorkspace = await buildTreeFromFileList(files, "workspace");
    if (nextWorkspace) {
      resetWorkbenchWithWorkspace(nextWorkspace);
    }
    event.target.value = "";
  }

  async function handleOpenServerWorkspace(path: string, backendProfile = activeBackendProfile) {
    try {
      if (!backendProfile) {
        throw new Error("No backend profile selected.");
      }
      if (backendProfile.id !== activeBackendProfile?.id) {
        setActiveBackendProfile(backendProfile.id);
      }
      const nextWorkspace = await fetchServerWorkspace(path, 1, backendProfile);
      resetWorkbenchWithWorkspace(nextWorkspace);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to open server folder.");
      throw error;
    }
  }

  async function handleOpenRecentWorkspaceEntry(
    workspaceEntry: ReturnType<typeof useWorkbenchStore.getState>["recentWorkspaces"][number]
  ) {
    if (workspaceEntry.source !== "server") {
      window.alert("Local recent folders cannot be reopened automatically in the browser. Please choose Open Folder again.");
      return;
    }

    const targetBackendProfile =
      (workspaceEntry.backendProfileId
        ? backendProfiles.find((item) => item.id === workspaceEntry.backendProfileId)
        : null) ?? activeBackendProfile;

    if (!targetBackendProfile) {
      window.alert("The backend profile used by this workspace is no longer available.");
      return;
    }

    await handleOpenServerWorkspace(workspaceEntry.path, targetBackendProfile);
  }

  async function handleSave() {
    if (!activeEditorTab || !fsProvider) return;

    try {
      if (!fsProvider.canSaveFile(activeEditorTab.path)) {
        return;
      }
      await fsProvider.saveFile(activeEditorTab.path, activeEditorTab.content);
      markTabSaved(activeEditorTab.id, activeEditorTab.content);
      addSessionEvent(`Saved ${fsProvider.source} file ${activeEditorTab.path}`, "success");
    } catch (error) {
      addSessionEvent(`Failed to save ${activeEditorTab.path}`, "warning");
      window.alert(error instanceof Error ? error.message : "Failed to save file.");
    }
  }

  function closeExternalFileChangeDialog() {
    setExternalFileChangeDialog(null);
  }

  function toggleExternalFileCompare() {
    setExternalFileChangeDialog((current) => (current ? { ...current, compareMode: !current.compareMode } : current));
  }

  async function reloadExternalFile() {
    const dialog = externalFileChangeDialog;
    if (!dialog) return;
    markTabSaved(dialog.tabId, dialog.externalContent);
    addSessionEvent(`Reloaded externally changed file ${dialog.path}`, "success");
    setExternalFileChangeDialog(null);
  }

  function saveBackendProfileDraft(draft: {
    id: string | null;
    name: string;
    kind: BackendConnectionProfile["kind"];
    httpBaseUrl: string;
    wsBaseUrl: string;
    description: string;
  }) {
    const profileId = draft.id ?? createId();
    const nextProfile = buildBackendConnectionProfile({
      id: profileId,
      name: draft.name,
      kind: draft.kind,
      httpBaseUrl: draft.httpBaseUrl,
      wsBaseUrl: draft.wsBaseUrl,
      description: draft.description,
    });
    saveBackendProfile(nextProfile);
    return profileId;
  }

  async function testBackendProfileDraft(draft: {
    id: string | null;
    name: string;
    kind: BackendConnectionProfile["kind"];
    httpBaseUrl: string;
    wsBaseUrl: string;
    description: string;
  }) {
    const profile = buildBackendConnectionProfile({
      id: draft.id ?? "preview-profile",
      name: draft.name,
      kind: draft.kind,
      httpBaseUrl: draft.httpBaseUrl,
      wsBaseUrl: draft.wsBaseUrl,
      description: draft.description,
    });
    const [health, nextCapabilities] = await Promise.all([
      fetchBackendHealth(profile),
      fetchCapabilities(profile),
    ]);
    return { health, capabilities: nextCapabilities };
  }

  function handleValidateTab(tabId: string, markers: MonacoEditor.IMarker[]) {
    setTabDiagnostics(
      tabId,
      markers.map((marker) => ({
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
        message: marker.message,
        severity: marker.severity,
        code: typeof marker.code === "string" ? marker.code : marker.code?.value,
        source: marker.source,
      }))
    );
  }

  const activityContext = useMemo<ActivityRenderContext>(
    () => ({
      plugins: activityContributions,
      availablePlugins: availableContributions,
      activePlugin: activeContribution,
      disabledPluginIds,
      extensionSearchQuery,
      extensionCategoryFilter,
      extensionStatusFilter,
      selectedExtensionId,
      backendProfiles,
      activeBackendProfile,
      backendConnectionState,
      backendConnectionError,
      backendHealth,
      workspace,
      allOpenEditors,
      activeEditorTab,
      currentSecondaryTab,
      groups,
      activeIds,
      focusedGroupIndex,
      dragState,
      dropIndicator,
      activePanelTab,
      diagnostics: activeDiagnostics,
      sessionEvents,
      terminalPreferences,
      capabilities,
      fileSystemCapabilities: fsProvider?.capabilities ?? null,
      litegraphGraph,
      litegraphWorkflowName,
      litegraphQueue,
      explorerUiState,
      onOpenFile: handleOpenFile,
      onExpandDirectory: handleExpandDirectory,
      onCreateFile: openCreateFileDialog,
      onCreateFolder: openCreateFolderDialog,
      onRenameNode: openRenameDialog,
      onDeleteNode: openDeleteDialog,
      onRefreshNode: refreshWorkspaceNode,
      onOpenFolder: openFolder,
      onOpenWorkspace: openWorkspace,
      onActivatePlugin: handleActivityClick,
      onActivateBackendProfile: setActiveBackendProfile,
      onSetActiveTab: handleSetActiveTab,
      onCloseTab: closeTab,
      onFocusGroup: setFocusedGroup,
      onMoveTabWithinGroup: moveTabWithinGroup,
      onToggleSplitLayout: toggleSplitLayout,
      onTabDragStart: (groupIndex, tabId) => setDragState({ sourceGroupIndex: groupIndex, tabId }),
      onTabDragEnd: () => {
        setDragState(null);
        setDropIndicator(null);
      },
      onTabDragOver: updateDropIndicatorFromTab,
      onTabDrop: handleTabDrop,
      onGroupDragOver: (event, groupIndex) => {
        event.preventDefault();
        setDropIndicator({ groupIndex, edge: "group" });
      },
      onGroupDragLeave: (event, groupIndex) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          if (dropIndicator?.groupIndex === groupIndex && dropIndicator.edge === "group") {
            setDropIndicator(null);
          }
        }
      },
      onGroupDrop: handleMoveDraggedTab,
      onContentChange: updateTabContent,
      onValidateTab: handleValidateTab,
      onChangePanelTab: setActivePanelTab,
      onChangeTerminalPreferences: setTerminalPreferences,
      onSessionEvent: addSessionEvent,
      onSetExplorerExpandedPaths: (expandedPaths) => {
        if (workspaceKey) {
          setExplorerExpandedPaths(workspaceKey, expandedPaths);
        }
      },
      onSetExplorerSelectedPath: (path) => {
        if (workspaceKey) {
          setExplorerSelectedPath(workspaceKey, path);
        }
      },
      onSetExplorerScrollTop: (scrollTop) => {
        if (workspaceKey) {
          setExplorerScrollTop(workspaceKey, scrollTop);
        }
      },
      onEnablePlugin: enablePlugin,
      onDisablePlugin: disablePlugin,
      onTogglePluginEnabled: togglePluginEnabled,
      onSetExtensionSearchQuery: setExtensionSearchQuery,
      onSetExtensionCategoryFilter: setExtensionCategoryFilter,
      onSetExtensionStatusFilter: setExtensionStatusFilter,
      onSetSelectedExtensionId: setSelectedExtensionId,
      onLitegraphSaveWorkflow: handleSaveLitegraphWorkflow,
      onLitegraphRunWorkflow: handleRunLitegraphWorkflow,
      onLitegraphCancelQueueItem: handleCancelLitegraphQueue,
      onLitegraphRetryQueueItem: handleRetryLitegraphQueue,
      onLitegraphClearQueue: handleClearLitegraphQueue,
    }),
    [
      workspace,
      allOpenEditors,
      activeEditorTab,
      currentSecondaryTab,
      groups,
      activeIds,
      focusedGroupIndex,
      dragState,
      dropIndicator,
      activePanelTab,
      availableContributions,
      backendProfiles,
      activeBackendProfile,
      backendConnectionState,
      backendConnectionError,
      backendHealth,
      disabledPluginIds,
      extensionSearchQuery,
      extensionCategoryFilter,
      extensionStatusFilter,
      selectedExtensionId,
      activeDiagnostics,
      sessionEvents,
      terminalPreferences,
      capabilities,
      fsProvider,
      litegraphGraph,
      litegraphWorkflowName,
      litegraphQueue,
      explorerUiState,
      handleOpenFile,
      handleExpandDirectory,
      openCreateFileDialog,
      openCreateFolderDialog,
      openRenameDialog,
      openDeleteDialog,
      refreshWorkspaceNode,
      openFolder,
      openWorkspace,
      handleActivityClick,
      setActiveBackendProfile,
      handleSetActiveTab,
      updateDropIndicatorFromTab,
      handleTabDrop,
      handleMoveDraggedTab,
      handleValidateTab,
      handleSaveLitegraphWorkflow,
      handleRunLitegraphWorkflow,
      handleCancelLitegraphQueue,
      handleRetryLitegraphQueue,
      handleClearLitegraphQueue,
      closeTab,
      moveTabWithinGroup,
      toggleSplitLayout,
      updateTabContent,
      setActivePanelTab,
      setTerminalPreferences,
      addSessionEvent,
      setExplorerExpandedPaths,
      setExplorerSelectedPath,
      setExplorerScrollTop,
      enablePlugin,
      disablePlugin,
      togglePluginEnabled,
      setExtensionSearchQuery,
      setExtensionCategoryFilter,
      setExtensionStatusFilter,
      setSelectedExtensionId,
      workspaceKey,
      activeContribution,
    ]
  );

  const { commands: commandPaletteCommands, commandMap: menuCommands, menus: menuNodes } = useWorkbenchCommandRegistry({
    activityContext,
    activeEditorPath: activeEditorTab?.path,
    canSaveActiveTab,
    canOpenServerFolder,
    showPrimarySidebar,
    showPanel,
    showSecondarySidebar,
    supportsPanel,
    supportsSecondarySidebar,
    setShowPrimarySidebar,
    setShowPanel,
    setShowSecondarySidebar,
    setServerDialogOpen,
    setCommandPaletteOpen,
    onOpenFolder: openFolder,
    onOpenWorkspace: openWorkspace,
    recentWorkspaces,
    onOpenRecentWorkspace: (workspaceEntry) => {
      void handleOpenRecentWorkspaceEntry(workspaceEntry);
    },
    onSave: handleSave,
  });

  return {
    folderInputRef,
    workspaceInputRef,
    serverDialogOpen,
    setServerDialogOpen,
    commandPaletteOpen,
    connectionDialogOpen,
    commandPaletteCommands,
    menuCommands,
    menuNodes,
    explorerDialog,
    externalFileChangeDialog,
    setCommandPaletteOpen,
    directoryInputProps,
    showPrimarySidebar,
    showSecondarySidebar,
    showPanel,
    primarySidebarWidth,
    secondarySidebarWidth,
    panelHeight,
    activeSidebar,
    activeContribution,
    availableContributions,
    activityContext,
    recentWorkspaces,
    backendProfiles,
    activeBackendProfile,
    backendConnectionState,
    backendConnectionError,
    backendHealth,
    canSaveActiveTab,
    canOpenServerFolder,
    onSelectActivity: handleActivityClick,
    onTogglePrimarySidebar: () => setShowPrimarySidebar(!showPrimarySidebar),
    onToggleSecondarySidebar: () => setShowSecondarySidebar(!showSecondarySidebar),
    onTogglePanel: () => setShowPanel(!showPanel),
    onOpenFolder: openFolder,
    onOpenWorkspace: openWorkspace,
    onOpenServerFolder: () => setServerDialogOpen(true),
    onOpenRecentWorkspace: (workspaceEntry) => {
      void handleOpenRecentWorkspaceEntry(workspaceEntry);
    },
    onSave: handleSave,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onCloseCommandPalette: () => setCommandPaletteOpen(false),
    onOpenConnectionDialog: () => setConnectionDialogOpen(true),
    onCloseConnectionDialog: () => setConnectionDialogOpen(false),
    onActivateBackendProfile: (profileId) => setActiveBackendProfile(profileId),
    onDeleteBackendProfile: (profileId) => removeBackendProfile(profileId),
    onSaveBackendProfile: saveBackendProfileDraft,
    onTestBackendProfile: testBackendProfileDraft,
    onCloseExplorerDialog: closeExplorerDialog,
    onCloseExternalFileChangeDialog: closeExternalFileChangeDialog,
    onToggleExternalFileCompare: toggleExternalFileCompare,
    onReloadExternalFile: reloadExternalFile,
    onExplorerDialogValueChange: (value) =>
      setExplorerDialog((current) => (current ? { ...current, value, error: null } : current)),
    onSubmitExplorerDialog: submitExplorerDialog,
    onCloseServerDialog: () => setServerDialogOpen(false),
    onSelectServerWorkspace: handleOpenServerWorkspace,
    onStartPrimaryResize: (clientX) => setResizeState({ type: "primary", startX: clientX, startSize: primarySidebarWidth }),
    onStartSecondaryResize: (clientX) => setResizeState({ type: "secondary", startX: clientX, startSize: secondarySidebarWidth }),
    onStartPanelResize: (clientY) => setResizeState({ type: "panel", startY: clientY, startSize: panelHeight }),
    onFolderInputChange: handleFolderInput,
    onWorkspaceInputChange: handleWorkspaceInput,
  };
}

