import { GitBranch } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../core/activity-placeholders";
import type { ActivityContribution } from "../core/activity-types";

export const sourceControlActivity: ActivityContribution = {
  manifest: {
    key: "source-control",
    label: "Source Control",
    icon: GitBranch,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: () => <PlaceholderPrimarySidebar activity="source-control" />,
  renderMainArea: () => <PlaceholderMainArea activity="source-control" />,
};
