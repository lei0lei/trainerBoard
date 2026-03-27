import { Play } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../../core/activity-placeholders";
import type { ActivityContribution } from "../../core/activity-types";

const title = "Run and Debug view is empty";
const description = "Launch configs, breakpoints, and debugger tools can be owned by this plugin.";

export const runActivity: ActivityContribution = {
  manifest: {
    id: "builtin.run",
    key: "run",
    label: "Run and Debug",
    icon: Play,
    order: 50,
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
    <PlaceholderPrimarySidebar heading="RUN AND DEBUG" title={title} description={description} />
  ),
  renderMainArea: () => <PlaceholderMainArea title={title} description={description} />,
};

