"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../../core/store";
import { resolveEditorGroups } from "../../core/store-helpers";
import { EditorArea } from "./editor-area";
import type { ActivityRenderContext } from "../../core/activity-types";

export function ExplorerMainAreaHost({
  dragState,
  dropIndicator,
  onSetActiveTab,
  onCloseTab,
  onFocusGroup,
  onMoveTabWithinGroup,
  onToggleSplitLayout,
  onTabDragStart,
  onTabDragEnd,
  onTabDragOver,
  onTabDrop,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onContentChange,
  onValidateTab,
}: Pick<
  ActivityRenderContext,
  | "dragState"
  | "dropIndicator"
  | "onSetActiveTab"
  | "onCloseTab"
  | "onFocusGroup"
  | "onMoveTabWithinGroup"
  | "onToggleSplitLayout"
  | "onTabDragStart"
  | "onTabDragEnd"
  | "onTabDragOver"
  | "onTabDrop"
  | "onGroupDragOver"
  | "onGroupDragLeave"
  | "onGroupDrop"
  | "onContentChange"
  | "onValidateTab"
>) {
  const { tabsById, groupTabIds, activeIds, focusedGroupIndex } = useWorkbenchStore(
    useShallow((state) => ({
      tabsById: state.tabsById,
      groupTabIds: state.groupTabIds,
      activeIds: state.activeIds,
      focusedGroupIndex: state.focusedGroupIndex,
    }))
  );

  const groups = useMemo(() => resolveEditorGroups(tabsById, groupTabIds), [groupTabIds, tabsById]);

  return (
    <EditorArea
      groups={groups}
      activeIds={activeIds}
      focusedGroupIndex={focusedGroupIndex}
      dragState={dragState}
      dropIndicator={dropIndicator}
      onSetActiveTab={onSetActiveTab}
      onCloseTab={onCloseTab}
      onFocusGroup={onFocusGroup}
      onMoveTabWithinGroup={onMoveTabWithinGroup}
      onToggleSplitLayout={onToggleSplitLayout}
      onTabDragStart={onTabDragStart}
      onTabDragEnd={onTabDragEnd}
      onTabDragOver={onTabDragOver}
      onTabDrop={onTabDrop}
      onGroupDragOver={onGroupDragOver}
      onGroupDragLeave={onGroupDragLeave}
      onGroupDrop={onGroupDrop}
      onContentChange={onContentChange}
      onValidateTab={onValidateTab}
    />
  );
}


