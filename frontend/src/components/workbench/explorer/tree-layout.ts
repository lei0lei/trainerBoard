export const EXPLORER_TREE_LAYOUT = {
  rowHeight: 28,
  overscanRows: 10,
  directoryBasePadding: 8,
  fileBasePadding: 28,
  depthIndent: 12,
  chevronSize: 14,
  iconSize: 16,
  contextMenuMaxWidth: 240,
  contextMenuMaxHeight: 220,
} as const;

export function getExplorerNodePaddingLeft(kind: "directory" | "file", depth: number) {
  return kind === "directory"
    ? EXPLORER_TREE_LAYOUT.directoryBasePadding + depth * EXPLORER_TREE_LAYOUT.depthIndent
    : EXPLORER_TREE_LAYOUT.fileBasePadding + depth * EXPLORER_TREE_LAYOUT.depthIndent;
}
