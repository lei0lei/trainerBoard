from __future__ import annotations

import os
import socket
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

APP_VERSION = "0.1.0"


def resolve_project_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parents[2]


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_csv(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_version: str
    app_host: str
    app_port: int
    app_instance_name: str
    app_instance_id: str
    cors_allowed_origins: tuple[str, ...]
    project_root: Path
    frontend_out_dir: Path
    serve_frontend: bool
    allow_dev_cors: bool
    enable_server_file_browser: bool
    file_browser_base_dir: Path
    enable_terminal: bool
    terminal_ssh_host: str
    terminal_ssh_port: int
    terminal_ssh_username: str
    terminal_ssh_password: str
    terminal_ssh_key_path: str
    terminal_ssh_shell: str
    litegraph_store_dir: Path


def get_settings() -> Settings:
    project_root = resolve_project_root()
    load_dotenv(project_root / "backend" / ".env", override=False)

    app_env = os.getenv("APP_ENV", "development").strip().lower()

    default_host = "127.0.0.1" if app_env == "desktop" else "0.0.0.0"
    default_port = "0" if app_env == "desktop" else "8000"

    frontend_out_dir_value = os.getenv("FRONTEND_OUT_DIR", "frontend/out")
    frontend_out_dir = Path(frontend_out_dir_value)
    if not frontend_out_dir.is_absolute():
        frontend_out_dir = project_root / frontend_out_dir

    default_file_browser_base_dir = project_root if app_env == "development" else Path.home()
    file_browser_base_dir_value = os.getenv("FILE_BROWSER_BASE_DIR")
    file_browser_base_dir = Path(file_browser_base_dir_value) if file_browser_base_dir_value else default_file_browser_base_dir
    if not file_browser_base_dir.is_absolute():
        file_browser_base_dir = (project_root / file_browser_base_dir).resolve()
    else:
        file_browser_base_dir = file_browser_base_dir.resolve()

    litegraph_store_dir_value = os.getenv("LITEGRAPH_STORE_DIR", ".trainerboard/litegraph")
    litegraph_store_dir = Path(litegraph_store_dir_value)
    if not litegraph_store_dir.is_absolute():
        litegraph_store_dir = (project_root / litegraph_store_dir).resolve()
    else:
        litegraph_store_dir = litegraph_store_dir.resolve()
    litegraph_store_dir.mkdir(parents=True, exist_ok=True)

    app_host = os.getenv("APP_HOST", default_host)
    app_port = int(os.getenv("APP_PORT", default_port))
    hostname = socket.gethostname()
    app_instance_name = os.getenv("APP_INSTANCE_NAME", hostname).strip() or hostname
    app_instance_id = os.getenv("APP_INSTANCE_ID", f"{hostname}:{app_port or 'dynamic'}").strip() or f"{hostname}:{app_port or 'dynamic'}"
    cors_allowed_origins = _as_csv(os.getenv("CORS_ALLOWED_ORIGINS"))

    return Settings(
        app_env=app_env,
        app_version=APP_VERSION,
        app_host=app_host,
        app_port=app_port,
        app_instance_name=app_instance_name,
        app_instance_id=app_instance_id,
        cors_allowed_origins=cors_allowed_origins,
        project_root=project_root,
        frontend_out_dir=frontend_out_dir,
        serve_frontend=_as_bool(os.getenv("SERVE_FRONTEND"), default=app_env != "development"),
        allow_dev_cors=_as_bool(os.getenv("ALLOW_DEV_CORS"), default=app_env == "development"),
        enable_server_file_browser=_as_bool(
            os.getenv("ENABLE_SERVER_FILE_BROWSER"),
            default=app_env in {"linux", "desktop"},
        ),
        file_browser_base_dir=file_browser_base_dir,
        enable_terminal=_as_bool(os.getenv("ENABLE_TERMINAL"), default=app_env in {"linux", "desktop", "development"}),
        terminal_ssh_host=os.getenv("TERMINAL_SSH_HOST", "").strip(),
        terminal_ssh_port=int(os.getenv("TERMINAL_SSH_PORT", "22")),
        terminal_ssh_username=os.getenv("TERMINAL_SSH_USERNAME", "").strip(),
        terminal_ssh_password=os.getenv("TERMINAL_SSH_PASSWORD", ""),
        terminal_ssh_key_path=os.getenv("TERMINAL_SSH_KEY_PATH", "").strip(),
        terminal_ssh_shell=os.getenv("TERMINAL_SSH_SHELL", "/bin/bash -l").strip() or "/bin/bash -l",
        litegraph_store_dir=litegraph_store_dir,
    )
