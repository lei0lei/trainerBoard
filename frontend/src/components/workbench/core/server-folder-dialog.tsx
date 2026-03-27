import { useEffect, useState } from "react";
import { ChevronRight, FolderClosed, LoaderCircle, MoveUp, X } from "lucide-react";
import { fetchCapabilities, fetchServerWorkspace } from "./api";
import type { BackendConnectionProfile } from "./types";

export function ServerFolderDialog({
  open,
  backendProfile,
  onClose,
  onSelectWorkspace,
}: {
  open: boolean;
  backendProfile?: BackendConnectionProfile | null;
  onClose: () => void;
  onSelectWorkspace: (path: string) => Promise<void> | void;
}) {
  const [baseDir, setBaseDir] = useState<string>("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directories, setDirectories] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const capabilities = await fetchCapabilities(backendProfile);
        if (cancelled) return;
        setBaseDir(capabilities.file_browser_base_dir);
        setPath(capabilities.file_browser_base_dir);
        const workspace = await fetchServerWorkspace(capabilities.file_browser_base_dir, 1, backendProfile);
        if (cancelled) return;
        setDirectories((workspace?.children ?? []).filter((node) => node.kind === "directory").map((node) => node.path));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to open server folder dialog.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [backendProfile, open]);

  async function browse(nextPath: string) {
    try {
      setLoading(true);
      setError(null);
      setPath(nextPath);
      const workspace = await fetchServerWorkspace(nextPath, 1, backendProfile);
      setDirectories((workspace?.children ?? []).filter((node) => node.kind === "directory").map((node) => node.path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to browse server directory.");
    } finally {
      setLoading(false);
    }
  }

  const canGoUp = !!path && !!baseDir && path !== baseDir;

  function handleGoUp() {
    if (!canGoUp) return;
    const normalizedBase = baseDir.replace(/[\/]+$/, "");
    const segments = path.split(/[\/]+/).filter(Boolean);
    const baseSegments = normalizedBase.split(/[\/]+/).filter(Boolean);
    const nextSegments = segments.slice(0, Math.max(baseSegments.length, segments.length - 1));
    const prefix = path.startsWith("/") ? "/" : "";
    const nextPath = `${prefix}${nextSegments.join("/")}`;
    void browse(nextPath || baseDir);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45">
      <div className="w-full max-w-xl rounded-lg border border-[#3c3c3c] bg-[#252526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a2d2e] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#f0f0f0]">Open Server Folder</h2>
            <p className="text-xs text-[#9d9d9d]">Browse a directory on the selected backend server.</p>
          </div>
          <button className="rounded p-1 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded border border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleGoUp}
              disabled={!canGoUp || loading}
              title="Go to parent folder"
            >
              <MoveUp className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4]">{path || baseDir}</div>
          </div>
          {error && <div className="rounded border border-[#5a1d1d] bg-[#3b1f1f] px-3 py-2 text-sm text-[#ffb3b3]">{error}</div>}
          <div className="max-h-72 overflow-y-auto overflow-x-hidden rounded border border-[#3c3c3c] bg-[#1e1e1e]">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-[#9d9d9d]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading directories...
              </div>
            ) : directories.length === 0 ? (
              <div className="px-4 py-8 text-sm text-[#9d9d9d]">No child directories in this location.</div>
            ) : (
              directories.map((dir) => (
                <button
                  key={dir}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#d4d4d4] hover:bg-[#04395e]"
                  onClick={() => void browse(dir)}
                >
                  <FolderClosed className="h-4 w-4 text-[#dcb67a]" />
                  <span className="min-w-0 flex-1 truncate">{dir}</span>
                  <ChevronRight className="h-4 w-4 text-[#8f8f8f]" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#2a2d2e] px-4 py-3">
          <span className="text-xs text-[#8f8f8f]">Base directory: {baseDir}</span>
          <div className="flex items-center gap-2">
            <button className="rounded px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e]" onClick={onClose}>
              Cancel
            </button>
            <button
              className="rounded bg-[#0e639c] px-3 py-1.5 text-sm text-white hover:bg-[#1177bb]"
              onClick={async () => {
                try {
                  await onSelectWorkspace(path || baseDir);
                  onClose();
                } catch {
                  // handled by caller
                }
              }}
            >
              Open Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
