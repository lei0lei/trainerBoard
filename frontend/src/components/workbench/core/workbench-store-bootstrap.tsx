"use client";

import { useWorkbenchStoreHydration } from "./use-workbench-store-hydration";

export function WorkbenchStoreBootstrap() {
  useWorkbenchStoreHydration();
  return null;
}
