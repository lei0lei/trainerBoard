"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../core/store";
import { resolveEditorGroups } from "../core/store-helpers";
import { PrimarySidebar } from "./primary-sidebar";
import type { FileNode, WorkspaceRoot } from "../core/types";
import type { FileSystemCapabilities } from "./file-system-provider";

const EMPTY_EXPLORER_UI_STATE = {
  expandedPaths: [] as string[],
  selectedPath: null,
  scrollTop: 0,
};

export function ExplorerPrimarySidebarHost({
  capabilities,
  onOpenFile,
  onExpandDirectory,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onRefreshNode,
  onOpenFolder,
  onOpenWorkspace,
}: {
  capabilities: FileSystemCapabilities | null;
  onOpenFile: (node: FileNode) => Promise<void> | void;
  onExpandDirectory: (node: FileNode, options?: { force?: boolean }) => Promise<void> | void;
  onCreateFile: (parent: FileNode | WorkspaceRoot) => Promise<void> | void;
  onCreateFolder: (parent: FileNode | WorkspaceRoot) => Promise<void> | void;
  onRenameNode: (node: FileNode) => Promise<void> | void;
  onDeleteNode: (node: FileNode) => Promise<void> | void;
  onRefreshNode: (node?: FileNode | WorkspaceRoot | null) => Promise<void> | void;
  onOpenFolder: () => Promise<void> | void;
  onOpenWorkspace: () => void;
}) {
  const { workspace, explorerUiByWorkspace, tabsById, groupTabIds, activeIds, focusedGroupIndex, setExplorerExpandedPaths, setExplorerSelectedPath, setExplorerScrollTop } = useWorkbenchStore(
    useShallow((state) => ({
      workspace: state.workspace,
      explorerUiByWorkspace: state.explorerUiByWorkspace,
      tabsById: state.tabsById,
      groupTabIds: state.groupTabIds,
      activeIds: state.activeIds,
      focusedGroupIndex: state.focusedGroupIndex,
      setExplorerExpandedPaths: state.setExplorerExpandedPaths,
      setExplorerSelectedPath: state.setExplorerSelectedPath,
      setExplorerScrollTop: state.setExplorerScrollTop,
    }))
  );

  const groups = useMemo(() => resolveEditorGroups(tabsById, groupTabIds), [groupTabIds, tabsById]);
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

  const workspaceKey = workspace?.root_path ?? workspace?.id ?? "";
  const explorerUiState = workspaceKey ? explorerUiByWorkspace[workspaceKey] ?? EMPTY_EXPLORER_UI_STATE : null;

  return (
    <PrimarySidebar
      activity="explorer"
      workspace={workspace}
      activeFilePath={currentSecondaryTab?.path}
      selectedPath={explorerUiState?.selectedPath ?? currentSecondaryTab?.path}
      expandedPaths={explorerUiState?.expandedPaths ?? []}
      scrollTop={explorerUiState?.scrollTop ?? 0}
      capabilities={capabilities}
      onOpenFile={onOpenFile}
      onExpandedPathsChange={(expandedPaths) => {
        if (workspaceKey) setExplorerExpandedPaths(workspaceKey, expandedPaths);
      }}
      onSelectedPathChange={(path) => {
        if (workspaceKey) setExplorerSelectedPath(workspaceKey, path);
      }}
      onScrollTopChange={(scrollTop) => {
        if (workspaceKey) setExplorerScrollTop(workspaceKey, scrollTop);
      }}
      onExpandDirectory={onExpandDirectory}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
      onRenameNode={onRenameNode}
      onDeleteNode={onDeleteNode}
      onRefreshNode={onRefreshNode}
      onOpenFolder={onOpenFolder}
      onOpenWorkspace={onOpenWorkspace}
    />
  );
}
