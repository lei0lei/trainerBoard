import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";
import type { ActivityContribution } from "../core/activity-types";

const LitegraphPrimarySidebar = dynamic(() => import("./primary-sidebar").then((mod) => mod.LitegraphPrimarySidebar), { ssr: false });
const LitegraphMainArea = dynamic(() => import("./main-area").then((mod) => mod.LitegraphMainArea), { ssr: false });
const LitegraphSecondarySidebar = dynamic(() => import("./secondary-sidebar").then((mod) => mod.LitegraphSecondarySidebar), { ssr: false });
const LitegraphPanel = dynamic(() => import("./panel").then((mod) => mod.LitegraphPanel), { ssr: false });

export const litegraphActivity: ActivityContribution = {
  manifest: {
    key: "litegraph",
    label: "LiteGraph",
    icon: Share2,
    capabilities: {
      primarySidebar: true,
      secondarySidebar: true,
      panel: true,
    },
  },
  getCommands: (context) => [
    {
      id: "litegraph.save-workflow",
      title: "LiteGraph: Save Workflow",
      section: "LiteGraph",
      description: context.litegraphWorkflowName,
      disabled: !context.litegraphGraph,
      menus: [{ menu: "File", group: "1_save", order: 10 }],
      run: () => void context.onLitegraphSaveWorkflow(),
    },
    {
      id: "litegraph.run-workflow",
      title: "LiteGraph: Run Workflow",
      section: "LiteGraph",
      description: context.litegraphWorkflowName,
      disabled: !context.litegraphGraph,
      menus: [{ menu: "Run", group: "0_litegraph", order: 0 }],
      run: () => void context.onLitegraphRunWorkflow(),
    },
    ...context.litegraphQueue
      .filter((item) => item.status === "queued" || item.status === "running")
      .map((item) => ({
        id: `litegraph.cancel-${item.id}`,
        title: `LiteGraph: Cancel ${item.workflow_name}`,
        section: "LiteGraph Queue",
        description: `${item.status} - ${Math.round(item.progress ?? 0)}%`,
        run: () => void context.onLitegraphCancelQueueItem(item.id),
      })),
    ...context.litegraphQueue
      .filter((item) => item.status === "completed" || item.status === "failed" || item.status === "cancelled")
      .map((item) => ({
        id: `litegraph.retry-${item.id}`,
        title: `LiteGraph: Retry ${item.workflow_name}`,
        section: "LiteGraph Queue",
        description: `${item.status} - ${Math.round(item.progress ?? 0)}%`,
        run: () => void context.onLitegraphRetryQueueItem(item.id),
      })),
    {
      id: "litegraph.clear-finished",
      title: "LiteGraph: Clear Finished Queue Items",
      section: "LiteGraph Queue",
      disabled: context.litegraphQueue.every((item) => item.status !== "completed" && item.status !== "failed" && item.status !== "cancelled"),
      run: () => void context.onLitegraphClearQueue("finished"),
    },
    {
      id: "litegraph.clear-all",
      title: "LiteGraph: Clear All Queue Items",
      section: "LiteGraph Queue",
      disabled: context.litegraphQueue.length === 0,
      run: () => void context.onLitegraphClearQueue("all"),
    },
  ],
  renderPrimarySidebar: () => <LitegraphPrimarySidebar />,
  renderMainArea: () => <LitegraphMainArea />,
  renderSecondarySidebar: () => <LitegraphSecondarySidebar />,
  renderPanel: () => <LitegraphPanel />,
};
