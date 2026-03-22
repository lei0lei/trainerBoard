import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import type { ActivityContribution } from "../core/activity-types";
import { findNodeByPath, parentPathOf } from "../core/path-utils";

const ExplorerPrimarySidebarHost = dynamic(() => import("./primary-sidebar-host").then((mod) => mod.ExplorerPrimarySidebarHost), { ssr: false });
const ExplorerMainAreaHost = dynamic(() => import("./main-area-host").then((mod) => mod.ExplorerMainAreaHost), { ssr: false });
const ExplorerSecondarySidebarHost = dynamic(() => import("./secondary-sidebar-host").then((mod) => mod.ExplorerSecondarySidebarHost), { ssr: false });
const ExplorerPanelHost = dynamic(() => import("./panel-host").then((mod) => mod.ExplorerPanelHost), { ssr: false });

export const explorerActivity: ActivityContribution = {
  manifest: {
    key: "explorer",
    label: "Explorer",
    icon: FileText,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: true,
      panel: true,
    },
  },
  getCommands: (context) => {
    const activeNode = context.workspace && context.currentSecondaryTab?.path
      ? findNodeByPath(context.workspace.children, context.currentSecondaryTab.path)
      : null;
    const preferredParent =
      !context.workspace
        ? null
        : !activeNode
          ? context.workspace
          : activeNode.kind === "directory"
            ? activeNode
            : findNodeByPath(context.workspace.children, parentPathOf(activeNode.path)) ?? context.workspace;

    return [
      {
        id: "explorer.new-file",
        title: "Explorer: New File",
        section: "Explorer",
        description: preferredParent ? `Create inside ${"kind" in preferredParent ? preferredParent.path : preferredParent.root_path ?? preferredParent.name}` : "No workspace open",
        disabled: !preferredParent || !context.fileSystemCapabilities?.canCreateFile,
        menus: [{ menu: "File", group: "2_open", order: 10 }],
        run: () => {
          if (preferredParent) {
            void context.onCreateFile(preferredParent);
          }
        },
      },
      {
        id: "explorer.new-folder",
        title: "Explorer: New Folder",
        section: "Explorer",
        description: preferredParent ? `Create inside ${"kind" in preferredParent ? preferredParent.path : preferredParent.root_path ?? preferredParent.name}` : "No workspace open",
        disabled: !preferredParent || !context.fileSystemCapabilities?.canCreateDirectory,
        menus: [{ menu: "File", group: "2_open", order: 11 }],
        run: () => {
          if (preferredParent) {
            void context.onCreateFolder(preferredParent);
          }
        },
      },
      {
        id: "explorer.rename",
        title: "Explorer: Rename Active Node",
        section: "Explorer",
        description: activeNode?.path ?? "Open a file from Explorer first",
        disabled: !activeNode || !context.fileSystemCapabilities?.canRename,
        menus: [{ menu: "Edit", group: "1_modify", order: 0 }],
        run: () => {
          if (activeNode) {
            void context.onRenameNode(activeNode);
          }
        },
      },
      {
        id: "explorer.delete",
        title: "Explorer: Delete Active Node",
        section: "Explorer",
        description: activeNode?.path ?? "Open a file from Explorer first",
        disabled: !activeNode || !context.fileSystemCapabilities?.canDelete,
        menus: [{ menu: "Edit", group: "1_modify", order: 1 }],
        run: () => {
          if (activeNode) {
            void context.onDeleteNode(activeNode);
          }
        },
      },
      {
        id: "explorer.refresh",
        title: "Explorer: Refresh",
        section: "Explorer",
        description: context.workspace?.root_path ?? "No workspace open",
        disabled: !context.workspace,
        run: () => void context.onRefreshNode(context.workspace),
      },
    ];
  },
  renderPrimarySidebar: (context) => (
    <ExplorerPrimarySidebarHost
      capabilities={context.fileSystemCapabilities}
      onOpenFile={context.onOpenFile}
      onExpandDirectory={context.onExpandDirectory}
      onCreateFile={context.onCreateFile}
      onCreateFolder={context.onCreateFolder}
      onRenameNode={context.onRenameNode}
      onDeleteNode={context.onDeleteNode}
      onRefreshNode={context.onRefreshNode}
      onOpenFolder={context.onOpenFolder}
      onOpenWorkspace={context.onOpenWorkspace}
    />
  ),
  renderMainArea: (context) => (
    <ExplorerMainAreaHost
      dragState={context.dragState}
      dropIndicator={context.dropIndicator}
      onSetActiveTab={context.onSetActiveTab}
      onCloseTab={context.onCloseTab}
      onFocusGroup={context.onFocusGroup}
      onMoveTabWithinGroup={context.onMoveTabWithinGroup}
      onToggleSplitLayout={context.onToggleSplitLayout}
      onTabDragStart={context.onTabDragStart}
      onTabDragEnd={context.onTabDragEnd}
      onTabDragOver={context.onTabDragOver}
      onTabDrop={context.onTabDrop}
      onGroupDragOver={context.onGroupDragOver}
      onGroupDragLeave={context.onGroupDragLeave}
      onGroupDrop={context.onGroupDrop}
      onContentChange={context.onContentChange}
      onValidateTab={context.onValidateTab}
    />
  ),
  renderSecondarySidebar: () => <ExplorerSecondarySidebarHost />,
  renderPanel: (context) => (
    <ExplorerPanelHost
      capabilities={context.capabilities}
      onChangeTerminalPreferences={context.onChangeTerminalPreferences}
      onSessionEvent={context.onSessionEvent}
    />
  ),
};
