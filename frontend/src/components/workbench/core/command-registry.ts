"use client";

import type { WorkbenchCommand, WorkbenchMenuId, WorkbenchMenuNode, WorkbenchMenuPlacement } from "./commands";

export type WorkbenchResolvedCommand = WorkbenchCommand & {
  shortcutBindings: string[];
  shortcutLabel?: string;
};

const DEFAULT_MENU_ORDER: WorkbenchMenuId[] = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];

function normalizeShortcutToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (normalized === "cmd") return "meta";
  if (normalized === "control") return "ctrl";
  if (normalized === "option") return "alt";
  if (normalized === "return") return "enter";
  return normalized;
}

function normalizeShortcutSequence(shortcut: string) {
  return shortcut
    .split(" ")
    .map((combo) =>
      combo
        .split("+")
        .map(normalizeShortcutToken)
        .sort()
        .join("+")
    )
    .join(" ");
}

export function resolveCommands(commands: WorkbenchCommand[]) {
  return commands.map<WorkbenchResolvedCommand>((command) => {
    const shortcutBindings = (Array.isArray(command.shortcut) ? command.shortcut : command.shortcut ? [command.shortcut] : []).map(normalizeShortcutSequence);
    return {
      ...command,
      shortcutBindings,
      shortcutLabel: Array.isArray(command.shortcut) ? command.shortcut[0] : command.shortcut,
    };
  });
}

function placementSortValue(placement?: WorkbenchMenuPlacement) {
  return placement?.order ?? 0;
}

function ensureSubmenu(root: WorkbenchMenuNode[], labels: string[]) {
  let items = root;
  let prefix = "submenu";

  for (const label of labels) {
    prefix = `${prefix}:${label}`;
    let next = items.find((item) => item.type === "submenu" && item.label === label) as Extract<WorkbenchMenuNode, { type: "submenu" }> | undefined;
    if (!next) {
      next = { type: "submenu", id: prefix, label, items: [] };
      items.push(next);
    }
    items = next.items;
  }

  return items;
}

export function buildCommandMenus(commands: WorkbenchResolvedCommand[]) {
  const menuBuckets = new Map<WorkbenchMenuId, Array<{ placement: WorkbenchMenuPlacement; command: WorkbenchResolvedCommand }>>();
  const commandMap = new Map(commands.map((command) => [command.id, command]));

  commands.forEach((command) => {
    command.menus?.forEach((placement) => {
      const list = menuBuckets.get(placement.menu) ?? [];
      list.push({ placement, command });
      menuBuckets.set(placement.menu, list);
    });
  });

  const menus: Record<WorkbenchMenuId, WorkbenchMenuNode[]> = {
    File: [],
    Edit: [],
    Selection: [],
    View: [],
    Go: [],
    Run: [],
    Terminal: [],
    Help: [],
  };

  DEFAULT_MENU_ORDER.forEach((menu) => {
    const placements = [...(menuBuckets.get(menu) ?? [])].sort((a, b) => {
      const groupCompare = (a.placement.group ?? "").localeCompare(b.placement.group ?? "");
      if (groupCompare !== 0) return groupCompare;
      return placementSortValue(a.placement) - placementSortValue(b.placement);
    });

    let previousGroup: string | null = null;
    placements.forEach(({ placement, command }) => {
      const targetItems = placement.submenu?.length ? ensureSubmenu(menus[menu], placement.submenu) : menus[menu];
      const currentGroup = placement.group ?? null;
      if (currentGroup && previousGroup && currentGroup !== previousGroup) {
        targetItems.push({ type: "separator", id: `${menu}-${previousGroup}-${currentGroup}-separator` });
      }
      targetItems.push({
        type: "command",
        id: `${menu}:${command.id}`,
        commandId: command.id,
      });
      previousGroup = currentGroup;
    });
  });

  return { menus, commandMap };
}

export function buildKeyboardCombo(event: KeyboardEvent) {
  const parts: string[] = [];
  const normalizedKey = normalizeShortcutToken(event.key.toLowerCase());
  if (["ctrl", "shift", "alt", "meta"].includes(normalizedKey)) {
    return "";
  }
  if (event.ctrlKey || event.metaKey) {
    parts.push(event.ctrlKey ? "ctrl" : "meta");
  }
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  let key = event.key.toLowerCase();
  if (key === " ") key = "space";
  if (key === "esc") key = "escape";
  parts.push(normalizeShortcutToken(key));
  return parts.sort().join("+");
}

export function findCommandByShortcut(commands: WorkbenchResolvedCommand[], sequence: string) {
  return commands.find((command) => command.shortcutBindings.includes(sequence) && !command.disabled) ?? null;
}

