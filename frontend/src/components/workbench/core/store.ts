"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createEditorSlice } from "./store-editor-slice";
import { createLayoutSlice } from "./store-layout-slice";
import { createLitegraphSlice } from "./store-litegraph-slice";
import { createSessionSlice } from "./store-session-slice";
import { createWorkspaceSlice } from "./store-workspace-slice";
import type { WorkbenchState } from "./store-types";

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (...args) => ({
      ...createLayoutSlice(...args),
      ...createSessionSlice(...args),
      ...createWorkspaceSlice(...args),
      ...createEditorSlice(...args),
      ...createLitegraphSlice(...args),
    }),
    {
      name: "trainerboard-workbench-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        showPrimarySidebar: state.showPrimarySidebar,
        showSecondarySidebar: state.showSecondarySidebar,
        showPanel: state.showPanel,
        activeSidebar: state.activeSidebar,
        activePanelTab: state.activePanelTab,
        primarySidebarWidth: state.primarySidebarWidth,
        secondarySidebarWidth: state.secondarySidebarWidth,
        panelHeight: state.panelHeight,
        explorerUiByWorkspace: state.explorerUiByWorkspace,
        workspace: state.workspace,
        recentWorkspaces: state.recentWorkspaces,
        sessionEvents: state.sessionEvents,
        diagnosticsByTab: state.diagnosticsByTab,
        terminalPreferences: {
          ...state.terminalPreferences,
          sshPassword: "",
        },
        litegraphGraph: state.litegraphGraph,
        litegraphWorkflowName: state.litegraphWorkflowName,
        litegraphWorkflows: state.litegraphWorkflows,
        litegraphQueue: state.litegraphQueue,
        litegraphLatestResult: state.litegraphLatestResult,
        litegraphSelectedNode: state.litegraphSelectedNode,
        litegraphDirty: state.litegraphDirty,
        litegraphSavedGraphText: state.litegraphSavedGraphText,
        tabsById: state.tabsById,
        groupTabIds: state.groupTabIds,
        activeIds: state.activeIds,
        focusedGroupIndex: state.focusedGroupIndex,
      }),
    }
  )
);

export type * from "./store-types";
