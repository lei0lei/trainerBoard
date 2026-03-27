import {
  buildBackendApiUrl,
  buildBackendWebSocketUrl,
} from "./backend-connection";
import type { BackendConnectionProfile, LitegraphQueueItem, LitegraphWorkflowSummary, WorkspaceRoot } from "./types";

type HealthResponse = {
  status: string;
  service: string;
  version: string;
  app_env: string;
  instance_name: string;
  instance_id: string;
  platform: string;
  transport: {
    http: boolean;
    websocket: boolean;
    ssh_proxy: boolean;
  };
};

type CapabilitiesResponse = {
  app_env: string;
  instance_name: string;
  instance_id: string;
  server_file_browser: boolean;
  file_browser_base_dir: string;
  platform: string;
  features: string[];
  transport: {
    http: boolean;
    websocket: boolean;
    ssh_proxy: boolean;
  };
};

type TerminalCapabilitiesResponse = {
  enabled: boolean;
  transport: "websocket-proxy";
  mode: "local-shell" | "ssh";
  default_mode: "local-shell" | "ssh";
  supported_modes: Array<"local-shell" | "ssh">;
  available_shells: Array<"powershell" | "cmd">;
  ssh: {
    default_host: string;
    default_port: number;
    default_username: string;
    default_key_path: string;
    default_shell: string;
    auth_methods: Array<"password" | "key">;
  };
};

type ServerFileResponse = {
  path: string;
  content: string;
  language: string;
  name: string;
};

type SaveResponse = {
  status: string;
  path: string;
};

type FsMutationResponse = SaveResponse & {
  name?: string;
  parent_path?: string;
  old_path?: string;
};

type SavedWorkflowResponse = {
  status: string;
  name: string;
  updated_at: string;
};

type FileSystemWatchEvent = {
  type: "fs_watch_ready" | "fs_changed" | "fs_watch_ping";
  root_path: string;
  watched_paths: string[];
  changed_paths?: string[];
  events?: Array<{
    event_type: "created" | "deleted" | "modified" | "moved";
    path: string;
    is_directory: boolean;
    parent_path?: string;
    old_path?: string;
    old_parent_path?: string;
  }>;
  changed_at?: string;
  backend?: "watchdog" | "polling";
};

async function throwIfNotOk(response: Response, fallbackMessage: string) {
  if (response.ok) return;

  let detail = "";
  try {
    const payload = (await response.json()) as { detail?: string };
    detail = payload.detail ?? "";
  } catch {
    detail = "";
  }

  throw new Error(detail || `${fallbackMessage}: ${response.status}`);
}

async function apiFetch(path: string, init?: RequestInit, profile?: BackendConnectionProfile | null) {
  const response = await fetch(buildBackendApiUrl(path, profile), init);
  return response;
}

export async function fetchBackendHealth(profile?: BackendConnectionProfile | null): Promise<HealthResponse> {
  const response = await apiFetch("/api/health", undefined, profile);
  await throwIfNotOk(response, "Failed to load backend health");
  return response.json();
}

export async function fetchCapabilities(profile?: BackendConnectionProfile | null): Promise<CapabilitiesResponse> {
  const response = await apiFetch("/api/capabilities", undefined, profile);
  await throwIfNotOk(response, "Failed to load capabilities");
  return response.json();
}

export async function fetchServerWorkspace(
  path?: string,
  maxDepth = 1,
  profile?: BackendConnectionProfile | null
): Promise<WorkspaceRoot> {
  const url = new URL(buildBackendApiUrl("/api/fs/tree", profile));
  if (path) url.searchParams.set("path", path);
  url.searchParams.set("max_depth", String(maxDepth));
  const response = await fetch(url.toString());
  await throwIfNotOk(response, "Failed to load workspace");
  const payload = await response.json();
  return payload.workspace as WorkspaceRoot;
}

export async function saveServerFile(path: string, content: string, profile?: BackendConnectionProfile | null): Promise<SaveResponse> {
  const response = await apiFetch(
    "/api/fs/file",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to save file");
  return response.json();
}

export async function createServerFile(path: string, content = "", profile?: BackendConnectionProfile | null): Promise<FsMutationResponse> {
  const response = await apiFetch(
    "/api/fs/file",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to create file");
  return response.json();
}

export async function createServerDirectory(path: string, profile?: BackendConnectionProfile | null): Promise<FsMutationResponse> {
  const response = await apiFetch(
    "/api/fs/directory",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to create directory");
  return response.json();
}

export async function renameServerNode(path: string, newName: string, profile?: BackendConnectionProfile | null): Promise<FsMutationResponse> {
  const response = await apiFetch(
    "/api/fs/rename",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, new_name: newName }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to rename path");
  return response.json();
}

export async function deleteServerNode(path: string, profile?: BackendConnectionProfile | null): Promise<FsMutationResponse> {
  const url = new URL(buildBackendApiUrl("/api/fs/node", profile));
  url.searchParams.set("path", path);
  const response = await fetch(url.toString(), { method: "DELETE" });
  await throwIfNotOk(response, "Failed to delete path");
  return response.json();
}

export async function fetchServerFile(path: string, profile?: BackendConnectionProfile | null): Promise<ServerFileResponse> {
  const url = new URL(buildBackendApiUrl("/api/fs/file", profile));
  url.searchParams.set("path", path);
  const response = await fetch(url.toString());
  await throwIfNotOk(response, "Failed to load file");
  return response.json();
}

export async function fetchTerminalCapabilities(profile?: BackendConnectionProfile | null): Promise<TerminalCapabilitiesResponse> {
  const response = await apiFetch("/api/terminal/capabilities", undefined, profile);
  await throwIfNotOk(response, "Failed to load terminal capabilities");
  return response.json();
}

export async function listLitegraphWorkflows(profile?: BackendConnectionProfile | null): Promise<LitegraphWorkflowSummary[]> {
  const response = await apiFetch("/api/litegraph/workflows", undefined, profile);
  await throwIfNotOk(response, "Failed to list workflows");
  const payload = await response.json();
  return payload.items as LitegraphWorkflowSummary[];
}

export async function loadLitegraphWorkflow(
  name: string,
  profile?: BackendConnectionProfile | null
): Promise<{ name: string; graph: Record<string, unknown> }> {
  const response = await apiFetch(`/api/litegraph/workflows/${encodeURIComponent(name)}`, undefined, profile);
  await throwIfNotOk(response, "Failed to load workflow");
  return response.json();
}

export async function saveLitegraphWorkflow(
  name: string,
  graph: Record<string, unknown>,
  profile?: BackendConnectionProfile | null
): Promise<SavedWorkflowResponse> {
  const response = await apiFetch(
    `/api/litegraph/workflows/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to save workflow");
  return response.json();
}

export async function enqueueLitegraphWorkflow(
  graph: Record<string, unknown>,
  workflowName: string,
  profile?: BackendConnectionProfile | null
): Promise<LitegraphQueueItem> {
  const response = await apiFetch(
    "/api/litegraph/queue",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, workflow_name: workflowName }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to enqueue workflow");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function listLitegraphQueue(profile?: BackendConnectionProfile | null): Promise<LitegraphQueueItem[]> {
  const response = await apiFetch("/api/litegraph/queue", undefined, profile);
  await throwIfNotOk(response, "Failed to load queue");
  const payload = await response.json();
  return payload.items as LitegraphQueueItem[];
}

export async function getLitegraphQueueItem(id: string, profile?: BackendConnectionProfile | null): Promise<LitegraphQueueItem> {
  const response = await apiFetch(`/api/litegraph/queue/${encodeURIComponent(id)}`, undefined, profile);
  await throwIfNotOk(response, "Failed to load queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function cancelLitegraphQueueItem(id: string, profile?: BackendConnectionProfile | null): Promise<LitegraphQueueItem> {
  const response = await apiFetch(
    `/api/litegraph/queue/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
    },
    profile
  );
  await throwIfNotOk(response, "Failed to cancel queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function retryLitegraphQueueItem(id: string, profile?: BackendConnectionProfile | null): Promise<LitegraphQueueItem> {
  const response = await apiFetch(
    `/api/litegraph/queue/${encodeURIComponent(id)}/retry`,
    {
      method: "POST",
    },
    profile
  );
  await throwIfNotOk(response, "Failed to retry queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function clearLitegraphQueue(
  mode: "finished" | "all" = "finished",
  profile?: BackendConnectionProfile | null
): Promise<LitegraphQueueItem[]> {
  const response = await apiFetch(
    "/api/litegraph/queue/clear",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    },
    profile
  );
  await throwIfNotOk(response, "Failed to clear queue");
  const payload = await response.json();
  return payload.items as LitegraphQueueItem[];
}

export function getTerminalWebSocketUrl(profile?: BackendConnectionProfile | null) {
  return buildBackendWebSocketUrl("/api/terminal/ws", profile);
}

export function getLitegraphQueueWebSocketUrl(profile?: BackendConnectionProfile | null) {
  return buildBackendWebSocketUrl("/api/litegraph/ws", profile);
}

export function getFileSystemWatchWebSocketUrl(
  path: string,
  watchPaths: string[] = [],
  profile?: BackendConnectionProfile | null
) {
  const url = new URL(buildBackendWebSocketUrl("/api/fs/watch", profile));
  url.searchParams.set("path", path);
  for (const watchPath of watchPaths) {
    url.searchParams.append("watch_path", watchPath);
  }
  return url.toString();
}

export type {
  CapabilitiesResponse,
  FileSystemWatchEvent,
  FsMutationResponse,
  HealthResponse,
  ServerFileResponse,
  TerminalCapabilitiesResponse,
};
