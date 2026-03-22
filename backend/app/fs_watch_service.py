from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
from pathlib import Path
from threading import RLock
from typing import TYPE_CHECKING, Any

try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler
    from watchdog.observers import Observer

    WATCHDOG_AVAILABLE = True
except Exception:  # pragma: no cover - optional runtime fallback
    FileSystemEvent = object  # type: ignore[assignment]

    class FileSystemEventHandler:  # type: ignore[no-redef]
        pass

    Observer = None  # type: ignore[assignment]
    WATCHDOG_AVAILABLE = False


if TYPE_CHECKING:
    from watchdog.observers.api import BaseObserver
else:
    BaseObserver = object


WATCHABLE_EVENT_TYPES = {"created", "deleted", "modified", "moved"}


@dataclass(slots=True)
class FileSystemWatchEventPayload:
    event_type: str
    path: str
    is_directory: bool
    parent_path: str | None = None
    old_path: str | None = None
    old_parent_path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        return {key: value for key, value in payload.items() if value is not None}


@dataclass(slots=True, eq=False)
class WatchSubscription:
    root_path: Path
    watch_paths: tuple[Path, ...]
    queue: asyncio.Queue[list[dict[str, Any]]] = field(default_factory=asyncio.Queue)
    loop: asyncio.AbstractEventLoop = field(default_factory=asyncio.get_running_loop)

    def enqueue(self, events: list[FileSystemWatchEventPayload]) -> None:
        relevant = [event.to_dict() for event in events if _matches_watch_event(event, self.watch_paths)]
        if not relevant:
            return
        self.loop.call_soon_threadsafe(self.queue.put_nowait, relevant)


class WorkspaceWatchHandler(FileSystemEventHandler):
    def __init__(self, entry: "WorkspaceWatchEntry") -> None:
        self.entry = entry

    def on_any_event(self, event: FileSystemEvent) -> None:  # pragma: no cover - watchdog callback
        event_type = getattr(event, "event_type", None)
        if event_type not in WATCHABLE_EVENT_TYPES:
            return
        changed_events = _event_payloads(self.entry.root_path, event)
        if changed_events:
            self.entry.dispatch(changed_events)


@dataclass(slots=True)
class WorkspaceWatchEntry:
    root_path: Path
    observer: BaseObserver
    handler: WorkspaceWatchHandler
    subscriptions: set[WatchSubscription] = field(default_factory=set)

    def dispatch(self, events: list[FileSystemWatchEventPayload]) -> None:
        for subscription in list(self.subscriptions):
            subscription.enqueue(events)


class FileSystemWatchManager:
    def __init__(self) -> None:
        self._entries: dict[str, WorkspaceWatchEntry] = {}
        self._lock = RLock()

    def subscribe(self, root_path: Path, watch_paths: list[Path]) -> WatchSubscription:
        subscription = WatchSubscription(root_path=root_path, watch_paths=tuple(_normalize_watch_paths(root_path, watch_paths)))
        with self._lock:
            entry = self._entries.get(str(root_path))
            if entry is None:
                entry = self._create_entry(root_path)
                self._entries[str(root_path)] = entry
            entry.subscriptions.add(subscription)
        return subscription

    def unsubscribe(self, subscription: WatchSubscription) -> None:
        key = str(subscription.root_path)
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return
            entry.subscriptions.discard(subscription)
            if entry.subscriptions:
                return
            try:
                entry.observer.stop()
                entry.observer.join(timeout=1.0)
            finally:
                self._entries.pop(key, None)

    def _create_entry(self, root_path: Path) -> WorkspaceWatchEntry:
        if not WATCHDOG_AVAILABLE or Observer is None:
            raise RuntimeError("watchdog is not available")
        observer = Observer()
        handler = WorkspaceWatchHandler(None)  # type: ignore[arg-type]
        entry = WorkspaceWatchEntry(root_path=root_path, observer=observer, handler=handler)
        handler.entry = entry
        observer.schedule(handler, str(root_path), recursive=True)
        observer.start()
        return entry


watch_manager = FileSystemWatchManager()


def _normalize_watch_paths(root_path: Path, watch_paths: list[Path]) -> list[Path]:
    items = {root_path}
    for watch_path in watch_paths:
        if _is_relative_to(watch_path, root_path):
            items.add(watch_path)
    return sorted(items, key=lambda item: (len(item.parts), str(item).lower()))


def _is_relative_to(path: Path, base: Path) -> bool:
    try:
        path.relative_to(base)
        return True
    except ValueError:
        return False


def _matches_watch_event(event: FileSystemWatchEventPayload, watch_paths: tuple[Path, ...]) -> bool:
    candidate_paths = [event.path, event.old_path, event.parent_path, event.old_parent_path]
    for raw_path in candidate_paths:
        if not raw_path:
            continue
        candidate = Path(raw_path)
        for watch_path in watch_paths:
            if _is_relative_to(candidate, watch_path) or _is_relative_to(watch_path, candidate):
                return True
    return False


def _normalize_event_path(root_path: Path, raw_path: str | None) -> Path | None:
    if not raw_path:
        return None
    candidate = Path(raw_path).resolve(strict=False)
    if _is_relative_to(candidate, root_path):
        return candidate
    return None


def _event_payloads(root_path: Path, event: FileSystemEvent) -> list[FileSystemWatchEventPayload]:
    event_type = getattr(event, "event_type", None)
    is_directory = bool(getattr(event, "is_directory", False))
    src = _normalize_event_path(root_path, getattr(event, "src_path", None))
    dest = _normalize_event_path(root_path, getattr(event, "dest_path", None))

    if event_type == "moved":
        target_path = dest or src or root_path
        return [
            FileSystemWatchEventPayload(
                event_type="moved",
                path=str(target_path),
                old_path=str(src) if src else None,
                is_directory=is_directory,
                parent_path=str(target_path.parent) if target_path != root_path else str(root_path),
                old_parent_path=str(src.parent) if src else None,
            )
        ]

    target_path = src or dest or root_path
    return [
        FileSystemWatchEventPayload(
            event_type=str(event_type or "modified"),
            path=str(target_path),
            is_directory=is_directory,
            parent_path=str(target_path.parent) if target_path != root_path else str(root_path),
        )
    ]
