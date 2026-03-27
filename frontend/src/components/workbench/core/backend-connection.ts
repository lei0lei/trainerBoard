import type { BackendConnectionKind, BackendConnectionProfile } from "./types";

export const DEFAULT_BACKEND_PROFILE_ID = "local-default";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureUrl(value: string, fallbackProtocol: "http:" | "ws:") {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Backend URL is required.");
  }

  try {
    return new URL(trimmed);
  } catch {
    return new URL(`${fallbackProtocol}//${trimmed.replace(/^\/\//, "")}`);
  }
}

export function normalizeHttpBaseUrl(value: string) {
  const url = ensureUrl(value, "http:");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HTTP base URL must start with http:// or https://");
  }

  url.pathname = trimTrailingSlash(url.pathname || "");
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
}

export function deriveWsBaseUrl(httpBaseUrl: string) {
  const url = new URL(httpBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
}

export function normalizeWsBaseUrl(value: string | undefined, httpBaseUrl: string) {
  if (!value?.trim()) {
    return deriveWsBaseUrl(httpBaseUrl);
  }

  const url = ensureUrl(value, "ws:");
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("WebSocket base URL must start with ws:// or wss://");
  }

  url.pathname = trimTrailingSlash(url.pathname || "");
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
}

export function inferBackendConnectionKind(httpBaseUrl: string): BackendConnectionKind {
  try {
    const url = new URL(httpBaseUrl);
    return LOCAL_HOSTS.has(url.hostname.toLowerCase()) ? "local" : "remote";
  } catch {
    return "remote";
  }
}

export function buildBackendConnectionProfile(
  input: Pick<BackendConnectionProfile, "id" | "name" | "httpBaseUrl"> & Partial<Omit<BackendConnectionProfile, "id" | "name" | "httpBaseUrl">>
): BackendConnectionProfile {
  const httpBaseUrl = normalizeHttpBaseUrl(input.httpBaseUrl);
  return {
    id: input.id,
    name: input.name.trim() || httpBaseUrl,
    kind: input.kind ?? inferBackendConnectionKind(httpBaseUrl),
    httpBaseUrl,
    wsBaseUrl: normalizeWsBaseUrl(input.wsBaseUrl, httpBaseUrl),
    description: input.description?.trim() || undefined,
  };
}

export const DEFAULT_BACKEND_PROFILES: BackendConnectionProfile[] = [
  buildBackendConnectionProfile({
    id: DEFAULT_BACKEND_PROFILE_ID,
    name: "Local Backend",
    kind: "local",
    httpBaseUrl: "http://127.0.0.1:8000",
    wsBaseUrl: "ws://127.0.0.1:8000",
    description: "Default local FastAPI service",
  }),
];

export function resolveBackendHttpBaseUrl(profile?: BackendConnectionProfile | null) {
  if (profile?.httpBaseUrl) {
    return profile.httpBaseUrl;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function resolveBackendWsBaseUrl(profile?: BackendConnectionProfile | null) {
  if (profile?.wsBaseUrl) {
    return profile.wsBaseUrl;
  }
  const httpBaseUrl = resolveBackendHttpBaseUrl(profile);
  return httpBaseUrl ? deriveWsBaseUrl(httpBaseUrl) : "";
}

export function buildBackendApiUrl(path: string, profile?: BackendConnectionProfile | null) {
  const baseUrl = resolveBackendHttpBaseUrl(profile);
  if (!baseUrl) {
    return path;
  }
  return new URL(path, `${baseUrl}/`).toString();
}

export function buildBackendWebSocketUrl(path: string, profile?: BackendConnectionProfile | null) {
  const baseUrl = resolveBackendWsBaseUrl(profile);
  if (!baseUrl) {
    return "";
  }
  return new URL(path, `${baseUrl}/`).toString();
}
