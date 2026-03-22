import type { FileNode, WorkspaceRoot } from "../core/types";

const textExtensions = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "md",
  "css",
  "html",
  "txt",
  "py",
  "yml",
  "yaml",
  "toml",
  "env",
]);

function extensionFromName(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "txt" : "txt";
}

const localFileHandleRegistry = new Map<string, FileSystemFileHandle>();
const localDirectoryHandleRegistry = new Map<string, FileSystemDirectoryHandle>();

export function detectLanguage(name: string) {
  const ext = extensionFromName(name);
  const mapping: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    py: "python",
    yml: "yaml",
    yaml: "yaml",
    txt: "plaintext",
  };
  return mapping[ext] ?? "plaintext";
}

async function readTextFile(file: File) {
  const ext = extensionFromName(file.name);
  if (file.size > 1024 * 1024) {
    return `// ${file.name} is larger than 1MB and is not previewed in the browser.`;
  }
  if (!textExtensions.has(ext)) {
    return `// Binary or unsupported preview for ${file.name}`;
  }
  try {
    return await file.text();
  } catch {
    return `// Unable to read ${file.name}`;
  }
}

function clearLocalFileHandleRegistry() {
  localFileHandleRegistry.clear();
  localDirectoryHandleRegistry.clear();
}

function registerLocalFileHandle(path: string, handle: FileSystemFileHandle) {
  localFileHandleRegistry.set(path, handle);
}

function registerLocalDirectoryHandle(path: string, handle: FileSystemDirectoryHandle) {
  localDirectoryHandleRegistry.set(path, handle);
}

export function canSaveLocalWorkspaceFile(path: string) {
  return localFileHandleRegistry.has(path);
}

export async function readLocalWorkspaceFile(path: string) {
  const handle = localFileHandleRegistry.get(path);
  if (!handle) {
    throw new Error(`Local file handle not found for ${path}`);
  }

  const file = await handle.getFile();
  return {
    content: await readTextFile(file),
    language: detectLanguage(file.name),
    name: file.name,
  };
}

export async function saveLocalWorkspaceFile(path: string, content: string) {
  const handle = localFileHandleRegistry.get(path);
  if (!handle) {
    throw new Error(`Local file handle not found for ${path}`);
  }

  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

function parentPathOf(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : normalized;
}

async function directoryHasChildren(handle: FileSystemDirectoryHandle) {
  const directoryHandle = handle as FileSystemDirectoryHandle & {
    entries: () => AsyncIterable<[string, FileSystemHandle]>;
  };

  for await (const _entry of directoryHandle.entries()) {
    return true;
  }

  return false;
}

function sortNodes(nodes: FileNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

async function listDirectoryChildren(handle: FileSystemDirectoryHandle, parentPath: string) {
  const children: FileNode[] = [];
  const directoryHandle = handle as FileSystemDirectoryHandle & {
    entries: () => AsyncIterable<[string, FileSystemHandle]>;
  };

  for await (const [_, entry] of directoryHandle.entries()) {
    const entryPath = `${parentPath}/${entry.name}`;

    if (entry.kind === "directory") {
      const nextDirectoryHandle = entry as FileSystemDirectoryHandle;
      registerLocalDirectoryHandle(entryPath, nextDirectoryHandle);
      children.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        kind: "directory",
        origin: "local",
        hasChildren: await directoryHasChildren(nextDirectoryHandle),
        childrenLoaded: false,
      });
    } else {
      const fileHandle = entry as FileSystemFileHandle;
      registerLocalFileHandle(entryPath, fileHandle);
      children.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        kind: "file",
        origin: "local",
        language: detectLanguage(entry.name),
      });
    }
  }

  return sortNodes(children);
}

export async function buildTreeFromDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<WorkspaceRoot> {
  clearLocalFileHandleRegistry();
  registerLocalDirectoryHandle(handle.name, handle);
  return {
    id: handle.name,
    name: handle.name,
    type: "folder",
    source: "local",
    root_path: handle.name,
    children: await listDirectoryChildren(handle, handle.name),
  };
}

export async function loadLocalDirectoryChildren(path: string): Promise<FileNode[]> {
  const handle = localDirectoryHandleRegistry.get(path);
  if (!handle) {
    throw new Error(`Local directory handle not found for ${path}`);
  }

  return listDirectoryChildren(handle, path);
}

export async function createLocalFile(parentPath: string, name: string) {
  const handle = localDirectoryHandleRegistry.get(parentPath);
  if (!handle) {
    throw new Error(`Local directory handle not found for ${parentPath}`);
  }
  const fileHandle = await handle.getFileHandle(name, { create: true });
  const path = `${parentPath}/${name}`;
  registerLocalFileHandle(path, fileHandle);
  return {
    id: path,
    name,
    path,
    kind: "file" as const,
    origin: "local" as const,
    language: detectLanguage(name),
    content: "",
  };
}

export async function createLocalDirectory(parentPath: string, name: string) {
  const handle = localDirectoryHandleRegistry.get(parentPath);
  if (!handle) {
    throw new Error(`Local directory handle not found for ${parentPath}`);
  }
  const directoryHandle = await handle.getDirectoryHandle(name, { create: true });
  const path = `${parentPath}/${name}`;
  registerLocalDirectoryHandle(path, directoryHandle);
  return {
    id: path,
    name,
    path,
    kind: "directory" as const,
    origin: "local" as const,
    hasChildren: false,
    childrenLoaded: true,
    children: [],
  };
}

export async function deleteLocalEntry(path: string) {
  const parentPath = parentPathOf(path);
  const name = path.slice(parentPath.length + 1);
  const parentHandle = localDirectoryHandleRegistry.get(parentPath);
  if (!parentHandle) {
    throw new Error(`Local directory handle not found for ${parentPath}`);
  }

  await parentHandle.removeEntry(name, { recursive: true });
  localFileHandleRegistry.delete(path);
  localDirectoryHandleRegistry.delete(path);
}

export async function renameLocalEntry() {
  throw new Error("Local rename is not supported in the browser yet. Use server workspace or showDirectoryPicker workflow later.");
}

export async function buildTreeFromFileList(files: FileList, rootName = "workspace"): Promise<WorkspaceRoot> {
  clearLocalFileHandleRegistry();
  const root: NonNullable<WorkspaceRoot> = { id: rootName, name: rootName, type: "workspace", children: [] };
  root.source = "local";
  root.root_path = rootName;

  const ensureDirectory = (segments: string[]) => {
    let current = root.children;
    let currentPath = root.name;

    for (const segment of segments) {
      currentPath = `${currentPath}/${segment}`;
      let next = current.find((node) => node.kind === "directory" && node.name === segment);
      if (!next) {
        next = {
          id: currentPath,
          name: segment,
          path: currentPath,
          kind: "directory",
          children: [],
          hasChildren: true,
          childrenLoaded: true,
        };
        next.origin = "local";
        current.push(next);
      }
      current = next.children ?? [];
    }

    return current;
  };

  for (const file of Array.from(files)) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop() ?? file.name;
    const folder = ensureDirectory(parts);
    folder.push({
      id: `${root.name}/${relativePath}`,
      name: fileName,
      path: `${root.name}/${relativePath}`,
      kind: "file",
      origin: "local",
      content: await readTextFile(file),
      language: detectLanguage(fileName),
    });
  }

  const sortRecursive = (nodes: FileNode[]): FileNode[] =>
    sortNodes(nodes).map((node) =>
      node.kind === "directory"
        ? { ...node, hasChildren: (node.children?.length ?? 0) > 0, childrenLoaded: true, children: sortRecursive(node.children ?? []) }
        : node
    );

  root.children = sortRecursive(root.children);
  return root;
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => (node.kind === "file" ? [node] : flattenFiles(node.children ?? [])));
}
