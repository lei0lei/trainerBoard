import { Play } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../core/activity-placeholders";
import type { ActivityContribution } from "../core/activity-types";

export const runActivity: ActivityContribution = {
  manifest: {
    key: "run",
    label: "Run and Debug",
    icon: Play,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: () => <PlaceholderPrimarySidebar activity="run" />,
  renderMainArea: () => <PlaceholderMainArea activity="run" />,
};
