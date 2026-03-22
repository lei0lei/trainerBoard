from __future__ import annotations

import asyncio
import os
import queue
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Literal

import paramiko
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.config import Settings, get_settings


router = APIRouter(prefix="/api/terminal", tags=["terminal"])
settings: Settings = get_settings()


TerminalMode = Literal["local-shell", "ssh"]


@dataclass
class BaseTerminalSession:
    output_queue: queue.Queue[str]
    closed: bool

    def __init__(self) -> None:
        self.output_queue = queue.Queue()
        self.closed = False

    def start(self) -> None:
        raise NotImplementedError

    def write(self, data: str) -> None:
        raise NotImplementedError

    def resize(self, cols: int, rows: int) -> None:
        return None

    def read_chunk(self, timeout: float = 0.1) -> str | None:
        try:
            return self.output_queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def close(self) -> None:
        self.closed = True


class LocalShellSession(BaseTerminalSession):
    def __init__(self, shell: str) -> None:
        super().__init__()
        self.shell = shell
        self.process: subprocess.Popen[bytes] | None = None
        self.reader_threads: list[threading.Thread] = []

    def start(self) -> None:
        if self.shell == "powershell":
            executable = shutil.which("pwsh") or shutil.which("powershell.exe") or "powershell.exe"
            args = [
                executable,
                "-NoLogo",
                "-NoExit",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "[Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()",
            ]
        elif self.shell == "cmd":
            executable = shutil.which("cmd.exe") or "cmd.exe"
            args = [executable, "/Q", "/K", "chcp 65001>nul"]
        else:
            raise ValueError(f"Unsupported shell: {self.shell}")

        self.process = subprocess.Popen(
            args,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0,
        )

        if self.process.stdout is None:
            raise RuntimeError("Terminal stdout is unavailable.")

        def pump_output() -> None:
            try:
                while not self.closed and self.process and self.process.poll() is None:
                    chunk = self.process.stdout.read(1024)
                    if not chunk:
                        break
                    self.output_queue.put(chunk.decode("utf-8", errors="replace"))
            finally:
                self.closed = True

        reader = threading.Thread(target=pump_output, daemon=True)
        reader.start()
        self.reader_threads.append(reader)

    def write(self, data: str) -> None:
        if not self.process or not self.process.stdin:
            return
        self.process.stdin.write(data.encode("utf-8", errors="replace"))
        self.process.stdin.flush()

    def close(self) -> None:
        super().close()
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=1.5)
            except subprocess.TimeoutExpired:
                self.process.kill()


class SshTerminalSession(BaseTerminalSession):
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        key_path: str,
        shell: str,
        cols: int,
        rows: int,
    ) -> None:
        super().__init__()
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.key_path = key_path
        self.shell = shell
        self.cols = cols
        self.rows = rows
        self.client: paramiko.SSHClient | None = None
        self.channel: paramiko.Channel | None = None
        self.reader_thread: threading.Thread | None = None

    def start(self) -> None:
        if not self.host or not self.username:
            raise ValueError("SSH host and username are required.")

        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password or None,
            key_filename=self.key_path or None,
            look_for_keys=not bool(self.password),
            allow_agent=True,
            timeout=10,
        )
        self.channel = self.client.invoke_shell(term="xterm-256color", width=self.cols, height=self.rows)
        self.channel.settimeout(0.25)
        if self.shell:
            self.channel.send(self.shell + "\n")

        def pump_output() -> None:
            try:
                while not self.closed and self.channel and not self.channel.closed:
                    if self.channel.recv_ready():
                        data = self.channel.recv(4096)
                        if not data:
                            break
                        self.output_queue.put(data.decode("utf-8", errors="replace"))
                    else:
                        time.sleep(0.05)
            finally:
                self.closed = True

        self.reader_thread = threading.Thread(target=pump_output, daemon=True)
        self.reader_thread.start()

    def write(self, data: str) -> None:
        if self.channel and not self.channel.closed:
            self.channel.send(data)

    def resize(self, cols: int, rows: int) -> None:
        self.cols = cols
        self.rows = rows
        if self.channel and not self.channel.closed:
            self.channel.resize_pty(width=cols, height=rows)

    def close(self) -> None:
        super().close()
        if self.channel and not self.channel.closed:
            self.channel.close()
        if self.client:
            self.client.close()


def _terminal_mode() -> TerminalMode:
    if settings.app_env == "desktop" and os.name == "nt":
        return "local-shell"
    if settings.app_env == "linux":
        return "ssh"
    return "local-shell" if os.name == "nt" else "ssh"


@router.get("/capabilities")
async def terminal_capabilities() -> dict:
    if not settings.enable_terminal:
        raise HTTPException(status_code=403, detail="Terminal is disabled.")

    available_shells = []
    if shutil.which("pwsh") or shutil.which("powershell.exe"):
        available_shells.append("powershell")
    if shutil.which("cmd.exe") or os.name == "nt":
        available_shells.append("cmd")

    if not available_shells:
        available_shells = ["powershell", "cmd"]

    return {
        "enabled": settings.enable_terminal,
        "mode": _terminal_mode(),
        "available_shells": available_shells,
        "ssh": {
            "default_host": settings.terminal_ssh_host,
            "default_port": settings.terminal_ssh_port,
            "default_username": settings.terminal_ssh_username,
            "default_key_path": settings.terminal_ssh_key_path,
            "default_shell": settings.terminal_ssh_shell,
        },
    }


@router.websocket("/ws")
async def terminal_socket(websocket: WebSocket) -> None:
    if not settings.enable_terminal:
        await websocket.close(code=4403, reason="Terminal is disabled.")
        return

    await websocket.accept()
    session: BaseTerminalSession | None = None
    forward_task: asyncio.Task[None] | None = None

    try:
        initial = await websocket.receive_json()
        if initial.get("type") != "start":
            raise ValueError("First websocket message must be a start command.")

        mode = initial.get("mode") or _terminal_mode()
        cols = int(initial.get("cols", 120))
        rows = int(initial.get("rows", 30))

        if mode == "local-shell":
            session = LocalShellSession(initial.get("shell", "powershell"))
        else:
            ssh_config = initial.get("ssh", {}) or {}
            session = SshTerminalSession(
                host=str(ssh_config.get("host") or settings.terminal_ssh_host),
                port=int(ssh_config.get("port") or settings.terminal_ssh_port),
                username=str(ssh_config.get("username") or settings.terminal_ssh_username),
                password=str(ssh_config.get("password") or settings.terminal_ssh_password),
                key_path=str(ssh_config.get("key_path") or settings.terminal_ssh_key_path),
                shell=str(ssh_config.get("shell") or settings.terminal_ssh_shell),
                cols=cols,
                rows=rows,
            )

        session.start()
        await websocket.send_json({"type": "status", "status": "connected"})

        async def forward_output() -> None:
            assert session is not None
            while True:
                chunk = await asyncio.to_thread(session.read_chunk, 0.15)
                if chunk:
                    await websocket.send_json({"type": "output", "data": chunk})
                    continue
                if session.closed:
                    break

        forward_task = asyncio.create_task(forward_output())

        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "input":
                session.write(str(message.get("data", "")))
            elif message_type == "resize":
                session.resize(int(message.get("cols", cols)), int(message.get("rows", rows)))
            elif message_type == "disconnect":
                break
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except RuntimeError:
            pass
    finally:
        if session:
            session.close()
        if forward_task:
            forward_task.cancel()
