"use client";

import { useEffect, useMemo, useRef } from "react";
import { getActivityCommands } from "./activity-registry";
import type { ActivityRenderContext } from "./activity-types";
import { buildCommandMenus, buildKeyboardCombo, findCommandByShortcut, resolveCommands, type WorkbenchResolvedCommand } from "./command-registry";
import type { WorkbenchCommand, WorkbenchMenuNode } from "./commands";
import type { RecentWorkspace } from "./types";

export function useWorkbenchCommandRegistry({
  activityContext,
  activeEditorPath,
  canSaveActiveTab,
  canOpenServerFolder,
  showPrimarySidebar,
  showPanel,
  showSecondarySidebar,
  supportsPanel,
  supportsSecondarySidebar,
  setShowPrimarySidebar,
  setShowPanel,
  setShowSecondarySidebar,
  setServerDialogOpen,
  setCommandPaletteOpen,
  onOpenFolder,
  onOpenWorkspace,
  recentWorkspaces,
  onOpenRecentWorkspace,
  onSave,
}: {
  activityContext: ActivityRenderContext;
  activeEditorPath?: string;
  canSaveActiveTab: boolean;
  canOpenServerFolder: boolean;
  showPrimarySidebar: boolean;
  showPanel: boolean;
  showSecondarySidebar: boolean;
  supportsPanel: boolean;
  supportsSecondarySidebar: boolean;
  setShowPrimarySidebar: (value: boolean) => void;
  setShowPanel: (value: boolean) => void;
  setShowSecondarySidebar: (value: boolean) => void;
  setServerDialogOpen: (value: boolean) => void;
  setCommandPaletteOpen: (value: boolean) => void;
  onOpenFolder: () => Promise<void>;
  onOpenWorkspace: () => void;
  recentWorkspaces: RecentWorkspace[];
  onOpenRecentWorkspace: (workspace: RecentWorkspace) => void;
  onSave: () => Promise<void>;
}) {
  const chordPrefixRef = useRef("");
  const chordTimerRef = useRef<number | null>(null);

  const commands = useMemo<WorkbenchResolvedCommand[]>(() => {
    const globalCommands: WorkbenchCommand[] = [
      {
        id: "workbench.command-palette",
        title: "View: Command Palette...",
        section: "View",
        shortcut: ["Ctrl+Shift+P", "F1"],
        run: () => setCommandPaletteOpen(true),
        menus: [{ menu: "View", group: "0_command", order: 0 }],
      },
      {
        id: "file.save",
        title: "File: Save",
        section: "File",
        shortcut: "Ctrl+S",
        description: activeEditorPath ?? "Save active editor",
        disabled: !canSaveActiveTab,
        run: () => void onSave(),
        menus: [{ menu: "File", group: "1_save", order: 0 }],
      },
      {
        id: "file.open-folder",
        title: "File: Open Folder...",
        section: "File",
        shortcut: "Ctrl+K Ctrl+O",
        run: () => void onOpenFolder(),
        menus: [{ menu: "File", group: "2_open", order: 0 }],
      },
      {
        id: "file.open-workspace",
        title: "File: Open Workspace from Files...",
        section: "File",
        shortcut: "Ctrl+Shift+W",
        run: onOpenWorkspace,
        menus: [{ menu: "File", group: "2_open", order: 1 }],
      },
      {
        id: "file.open-server-folder",
        title: "File: Open Server Folder...",
        section: "File",
        shortcut: "Alt+Shift+O",
        disabled: !canOpenServerFolder,
        run: () => setServerDialogOpen(true),
        menus: [{ menu: "File", group: "2_open", order: 2 }],
      },
      ...recentWorkspaces.map((workspace, index) => ({
        id: `file.open-recent.${workspace.id}`,
        title: `File: Open Recent ${workspace.label}`,
        section: "File",
        description: workspace.path,
        disabled: workspace.source === "local",
        run: () => onOpenRecentWorkspace(workspace),
        menus: [{ menu: "File" as const, group: "3_recent", order: index, submenu: ["Open Recent"] }],
      })),
      {
        id: "view.toggle-primary-sidebar",
        title: `${showPrimarySidebar ? "Hide" : "Show"} Primary Sidebar`,
        section: "View",
        checked: showPrimarySidebar,
        run: () => setShowPrimarySidebar(!showPrimarySidebar),
        menus: [{ menu: "View", group: "1_layout", order: 0 }],
      },
      {
        id: "view.toggle-panel",
        title: `${showPanel ? "Hide" : "Show"} Panel`,
        section: "View",
        disabled: !supportsPanel,
        checked: showPanel && supportsPanel,
        run: () => setShowPanel(!showPanel),
        menus: [{ menu: "View", group: "1_layout", order: 1 }],
      },
      {
        id: "view.toggle-secondary-sidebar",
        title: `${showSecondarySidebar ? "Hide" : "Show"} Secondary Sidebar`,
        section: "View",
        disabled: !supportsSecondarySidebar,
        checked: showSecondarySidebar && supportsSecondarySidebar,
        run: () => setShowSecondarySidebar(!showSecondarySidebar),
        menus: [{ menu: "View", group: "1_layout", order: 2 }],
      },
    ];

    return resolveCommands([...globalCommands, ...getActivityCommands(activityContext)]);
  }, [
    activityContext,
    activeEditorPath,
    canOpenServerFolder,
    canSaveActiveTab,
    onOpenFolder,
    onOpenRecentWorkspace,
    onOpenWorkspace,
    onSave,
    recentWorkspaces,
    setCommandPaletteOpen,
    setServerDialogOpen,
    setShowPanel,
    setShowPrimarySidebar,
    setShowSecondarySidebar,
    showPanel,
    showPrimarySidebar,
    showSecondarySidebar,
    supportsPanel,
    supportsSecondarySidebar,
  ]);

  const menuState = useMemo(() => buildCommandMenus(commands), [commands]);

  useEffect(() => {
    function clearChordPrefix() {
      chordPrefixRef.current = "";
      if (chordTimerRef.current) {
        window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const currentCombo = buildKeyboardCombo(event);
      if (!currentCombo) return;
      const currentSequence = chordPrefixRef.current ? `${chordPrefixRef.current} ${currentCombo}` : currentCombo;
      const exactCommand = findCommandByShortcut(commands, currentSequence);
      if (exactCommand) {
        event.preventDefault();
        clearChordPrefix();
        void Promise.resolve(exactCommand.run()).catch(() => undefined);
        return;
      }

      const hasChordContinuation = commands.some((command) => command.shortcutBindings.some((binding) => binding.startsWith(`${currentSequence} `)));
      if (hasChordContinuation) {
        event.preventDefault();
        chordPrefixRef.current = currentSequence;
        if (chordTimerRef.current) {
          window.clearTimeout(chordTimerRef.current);
        }
        chordTimerRef.current = window.setTimeout(clearChordPrefix, 1200);
        return;
      }

      clearChordPrefix();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearChordPrefix();
    };
  }, [commands]);

  return {
    commands,
    commandMap: menuState.commandMap,
    menus: menuState.menus as Record<string, WorkbenchMenuNode[]>,
  };
}
