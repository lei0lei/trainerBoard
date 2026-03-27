import { useEffect } from "react";
import { getFileSystemWatchWebSocketUrl, type FileSystemWatchEvent } from "./api";
import type { BackendConnectionProfile } from "./types";

export function useWorkbenchFsWatch({
  enabled,
  rootPath,
  watchedPaths,
  backendProfile,
  onChanged,
  onEvent,
}: {
  enabled: boolean;
  rootPath?: string;
  watchedPaths: string[];
  backendProfile?: BackendConnectionProfile | null;
  onChanged: (payload: FileSystemWatchEvent, changedPaths: string[]) => void;
  onEvent?: (payload: FileSystemWatchEvent) => void;
}) {
  useEffect(() => {
    if (!enabled || !rootPath) return;

    const wsUrl = getFileSystemWatchWebSocketUrl(rootPath, watchedPaths, backendProfile);
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      let payload: FileSystemWatchEvent | null = null;
      try {
        payload = JSON.parse(event.data) as FileSystemWatchEvent;
      } catch {
        payload = null;
      }
      if (!payload || payload.type !== "fs_changed") return;
      onEvent?.(payload);
      onChanged(payload, payload.changed_paths?.length ? payload.changed_paths : [rootPath]);
    };

    return () => socket.close();
  }, [backendProfile, enabled, onChanged, onEvent, rootPath, watchedPaths]);
}
