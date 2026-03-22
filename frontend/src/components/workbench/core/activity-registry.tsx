import { explorerActivity } from "../explorer";
import { extensionsActivity } from "../extensions";
import { litegraphActivity } from "../litegraph";
import { runActivity } from "../run";
import { searchActivity } from "../search";
import { sourceControlActivity } from "../source-control";
import type { ActivityContribution, ActivityRenderContext } from "./activity-types";
import type { WorkbenchCommand } from "./commands";
import type { SidebarKey } from "./types";

export type { ActivityContribution, ActivityRenderContext } from "./activity-types";

// Register activities here. Each activity folder exposes a unified activity.ts / index.ts entrypoint.
export const activityContributions: ActivityContribution[] = [
  explorerActivity,
  litegraphActivity,
  searchActivity,
  sourceControlActivity,
  runActivity,
  extensionsActivity,
];

export function getActivityContribution(key: SidebarKey) {
  return activityContributions.find((item) => item.manifest.key === key) ?? activityContributions[0];
}

export function getActivityCommands(context: ActivityRenderContext): WorkbenchCommand[] {
  return activityContributions.flatMap((activity) => activity.getCommands?.(context) ?? []);
}
