"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../../core/store";
import { resolveEditorGroups } from "../../core/store-helpers";
import { SecondarySidebar } from "./secondary-sidebar";

export function ExplorerSecondarySidebarHost() {
  const { tabsById, groupTabIds, activeIds, focusedGroupIndex } = useWorkbenchStore(
    useShallow((state) => ({
      tabsById: state.tabsById,
      groupTabIds: state.groupTabIds,
      activeIds: state.activeIds,
      focusedGroupIndex: state.focusedGroupIndex,
    }))
  );

  const groups = useMemo(() => resolveEditorGroups(tabsById, groupTabIds), [groupTabIds, tabsById]);
  const allOpenEditors = useMemo(() => groups.flat(), [groups]);
  const activeEditorTab = useMemo(() => {
    const activeId = activeIds[focusedGroupIndex];
    const focusedGroup = groups[focusedGroupIndex] ?? [];
    return focusedGroup.find((tab) => tab.id === activeId) ?? focusedGroup[0] ?? null;
  }, [activeIds, focusedGroupIndex, groups]);
  const currentSecondaryTab = useMemo(() => {
    if (activeEditorTab) return activeEditorTab;
    const fallbackId = activeIds.find((id) => Boolean(id));
    return (fallbackId ? allOpenEditors.find((tab) => tab.id === fallbackId) : null) ?? null;
  }, [activeEditorTab, activeIds, allOpenEditors]);

  return <SecondarySidebar activeTab={currentSecondaryTab} openEditors={allOpenEditors} />;
}


