"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plug, PlugZap, RotateCcw } from "lucide-react";
import { fetchTerminalCapabilities, type TerminalCapabilitiesResponse } from "../core/api";
import type { TerminalPreferences } from "../core/types";

type TerminalStatus = "idle" | "loading" | "connecting" | "connected" | "disconnected" | "error";

export function TerminalView({
  preferences,
  onChangePreferences,
  onSessionEvent,
}: {
  preferences: TerminalPreferences;
  onChangePreferences: (patch: Partial<TerminalPreferences>) => void;
  onSessionEvent?: (message: string, level?: "info" | "success" | "warning") => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataListenerDisposeRef = useRef<{ dispose: () => void } | null>(null);

  const [capabilities, setCapabilities] = useState<TerminalCapabilitiesResponse | null>(null);
  const [status, setStatus] = useState<TerminalStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/terminal/ws`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setStatus("loading");
        const [xtermModule, fitModule, terminalCapabilities] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          fetchTerminalCapabilities(),
        ]);
        if (cancelled || !hostRef.current) return;

        const Terminal = xtermModule.Terminal;
        const FitAddon = fitModule.FitAddon;
        const terminal = new Terminal({
          theme: {
            background: "#181818",
            foreground: "#d4d4d4",
            cursor: "#aeafad",
            selectionBackground: "#264f78",
          },
          fontFamily: 'Consolas, "Cascadia Code", Menlo, monospace',
          fontSize: 12,
          convertEol: true,
          cursorBlink: true,
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(hostRef.current);
        fitAddon.fit();
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        terminal.writeln("TrainerBoard terminal ready.");

        setCapabilities(terminalCapabilities);
        setStatus("idle");

        onChangePreferences({
          sshHost: preferences.sshHost || terminalCapabilities.ssh.default_host,
          sshPort: preferences.sshPort || terminalCapabilities.ssh.default_port,
          sshUsername: preferences.sshUsername || terminalCapabilities.ssh.default_username,
          sshKeyPath: preferences.sshKeyPath || terminalCapabilities.ssh.default_key_path,
          sshShell: preferences.sshShell || terminalCapabilities.ssh.default_shell,
          windowsShell:
            terminalCapabilities.available_shells.includes(preferences.windowsShell)
              ? preferences.windowsShell
              : (terminalCapabilities.available_shells[0] ?? "powershell"),
        });

        resizeObserverRef.current = new ResizeObserver(() => {
          if (!fitAddonRef.current || !terminalRef.current) return;
          fitAddonRef.current.fit();
          sendResize();
        });
        resizeObserverRef.current.observe(hostRef.current);
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to initialize terminal.");
        setStatus("error");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      socketRef.current?.close();
      dataListenerDisposeRef.current?.dispose();
      terminalRef.current?.dispose?.();
    };
  }, []);

  function sendResize() {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !terminalRef.current) return;
    socketRef.current.send(
      JSON.stringify({
        type: "resize",
        cols: terminalRef.current.cols,
        rows: terminalRef.current.rows,
      })
    );
  }

  function disconnectTerminal() {
    dataListenerDisposeRef.current?.dispose();
    dataListenerDisposeRef.current = null;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "disconnect" }));
    }
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("disconnected");
  }

  function connectTerminal() {
    if (!capabilities || !terminalRef.current || !wsUrl) return;

    setError(null);
    setStatus("connecting");
    terminalRef.current.clear();
    terminalRef.current.writeln("Connecting...");

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "start",
          mode: capabilities.mode,
          shell: preferences.windowsShell,
          cols: terminalRef.current?.cols ?? 120,
          rows: terminalRef.current?.rows ?? 30,
          ssh: {
            host: preferences.sshHost,
            port: preferences.sshPort,
            username: preferences.sshUsername,
            password: preferences.sshPassword,
            key_path: preferences.sshKeyPath,
            shell: preferences.sshShell,
          },
        })
      );
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "status") {
        setStatus("connected");
        onSessionEvent?.(
          capabilities.mode === "local-shell"
            ? `Connected ${preferences.windowsShell} terminal`
            : `Connected SSH terminal ${preferences.sshUsername}@${preferences.sshHost}:${preferences.sshPort}`,
          "success"
        );
        terminalRef.current?.write("\r\n");
        dataListenerDisposeRef.current?.dispose();
        dataListenerDisposeRef.current = terminalRef.current?.onData((data: string) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "input", data }));
          }
        });
        sendResize();
        return;
      }

      if (message.type === "output") {
        terminalRef.current?.write(message.data);
        return;
      }

      if (message.type === "error") {
        setStatus("error");
        setError(message.message);
        terminalRef.current?.writeln(`\r\n[error] ${message.message}`);
        onSessionEvent?.(`Terminal error: ${message.message}`, "warning");
      }
    };

    socket.onclose = () => {
      if (status !== "error") {
        setStatus("disconnected");
      }
    };
  }

  const mode = capabilities?.mode ?? "ssh";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-[#2a2d2e] bg-[#1b1b1b] px-3 py-2 text-xs">
        {!capabilities ? (
          <div className="flex items-center gap-2 text-[#8b8b8b]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading terminal capabilities...
          </div>
        ) : mode === "local-shell" ? (
          <>
            <label className="flex flex-col gap-1 text-[#8b8b8b]">
              Shell
              <select
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.windowsShell}
                onChange={(event) => onChangePreferences({ windowsShell: event.target.value as "powershell" | "cmd" })}
              >
                {capabilities.available_shells.map((shell) => (
                  <option key={shell} value={shell}>
                    {shell}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="flex min-w-36 flex-col gap-1 text-[#8b8b8b]">
              Host
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshHost}
                onChange={(event) => onChangePreferences({ sshHost: event.target.value })}
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-[#8b8b8b]">
              Port
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshPort}
                onChange={(event) => onChangePreferences({ sshPort: Number(event.target.value) || 22 })}
              />
            </label>
            <label className="flex min-w-32 flex-col gap-1 text-[#8b8b8b]">
              Username
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshUsername}
                onChange={(event) => onChangePreferences({ sshUsername: event.target.value })}
              />
            </label>
            <label className="flex min-w-32 flex-col gap-1 text-[#8b8b8b]">
              Password
              <input
                type="password"
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshPassword}
                onChange={(event) => onChangePreferences({ sshPassword: event.target.value })}
              />
            </label>
            <label className="flex min-w-32 flex-col gap-1 text-[#8b8b8b]">
              Key Path
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshKeyPath}
                onChange={(event) => onChangePreferences({ sshKeyPath: event.target.value })}
              />
            </label>
            <label className="flex min-w-36 flex-col gap-1 text-[#8b8b8b]">
              Shell
              <input
                className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-1 text-sm text-[#d4d4d4]"
                value={preferences.sshShell}
                onChange={(event) => onChangePreferences({ sshShell: event.target.value })}
              />
            </label>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded bg-[#0e639c] px-3 py-1.5 text-sm text-white hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!capabilities || status === "connecting" || status === "connected"}
            onClick={connectTerminal}
          >
            <PlugZap className="h-4 w-4" />
            Connect
          </button>
          <button
            className="flex items-center gap-1 rounded border border-[#3c3c3c] px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status !== "connected"}
            onClick={disconnectTerminal}
          >
            <Plug className="h-4 w-4" />
            Disconnect
          </button>
          <button
            className="flex items-center gap-1 rounded border border-[#3c3c3c] px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!capabilities}
            onClick={() => {
              disconnectTerminal();
              setTimeout(() => connectTerminal(), 100);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Restart
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-[#2a2d2e] bg-[#1f1f1f] px-3 py-1 text-xs text-[#8b8b8b]">
        <span>{capabilities ? `${capabilities.mode} • ${status}` : "terminal unavailable"}</span>
        {error && <span className="truncate text-[#d7ba7d]">{error}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-[#181818]">
        <div ref={hostRef} className="h-full w-full px-2 py-1" />
      </div>
    </div>
  );
}
