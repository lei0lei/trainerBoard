import type { ActivityContribution, ActivityRenderContext } from "./activity-types";
import type { WorkbenchCommand } from "./commands";
import type { SidebarKey } from "./types";
import { workbenchPlugins } from "../plugins/generated-registry";

export type { ActivityContribution, ActivityRenderContext } from "./activity-types";

export const activityContributions: ActivityContribution[] = [...workbenchPlugins].sort(
  (left, right) => (left.manifest.order ?? 0) - (right.manifest.order ?? 0)
);

export function getAvailableActivityContributions(disabledPluginIds: string[] = []) {
  return activityContributions.filter(
    (item) => item.manifest.kind !== "extension" || !disabledPluginIds.includes(item.manifest.id)
  );
}

export function getActivityContribution(key: SidebarKey, items: ActivityContribution[] = activityContributions) {
  return items.find((item) => item.manifest.key === key) ?? items[0];
}

export function getActivityCommands(
  context: ActivityRenderContext,
  items: ActivityContribution[] = context.availablePlugins
): WorkbenchCommand[] {
  return items.flatMap((activity) => activity.getCommands?.(context) ?? []);
}
