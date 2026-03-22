import type { LitegraphQueueItem, LitegraphWorkflowSummary, WorkspaceRoot } from "./types";

type CapabilitiesResponse = {
  app_env: string;
  server_file_browser: boolean;
  file_browser_base_dir: string;
  platform: string;
};

type TerminalCapabilitiesResponse = {
  enabled: boolean;
  mode: "local-shell" | "ssh";
  available_shells: Array<"powershell" | "cmd">;
  ssh: {
    default_host: string;
    default_port: number;
    default_username: string;
    default_key_path: string;
    default_shell: string;
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

export async function fetchCapabilities(): Promise<CapabilitiesResponse> {
  const response = await fetch("/api/capabilities");
  await throwIfNotOk(response, "Failed to load capabilities");
  return response.json();
}

export async function fetchServerWorkspace(path?: string, maxDepth = 1): Promise<WorkspaceRoot> {
  const url = new URL("/api/fs/tree", window.location.origin);
  if (path) url.searchParams.set("path", path);
  url.searchParams.set("max_depth", String(maxDepth));
  const response = await fetch(url.toString());
  await throwIfNotOk(response, "Failed to load workspace");
  const payload = await response.json();
  return payload.workspace as WorkspaceRoot;
}

export async function saveServerFile(path: string, content: string): Promise<SaveResponse> {
  const response = await fetch("/api/fs/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  await throwIfNotOk(response, "Failed to save file");
  return response.json();
}

export async function createServerFile(path: string, content = ""): Promise<FsMutationResponse> {
  const response = await fetch("/api/fs/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  await throwIfNotOk(response, "Failed to create file");
  return response.json();
}

export async function createServerDirectory(path: string): Promise<FsMutationResponse> {
  const response = await fetch("/api/fs/directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  await throwIfNotOk(response, "Failed to create directory");
  return response.json();
}

export async function renameServerNode(path: string, newName: string): Promise<FsMutationResponse> {
  const response = await fetch("/api/fs/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, new_name: newName }),
  });
  await throwIfNotOk(response, "Failed to rename path");
  return response.json();
}

export async function deleteServerNode(path: string): Promise<FsMutationResponse> {
  const url = new URL("/api/fs/node", window.location.origin);
  url.searchParams.set("path", path);
  const response = await fetch(url.toString(), { method: "DELETE" });
  await throwIfNotOk(response, "Failed to delete path");
  return response.json();
}

export async function fetchServerFile(path: string): Promise<ServerFileResponse> {
  const url = new URL("/api/fs/file", window.location.origin);
  url.searchParams.set("path", path);
  const response = await fetch(url.toString());
  await throwIfNotOk(response, "Failed to load file");
  return response.json();
}

export async function fetchTerminalCapabilities(): Promise<TerminalCapabilitiesResponse> {
  const response = await fetch("/api/terminal/capabilities");
  await throwIfNotOk(response, "Failed to load terminal capabilities");
  return response.json();
}

export async function listLitegraphWorkflows(): Promise<LitegraphWorkflowSummary[]> {
  const response = await fetch("/api/litegraph/workflows");
  await throwIfNotOk(response, "Failed to list workflows");
  const payload = await response.json();
  return payload.items as LitegraphWorkflowSummary[];
}

export async function loadLitegraphWorkflow(name: string): Promise<{ name: string; graph: Record<string, unknown> }> {
  const response = await fetch(`/api/litegraph/workflows/${encodeURIComponent(name)}`);
  await throwIfNotOk(response, "Failed to load workflow");
  return response.json();
}

export async function saveLitegraphWorkflow(name: string, graph: Record<string, unknown>): Promise<SavedWorkflowResponse> {
  const response = await fetch(`/api/litegraph/workflows/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph }),
  });
  await throwIfNotOk(response, "Failed to save workflow");
  return response.json();
}

export async function enqueueLitegraphWorkflow(graph: Record<string, unknown>, workflowName: string): Promise<LitegraphQueueItem> {
  const response = await fetch("/api/litegraph/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph, workflow_name: workflowName }),
  });
  await throwIfNotOk(response, "Failed to enqueue workflow");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function listLitegraphQueue(): Promise<LitegraphQueueItem[]> {
  const response = await fetch("/api/litegraph/queue");
  await throwIfNotOk(response, "Failed to load queue");
  const payload = await response.json();
  return payload.items as LitegraphQueueItem[];
}

export async function getLitegraphQueueItem(id: string): Promise<LitegraphQueueItem> {
  const response = await fetch(`/api/litegraph/queue/${encodeURIComponent(id)}`);
  await throwIfNotOk(response, "Failed to load queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function cancelLitegraphQueueItem(id: string): Promise<LitegraphQueueItem> {
  const response = await fetch(`/api/litegraph/queue/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
  await throwIfNotOk(response, "Failed to cancel queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function retryLitegraphQueueItem(id: string): Promise<LitegraphQueueItem> {
  const response = await fetch(`/api/litegraph/queue/${encodeURIComponent(id)}/retry`, {
    method: "POST",
  });
  await throwIfNotOk(response, "Failed to retry queue item");
  const payload = await response.json();
  return payload.item as LitegraphQueueItem;
}

export async function clearLitegraphQueue(mode: "finished" | "all" = "finished"): Promise<LitegraphQueueItem[]> {
  const response = await fetch("/api/litegraph/queue/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  await throwIfNotOk(response, "Failed to clear queue");
  const payload = await response.json();
  return payload.items as LitegraphQueueItem[];
}

export function getLitegraphQueueWebSocketUrl() {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/litegraph/ws`;
}

export function getFileSystemWatchWebSocketUrl(path: string, watchPaths: string[] = []) {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`${protocol}//${window.location.host}/api/fs/watch`);
  url.searchParams.set("path", path);
  for (const watchPath of watchPaths) {
    url.searchParams.append("watch_path", watchPath);
  }
  return url.toString();
}

export type { CapabilitiesResponse, FileSystemWatchEvent, FsMutationResponse, ServerFileResponse, TerminalCapabilitiesResponse };
