"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientReady } from "./use-client-ready";
import { useNetworkStatus } from "./use-network-status";

export function PwaNetworkBadge({ className }: { className?: string }) {
  const clientReady = useClientReady();
  const { isOnline } = useNetworkStatus();

  if (!clientReady) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        isOnline ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/20 text-amber-100",
        className
      )}
    >
      {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
