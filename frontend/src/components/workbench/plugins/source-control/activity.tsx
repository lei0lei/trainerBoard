import { GitBranch } from "lucide-react";
import { PlaceholderMainArea, PlaceholderPrimarySidebar } from "../../core/activity-placeholders";
import type { ActivityContribution } from "../../core/activity-types";

const title = "Source Control view is empty";
const description = "Repository changes, commits, and SCM integrations can stay isolated in this plugin.";

export const sourceControlActivity: ActivityContribution = {
  manifest: {
    id: "builtin.source-control",
    key: "source-control",
    label: "Source Control",
    icon: GitBranch,
    order: 60,
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
    <PlaceholderPrimarySidebar heading="SOURCE CONTROL" title={title} description={description} />
  ),
  renderMainArea: () => <PlaceholderMainArea title={title} description={description} />,
};

