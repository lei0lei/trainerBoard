"use client";

import { ActivityBar } from "./activity-bar";
import { CommandPalette } from "./command-palette";
import { ConnectionDialog } from "./connection-dialog";
import { ExternalFileChangeDialog } from "./external-file-change-dialog";
import { ExplorerFileDialog } from "./explorer-file-dialog";
import { MenuBar } from "./menu-bar";
import { ResizeHandle } from "./resize-handle";
import { ServerFolderDialog } from "./server-folder-dialog";
import { StatusBar } from "./status-bar";
import type { WorkbenchController } from "./use-workbench-controller";

export function WorkbenchLayout({
  folderInputRef,
  workspaceInputRef,
  serverDialogOpen,
  commandPaletteOpen,
  connectionDialogOpen,
  commandPaletteCommands,
  menuCommands,
  menuNodes,
  explorerDialog,
  externalFileChangeDialog,
  directoryInputProps,
  showPrimarySidebar,
  showSecondarySidebar,
  showPanel,
  primarySidebarWidth,
  secondarySidebarWidth,
  panelHeight,
  activeSidebar,
  activeContribution,
  availableContributions,
  activityContext,
  recentWorkspaces,
  backendProfiles,
  activeBackendProfile,
  backendConnectionState,
  backendConnectionError,
  backendHealth,
  canSaveActiveTab,
  canOpenServerFolder,
  onSelectActivity,
  onTogglePrimarySidebar,
  onToggleSecondarySidebar,
  onTogglePanel,
  onOpenFolder,
  onOpenWorkspace,
  onOpenServerFolder,
  onOpenRecentWorkspace,
  onSave,
  onOpenCommandPalette,
  onCloseCommandPalette,
  onOpenConnectionDialog,
  onCloseConnectionDialog,
  onActivateBackendProfile,
  onDeleteBackendProfile,
  onSaveBackendProfile,
  onTestBackendProfile,
  onCloseExplorerDialog,
  onCloseExternalFileChangeDialog,
  onToggleExternalFileCompare,
  onReloadExternalFile,
  onExplorerDialogValueChange,
  onSubmitExplorerDialog,
  onCloseServerDialog,
  onSelectServerWorkspace,
  onStartPrimaryResize,
  onStartSecondaryResize,
  onStartPanelResize,
  onFolderInputChange,
  onWorkspaceInputChange,
}: WorkbenchController) {
  const supportsPrimarySidebar = activeContribution.manifest.capabilities.primarySidebar;
  const supportsSecondarySidebar = activeContribution.manifest.capabilities.secondarySidebar;
  const supportsPanel = activeContribution.manifest.capabilities.panel;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      <input ref={folderInputRef} type="file" className="hidden" multiple {...directoryInputProps} onChange={(event) => void onFolderInputChange(event)} />
      <input ref={workspaceInputRef} type="file" className="hidden" multiple onChange={(event) => void onWorkspaceInputChange(event)} />

      <MenuBar
        menus={menuNodes}
        commandMap={menuCommands}
        showPrimarySidebar={showPrimarySidebar}
        showPanel={showPanel}
        showSecondarySidebar={showSecondarySidebar}
        onTogglePrimarySidebar={onTogglePrimarySidebar}
        onTogglePanel={onTogglePanel}
        onToggleSecondarySidebar={onToggleSecondarySidebar}
        canTogglePanel={supportsPanel}
        canToggleSecondarySidebar={supportsSecondarySidebar}
      />

      <ServerFolderDialog
        open={serverDialogOpen}
        backendProfile={activeBackendProfile}
        onClose={onCloseServerDialog}
        onSelectWorkspace={onSelectServerWorkspace}
      />
      <ConnectionDialog
        open={connectionDialogOpen}
        profiles={backendProfiles}
        activeProfileId={activeBackendProfile?.id ?? ""}
        connectionState={backendConnectionState}
        connectionError={backendConnectionError}
        currentHealth={backendHealth}
        onClose={onCloseConnectionDialog}
        onActivateProfile={onActivateBackendProfile}
        onSaveProfile={onSaveBackendProfile}
        onDeleteProfile={onDeleteBackendProfile}
        onTestProfile={onTestBackendProfile}
      />
      <ExplorerFileDialog
        dialog={explorerDialog}
        onClose={onCloseExplorerDialog}
        onValueChange={onExplorerDialogValueChange}
        onSubmit={() => void onSubmitExplorerDialog()}
      />
      <ExternalFileChangeDialog
        dialog={externalFileChangeDialog}
        onClose={onCloseExternalFileChangeDialog}
        onCompare={onToggleExternalFileCompare}
        onReload={() => void onReloadExternalFile()}
      />
      <CommandPalette open={commandPaletteOpen} commands={commandPaletteCommands} onClose={onCloseCommandPalette} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          contributions={availableContributions}
          activeSidebar={activeSidebar}
          showPrimarySidebar={showPrimarySidebar}
          onSelect={onSelectActivity}
        />

        {showPrimarySidebar && supportsPrimarySidebar && (
          <>
            <div className="h-full shrink-0 overflow-hidden border-r border-[#2a2d2e]" style={{ width: primarySidebarWidth }}>
              {activeContribution.renderPrimarySidebar?.(activityContext)}
            </div>
            <ResizeHandle orientation="vertical" onMouseDown={(event) => onStartPrimaryResize(event.clientX)} />
          </>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {activeContribution.renderMainArea(activityContext)}

              {showPanel && supportsPanel && (
                <>
                  <ResizeHandle orientation="horizontal" onMouseDown={(event) => onStartPanelResize(event.clientY)} />
                  <div className="shrink-0 overflow-hidden" style={{ height: panelHeight }}>
                    {activeContribution.renderPanel?.(activityContext)}
                  </div>
                </>
              )}
            </div>

            {showSecondarySidebar && supportsSecondarySidebar && (
              <>
                <ResizeHandle orientation="vertical" onMouseDown={(event) => onStartSecondaryResize(event.clientX)} />
                <div className="h-full shrink-0 overflow-hidden border-l border-[#2a2d2e]" style={{ width: secondarySidebarWidth }}>
                  {activeContribution.renderSecondarySidebar?.(activityContext)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <StatusBar
        activeBackendProfile={activeBackendProfile}
        backendConnectionState={backendConnectionState}
        backendConnectionError={backendConnectionError}
        backendHealth={backendHealth}
        onOpenConnections={onOpenConnectionDialog}
      />
    </main>
  );
}

