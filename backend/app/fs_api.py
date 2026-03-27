from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, WebSocket
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.fs_watch_service import WATCHDOG_AVAILABLE, watch_manager


router = APIRouter(prefix="/api", tags=["filesystem"])
settings: Settings = get_settings()


TEXT_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".css",
    ".html",
    ".txt",
    ".py",
    ".yml",
    ".yaml",
    ".toml",
    ".env",
}


class SaveFileRequest(BaseModel):
    path: str
    content: str


class CreateFileRequest(BaseModel):
    path: str
    content: str = ""


class CreateDirectoryRequest(BaseModel):
    path: str


class RenameNodeRequest(BaseModel):
    path: str
    new_name: str


def _normalize_path(path_value: str | None) -> Path:
    base_dir = settings.file_browser_base_dir
    candidate = Path(path_value) if path_value else base_dir
    if not candidate.is_absolute():
        candidate = base_dir / candidate
    resolved = candidate.resolve()

    try:
        resolved.relative_to(base_dir)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Path is outside the allowed file browser root.") from exc

    return resolved


def _language_for(path: Path) -> str:
    suffix = path.suffix.lower()
    mapping = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".json": "json",
        ".md": "markdown",
        ".css": "css",
        ".html": "html",
        ".py": "python",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".txt": "plaintext",
    }
    return mapping.get(suffix, "plaintext")


def _sanitize_name(name: str) -> str:
    cleaned = name.strip().replace("\\", "/").split("/")[-1].strip()
    if not cleaned or cleaned in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid file or directory name.")
    return cleaned


def _node_from_path(path: Path, depth: int, max_depth: int) -> dict:
    if path.is_dir():
        entries = sorted(path.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
        should_load_children = depth < max_depth
        children: list[dict] = []
        if should_load_children:
            for entry in entries:
                children.append(_node_from_path(entry, depth + 1, max_depth))
        return {
            "id": str(path),
            "name": path.name or str(path),
            "path": str(path),
            "kind": "directory",
            "hasChildren": len(entries) > 0,
            "childrenLoaded": should_load_children,
            "children": children,
            "origin": "server",
        }

    return {
        "id": str(path),
        "name": path.name,
        "path": str(path),
        "kind": "file",
        "language": _language_for(path),
        "origin": "server",
    }


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_watch_path(root_path: Path, watch_path: str) -> Path:
    resolved = _normalize_path(watch_path)
    try:
        resolved.relative_to(root_path)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Watch path is outside the selected workspace root.") from exc

    return resolved


def _directory_signature(path: Path) -> dict[str, tuple[str, int, int, int]]:
    if not path.exists() or not path.is_dir():
        return {"__missing__": ("missing", 0, 0, 0)}

    entries: dict[str, tuple[str, int, int, int]] = {}
    try:
        for entry in path.iterdir():
            try:
                stat = entry.stat()
            except OSError:
                continue
            entries[entry.name] = (
                "directory" if entry.is_dir() else "file",
                stat.st_mtime_ns,
                stat.st_size,
                getattr(stat, "st_ctime_ns", 0),
            )
    except OSError:
        return {"__error__": ("error", 0, 0, 0)}

    return entries


def _watched_directory_paths(root_path: Path, watch_paths: list[str]) -> list[Path]:
    watched: list[Path] = [root_path]
    seen = {str(root_path)}

    for watch_path in watch_paths:
        try:
            resolved = _validate_watch_path(root_path, watch_path)
        except HTTPException:
            continue

        candidate = resolved if resolved.is_dir() or not resolved.exists() else resolved.parent
        if str(candidate) not in seen:
            seen.add(str(candidate))
            watched.append(candidate)

    watched.sort(key=lambda item: (len(item.parts), str(item).lower()))
    return watched


@router.get("/capabilities")
async def capabilities() -> dict[str, object]:
    features = ["litegraph"]
    if settings.enable_server_file_browser:
        features.append("filesystem")
    if settings.enable_terminal:
        features.append("terminal")
        features.append("ssh-proxy")

    return {
        "app_env": settings.app_env,
        "instance_name": settings.app_instance_name,
        "instance_id": settings.app_instance_id,
        "server_file_browser": settings.enable_server_file_browser,
        "file_browser_base_dir": str(settings.file_browser_base_dir),
        "platform": os.name,
        "features": features,
        "transport": {
            "http": True,
            "websocket": True,
            "ssh_proxy": settings.enable_terminal,
        },
    }


@router.get("/fs/tree")
async def filesystem_tree(
    path: str | None = Query(default=None),
    max_depth: int = Query(default=1, ge=1, le=12),
) -> dict:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(path)
    if not resolved.exists() or not resolved.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found.")

    return {
        "workspace": {
            "id": str(resolved),
            "name": resolved.name or str(resolved),
            "type": "folder",
            "root_path": str(resolved),
            "source": "server",
            "children": _node_from_path(resolved, depth=0, max_depth=max_depth)["children"],
        }
    }


@router.get("/fs/file")
async def read_file(path: str = Query(...)) -> dict:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(path)
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    if resolved.suffix.lower() not in TEXT_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type is not supported for browser editing.")

    return {
        "path": str(resolved),
        "content": resolved.read_text(encoding="utf-8", errors="replace"),
        "language": _language_for(resolved),
        "name": resolved.name,
    }


@router.put("/fs/file")
async def save_file(payload: SaveFileRequest) -> dict[str, str]:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(payload.path)
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    resolved.write_text(payload.content, encoding="utf-8")
    return {"status": "saved", "path": str(resolved)}


@router.post("/fs/file")
async def create_file(payload: CreateFileRequest) -> dict[str, str]:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(payload.path)
    if resolved.exists():
        raise HTTPException(status_code=409, detail="File already exists.")

    parent = resolved.parent
    if not parent.exists() or not parent.is_dir():
        raise HTTPException(status_code=404, detail="Parent directory not found.")

    resolved.write_text(payload.content, encoding="utf-8")
    return {"status": "created", "path": str(resolved), "name": resolved.name, "parent_path": str(parent)}


@router.post("/fs/directory")
async def create_directory(payload: CreateDirectoryRequest) -> dict[str, str]:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(payload.path)
    if resolved.exists():
        raise HTTPException(status_code=409, detail="Directory already exists.")

    parent = resolved.parent
    if not parent.exists() or not parent.is_dir():
        raise HTTPException(status_code=404, detail="Parent directory not found.")

    resolved.mkdir(parents=False, exist_ok=False)
    return {"status": "created", "path": str(resolved), "name": resolved.name, "parent_path": str(parent)}


@router.post("/fs/rename")
async def rename_node(payload: RenameNodeRequest) -> dict[str, str]:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    source = _normalize_path(payload.path)
    if not source.exists():
        raise HTTPException(status_code=404, detail="Path not found.")

    target = source.with_name(_sanitize_name(payload.new_name))
    target = _normalize_path(str(target))
    if target.exists():
        raise HTTPException(status_code=409, detail="Target already exists.")

    source.rename(target)
    return {
        "status": "renamed",
        "path": str(target),
        "old_path": str(source),
        "name": target.name,
        "parent_path": str(target.parent),
    }


@router.delete("/fs/node")
async def delete_node(path: str = Query(...)) -> dict[str, str]:
    if not settings.enable_server_file_browser:
        raise HTTPException(status_code=403, detail="Server file browser is disabled.")

    resolved = _normalize_path(path)
    if not resolved.exists():
        raise HTTPException(status_code=404, detail="Path not found.")

    parent = resolved.parent
    if resolved.is_dir():
        for _ in resolved.iterdir():
            raise HTTPException(status_code=400, detail="Directory must be empty before deletion.")
        resolved.rmdir()
    else:
        resolved.unlink()

    return {"status": "deleted", "path": str(resolved), "parent_path": str(parent)}


async def _watch_filesystem_polling(websocket: WebSocket, root_path: Path, watched_paths: list[Path]) -> None:
    previous_snapshot = {str(candidate): _directory_signature(candidate) for candidate in watched_paths}

    while True:
        await asyncio.sleep(1.0)
        current_snapshot = {str(candidate): _directory_signature(candidate) for candidate in watched_paths}
        changed_paths = [candidate for candidate, signature in current_snapshot.items() if signature != previous_snapshot.get(candidate)]
        if changed_paths:
            await websocket.send_json(
                {
                    "type": "fs_changed",
                    "root_path": str(root_path),
                    "watched_paths": [str(candidate) for candidate in watched_paths],
                    "changed_paths": changed_paths,
                    "events": [],
                    "changed_at": _utc_now(),
                }
            )
        previous_snapshot = current_snapshot


@router.websocket("/fs/watch")
async def watch_filesystem(
    websocket: WebSocket,
    path: str = Query(...),
    watch_path: list[str] = Query(default=[]),
) -> None:
    if not settings.enable_server_file_browser:
        await websocket.close(code=4403, reason="Server file browser is disabled.")
        return

    try:
        root_path = _normalize_path(path)
    except HTTPException as exc:
        await websocket.close(code=4403, reason=str(exc.detail))
        return

    if not root_path.exists() or not root_path.is_dir():
        await websocket.close(code=4404, reason="Directory not found.")
        return

    watched_paths = _watched_directory_paths(root_path, watch_path)

    await websocket.accept()
    await websocket.send_json(
        {
            "type": "fs_watch_ready",
            "root_path": str(root_path),
            "watched_paths": [str(candidate) for candidate in watched_paths],
            "changed_at": _utc_now(),
            "backend": "watchdog" if WATCHDOG_AVAILABLE else "polling",
        }
    )

    if not WATCHDOG_AVAILABLE:
        try:
            await _watch_filesystem_polling(websocket, root_path, watched_paths)
        except Exception:
            return
        return

    subscription = watch_manager.subscribe(root_path, watched_paths)
    try:
        while True:
            try:
                changed_events = await asyncio.wait_for(subscription.queue.get(), timeout=25.0)
                await websocket.send_json(
                    {
                        "type": "fs_changed",
                        "root_path": str(root_path),
                        "watched_paths": [str(candidate) for candidate in watched_paths],
                        "changed_paths": sorted(
                            {
                                event.get("path") or ""
                                for event in changed_events
                            }
                            | {
                                event.get("parent_path") or ""
                                for event in changed_events
                            }
                            | {
                                event.get("old_parent_path") or ""
                                for event in changed_events
                            }
                            - {""}
                        ),
                        "events": changed_events,
                        "changed_at": _utc_now(),
                    }
                )
            except asyncio.TimeoutError:
                await websocket.send_json(
                    {
                        "type": "fs_watch_ping",
                        "root_path": str(root_path),
                        "watched_paths": [str(candidate) for candidate in watched_paths],
                        "changed_at": _utc_now(),
                    }
                )
    except Exception:
        return
    finally:
        watch_manager.unsubscribe(subscription)
