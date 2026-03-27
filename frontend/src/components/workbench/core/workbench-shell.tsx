"use client";

import { WorkbenchLayout } from "./workbench-layout";
import { useWorkbenchController } from "./use-workbench-controller";
import { useWorkbenchStoreHydration } from "./use-workbench-store-hydration";

export function WorkbenchShell() {
  const hydrated = useWorkbenchStoreHydration();

  if (!hydrated) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#1e1e1e] text-sm text-[#cccccc]">
        Loading workbench...
      </main>
    );
  }

  return <HydratedWorkbenchShell />;
}

function HydratedWorkbenchShell() {
  const controller = useWorkbenchController();
  return <WorkbenchLayout {...controller} />;
}
