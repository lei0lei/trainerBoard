import type { FileNode } from "./types";

export function parentPathOf(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : normalized;
}

export function joinPath(basePath: string, name: string) {
  const separator = basePath.includes("\\") ? "\\" : "/";
  return `${basePath.replace(/[\\/]$/, "")}${separator}${name}`;
}

export function findNodeByPath(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.kind === "directory" && node.children?.length) {
      const child = findNodeByPath(node.children, targetPath);
      if (child) {
        return child;
      }
    }
  }
  return null;
}
