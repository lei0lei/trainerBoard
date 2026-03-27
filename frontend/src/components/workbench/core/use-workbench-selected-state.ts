import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "./store";
import { resolveEditorGroups } from "./store-helpers";

export function useWorkbenchSelectedState() {
  const layoutState = useWorkbenchStore(
    useShallow((state) => ({
      showPrimarySidebar: state.showPrimarySidebar,
      showSecondarySidebar: state.showSecondarySidebar,
      showPanel: state.showPanel,
      activeSidebar: state.activeSidebar,
      activePanelTab: state.activePanelTab,
      primarySidebarWidth: state.primarySidebarWidth,
      secondarySidebarWidth: state.secondarySidebarWidth,
      panelHeight: state.panelHeight,
      resizeState: state.resizeState,
      dragState: state.dragState,
      dropIndicator: state.dropIndicator,
      explorerUiByWorkspace: state.explorerUiByWorkspace,
    }))
  );

  const connectionState = useWorkbenchStore(
    useShallow((state) => ({
      backendProfiles: state.backendProfiles,
      activeBackendProfileId: state.activeBackendProfileId,
      saveBackendProfile: state.saveBackendProfile,
      removeBackendProfile: state.removeBackendProfile,
      setActiveBackendProfile: state.setActiveBackendProfile,
    }))
  );

  const workspaceState = useWorkbenchStore(
    useShallow((state) => ({
      workspace: state.workspace,
      workspaceIndex: state.workspaceIndex,
      recentWorkspaces: state.recentWorkspaces,
      terminalPreferences: state.terminalPreferences,
      setWorkspace: state.setWorkspace,
      renameWorkspaceNodePath: state.renameWorkspaceNodePath,
      removeWorkspaceNodePath: state.removeWorkspaceNodePath,
      setTerminalPreferences: state.setTerminalPreferences,
      resetWorkbenchWithWorkspace: state.resetWorkbenchWithWorkspace,
    }))
  );

  const editorState = useWorkbenchStore(
    useShallow((state) => ({
      diagnosticsByTab: state.diagnosticsByTab,
      tabsById: state.tabsById,
      groupTabIds: state.groupTabIds,
      activeIds: state.activeIds,
      focusedGroupIndex: state.focusedGroupIndex,
      setTabDiagnostics: state.setTabDiagnostics,
      setFocusedGroup: state.setFocusedGroup,
      setActiveTab: state.setActiveTab,
      openNodeInEditor: state.openNodeInEditor,
      closeTab: state.closeTab,
      updateTabContent: state.updateTabContent,
      markTabSaved: state.markTabSaved,
      moveTabWithinGroup: state.moveTabWithinGroup,
      toggleSplitLayout: state.toggleSplitLayout,
      moveDraggedTab: state.moveDraggedTab,
    }))
  );

  const sessionState = useWorkbenchStore(
    useShallow((state) => ({
      sessionEvents: state.sessionEvents,
      addSessionEvent: state.addSessionEvent,
    }))
  );

  const litegraphState = useWorkbenchStore(
    useShallow((state) => ({
      litegraphGraph: state.litegraphGraph,
      litegraphWorkflowName: state.litegraphWorkflowName,
      litegraphQueue: state.litegraphQueue,
      setLitegraphLatestResult: state.setLitegraphLatestResult,
      setLitegraphQueue: state.setLitegraphQueue,
      markLitegraphSaved: state.markLitegraphSaved,
    }))
  );

  const uiActions = useWorkbenchStore(
    useShallow((state) => ({
      setShowPrimarySidebar: state.setShowPrimarySidebar,
      setShowSecondarySidebar: state.setShowSecondarySidebar,
      setShowPanel: state.setShowPanel,
      setActiveSidebar: state.setActiveSidebar,
      setActivePanelTab: state.setActivePanelTab,
      setPrimarySidebarWidth: state.setPrimarySidebarWidth,
      setSecondarySidebarWidth: state.setSecondarySidebarWidth,
      setPanelHeight: state.setPanelHeight,
      setResizeState: state.setResizeState,
      setDragState: state.setDragState,
      setDropIndicator: state.setDropIndicator,
      setExplorerExpandedPaths: state.setExplorerExpandedPaths,
      setExplorerSelectedPath: state.setExplorerSelectedPath,
      setExplorerScrollTop: state.setExplorerScrollTop,
    }))
  );

  const extensionsState = useWorkbenchStore(
    useShallow((state) => ({
      disabledPluginIds: state.disabledPluginIds,
      extensionSearchQuery: state.extensionSearchQuery,
      extensionCategoryFilter: state.extensionCategoryFilter,
      extensionStatusFilter: state.extensionStatusFilter,
      selectedExtensionId: state.selectedExtensionId,
      enablePlugin: state.enablePlugin,
      disablePlugin: state.disablePlugin,
      togglePluginEnabled: state.togglePluginEnabled,
      setExtensionSearchQuery: state.setExtensionSearchQuery,
      setExtensionCategoryFilter: state.setExtensionCategoryFilter,
      setExtensionStatusFilter: state.setExtensionStatusFilter,
      setSelectedExtensionId: state.setSelectedExtensionId,
    }))
  );

  const groups = useMemo(() => resolveEditorGroups(editorState.tabsById, editorState.groupTabIds), [editorState.groupTabIds, editorState.tabsById]);

  return {
    ...layoutState,
    ...connectionState,
    ...workspaceState,
    ...editorState,
    ...sessionState,
    ...litegraphState,
    ...extensionsState,
    ...uiActions,
    groups,
  };
}

