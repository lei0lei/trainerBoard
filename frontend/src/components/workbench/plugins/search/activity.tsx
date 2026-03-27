import { Search } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../../core/activity-placeholders";
import type { ActivityContribution } from "../../core/activity-types";

const title = "Search view is empty";
const description = "Search results, filters, and saved queries can be implemented entirely inside this plugin.";

export const searchActivity: ActivityContribution = {
  manifest: {
    id: "builtin.search",
    key: "search",
    label: "Search",
    icon: Search,
    order: 40,
    kind: "builtin",
    category: "workspace",
    container: "root",
    version: "1.0.0",
    defaultLayout: {
      showPrimarySidebar: true,
      showSecondarySidebar: false,
      showPanel: false,
      primarySidebarWidth: 280,
    },
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: () => (
    <PlaceholderPrimarySidebar heading="SEARCH" title={title} description={description} />
  ),
  renderMainArea: () => <PlaceholderMainArea title={title} description={description} />,
};

