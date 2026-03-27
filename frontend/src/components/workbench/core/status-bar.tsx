import { Activity, GitBranch, Server } from "lucide-react";
import { PwaNetworkBadge } from "@/components/pwa/pwa-network-badge";
import type { BackendConnectionProfile } from "./types";
import type { HealthResponse } from "./api";

export function StatusBar({
  activeBackendProfile,
  backendConnectionState,
  backendConnectionError,
  backendHealth,
  onOpenConnections,
}: {
  activeBackendProfile: BackendConnectionProfile | null;
  backendConnectionState: "idle" | "connecting" | "connected" | "error";
  backendConnectionError: string | null;
  backendHealth: HealthResponse | null;
  onOpenConnections: () => void;
}) {
  return (
    <footer className="flex h-6 items-center justify-between bg-[#007acc] px-3 text-xs text-white">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          main
        </span>
        <button className="flex min-w-0 items-center gap-1 rounded px-1 hover:bg-white/10" onClick={onOpenConnections}>
          <Server className="h-3.5 w-3.5" />
          <span className="truncate">{activeBackendProfile?.name ?? "No backend"}</span>
        </button>
        <span className="truncate">{backendHealth?.instance_name ?? backendConnectionError ?? backendConnectionState}</span>
      </div>
      <div className="flex items-center gap-4">
        <PwaNetworkBadge className="bg-white/10 text-white" />
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          {backendConnectionState}
        </span>
        <span>{backendHealth?.app_env ?? "unknown env"}</span>
        <span>{backendHealth?.platform ?? "unknown platform"}</span>
      </div>
    </footer>
  );
}
