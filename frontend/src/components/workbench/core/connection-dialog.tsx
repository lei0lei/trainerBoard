"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, CirclePlus, PlugZap, Save, Server, Trash2 } from "lucide-react";
import { Modal } from "./modal";
import { buildBackendConnectionProfile } from "./backend-connection";
import type { CapabilitiesResponse, HealthResponse } from "./api";
import type { BackendConnectionKind, BackendConnectionProfile } from "./types";

type ConnectionTestResult = {
  health: HealthResponse;
  capabilities: CapabilitiesResponse;
};

type ConnectionDraft = {
  id: string | null;
  name: string;
  kind: BackendConnectionKind;
  httpBaseUrl: string;
  wsBaseUrl: string;
  description: string;
};

function toDraft(profile?: BackendConnectionProfile | null): ConnectionDraft {
  return {
    id: profile?.id ?? null,
    name: profile?.name ?? "",
    kind: profile?.kind ?? "remote",
    httpBaseUrl: profile?.httpBaseUrl ?? "http://127.0.0.1:8000",
    wsBaseUrl: profile?.wsBaseUrl ?? "ws://127.0.0.1:8000",
    description: profile?.description ?? "",
  };
}

export function ConnectionDialog({
  open,
  profiles,
  activeProfileId,
  connectionState,
  connectionError,
  currentHealth,
  onClose,
  onActivateProfile,
  onSaveProfile,
  onDeleteProfile,
  onTestProfile,
}: {
  open: boolean;
  profiles: BackendConnectionProfile[];
  activeProfileId: string;
  connectionState: "idle" | "connecting" | "connected" | "error";
  connectionError: string | null;
  currentHealth: HealthResponse | null;
  onClose: () => void;
  onActivateProfile: (profileId: string) => void;
  onSaveProfile: (draft: ConnectionDraft) => string;
  onDeleteProfile: (profileId: string) => void;
  onTestProfile: (draft: ConnectionDraft) => Promise<ConnectionTestResult>;
}) {
  const activeProfile = useMemo(
    () => profiles.find((item) => item.id === activeProfileId) ?? profiles[0] ?? null,
    [activeProfileId, profiles]
  );
  const [selectedId, setSelectedId] = useState<string>(activeProfile?.id ?? "new");
  const [draft, setDraft] = useState<ConnectionDraft>(toDraft(activeProfile));
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(activeProfile?.id ?? "new");
    setDraft(toDraft(activeProfile));
    setTestError(null);
    setTestResult(null);
  }, [activeProfile, open]);

  function handleSelect(profileId: string) {
    if (profileId === "new") {
      setSelectedId("new");
      setDraft(toDraft(null));
      setTestError(null);
      setTestResult(null);
      return;
    }

    const profile = profiles.find((item) => item.id === profileId) ?? null;
    setSelectedId(profileId);
    setDraft(toDraft(profile));
    setTestError(null);
    setTestResult(null);
  }

  async function handleTest() {
    try {
      setTestLoading(true);
      setTestError(null);
      const result = await onTestProfile(draft);
      setTestResult(result);
    } catch (error) {
      setTestResult(null);
      setTestError(error instanceof Error ? error.message : "Failed to connect to backend.");
    } finally {
      setTestLoading(false);
    }
  }

  function handleSave() {
    const savedId = onSaveProfile(draft);
    const savedProfile = profiles.find((item) => item.id === savedId);
    setSelectedId(savedId);
    setDraft(toDraft(savedProfile ?? buildBackendConnectionProfile({ ...draft, id: savedId })));
  }

  const canDelete = selectedId !== "new" && profiles.length > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Backend Connections"
      description="One PWA can switch between local and remote FastAPI backends. SSH terminal traffic will continue to go through the selected backend's WebSocket proxy."
      widthClassName="max-w-5xl"
      footer={
        <>
          <button className="rounded px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e]" onClick={onClose}>
            Close
          </button>
          <button className="inline-flex items-center gap-2 rounded bg-[#0e639c] px-3 py-1.5 text-sm text-white hover:bg-[#1177bb]" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Profile
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-lg border border-[#2a2d2e] bg-[#1f1f1f] p-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#3c3c3c] px-3 py-2 text-sm text-[#cccccc] hover:bg-[#252526]"
            onClick={() => handleSelect("new")}
          >
            <CirclePlus className="h-4 w-4" />
            New Profile
          </button>

          <div className="space-y-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              const isSelected = profile.id === selectedId;
              return (
                <button
                  key={profile.id}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    isSelected ? "border-[#007acc] bg-[#0f2a3b]" : "border-[#2a2d2e] bg-[#252526] hover:bg-[#2a2d2e]"
                  }`}
                  onClick={() => handleSelect(profile.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Server className="h-4 w-4 text-[#4fc1ff]" />
                      <span className="truncate text-sm text-[#f0f0f0]">{profile.name}</span>
                    </div>
                    {isActive ? <span className="rounded bg-[#1f3a28] px-1.5 py-0.5 text-[10px] uppercase text-[#89d185]">Active</span> : null}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#8b8b8b]">{profile.httpBaseUrl}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-[#2a2d2e] bg-[#1f1f1f] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-[#8b8b8b]">
              Name
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#8b8b8b]">
              Type
              <select
                className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                value={draft.kind}
                onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as BackendConnectionKind }))}
              >
                <option value="local">Local</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#8b8b8b] md:col-span-2">
              HTTP Base URL
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                placeholder="http://127.0.0.1:8000"
                value={draft.httpBaseUrl}
                onChange={(event) => setDraft((current) => ({ ...current, httpBaseUrl: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#8b8b8b] md:col-span-2">
              WebSocket Base URL
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                placeholder="ws://127.0.0.1:8000"
                value={draft.wsBaseUrl}
                onChange={(event) => setDraft((current) => ({ ...current, wsBaseUrl: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#8b8b8b] md:col-span-2">
              Description
              <textarea
                className="min-h-20 rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded border border-[#3c3c3c] px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => void handleTest()}
              disabled={testLoading}
            >
              <PlugZap className="h-4 w-4" />
              {testLoading ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded border border-[#3c3c3c] px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e] disabled:opacity-40"
              onClick={() => draft.id && onActivateProfile(draft.id)}
              disabled={!draft.id}
            >
              <Check className="h-4 w-4" />
              Set Active
            </button>
            <button
              className="inline-flex items-center gap-2 rounded border border-[#5a1d1d] px-3 py-1.5 text-sm text-[#ffb4b4] hover:bg-[#5a1d1d]/30 disabled:opacity-40"
              onClick={() => draft.id && onDeleteProfile(draft.id)}
              disabled={!canDelete || !draft.id}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded border border-[#2a2d2e] bg-[#252526] p-3 text-sm text-[#d4d4d4]">
              <div className="mb-2 text-xs uppercase tracking-wide text-[#8b8b8b]">Current Active Backend</div>
              {currentHealth ? (
                <div className="space-y-1">
                  <div className="font-medium text-white">{currentHealth.instance_name}</div>
                  <div className="text-xs text-[#8b8b8b]">{activeProfile?.httpBaseUrl}</div>
                  <div className="text-xs text-[#8b8b8b]">
                    {connectionState} ? {currentHealth.app_env} ? {currentHealth.platform}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8b8b8b]">{connectionError || "No backend connected yet."}</div>
              )}
            </div>

            <div className="rounded border border-[#2a2d2e] bg-[#252526] p-3 text-sm text-[#d4d4d4]">
              <div className="mb-2 text-xs uppercase tracking-wide text-[#8b8b8b]">Last Test Result</div>
              {testResult ? (
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-white">{testResult.health.instance_name}</div>
                  <div>Status: {testResult.health.status}</div>
                  <div>Features: {testResult.capabilities.features.join(", ") || "none"}</div>
                  <div>SSH Proxy: {testResult.capabilities.transport.ssh_proxy ? "enabled" : "disabled"}</div>
                </div>
              ) : testError ? (
                <div className="flex items-start gap-2 text-xs text-[#ffb4b4]">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{testError}</span>
                </div>
              ) : (
                <div className="text-xs text-[#8b8b8b]">Run a connection test before switching to a new backend.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
