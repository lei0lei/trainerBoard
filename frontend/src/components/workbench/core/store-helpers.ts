import type { EditorTab, FileNode, RecentWorkspace, WorkspaceRoot } from "./types";
import type { WorkspaceIndex } from "./store-types";

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function rememberWorkspace(
  recent: RecentWorkspace[],
  workspace: WorkspaceRoot,
  options?: { backendProfileId?: string | null; backendProfileName?: string | null }
): RecentWorkspace[] {
  if (!workspace?.root_path || !workspace.source) return recent;

  const backendProfileId = workspace.source === "server" ? options?.backendProfileId ?? null : null;
  const backendProfileName = workspace.source === "server" ? options?.backendProfileName ?? null : null;
  const idParts = [workspace.source, workspace.root_path];
  if (backendProfileId) {
    idParts.push(backendProfileId);
  }

  const item: RecentWorkspace = {
    id: idParts.join(":"),
    label: workspace.name,
    path: workspace.root_path,
    source: workspace.source,
    type: workspace.type,
    backendProfileId,
    backendProfileName,
  };

  return [item, ...recent.filter((entry) => entry.id !== item.id)].slice(0, 12);
}

export function buildWorkspaceIndex(workspace: WorkspaceRoot): WorkspaceIndex | null {
  if (!workspace?.root_path) return null;

  const nodeByPath: Record<string, FileNode> = {};
  const parentByPath: Record<string, string | null> = { [workspace.root_path]: null };
  const childPathsByPath: Record<string, string[]> = {
    [workspace.root_path]: workspace.children.map((node) => node.path),
  };

  const visit = (nodes: FileNode[], parentPath: string) => {
    childPathsByPath[parentPath] = nodes.map((node) => node.path);
    for (const node of nodes) {
      nodeByPath[node.path] = node;
      parentByPath[node.path] = parentPath;
      if (node.kind === "directory") {
        childPathsByPath[node.path] = (node.children ?? []).map((child) => child.path);
        if (node.children?.length) {
          visit(node.children, node.path);
        }
      }
    }
  };

  visit(workspace.children, workspace.root_path);

  return {
    nodeByPath,
    parentByPath,
    childPathsByPath,
  };
}

function mergePatchedChildren(existingIndex: WorkspaceIndex | null, parentPath: string, children: FileNode[]): FileNode[] {
  let changed = false;
  const nextChildren = children.map((child) => {
    const existing = existingIndex?.nodeByPath[child.path];
    if (!existing || existing.kind !== child.kind) {
      changed = true;
      return child;
    }
    if (child.kind === "directory") {
      const nextNode = {
        ...existing,
        ...child,
        children:
          child.childrenLoaded || child.children?.length
            ? mergePatchedChildren(existingIndex, child.path, child.children ?? [])
            : existing.children,
        childrenLoaded: child.childrenLoaded ?? existing.childrenLoaded,
        hasChildren: child.hasChildren ?? existing.hasChildren,
      };
      if (
        nextNode.name !== existing.name ||
        nextNode.children !== existing.children ||
        nextNode.childrenLoaded !== existing.childrenLoaded ||
        nextNode.hasChildren !== existing.hasChildren
      ) {
        changed = true;
      }
      return nextNode;
    }
    const nextNode = {
      ...existing,
      ...child,
      content: child.content ?? existing.content,
      language: child.language ?? existing.language,
    };
    if (
      nextNode.name !== existing.name ||
      nextNode.content !== existing.content ||
      nextNode.language !== existing.language
    ) {
      changed = true;
    }
    return nextNode;
  });
  return changed ? nextChildren : children;
}

export function updateWorkspaceFileContent(workspace: WorkspaceRoot, path: string, content: string, language?: string): WorkspaceRoot {
  if (!workspace) return workspace;

  const updateNodes = (nodes: FileNode[]): [FileNode[], boolean] => {
    let changed = false;
    const nextNodes = nodes.map((node) => {
      if (node.kind === "file" && node.path === path) {
        changed = true;
        return { ...node, content, language: language ?? node.language };
      }
      if (node.kind === "directory" && node.children?.length) {
        const [nextChildren, childChanged] = updateNodes(node.children);
        if (childChanged) {
          changed = true;
          return { ...node, children: nextChildren };
        }
      }
      return node;
    });
    return changed ? [nextNodes, true] : [nodes, false];
  };

  const [nextChildren, changed] = updateNodes(workspace.children);
  return changed ? { ...workspace, children: nextChildren } : workspace;
}

export function updateWorkspaceDirectoryChildren(workspace: WorkspaceRoot, path: string, children: FileNode[], existingIndex?: WorkspaceIndex | null): WorkspaceRoot {
  if (!workspace) return workspace;
  const mergedChildren = mergePatchedChildren(existingIndex ?? buildWorkspaceIndex(workspace), path, children);

  if (workspace.root_path === path) {
    return mergedChildren === workspace.children ? workspace : { ...workspace, children: mergedChildren };
  }

  const updateNodes = (nodes: FileNode[]): [FileNode[], boolean] => {
    let changed = false;
    const nextNodes = nodes.map((node) => {
      if (node.kind === "directory" && node.path === path) {
        changed = true;
        return {
          ...node,
          children: mergedChildren,
          childrenLoaded: true,
          hasChildren: mergedChildren.length > 0,
        };
      }
      if (node.kind === "directory" && node.children?.length) {
        const [nextChildren, childChanged] = updateNodes(node.children);
        if (childChanged) {
          changed = true;
          return { ...node, children: nextChildren };
        }
      }
      return node;
    });
    return changed ? [nextNodes, true] : [nodes, false];
  };

  const [nextChildren, changed] = updateNodes(workspace.children);
  return changed ? { ...workspace, children: nextChildren } : workspace;
}

export function renameWorkspaceNode(workspace: WorkspaceRoot, oldPath: string, newPath: string, newName: string): WorkspaceRoot {
  if (!workspace) return workspace;

  const rewritePath = (currentPath: string) => (currentPath === oldPath ? newPath : currentPath.startsWith(`${oldPath}/`) ? `${newPath}${currentPath.slice(oldPath.length)}` : currentPath);

  const renameNodes = (nodes: FileNode[]): FileNode[] =>
    nodes.map((node) => {
      const rewrittenPath = rewritePath(node.path);
      const rewrittenId = rewritePath(node.id);
      if (node.path === oldPath || node.path.startsWith(`${oldPath}/`)) {
        if (node.kind === "directory") {
          return {
            ...node,
            id: rewrittenId,
            name: node.path === oldPath ? newName : node.name,
            path: rewrittenPath,
            children: renameNodes(node.children ?? []),
          };
        }
        return {
          ...node,
          id: rewrittenId,
          name: node.path === oldPath ? newName : node.name,
          path: rewrittenPath,
        };
      }
      if (node.kind === "directory" && node.children?.length) {
        return { ...node, children: renameNodes(node.children) };
      }
      return node;
    });

  const rootPath = workspace.root_path ? rewritePath(workspace.root_path) : workspace.root_path;
  return {
    ...workspace,
    name: workspace.root_path === oldPath ? newName : workspace.name,
    root_path: rootPath,
    id: workspace.id === oldPath ? newPath : workspace.id,
    children: renameNodes(workspace.children),
  };
}

export function removeWorkspaceNode(workspace: WorkspaceRoot, targetPath: string): WorkspaceRoot {
  if (!workspace) return workspace;

  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    let changed = false;
    const nextNodes = nodes
      .filter((node) => {
        const keep = node.path !== targetPath && !node.path.startsWith(`${targetPath}/`);
        if (!keep) changed = true;
        return keep;
      })
      .map((node) => {
        if (node.kind === "directory" && node.children?.length) {
          const nextChildren = filterNodes(node.children);
          if (nextChildren !== node.children) {
            changed = true;
            return {
              ...node,
              children: nextChildren,
              hasChildren: nextChildren.length > 0,
            };
          }
        }
        return node;
      });

    return changed ? nextNodes : nodes;
  };

  const nextChildren = filterNodes(workspace.children);
  return nextChildren === workspace.children ? workspace : { ...workspace, children: nextChildren };
}

export function resolveEditorGroups(tabsById: Record<string, EditorTab>, groupTabIds: string[][]): EditorTab[][] {
  return groupTabIds.map((group) => group.map((tabId) => tabsById[tabId]).filter((tab): tab is EditorTab => Boolean(tab)));
}

type FileSystemWatchChange = {
  event_type: "created" | "deleted" | "modified" | "moved";
  path: string;
  is_directory: boolean;
  parent_path?: string;
  old_path?: string;
  old_parent_path?: string;
};

function sortFileNodes(nodes: FileNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function baseName(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() ?? path;
}

function upsertWorkspaceNode(workspace: WorkspaceRoot, parentPath: string, node: FileNode): WorkspaceRoot {
  if (!workspace) return workspace;

  const insertChildren = (children: FileNode[]) => {
    const existingIndex = children.findIndex((child) => child.path === node.path);
    const nextChildren = existingIndex >= 0 ? children.map((child, index) => (index === existingIndex ? { ...child, ...node } : child)) : [...children, node];
    return sortFileNodes(nextChildren);
  };

  if (workspace.root_path === parentPath) {
    const nextChildren = insertChildren(workspace.children);
    return nextChildren === workspace.children ? workspace : { ...workspace, children: nextChildren };
  }

  const patchNodes = (nodes: FileNode[]): [FileNode[], boolean] => {
    let changed = false;
    const nextNodes = nodes.map((entry) => {
      if (entry.kind === "directory" && entry.path === parentPath) {
        changed = true;
        return {
          ...entry,
          hasChildren: true,
          children: insertChildren(entry.children ?? []),
          childrenLoaded: true,
        };
      }
      if (entry.kind === "directory" && entry.children?.length) {
        const [nextChildren, childChanged] = patchNodes(entry.children);
        if (childChanged) {
          changed = true;
          return { ...entry, children: nextChildren, hasChildren: nextChildren.length > 0 || entry.hasChildren };
        }
      }
      return entry;
    });
    return changed ? [nextNodes, true] : [nodes, false];
  };

  const [nextChildren, changed] = patchNodes(workspace.children);
  return changed ? { ...workspace, children: nextChildren } : workspace;
}

function markDirectoryHasChildren(workspace: WorkspaceRoot, path: string, hasChildren: boolean): WorkspaceRoot {
  if (!workspace) return workspace;
  if (workspace.root_path === path) return workspace;

  const patchNodes = (nodes: FileNode[]): [FileNode[], boolean] => {
    let changed = false;
    const nextNodes = nodes.map((entry) => {
      if (entry.kind === "directory" && entry.path === path) {
        if (entry.hasChildren === hasChildren) return entry;
        changed = true;
        return { ...entry, hasChildren };
      }
      if (entry.kind === "directory" && entry.children?.length) {
        const [nextChildren, childChanged] = patchNodes(entry.children);
        if (childChanged) {
          changed = true;
          return { ...entry, children: nextChildren };
        }
      }
      return entry;
    });
    return changed ? [nextNodes, true] : [nodes, false];
  };

  const [nextChildren, changed] = patchNodes(workspace.children);
  return changed ? { ...workspace, children: nextChildren } : workspace;
}

export function applyWorkspaceWatchEvents(workspace: WorkspaceRoot, events: FileSystemWatchChange[]): WorkspaceRoot {
  if (!workspace || !workspace.root_path || events.length === 0) return workspace;

  let nextWorkspace: WorkspaceRoot = workspace;
  for (const event of events) {
    if (event.event_type === "created") {
      const parentPath = event.parent_path;
      if (!parentPath) continue;
      nextWorkspace = upsertWorkspaceNode(nextWorkspace, parentPath, {
        id: event.path,
        name: baseName(event.path),
        path: event.path,
        kind: event.is_directory ? "directory" : "file",
        origin: "server",
        hasChildren: event.is_directory ? false : undefined,
        childrenLoaded: event.is_directory ? false : undefined,
        children: event.is_directory ? [] : undefined,
      });
      continue;
    }

    if (event.event_type === "deleted") {
      nextWorkspace = removeWorkspaceNode(nextWorkspace, event.path);
      if (event.parent_path) {
        const reindexed = buildWorkspaceIndex(nextWorkspace);
        const remaining = reindexed?.childPathsByPath[event.parent_path] ?? [];
        nextWorkspace = markDirectoryHasChildren(nextWorkspace, event.parent_path, remaining.length > 0);
      }
      continue;
    }

    if (event.event_type === "moved") {
      const existingIndex = buildWorkspaceIndex(nextWorkspace);
      const oldPath = event.old_path;
      if (oldPath && existingIndex?.nodeByPath[oldPath]) {
        nextWorkspace = renameWorkspaceNode(nextWorkspace, oldPath, event.path, baseName(event.path));
        if (event.old_parent_path) {
          const reindexed = buildWorkspaceIndex(nextWorkspace);
          const remaining = reindexed?.childPathsByPath[event.old_parent_path] ?? [];
          nextWorkspace = markDirectoryHasChildren(nextWorkspace, event.old_parent_path, remaining.length > 0);
        }
        if (event.parent_path) {
          nextWorkspace = markDirectoryHasChildren(nextWorkspace, event.parent_path, true);
        }
      } else if (event.parent_path) {
        nextWorkspace = upsertWorkspaceNode(nextWorkspace, event.parent_path, {
          id: event.path,
          name: baseName(event.path),
          path: event.path,
          kind: event.is_directory ? "directory" : "file",
          origin: "server",
          hasChildren: event.is_directory ? false : undefined,
          childrenLoaded: event.is_directory ? false : undefined,
          children: event.is_directory ? [] : undefined,
        });
      }
      continue;
    }
  }

  return nextWorkspace;
}

