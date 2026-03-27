import type { LayoutSlice, WorkbenchSliceCreator } from "./store-types";

function nextExplorerUiState(current: LayoutSlice["explorerUiByWorkspace"], workspaceKey: string) {
  return current[workspaceKey] ?? { expandedPaths: [], selectedPath: null, scrollTop: 0 };
}

export const createLayoutSlice: WorkbenchSliceCreator<LayoutSlice> = (set) => ({
  showPrimarySidebar: true,
  showSecondarySidebar: true,
  showPanel: true,
  activeSidebar: "explorer",
  activePanelTab: "Terminal",
  primarySidebarWidth: 280,
  secondarySidebarWidth: 300,
  panelHeight: 224,
  resizeState: null,
  dragState: null,
  dropIndicator: null,
  explorerUiByWorkspace: {},
  setShowPrimarySidebar: (value) => set({ showPrimarySidebar: value }),
  setShowSecondarySidebar: (value) => set({ showSecondarySidebar: value }),
  setShowPanel: (value) => set({ showPanel: value }),
  setActiveSidebar: (value) => set({ activeSidebar: value }),
  setActivePanelTab: (value) => set({ activePanelTab: value }),
  setPrimarySidebarWidth: (value) => set({ primarySidebarWidth: value }),
  setSecondarySidebarWidth: (value) => set({ secondarySidebarWidth: value }),
  setPanelHeight: (value) => set({ panelHeight: value }),
  setResizeState: (value) => set({ resizeState: value }),
  setDragState: (value) => set({ dragState: value }),
  setDropIndicator: (value) => set({ dropIndicator: value }),
  setExplorerExpandedPaths: (workspaceKey, expandedPaths) =>
    set((state) => ({
      explorerUiByWorkspace: {
        ...state.explorerUiByWorkspace,
        [workspaceKey]: {
          ...nextExplorerUiState(state.explorerUiByWorkspace, workspaceKey),
          expandedPaths,
        },
      },
    })),
  setExplorerSelectedPath: (workspaceKey, selectedPath) =>
    set((state) => ({
      explorerUiByWorkspace: {
        ...state.explorerUiByWorkspace,
        [workspaceKey]: {
          ...nextExplorerUiState(state.explorerUiByWorkspace, workspaceKey),
          selectedPath,
        },
      },
    })),
  setExplorerScrollTop: (workspaceKey, scrollTop) =>
    set((state) => ({
      explorerUiByWorkspace: {
        ...state.explorerUiByWorkspace,
        [workspaceKey]: {
          ...nextExplorerUiState(state.explorerUiByWorkspace, workspaceKey),
          scrollTop,
        },
      },
    })),
});

