import type { EditorTab } from "./types";
import { updateWorkspaceFileContent } from "./store-helpers";
import { createEditorTabFromNode, DEFAULT_EDITOR_ACTIVE_IDS, DEFAULT_EDITOR_GROUP_TAB_IDS, findEditorGroupIndex } from "./store-editor-helpers";
import type { EditorSlice, WorkbenchSliceCreator } from "./store-types";

export const createEditorSlice: WorkbenchSliceCreator<EditorSlice> = (set, get) => ({
  diagnosticsByTab: {},
  tabsById: {},
  groupTabIds: DEFAULT_EDITOR_GROUP_TAB_IDS,
  activeIds: DEFAULT_EDITOR_ACTIVE_IDS,
  focusedGroupIndex: 0,
  setTabDiagnostics: (tabId, diagnostics) =>
    set((state) => ({
      diagnosticsByTab: { ...state.diagnosticsByTab, [tabId]: diagnostics },
    })),
  setFocusedGroup: (value) => set({ focusedGroupIndex: value }),
  setActiveTab: (groupIndex, tabId) =>
    set((state) => ({
      activeIds: state.activeIds.map((item, index) => (index === groupIndex ? tabId : item)),
      focusedGroupIndex: groupIndex,
    })),
  openNodeInEditor: (node) => {
    if (node.kind !== "file") return;
    const { groupTabIds, tabsById } = get();
    const existingGroupIndex = findEditorGroupIndex(groupTabIds, node.id);

    if (existingGroupIndex >= 0) {
      set((state) => ({
        tabsById: {
          ...state.tabsById,
          [node.id]: !state.tabsById[node.id]?.dirty
            ? {
                ...state.tabsById[node.id],
                content: node.content ?? state.tabsById[node.id].content,
                language: node.language ?? state.tabsById[node.id].language,
                origin: node.origin ?? state.tabsById[node.id].origin,
              }
            : state.tabsById[node.id],
        },
        activeIds: state.activeIds.map((item, index) => (index === existingGroupIndex ? node.id : item)),
        focusedGroupIndex: existingGroupIndex,
        workspace: node.content ? updateWorkspaceFileContent(state.workspace, node.path, node.content, node.language) : state.workspace,
      }));
      return;
    }

    const nextTab = createEditorTabFromNode(node);
    set((state) => ({
      tabsById: {
        ...state.tabsById,
        [nextTab.id]: nextTab,
      },
      groupTabIds: state.groupTabIds.map((group, index) => (index === 0 ? [...group, nextTab.id] : group)),
      activeIds: state.activeIds.map((item, index) => (index === 0 ? nextTab.id : item)),
      focusedGroupIndex: 0,
      workspace: node.content ? updateWorkspaceFileContent(state.workspace, node.path, node.content, node.language) : state.workspace,
    }));
  },
  closeTab: (groupIndex, tabId) =>
    set((state) => {
      const nextGroupTabIds = state.groupTabIds.map((group, index) => (index === groupIndex ? group.filter((id) => id !== tabId) : group));
      const nextTabsById = { ...state.tabsById };
      delete nextTabsById[tabId];
      const nextDiagnostics = { ...state.diagnosticsByTab };
      delete nextDiagnostics[tabId];
      return {
        tabsById: nextTabsById,
        groupTabIds: nextGroupTabIds,
        diagnosticsByTab: nextDiagnostics,
        activeIds: state.activeIds.map((activeId, index) => {
          if (index !== groupIndex || activeId !== tabId) return activeId;
          return nextGroupTabIds[groupIndex][0] ?? null;
        }),
      };
    }),
  updateTabContent: (groupIndex, tabId, content) =>
    set((state) => {
      const tab = state.tabsById[tabId];
      if (!tab) return {};
      return {
        tabsById: {
          ...state.tabsById,
          [tabId]: { ...tab, content, dirty: true },
        },
        focusedGroupIndex: groupIndex,
        workspace: updateWorkspaceFileContent(state.workspace, tab.path, content, tab.language),
      };
    }),
  markTabSaved: (tabId, content) =>
    set((state) => {
      const tab = state.tabsById[tabId];
      if (!tab) return {};
      const nextContent = content ?? tab.content;
      return {
        tabsById: {
          ...state.tabsById,
          [tabId]: { ...tab, content: nextContent, dirty: false },
        },
        workspace: updateWorkspaceFileContent(state.workspace, tab.path, nextContent, tab.language),
      };
    }),
  moveTabWithinGroup: (groupIndex, direction) =>
    set((state) => {
      const activeId = state.activeIds[groupIndex];
      if (!activeId) return {};
      const group = state.groupTabIds[groupIndex];
      const currentIndex = group.indexOf(activeId);
      if (currentIndex < 0) return {};
      const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= group.length) return {};
      const nextGroup = [...group];
      const [tabId] = nextGroup.splice(currentIndex, 1);
      nextGroup.splice(targetIndex, 0, tabId);
      return {
        groupTabIds: state.groupTabIds.map((item, index) => (index === groupIndex ? nextGroup : item)),
      };
    }),
  moveTabToOtherGroup: (groupIndex) =>
    set((state) => {
      const activeId = state.activeIds[groupIndex];
      if (!activeId) return {};
      const targetGroupIndex = groupIndex === 0 ? 1 : 0;
      const activeTab = state.tabsById[activeId];
      if (!activeTab) return {};

      const nextGroupTabIds = state.groupTabIds.map((group, index) => {
        if (index === groupIndex) return group.filter((tabId) => tabId !== activeId);
        if (index === targetGroupIndex && !group.includes(activeId)) return [...group, activeId];
        return group;
      });

      return {
        groupTabIds: nextGroupTabIds,
        activeIds: state.activeIds.map((id, index) => {
          if (index === groupIndex) return nextGroupTabIds[groupIndex][0] ?? null;
          if (index === targetGroupIndex) return activeId;
          return id;
        }),
        focusedGroupIndex: targetGroupIndex,
      };
    }),
  toggleSplitLayout: (groupIndex) =>
    set((state) => {
      const visibleGroups = state.groupTabIds.map((tabs, index) => ({ tabs, index })).filter((group) => group.tabs.length > 0);
      if (visibleGroups.length <= 1) {
        const activeId = state.activeIds[groupIndex];
        if (!activeId) return {};
        const targetGroupIndex = groupIndex === 0 ? 1 : 0;
        const activeTab = state.tabsById[activeId];
        if (!activeTab) return {};
        const nextGroupTabIds = state.groupTabIds.map((group, index) => {
          if (index === groupIndex) return group.filter((tabId) => tabId !== activeId);
          if (index === targetGroupIndex && !group.includes(activeId)) return [...group, activeId];
          return group;
        });
        return {
          groupTabIds: nextGroupTabIds,
          activeIds: state.activeIds.map((id, index) => {
            if (index === groupIndex) return nextGroupTabIds[groupIndex][0] ?? null;
            if (index === targetGroupIndex) return activeId;
            return id;
          }),
          focusedGroupIndex: targetGroupIndex,
        };
      }

      const targetGroupIndex = groupIndex;
      const sourceGroupIndex = groupIndex === 0 ? 1 : 0;
      const incomingTabIds = state.groupTabIds[sourceGroupIndex];
      if (incomingTabIds.length === 0) return {};

      const nextGroupTabIds = state.groupTabIds.map((group, index) => {
        if (index === targetGroupIndex) {
          const known = new Set(group);
          const merged = [...group];
          incomingTabIds.forEach((tabId) => {
            if (!known.has(tabId)) merged.push(tabId);
          });
          return merged;
        }
        if (index === sourceGroupIndex) return [];
        return group;
      });

      return {
        groupTabIds: nextGroupTabIds,
        activeIds: state.activeIds.map((activeId, index) => {
          if (index === targetGroupIndex) return activeId ?? incomingTabIds[0] ?? null;
          if (index === sourceGroupIndex) return null;
          return activeId;
        }),
        focusedGroupIndex: targetGroupIndex,
      };
    }),
  moveDraggedTab: (targetGroupIndex, targetTabId) =>
    set((state) => {
      if (!state.dragState) return {};
      const { sourceGroupIndex, tabId } = state.dragState;
      const sourceGroup = state.groupTabIds[sourceGroupIndex];
      if (!state.tabsById[tabId] || !sourceGroup.includes(tabId)) return {};

      const sourceWithoutDragged = sourceGroup.filter((id) => id !== tabId);
      const rawTarget = sourceGroupIndex === targetGroupIndex ? sourceWithoutDragged : state.groupTabIds[targetGroupIndex];
      const targetTabs = rawTarget.filter((id) => id !== tabId);
      const insertAt = targetTabId ? targetTabs.findIndex((id) => id === targetTabId) : targetTabs.length;
      const safeIndex = insertAt < 0 ? targetTabs.length : insertAt;
      const nextTargetTabs = [...targetTabs];
      nextTargetTabs.splice(safeIndex, 0, tabId);

      const nextGroupTabIds = state.groupTabIds.map((group, index) => {
        if (index === sourceGroupIndex && index === targetGroupIndex) return nextTargetTabs;
        if (index === sourceGroupIndex) return sourceWithoutDragged;
        if (index === targetGroupIndex) return nextTargetTabs;
        return group;
      });

      return {
        groupTabIds: nextGroupTabIds,
        activeIds: state.activeIds.map((activeId, index) => {
          if (index === targetGroupIndex) return tabId;
          if (index === sourceGroupIndex && sourceGroupIndex !== targetGroupIndex && activeId === tabId) {
            return nextGroupTabIds[sourceGroupIndex][0] ?? null;
          }
          return activeId;
        }),
        focusedGroupIndex: targetGroupIndex,
        dragState: null,
        dropIndicator: null,
      };
    }),
});
