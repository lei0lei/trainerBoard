"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../core/store";
import { resolveEditorGroups } from "../core/store-helpers";
import { Panel } from "./panel";
import type { CapabilitiesResponse } from "../core/api";
import type { TerminalPreferences } from "../core/types";

export function ExplorerPanelHost({
  capabilities,
  onChangeTerminalPreferences,
  onSessionEvent,
}: {
  capabilities: CapabilitiesResponse | null;
  onChangeTerminalPreferences: (patch: Partial<TerminalPreferences>) => void;
  onSessionEvent?: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  const { tabsById, groupTabIds, activeIds, focusedGroupIndex, activePanelTab, diagnosticsByTab, workspace, sessionEvents, terminalPreferences, setActivePanelTab } = useWorkbenchStore(
    useShallow((state) => ({
      tabsById: state.tabsById,
      groupTabIds: state.groupTabIds,
      activeIds: state.activeIds,
      focusedGroupIndex: state.focusedGroupIndex,
      activePanelTab: state.activePanelTab,
      diagnosticsByTab: state.diagnosticsByTab,
      workspace: state.workspace,
      sessionEvents: state.sessionEvents,
      terminalPreferences: state.terminalPreferences,
      setActivePanelTab: state.setActivePanelTab,
    }))
  );

  const groups = useMemo(() => resolveEditorGroups(tabsById, groupTabIds), [groupTabIds, tabsById]);
  const activeEditorTab = useMemo(() => {
    const activeId = activeIds[focusedGroupIndex];
    const focusedGroup = groups[focusedGroupIndex] ?? [];
    return focusedGroup.find((tab) => tab.id === activeId) ?? focusedGroup[0] ?? null;
  }, [activeIds, focusedGroupIndex, groups]);
  const diagnostics = activeEditorTab ? diagnosticsByTab[activeEditorTab.id] ?? [] : [];

  return (
    <Panel
      activity="explorer"
      activeTab={activePanelTab}
      activeEditor={activeEditorTab}
      workspace={workspace}
      diagnostics={diagnostics}
      sessionEvents={sessionEvents}
      terminalPreferences={terminalPreferences}
      capabilities={capabilities}
      onChange={setActivePanelTab}
      onChangeTerminalPreferences={onChangeTerminalPreferences}
      onSessionEvent={onSessionEvent}
    />
  );
}
