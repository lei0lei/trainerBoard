"use client";

import { WifiOff } from "lucide-react";
import { useClientReady } from "./use-client-ready";
import { useNetworkStatus } from "./use-network-status";

export function PwaConnectivityBanner() {
  const clientReady = useClientReady();
  const { isOnline } = useNetworkStatus();

  if (!clientReady || isOnline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 px-4">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-100 shadow-lg backdrop-blur">
        <WifiOff className="h-4 w-4" />
        You are offline. The PWA shell is available, but backend features may be unavailable.
      </div>
    </div>
  );
}
