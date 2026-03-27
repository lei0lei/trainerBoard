import { ScanLine } from "lucide-react";
import type { ActivityContribution } from "../../../core/activity-types";
import { DetectionMainArea } from "./main-area";
import { DetectionSecondarySidebar } from "./secondary-sidebar";

export const detectionActivity: ActivityContribution = {
  manifest: {
    id: "extension.detection",
    key: "extensions.detection",
    label: "Detection",
    description: "Visual inspection extension for defect detection results.",
    icon: ScanLine,
    order: 80,
    kind: "extension",
    category: "vision",
    container: "extensions",
    version: "0.1.0",
    defaultLayout: {
      showPrimarySidebar: false,
      showSecondarySidebar: true,
      showPanel: false,
      secondarySidebarWidth: 360,
    },
    capabilities: {
      primarySidebar: false,
      secondarySidebar: true,
      panel: false,
    },
  },
  renderMainArea: () => <DetectionMainArea />,
  renderSecondarySidebar: () => <DetectionSecondarySidebar />,
};


