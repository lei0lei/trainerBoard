import type { SidebarKey } from "./types";

export const menuItems = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];

export const panelTabs = ["Terminal", "Problems", "Output", "Ports"];

export const placeholderByActivity: Record<Exclude<SidebarKey, "explorer" | "litegraph">, { title: string; description: string }> = {
  search: {
    title: "Search view is empty",
    description: "Search results, related panels, and a secondary sidebar can be added later.",
  },
  "source-control": {
    title: "Source Control view is empty",
    description: "Repository changes, commits, and SCM tooling can be connected later.",
  },
  run: {
    title: "Run and Debug view is empty",
    description: "Launch configs, breakpoints, and debugger panels can be connected later.",
  },
  extensions: {
    title: "Extensions view is empty",
    description: "Marketplace browsing and installed extension management can be connected later.",
  },
};
