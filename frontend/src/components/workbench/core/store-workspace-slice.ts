import type { TerminalPreferences } from "./types";
import { DEFAULT_EDITOR_ACTIVE_IDS, DEFAULT_EDITOR_GROUP_TAB_IDS, removeEditorTabsByPath, updateEditorTabsForRename } from "./store-editor-helpers";
import { buildWorkspaceIndex, rememberWorkspace, renameWorkspaceNode, removeWorkspaceNode, updateWorkspaceDirectoryChildren } from "./store-helpers";
import { createId } from "./store-helpers";
import type { SessionLevel, WorkbenchSliceCreator, WorkspaceSlice } from "./store-types";

const defaultTerminalPreferences: TerminalPreferences = {
  windowsShell: "powershell",
  sshHost: "",
  sshPort: 22,
  sshUsername: "",
  sshPassword: "",
  sshKeyPath: "",
  sshShell: "/bin/bash -l",
};

export const createWorkspaceSlice: WorkbenchSliceCreator<WorkspaceSlice> = (set) => ({
  workspace: null,
  workspaceIndex: null,
  recentWorkspaces: [],
  terminalPreferences: defaultTerminalPreferences,
  setWorkspace: (workspace) => set({ workspace, workspaceIndex: buildWorkspaceIndex(workspace) }),
  updateWorkspaceDirectory: (path, children) =>
    set((state) => {
      const workspace = updateWorkspaceDirectoryChildren(state.workspace, path, children, state.workspaceIndex);
      return {
        workspace,
        workspaceIndex: buildWorkspaceIndex(workspace),
      };
    }),
  renameWorkspaceNodePath: (oldPath, newPath, newName) =>
    set((state) => {
      const workspace = renameWorkspaceNode(state.workspace, oldPath, newPath, newName);
      return {
        workspace,
        workspaceIndex: buildWorkspaceIndex(workspace),
        tabsById: updateEditorTabsForRename(state.tabsById, oldPath, newPath, newName),
      };
    }),
  removeWorkspaceNodePath: (path) =>
    set((state) => {
      const workspace = removeWorkspaceNode(state.workspace, path);
      const removed = removeEditorTabsByPath(state.tabsById, state.groupTabIds, state.activeIds, path);
      const nextDiagnostics = { ...state.diagnosticsByTab };
      removed.removedTabIds.forEach((tabId) => {
        delete nextDiagnostics[tabId];
      });
      return {
        workspace,
        workspaceIndex: buildWorkspaceIndex(workspace),
        tabsById: removed.tabsById,
        groupTabIds: removed.groupTabIds,
        activeIds: removed.activeIds,
        diagnosticsByTab: nextDiagnostics,
      };
    }),
  setTerminalPreferences: (patch) =>
    set((state) => ({
      terminalPreferences: {
        ...state.terminalPreferences,
        ...patch,
      },
    })),
  resetWorkbenchWithWorkspace: (workspace) =>
    set((state) => {
      const level: SessionLevel = "info";
      const activeBackendProfile = state.backendProfiles.find((item) => item.id === state.activeBackendProfileId) ?? null;
      const recentWorkspaces = workspace
        ? rememberWorkspace(state.recentWorkspaces, workspace, {
            backendProfileId: activeBackendProfile?.id,
            backendProfileName: activeBackendProfile?.name,
          })
        : state.recentWorkspaces;
      const message = workspace
        ? `Opened ${workspace.source === "server" ? "server" : "local"} ${workspace.type}: ${workspace.root_path ?? workspace.name}`
        : "Cleared current workspace.";

      return {
        workspace,
        workspaceIndex: buildWorkspaceIndex(workspace),
        recentWorkspaces,
        sessionEvents: [
          {
            id: createId(),
            message,
            level,
            createdAt: new Date().toISOString(),
          },
          ...state.sessionEvents,
        ].slice(0, 200),
        tabsById: {},
        groupTabIds: DEFAULT_EDITOR_GROUP_TAB_IDS.map((group) => [...group]),
        activeIds: [...DEFAULT_EDITOR_ACTIVE_IDS],
        focusedGroupIndex: 0,
        diagnosticsByTab: {},
        dropIndicator: null,
        dragState: null,
        activeSidebar: "explorer",
        showPrimarySidebar: true,
      };
    }),
});

