import type { EditorTab, FileNode } from "./types";

export const DEFAULT_EDITOR_GROUP_TAB_IDS: string[][] = [[], []];
export const DEFAULT_EDITOR_ACTIVE_IDS: (string | null)[] = [null, null];

export function createEditorTabFromNode(node: FileNode): EditorTab {
  return {
    id: node.id,
    title: node.name,
    path: node.path,
    language: node.language ?? "plaintext",
    content: node.content ?? "",
    origin: node.origin ?? "local",
    dirty: false,
  };
}

export function findEditorGroupIndex(groupTabIds: string[][], tabId: string) {
  return groupTabIds.findIndex((group) => group.includes(tabId));
}

export function updateEditorTabsForRename(tabsById: Record<string, EditorTab>, oldPath: string, newPath: string, newName: string) {
  let changed = false;
  const nextTabsById = Object.fromEntries(
    Object.entries(tabsById).map(([tabId, tab]) => {
      if (tab.path === oldPath || tab.path.startsWith(`${oldPath}/`)) {
        changed = true;
        const updatedPath = tab.path === oldPath ? newPath : `${newPath}${tab.path.slice(oldPath.length)}`;
        return [
          tabId,
          {
            ...tab,
            path: updatedPath,
            title: tab.path === oldPath ? newName : tab.title,
          },
        ];
      }
      return [tabId, tab];
    })
  );
  return changed ? nextTabsById : tabsById;
}

export function removeEditorTabsByPath(
  tabsById: Record<string, EditorTab>,
  groupTabIds: string[][],
  activeIds: (string | null)[],
  targetPath: string
) {
  const removedTabIds = Object.values(tabsById)
    .filter((tab) => tab.path === targetPath || tab.path.startsWith(`${targetPath}/`))
    .map((tab) => tab.id);

  if (removedTabIds.length === 0) {
    return {
      tabsById,
      groupTabIds,
      activeIds,
      removedTabIds: [] as string[],
    };
  }

  const removedSet = new Set(removedTabIds);
  const nextTabsById = Object.fromEntries(Object.entries(tabsById).filter(([tabId]) => !removedSet.has(tabId)));
  const nextGroupTabIds = groupTabIds.map((group) => group.filter((tabId) => !removedSet.has(tabId)));
  const nextActiveIds = activeIds.map((activeId, index) => {
    if (!activeId || !removedSet.has(activeId)) return activeId;
    return nextGroupTabIds[index][0] ?? null;
  });

  return {
    tabsById: nextTabsById,
    groupTabIds: nextGroupTabIds,
    activeIds: nextActiveIds,
    removedTabIds,
  };
}

