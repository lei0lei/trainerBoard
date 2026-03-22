"use client";

import { ChevronDown, ChevronRight, Copy, File, FolderClosed, FolderOpen, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FileNode } from "../core/types";
import type { FileSystemCapabilities } from "./file-system-provider";
import { EXPLORER_TREE_LAYOUT, getExplorerNodePaddingLeft } from "./tree-layout";

const EMPTY_EXPANDED_PATHS: string[] = [];

type ExpandOptions = { force?: boolean };

type ContextMenuState = {
  node: FileNode;
  x: number;
  y: number;
};

type ExplorerTreeProps = {
  nodes: FileNode[];
  activePath?: string | null;
  selectedPath?: string | null;
  expandedPaths?: string[];
  scrollTop?: number;
  onOpenFile: (node: FileNode) => void;
  onExpandedPathsChange?: (expandedPaths: string[]) => void;
  onSelectedPathChange?: (path: string | null) => void;
  onScrollTopChange?: (scrollTop: number) => void;
  onExpandDirectory?: (node: FileNode, options?: ExpandOptions) => Promise<void> | void;
  onCreateFile?: (parent: FileNode) => Promise<void> | void;
  onCreateFolder?: (parent: FileNode) => Promise<void> | void;
  onRenameNode?: (node: FileNode) => Promise<void> | void;
  onDeleteNode?: (node: FileNode) => Promise<void> | void;
  onRefreshNode?: (node: FileNode) => Promise<void> | void;
  capabilities?: FileSystemCapabilities | null;
};

type ExplorerTreeRowProps = {
  node: FileNode;
  depth: number;
  top: number;
  rowHeight: number;
  activePath?: string | null;
  selectedPath?: string | null;
  isExpanded: boolean;
  isLoading: boolean;
  onToggle: (node: FileNode) => void | Promise<void>;
  onOpenFile: (node: FileNode) => void;
  onSelectNode?: (path: string | null) => void;
  onOpenContextMenu: (node: FileNode, x: number, y: number) => void;
};

type FlatExplorerNode = {
  node: FileNode;
  depth: number;
};

type CachedFlatNode = {
  node: FileNode;
  depthOffset: number;
};

type FlatNodeCacheEntry = {
  expanded: boolean;
  childrenRef?: FileNode[];
  items: CachedFlatNode[];
};

function flattenNodeWithCache(
  node: FileNode,
  expandedIds: Set<string>,
  cache: WeakMap<FileNode, FlatNodeCacheEntry>
): CachedFlatNode[] {
  const isExpanded = node.kind === "directory" && expandedIds.has(node.id);
  const cached = cache.get(node);
  if (cached && cached.expanded === isExpanded && cached.childrenRef === node.children) {
    return cached.items;
  }

  let items: CachedFlatNode[];
  if (node.kind !== "directory" || !isExpanded || !node.children?.length) {
    items = [{ node, depthOffset: 0 }];
  } else {
    items = [{ node, depthOffset: 0 }];
    for (const child of node.children) {
      const childItems = flattenNodeWithCache(child, expandedIds, cache);
      for (const childItem of childItems) {
        items.push({ node: childItem.node, depthOffset: childItem.depthOffset + 1 });
      }
    }
  }

  cache.set(node, {
    expanded: isExpanded,
    childrenRef: node.children,
    items,
  });
  return items;
}

function flattenVisibleNodes(
  nodes: FileNode[],
  expandedIds: Set<string>,
  cache: WeakMap<FileNode, FlatNodeCacheEntry>
): FlatExplorerNode[] {
  const items: FlatExplorerNode[] = [];
  for (const node of nodes) {
    const cachedItems = flattenNodeWithCache(node, expandedIds, cache);
    for (const cachedItem of cachedItems) {
      items.push({
        node: cachedItem.node,
        depth: cachedItem.depthOffset,
      });
    }
  }
  return items;
}

function pathDepth(path: string) {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).length;
}

const ExplorerTreeRow = memo(function ExplorerTreeRow({
  node,
  depth,
  top,
  rowHeight,
  activePath,
  selectedPath,
  isExpanded,
  isLoading,
  onToggle,
  onOpenFile,
  onSelectNode,
  onOpenContextMenu,
}: ExplorerTreeRowProps) {
  const isSelected = (selectedPath ?? activePath) === node.path;
  const baseClassName = cn(
    "flex h-full w-full min-w-0 items-center gap-1 rounded px-2 text-left text-sm text-[#cccccc] hover:bg-[#2a2d2e]",
    isSelected && "bg-[#37373d]"
  );

  if (node.kind === "directory") {
    const showChevron = node.hasChildren ?? ((node.children?.length ?? 0) > 0);

    return (
      <div className="absolute left-0 right-0" style={{ top, height: rowHeight }}>
        <button
          className={baseClassName}
          style={{ paddingLeft: getExplorerNodePaddingLeft("directory", depth) }}
          onClick={() => {
            onSelectNode?.(node.path);
            void onToggle(node);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            onOpenContextMenu(node, event.clientX, event.clientY);
          }}
        >
          {isLoading ? (
            <LoaderCircle className="shrink-0 animate-spin text-[#8b8b8b]" style={{ width: EXPLORER_TREE_LAYOUT.chevronSize, height: EXPLORER_TREE_LAYOUT.chevronSize }} />
          ) : showChevron ? (
            isExpanded ? (
              <ChevronDown className="shrink-0 text-[#8b8b8b]" style={{ width: EXPLORER_TREE_LAYOUT.chevronSize, height: EXPLORER_TREE_LAYOUT.chevronSize }} />
            ) : (
              <ChevronRight className="shrink-0 text-[#8b8b8b]" style={{ width: EXPLORER_TREE_LAYOUT.chevronSize, height: EXPLORER_TREE_LAYOUT.chevronSize }} />
            )
          ) : (
            <span className="shrink-0" style={{ width: EXPLORER_TREE_LAYOUT.chevronSize, height: EXPLORER_TREE_LAYOUT.chevronSize }} />
          )}
          {isExpanded ? (
            <FolderOpen className="shrink-0 text-[#dcb67a]" style={{ width: EXPLORER_TREE_LAYOUT.iconSize, height: EXPLORER_TREE_LAYOUT.iconSize }} />
          ) : (
            <FolderClosed className="shrink-0 text-[#dcb67a]" style={{ width: EXPLORER_TREE_LAYOUT.iconSize, height: EXPLORER_TREE_LAYOUT.iconSize }} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0" style={{ top, height: rowHeight }}>
      <button
        className={cn(baseClassName, "gap-2")}
        style={{ paddingLeft: getExplorerNodePaddingLeft("file", depth) }}
        onClick={() => {
          onSelectNode?.(node.path);
          onOpenFile(node);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenContextMenu(node, event.clientX, event.clientY);
        }}
      >
        <File className="shrink-0 text-[#8b8b8b]" style={{ width: EXPLORER_TREE_LAYOUT.iconSize, height: EXPLORER_TREE_LAYOUT.iconSize }} />
        <span className="truncate">{node.name}</span>
      </button>
    </div>
  );
},
(prev, next) =>
  prev.node === next.node &&
  prev.depth === next.depth &&
  prev.top === next.top &&
  prev.rowHeight === next.rowHeight &&
  prev.activePath === next.activePath &&
  prev.selectedPath === next.selectedPath &&
  prev.isExpanded === next.isExpanded &&
  prev.isLoading === next.isLoading &&
  prev.onToggle === next.onToggle &&
  prev.onOpenFile === next.onOpenFile &&
  prev.onSelectNode === next.onSelectNode
);

export function ExplorerTree({
  nodes,
  activePath,
  selectedPath,
  expandedPaths,
  scrollTop,
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
  capabilities,
}: ExplorerTreeProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [internalScrollTop, setInternalScrollTop] = useState(scrollTop ?? 0);
  const normalizedExpandedPaths = expandedPaths ?? EMPTY_EXPANDED_PATHS;
  const expandedIds = useMemo(() => new Set(normalizedExpandedPaths), [normalizedExpandedPaths]);
  const expandedIdsRef = useRef(expandedIds);
  const loadingIdsRef = useRef(loadingIds);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  expandedIdsRef.current = expandedIds;
  loadingIdsRef.current = loadingIds;

  useEffect(() => {
    setInternalScrollTop(scrollTop ?? 0);
    const element = scrollContainerRef.current;
    if (element && Math.abs(element.scrollTop - (scrollTop ?? 0)) > 1) {
      element.scrollTop = scrollTop ?? 0;
    }
  }, [scrollTop]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      setViewportHeight(element?.clientHeight ?? 0);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextHeight = entries[0]?.contentRect.height ?? element.clientHeight;
      setViewportHeight(nextHeight);
    });
    observer.observe(element);
    setViewportHeight(element.clientHeight);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  const expandDirectory = useCallback(
    async (node: FileNode, options?: ExpandOptions) => {
      if (node.kind !== "directory") return;
      const shouldLoad = (options?.force || !node.childrenLoaded) && node.hasChildren && onExpandDirectory;
      if (!shouldLoad) return;

      setLoadingIds((current) => new Set(current).add(node.id));
      try {
        await onExpandDirectory(node, options);
      } finally {
        setLoadingIds((current) => {
          const next = new Set(current);
          next.delete(node.id);
          return next;
        });
      }
    },
    [onExpandDirectory]
  );

  const onToggle = useCallback(
    async (node: FileNode) => {
      if (node.kind !== "directory") return;
      const isOpen = expandedIdsRef.current.has(node.path);

      if (!isOpen) {
        await expandDirectory(node);
      }

      const next = new Set(expandedIdsRef.current);
      if (next.has(node.path)) next.delete(node.path);
      else next.add(node.path);
      onExpandedPathsChange?.([...next].sort((left, right) => pathDepth(left) - pathDepth(right) || left.localeCompare(right)));
    },
    [expandDirectory, onExpandedPathsChange]
  );

  const openContextMenu = useCallback((node: FileNode, x: number, y: number) => setContextMenu({ node, x, y }), []);
  const isExpandedById = useCallback((path: string) => expandedIdsRef.current.has(path), []);
  const isLoadingById = useCallback((id: string) => loadingIdsRef.current.has(id), []);

  const flatNodes = useMemo(() => flattenVisibleNodes(nodes, expandedIds, new WeakMap<FileNode, FlatNodeCacheEntry>()), [expandedIds, nodes]);
  const totalHeight = flatNodes.length * EXPLORER_TREE_LAYOUT.rowHeight;
  const startIndex = Math.max(0, Math.floor(internalScrollTop / EXPLORER_TREE_LAYOUT.rowHeight) - EXPLORER_TREE_LAYOUT.overscanRows);
  const endIndex = Math.min(
    flatNodes.length,
    Math.ceil((internalScrollTop + Math.max(viewportHeight, EXPLORER_TREE_LAYOUT.rowHeight)) / EXPLORER_TREE_LAYOUT.rowHeight) + EXPLORER_TREE_LAYOUT.overscanRows
  );
  const visibleNodes = flatNodes.slice(startIndex, endIndex);

  const viewport = useMemo(
    () => ({
      width: typeof window !== "undefined" ? window.innerWidth : 1024,
      height: typeof window !== "undefined" ? window.innerHeight : 768,
    }),
    [contextMenu]
  );

  async function copyPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overflow-x-hidden"
        onScroll={(event) => {
          const nextScrollTop = event.currentTarget.scrollTop;
          setInternalScrollTop(nextScrollTop);
          onScrollTopChange?.(nextScrollTop);
          if (contextMenu) {
            setContextMenu(null);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {flatNodes.length === 0 ? (
          <div className="px-2 py-2 text-sm text-[#8b8b8b]">Empty folder</div>
        ) : (
          <div className="relative min-w-0" style={{ height: totalHeight }}>
            {visibleNodes.map(({ node, depth }, index) => {
              const itemIndex = startIndex + index;
              return (
                <ExplorerTreeRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  top={itemIndex * EXPLORER_TREE_LAYOUT.rowHeight}
                  rowHeight={EXPLORER_TREE_LAYOUT.rowHeight}
                  activePath={activePath}
                  selectedPath={selectedPath}
                  isExpanded={isExpandedById(node.path)}
                  isLoading={isLoadingById(node.id)}
                  onToggle={onToggle}
                  onOpenFile={onOpenFile}
                  onSelectNode={onSelectedPathChange}
                  onOpenContextMenu={openContextMenu}
                />
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-52 rounded-md border border-[#3c3c3c] bg-[#252526] p-1 shadow-2xl"
          style={{
            left: Math.min(contextMenu.x, viewport.width - EXPLORER_TREE_LAYOUT.contextMenuMaxWidth),
            top: Math.min(contextMenu.y, viewport.height - EXPLORER_TREE_LAYOUT.contextMenuMaxHeight),
          }}
        >
          {contextMenu.node.kind === "file" ? (
            <>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]"
                onClick={() => {
                  onSelectedPathChange?.(contextMenu.node.path);
                  onOpenFile(contextMenu.node);
                  setContextMenu(null);
                }}
              >
                <File className="h-4 w-4" />
                Open
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]"
                onClick={() => {
                  void copyPath(contextMenu.node.path);
                  setContextMenu(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Copy Path
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onRenameNode?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canRename}
              >
                <RefreshCw className="h-4 w-4" />
                Rename
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#ffb4b4] hover:bg-[#5a1d1d] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onDeleteNode?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]"
                onClick={() => {
                  onSelectedPathChange?.(contextMenu.node.path);
                  void onToggle(contextMenu.node);
                  setContextMenu(null);
                }}
              >
                {expandedIds.has(contextMenu.node.path) ? <FolderClosed className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                {expandedIds.has(contextMenu.node.path) ? "Collapse" : "Expand"}
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]"
                onClick={() => {
                  void (onRefreshNode ? onRefreshNode(contextMenu.node) : expandDirectory(contextMenu.node, { force: true }));
                  const next = new Set(expandedIdsRef.current).add(contextMenu.node.path);
                  onExpandedPathsChange?.([...next].sort((left, right) => pathDepth(left) - pathDepth(right) || left.localeCompare(right)));
                  setContextMenu(null);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onCreateFile?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canCreateFile}
              >
                <File className="h-4 w-4" />
                New File
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onCreateFolder?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canCreateDirectory}
              >
                <FolderOpen className="h-4 w-4" />
                New Folder
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onRenameNode?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canRename}
              >
                <RefreshCw className="h-4 w-4" />
                Rename
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]"
                onClick={() => {
                  void copyPath(contextMenu.node.path);
                  setContextMenu(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Copy Path
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#ffb4b4] hover:bg-[#5a1d1d] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void onDeleteNode?.(contextMenu.node);
                  setContextMenu(null);
                }}
                disabled={!capabilities?.canDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
