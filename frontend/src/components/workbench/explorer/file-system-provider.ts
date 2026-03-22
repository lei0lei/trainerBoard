import {
  createServerDirectory,
  createServerFile,
  deleteServerNode,
  fetchServerFile,
  fetchServerWorkspace,
  renameServerNode,
  saveServerFile,
} from "../core/api";
import type { FileNode, WorkspaceRoot } from "../core/types";
import {
  canSaveLocalWorkspaceFile,
  createLocalDirectory,
  createLocalFile,
  deleteLocalEntry,
  loadLocalDirectoryChildren,
  readLocalWorkspaceFile,
  renameLocalEntry,
  saveLocalWorkspaceFile,
} from "./file-system";
import { joinPath, parentPathOf } from "../core/path-utils";

export type FileSystemMutationResult = {
  path: string;
  name?: string;
  parent_path?: string;
  old_path?: string;
};

export type FileSystemCapabilities = {
  canRead: boolean;
  canSave: boolean;
  canCreateFile: boolean;
  canCreateDirectory: boolean;
  canRename: boolean;
  canDelete: boolean;
  canDeleteNonEmptyDirectory: boolean;
  canReconnectRecentWorkspace: boolean;
};

export type FileSystemProvider = {
  source: "server" | "local";
  capabilities: FileSystemCapabilities;
  readFile: (node: FileNode) => Promise<{ name: string; content: string; language: string }>;
  readDirectory: (path: string) => Promise<FileNode[]>;
  readWorkspace: (path: string, maxDepth?: number) => Promise<WorkspaceRoot>;
  saveFile: (path: string, content: string) => Promise<void>;
  createFile: (parentPath: string, name: string) => Promise<FileSystemMutationResult>;
  createDirectory: (parentPath: string, name: string) => Promise<FileSystemMutationResult>;
  renameNode: (path: string, nextName: string) => Promise<FileSystemMutationResult>;
  deleteNode: (path: string) => Promise<FileSystemMutationResult>;
  canSaveFile: (path: string) => boolean;
};

const serverProvider: FileSystemProvider = {
  source: "server",
  capabilities: {
    canRead: true,
    canSave: true,
    canCreateFile: true,
    canCreateDirectory: true,
    canRename: true,
    canDelete: true,
    canDeleteNonEmptyDirectory: false,
    canReconnectRecentWorkspace: true,
  },
  readFile: async (node) => fetchServerFile(node.path),
  readDirectory: async (path) => (await fetchServerWorkspace(path, 1))?.children ?? [],
  readWorkspace: async (path, maxDepth = 1) => fetchServerWorkspace(path, maxDepth),
  saveFile: async (path, content) => {
    await saveServerFile(path, content);
  },
  createFile: async (parentPath, name) => createServerFile(joinPath(parentPath, name)),
  createDirectory: async (parentPath, name) => createServerDirectory(joinPath(parentPath, name)),
  renameNode: async (path, nextName) => renameServerNode(path, nextName),
  deleteNode: async (path) => deleteServerNode(path),
  canSaveFile: () => true,
};

const localProvider: FileSystemProvider = {
  source: "local",
  capabilities: {
    canRead: true,
    canSave: true,
    canCreateFile: true,
    canCreateDirectory: true,
    canRename: false,
    canDelete: true,
    canDeleteNonEmptyDirectory: true,
    canReconnectRecentWorkspace: false,
  },
  readFile: async (node) => readLocalWorkspaceFile(node.path),
  readDirectory: async (path) => loadLocalDirectoryChildren(path),
  readWorkspace: async (path) => ({
    id: path,
    name: path.split(/[\\/]/).pop() ?? path,
    type: "folder",
    source: "local",
    root_path: path,
    children: await loadLocalDirectoryChildren(path),
  }),
  saveFile: async (path, content) => {
    await saveLocalWorkspaceFile(path, content);
  },
  createFile: async (parentPath, name) => {
    const file = await createLocalFile(parentPath, name);
    return { path: file.path, name: file.name, parent_path: parentPath };
  },
  createDirectory: async (parentPath, name) => {
    const directory = await createLocalDirectory(parentPath, name);
    return { path: directory.path, name: directory.name, parent_path: parentPath };
  },
  renameNode: async (path, nextName) => {
    await renameLocalEntry();
    return { path, name: nextName, parent_path: parentPathOf(path) };
  },
  deleteNode: async (path) => {
    await deleteLocalEntry(path);
    return { path, parent_path: parentPathOf(path) };
  },
  canSaveFile: (path) => canSaveLocalWorkspaceFile(path),
};

export function getFileSystemProvider(workspace: WorkspaceRoot): FileSystemProvider | null {
  if (!workspace?.source) return null;
  return workspace.source === "server" ? serverProvider : localProvider;
}
