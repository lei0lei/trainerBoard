import { Search } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../core/activity-placeholders";
import type { ActivityContribution } from "../core/activity-types";

export const searchActivity: ActivityContribution = {
  manifest: {
    key: "search",
    label: "Search",
    icon: Search,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: () => <PlaceholderPrimarySidebar activity="search" />,
  renderMainArea: () => <PlaceholderMainArea activity="search" />,
};
