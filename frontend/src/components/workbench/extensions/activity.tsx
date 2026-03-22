import { Boxes } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../core/activity-placeholders";
import type { ActivityContribution } from "../core/activity-types";

export const extensionsActivity: ActivityContribution = {
  manifest: {
    key: "extensions",
    label: "Extensions",
    icon: Boxes,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: () => <PlaceholderPrimarySidebar activity="extensions" />,
  renderMainArea: () => <PlaceholderMainArea activity="extensions" />,
};
