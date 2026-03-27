"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore } from "../../core/store";
import { resolveEditorGroups } from "../../core/store-helpers";
import { Panel } from "./panel";
import type { CapabilitiesResponse } from "../../core/api";
import type { TerminalPreferences } from "../../core/types";

export function ExplorerPanelHost({
  capabilities,
  onChangeTerminalPreferences,
  onSessionEvent,
}: {
  capabilities: CapabilitiesResponse | null;
  onChangeTerminalPreferences: (patch: Partial<TerminalPreferences>) => void;
  onSessionEvent?: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  const {
    tabsById,
    groupTabIds,
    activeIds,
    focusedGroupIndex,
    activePanelTab,
    diagnosticsByTab,
    workspace,
    sessionEvents,
    terminalPreferences,
    backendProfiles,
    activeBackendProfileId,
    setActivePanelTab,
  } = useWorkbenchStore(
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
      backendProfiles: state.backendProfiles,
      activeBackendProfileId: state.activeBackendProfileId,
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
  const activeBackendProfile = useMemo(
    () => backendProfiles.find((item) => item.id === activeBackendProfileId) ?? backendProfiles[0] ?? null,
    [activeBackendProfileId, backendProfiles]
  );

  return (
    <Panel
      activeTab={activePanelTab}
      activeEditor={activeEditorTab}
      workspace={workspace}
      diagnostics={diagnostics}
      sessionEvents={sessionEvents}
      terminalPreferences={terminalPreferences}
      capabilities={capabilities}
      activeBackendProfile={activeBackendProfile}
      onChange={setActivePanelTab}
      onChangeTerminalPreferences={onChangeTerminalPreferences}
      onSessionEvent={onSessionEvent}
    />
  );
}
