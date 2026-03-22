"use client";

import { WorkbenchLayout } from "./workbench-layout";
import { useWorkbenchController } from "./use-workbench-controller";

export function WorkbenchShell() {
  const controller = useWorkbenchController();
  return <WorkbenchLayout {...controller} />;
}
