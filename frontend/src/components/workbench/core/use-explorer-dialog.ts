"use client";

import { useState } from "react";
import type { FileSystemProvider } from "./file-system-provider";
import { joinPath, parentPathOf } from "./path-utils";
import type { ExplorerDialogMode, ExplorerDialogState } from "./explorer-file-dialog";
import type { FileNode, WorkspaceRoot } from "./types";

type ExplorerDialogRuntimeState = ExplorerDialogState & {
  parent: FileNode | WorkspaceRoot | null;
  node: FileNode | null;
};

export function useExplorerDialog({
  workspace,
  fsProvider,
  resolveParent,
  refreshWorkspaceNode,
  renameWorkspaceNodePath,
  removeWorkspaceNodePath,
  addSessionEvent,
}: {
  workspace: WorkspaceRoot;
  fsProvider: FileSystemProvider | null;
  resolveParent: (parent: FileNode | WorkspaceRoot | null | undefined) => FileNode | null;
  refreshWorkspaceNode: (node?: FileNode | WorkspaceRoot | null) => Promise<void>;
  renameWorkspaceNodePath: (oldPath: string, newPath: string, newName: string) => void;
  removeWorkspaceNodePath: (path: string) => void;
  addSessionEvent: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  const [explorerDialog, setExplorerDialog] = useState<ExplorerDialogRuntimeState | null>(null);

  function openExplorerDialog(mode: ExplorerDialogMode, options: { parent?: FileNode | WorkspaceRoot | null; node?: FileNode | null; value?: string }) {
    const targetLabel = options.node?.path ?? resolveParent(options.parent)?.path ?? workspace?.root_path ?? workspace?.name ?? "";
    const titleByMode: Record<ExplorerDialogMode, string> = {
      "create-file": "New File",
      "create-folder": "New Folder",
      rename: "Rename",
      delete: "Delete",
    };
    const confirmByMode: Record<ExplorerDialogMode, string> = {
      "create-file": "Create File",
      "create-folder": "Create Folder",
      rename: "Rename",
      delete: "Delete",
    };
    const descriptionByMode: Record<ExplorerDialogMode, string> = {
      "create-file": `Create a file inside ${targetLabel}.`,
      "create-folder": `Create a folder inside ${targetLabel}.`,
      rename: `Rename ${targetLabel}.`,
      delete: `This will permanently delete ${targetLabel}.`,
    };

    setExplorerDialog({
      open: true,
      mode,
      title: titleByMode[mode],
      description: descriptionByMode[mode],
      confirmLabel: confirmByMode[mode],
      value: options.value ?? options.node?.name ?? "",
      targetLabel,
      error: null,
      submitting: false,
      parent: options.parent ?? null,
      node: options.node ?? null,
    });
  }

  function closeExplorerDialog() {
    setExplorerDialog((current) => (current?.submitting ? current : null));
  }

  async function submitExplorerDialog() {
    if (!explorerDialog || !workspace) return;

    setExplorerDialog((current) => (current ? { ...current, submitting: true, error: null } : current));

    try {
      if (explorerDialog.mode === "create-file") {
        const parentNode = resolveParent(explorerDialog.parent);
        const name = explorerDialog.value.trim();
        if (!parentNode || !name || !fsProvider) {
          throw new Error("Please enter a file name.");
        }
        const nextPath = joinPath(parentNode.path, name);
        await fsProvider.createFile(parentNode.path, name);
        await refreshWorkspaceNode(parentNode);
        addSessionEvent(`Created file ${nextPath}`, "success");
        setExplorerDialog(null);
        return;
      }

      if (explorerDialog.mode === "create-folder") {
        const parentNode = resolveParent(explorerDialog.parent);
        const name = explorerDialog.value.trim();
        if (!parentNode || !name || !fsProvider) {
          throw new Error("Please enter a folder name.");
        }
        const nextPath = joinPath(parentNode.path, name);
        await fsProvider.createDirectory(parentNode.path, name);
        await refreshWorkspaceNode(parentNode);
        addSessionEvent(`Created folder ${nextPath}`, "success");
        setExplorerDialog(null);
        return;
      }

      if (explorerDialog.mode === "rename") {
        const node = explorerDialog.node;
        const nextName = explorerDialog.value.trim();
        if (!node || !nextName) {
          throw new Error("Please enter a new name.");
        }
        if (nextName === node.name) {
          setExplorerDialog(null);
          return;
        }
        if (!fsProvider) {
          throw new Error("Workspace provider is not available.");
        }
        const payload = await fsProvider.renameNode(node.path, nextName);
        renameWorkspaceNodePath(node.path, payload.path, payload.name ?? nextName);
        await refreshWorkspaceNode({
          kind: "directory",
          id: payload.parent_path ?? parentPathOf(payload.path),
          path: payload.parent_path ?? parentPathOf(payload.path),
          name: payload.parent_path ?? parentPathOf(payload.path),
          origin: fsProvider.source,
        } as FileNode);
        addSessionEvent(`Renamed ${node.path} to ${nextName}`, "success");
        setExplorerDialog(null);
        return;
      }

      if (explorerDialog.mode === "delete") {
        const node = explorerDialog.node;
        if (!node) {
          throw new Error("Nothing selected to delete.");
        }
        if (!fsProvider) {
          throw new Error("Workspace provider is not available.");
        }
        const payload = await fsProvider.deleteNode(node.path);
        removeWorkspaceNodePath(node.path);
        await refreshWorkspaceNode({
          kind: "directory",
          id: payload.parent_path ?? parentPathOf(node.path),
          path: payload.parent_path ?? parentPathOf(node.path),
          name: payload.parent_path ?? parentPathOf(node.path),
          origin: fsProvider.source,
        } as FileNode);
        addSessionEvent(`Deleted ${node.path}`, "success");
        setExplorerDialog(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Explorer operation failed.";
      addSessionEvent(message, "warning");
      setExplorerDialog((current) => (current ? { ...current, submitting: false, error: message } : current));
    }
  }

  return {
    explorerDialog,
    setExplorerDialog,
    closeExplorerDialog,
    submitExplorerDialog,
    openCreateFileDialog: (parent: FileNode | WorkspaceRoot) => openExplorerDialog("create-file", { parent, value: "" }),
    openCreateFolderDialog: (parent: FileNode | WorkspaceRoot) => openExplorerDialog("create-folder", { parent, value: "" }),
    openRenameDialog: (node: FileNode) => openExplorerDialog("rename", { node, value: node.name }),
    openDeleteDialog: (node: FileNode) => openExplorerDialog("delete", { node }),
  };
}

