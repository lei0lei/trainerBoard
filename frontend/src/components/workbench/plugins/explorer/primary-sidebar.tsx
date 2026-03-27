import { FilePlus2, FolderOpen, FolderPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExplorerTree } from "./explorer-tree";
import type { FileNode, WorkspaceRoot } from "../../core/types";
import type { FileSystemCapabilities } from "./file-system-provider";

export function PrimarySidebar({
  workspace,
  activeFilePath,
  selectedPath,
  expandedPaths,
  scrollTop,
  capabilities,
  onOpenFile,
  onExpandedPathsChange,
  onSelectedPathChange,
  onScrollTopChange,
  onExpandDirectory,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onRefreshNode,
  onOpenFolder,
  onOpenWorkspace,
}: {
  workspace: WorkspaceRoot;
  activeFilePath?: string | null;
  selectedPath?: string | null;
  expandedPaths?: string[];
  scrollTop?: number;
  capabilities?: FileSystemCapabilities | null;
  onOpenFile: (node: FileNode) => Promise<void> | void;
  onExpandedPathsChange: (expandedPaths: string[]) => void;
  onSelectedPathChange: (path: string | null) => void;
  onScrollTopChange: (scrollTop: number) => void;
  onExpandDirectory: (node: FileNode, options?: { force?: boolean }) => Promise<void> | void;
  onCreateFile: (parent: FileNode | NonNullable<WorkspaceRoot>) => Promise<void> | void;
  onCreateFolder: (parent: FileNode | NonNullable<WorkspaceRoot>) => Promise<void> | void;
  onRenameNode: (node: FileNode) => Promise<void> | void;
  onDeleteNode: (node: FileNode) => Promise<void> | void;
  onRefreshNode: (node?: FileNode | WorkspaceRoot | null) => Promise<void> | void;
  onOpenFolder: () => Promise<void> | void;
  onOpenWorkspace: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>EXPLORER</span>
        <span className="truncate text-[#8b8b8b]">{workspace?.name ?? "no folder open"}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
        {!workspace ? (
          <div className="flex h-full flex-col items-start justify-center gap-3 px-3 text-sm text-[#9d9d9d]">
            <FolderOpen className="h-8 w-8 text-[#6f6f6f]" />
            <p className="font-medium text-[#cccccc]">Open a folder or workspace to start exploring.</p>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={onOpenFolder}>
                Open Folder...
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenWorkspace}>
                Open Workspace from Files...
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between px-2 text-[11px] font-semibold tracking-wide text-[#8b8b8b]">
              <span>{workspace.type === "folder" ? "FOLDER" : "WORKSPACE"}</span>
              <div className="flex items-center gap-1">
                <button className="rounded p-1 hover:bg-[#2a2d2e] hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="New file" disabled={!capabilities?.canCreateFile} onClick={() => void onCreateFile(workspace)}>
                  <FilePlus2 className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1 hover:bg-[#2a2d2e] hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="New folder" disabled={!capabilities?.canCreateDirectory} onClick={() => void onCreateFolder(workspace)}>
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1 hover:bg-[#2a2d2e] hover:text-white" title="Refresh" onClick={() => void onRefreshNode(workspace)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ExplorerTree
                key={workspace.id}
                nodes={workspace.children}
                activePath={activeFilePath}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                scrollTop={scrollTop}
                onOpenFile={onOpenFile}
                onExpandedPathsChange={onExpandedPathsChange}
                onSelectedPathChange={onSelectedPathChange}
                onScrollTopChange={onScrollTopChange}
                onExpandDirectory={onExpandDirectory}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRenameNode={onRenameNode}
                onDeleteNode={onDeleteNode}
                onRefreshNode={onRefreshNode}
                capabilities={capabilities}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}


