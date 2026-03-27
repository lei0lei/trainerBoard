import type { LucideIcon } from "lucide-react";

export type SidebarKey = string;

export type ActivityItem = {
  key: SidebarKey;
  label: string;
  icon: LucideIcon;
};

export type FileNode = {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  origin?: "server" | "local";
  hasChildren?: boolean;
  childrenLoaded?: boolean;
  children?: FileNode[];
  content?: string;
  language?: string;
};

export type WorkspaceRoot = {
  id: string;
  name: string;
  type: "folder" | "workspace";
  source?: "server" | "local";
  root_path?: string;
  children: FileNode[];
} | null;

export type EditorTab = {
  id: string;
  title: string;
  path: string;
  language: string;
  content: string;
  origin?: "server" | "local";
  dirty?: boolean;
};

export type DiagnosticMarker = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number;
  code?: string;
  source?: string;
};

export type BackendConnectionKind = "local" | "remote";

export type BackendConnectionProfile = {
  id: string;
  name: string;
  kind: BackendConnectionKind;
  httpBaseUrl: string;
  wsBaseUrl: string;
  description?: string;
};

export type RecentWorkspace = {
  id: string;
  label: string;
  path: string;
  source: "server" | "local";
  type: "folder" | "workspace";
  backendProfileId?: string | null;
  backendProfileName?: string | null;
};

export type TerminalPreferences = {
  windowsShell: "powershell" | "cmd";
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPassword: string;
  sshKeyPath: string;
  sshShell: string;
};

export type LitegraphNodeSelection = {
  id: number | null;
  title: string | null;
  type: string | null;
  properties: Record<string, string | number | boolean | null>;
};

export type LitegraphWorkflowSummary = {
  name: string;
  updated_at: string;
  size: number;
};

export type LitegraphQueueItem = {
  id: string;
  workflow_name: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
  prompt: string;
  checkpoint: string;
  progress?: number;
  cancellable?: boolean;
  cancel_requested?: boolean;
  preview_url?: string | null;
  result_summary?: string | null;
  logs?: string[];
  error?: string | null;
};

export type ResizeState =
  | { type: "primary"; startX: number; startSize: number }
  | { type: "secondary"; startX: number; startSize: number }
  | { type: "panel"; startY: number; startSize: number }
  | null;

export type DragState = {
  sourceGroupIndex: number;
  tabId: string;
} | null;

export type DropIndicator = {
  groupIndex: number;
  tabId?: string;
  edge: "before" | "after" | "group";
} | null;

