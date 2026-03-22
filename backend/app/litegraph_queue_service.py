from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import re
from collections import deque
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, WebSocket

from app.config import Settings, get_settings


settings: Settings = get_settings()
queue_state_path = settings.litegraph_store_dir / "queue-state.json"

queue_items: dict[str, dict[str, Any]] = {}
queue_order: deque[str] = deque()
queue_lock = asyncio.Lock()
queue_event = asyncio.Event()
queue_worker_task: asyncio.Task[None] | None = None
queue_subscribers: set[WebSocket] = set()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return cleaned or "trainer-workflow"


def _public_queue_item(item: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in item.items() if k != "graph"}


def _persist_queue_state() -> None:
    payload = {
        "items": [_public_queue_item(queue_items[item_id]) | {"graph": queue_items[item_id].get("graph", {})} for item_id in queue_order if item_id in queue_items],
    }
    queue_state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_queue_state() -> None:
    if not queue_state_path.exists():
        return

    try:
        payload = json.loads(queue_state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    queue_items.clear()
    queue_order.clear()

    for raw_item in payload.get("items", []):
        if not isinstance(raw_item, dict) or "id" not in raw_item:
            continue
        item = dict(raw_item)
        if item.get("status") in {"queued", "running"}:
            item["status"] = "cancelled"
            item["cancel_requested"] = True
            item["cancellable"] = False
            item["updated_at"] = _utc_now()
            logs = list(item.get("logs") or [])
            logs.append("Recovered after restart; previous queued/running task marked cancelled.")
            item["logs"] = logs[-200:]
        queue_items[item["id"]] = item
        queue_order.append(item["id"])


def _extract_execution_metadata(graph: dict[str, Any]) -> dict[str, str]:
    checkpoint = "unknown"
    positive = ""
    negative = ""

    for node in graph.get("nodes", []):
        node_type = node.get("type")
        properties = node.get("properties", {}) or {}
        if node_type == "trainer/checkpoint":
            checkpoint = str(properties.get("checkpoint", checkpoint))
        elif node_type == "trainer/prompt":
            positive = str(properties.get("positive", positive))
            negative = str(properties.get("negative", negative))

    prompt = positive or "No prompt"
    if negative:
        prompt = f"{prompt} | negative: {negative}"
    return {
        "checkpoint": checkpoint,
        "prompt": prompt,
    }


def _preview_svg(prompt: str, checkpoint: str, workflow_name: str) -> str:
    digest = hashlib.sha256(f"{workflow_name}:{checkpoint}:{prompt}".encode("utf-8")).hexdigest()
    color_a = f"#{digest[:6]}"
    color_b = f"#{digest[6:12]}"
    color_c = f"#{digest[12:18]}"
    prompt_line = escape((prompt[:68] + "...") if len(prompt) > 68 else prompt)
    checkpoint_line = escape((checkpoint[:36] + "...") if len(checkpoint) > 36 else checkpoint)
    workflow_line = escape(workflow_name)
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="{color_a}" />
          <stop offset="55%" stop-color="{color_b}" />
          <stop offset="100%" stop-color="{color_c}" />
        </linearGradient>
      </defs>
      <rect width="720" height="420" rx="24" fill="#101215"/>
      <rect x="20" y="20" width="680" height="380" rx="18" fill="url(#bg)" opacity="0.92"/>
      <circle cx="610" cy="90" r="86" fill="rgba(255,255,255,0.18)"/>
      <circle cx="570" cy="130" r="124" fill="rgba(255,255,255,0.08)"/>
      <text x="48" y="72" fill="#ffffff" font-size="28" font-family="Arial, sans-serif" font-weight="700">{workflow_line}</text>
      <text x="48" y="118" fill="#e9f6ff" font-size="18" font-family="Arial, sans-serif">Checkpoint: {checkpoint_line}</text>
      <text x="48" y="162" fill="#f5fbff" font-size="18" font-family="Arial, sans-serif">{prompt_line}</text>
      <rect x="48" y="302" width="188" height="44" rx="12" fill="rgba(16,18,21,0.35)"/>
      <text x="68" y="330" fill="#ffffff" font-size="16" font-family="Arial, sans-serif">TrainerBoard Preview</text>
    </svg>
    """.strip()
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def create_queue_item(graph: dict[str, Any], workflow_name: str) -> dict[str, Any]:
    item_id = uuid4().hex
    metadata = _extract_execution_metadata(graph)
    return {
        "id": item_id,
        "workflow_name": _sanitize_name(workflow_name),
        "graph": graph,
        "status": "queued",
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
        "prompt": metadata["prompt"],
        "checkpoint": metadata["checkpoint"],
        "progress": 0,
        "cancellable": True,
        "cancel_requested": False,
        "preview_url": None,
        "result_summary": None,
        "logs": ["Queued workflow execution."],
        "error": None,
    }


async def _run_queue_item(item_id: str) -> None:
    async with queue_lock:
        item = queue_items[item_id]
        if item["status"] != "queued":
            return
        item["status"] = "running"
        item["progress"] = max(item.get("progress", 0), 5)
        item["cancellable"] = True
        item["cancel_requested"] = False
        item["updated_at"] = _utc_now()
        item["logs"].append("Execution started.")
        _persist_queue_state()
    await broadcast_queue_snapshot()

    async def update_progress(progress: int, message: str | None = None) -> bool:
        await asyncio.sleep(0.45)
        async with queue_lock:
            item = queue_items[item_id]
            if item["status"] == "cancelled" or item.get("cancel_requested"):
                item["status"] = "cancelled"
                item["cancellable"] = False
                item["cancel_requested"] = True
                item["updated_at"] = _utc_now()
                if not item["logs"] or item["logs"][-1] != "Execution cancelled.":
                    item["logs"].append("Execution cancelled.")
                _persist_queue_state()
                return False

            item["progress"] = progress
            item["updated_at"] = _utc_now()
            if message:
                item["logs"].append(message)
            _persist_queue_state()
        await broadcast_queue_snapshot()
        return True

    if not await update_progress(18, "Validating workflow graph."):
        await broadcast_queue_snapshot()
        return

    async with queue_lock:
        item = queue_items[item_id]
        metadata = _extract_execution_metadata(item["graph"])
        item["checkpoint"] = metadata["checkpoint"]
        item["prompt"] = metadata["prompt"]
        item["updated_at"] = _utc_now()
        item["logs"].append(f"Resolved checkpoint: {item['checkpoint']}")
        _persist_queue_state()
    await broadcast_queue_snapshot()

    if not await update_progress(42, "Preparing node execution plan."):
        await broadcast_queue_snapshot()
        return

    if not await update_progress(68, "Running simulated sampler steps."):
        await broadcast_queue_snapshot()
        return

    async with queue_lock:
        item = queue_items[item_id]
        if item["status"] == "cancelled" or item.get("cancel_requested"):
            item["status"] = "cancelled"
            item["cancellable"] = False
            item["cancel_requested"] = True
            item["updated_at"] = _utc_now()
            if not item["logs"] or item["logs"][-1] != "Execution cancelled.":
                item["logs"].append("Execution cancelled.")
        else:
            item["progress"] = 88
            item["updated_at"] = _utc_now()
            item["logs"].append("Synthesizing preview image.")
        _persist_queue_state()
    await broadcast_queue_snapshot()

    await asyncio.sleep(0.4)

    async with queue_lock:
        item = queue_items[item_id]
        if item["status"] == "cancelled" or item.get("cancel_requested"):
            item["status"] = "cancelled"
            item["cancellable"] = False
            item["cancel_requested"] = True
            item["updated_at"] = _utc_now()
            if not item["logs"] or item["logs"][-1] != "Execution cancelled.":
                item["logs"].append("Execution cancelled.")
        else:
            item["preview_url"] = _preview_svg(item["prompt"], item["checkpoint"], item["workflow_name"])
            item["result_summary"] = f"Completed simulated workflow run for {item['workflow_name']}."
            item["status"] = "completed"
            item["progress"] = 100
            item["cancellable"] = False
            item["updated_at"] = _utc_now()
            item["logs"].append("Execution finished.")
        _persist_queue_state()
    await broadcast_queue_snapshot()


async def _queue_worker() -> None:
    while True:
        await queue_event.wait()

        async with queue_lock:
            next_item_id = next(
                (item_id for item_id in reversed(queue_order) if queue_items[item_id]["status"] == "queued"),
                None,
            )
            if next_item_id is None:
                queue_event.clear()
                continue

        await _run_queue_item(next_item_id)


def ensure_queue_worker() -> None:
    global queue_worker_task

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return

    if queue_worker_task is None or queue_worker_task.done():
        queue_worker_task = loop.create_task(_queue_worker())


async def queue_snapshot() -> dict[str, Any]:
    async with queue_lock:
        items = [_public_queue_item(queue_items[item_id]) for item_id in queue_order]
        latest_completed = next((item["id"] for item in items if item["status"] == "completed"), None)
    return {
        "type": "queue_snapshot",
        "items": items,
        "latest_completed": latest_completed,
    }


async def broadcast_queue_snapshot() -> None:
    if not queue_subscribers:
        return
    payload = await queue_snapshot()
    stale: list[WebSocket] = []
    for websocket in list(queue_subscribers):
        try:
            await websocket.send_json(payload)
        except RuntimeError:
            stale.append(websocket)
    for websocket in stale:
        queue_subscribers.discard(websocket)


async def enqueue_workflow_run(graph: dict[str, Any], workflow_name: str) -> dict[str, Any]:
    ensure_queue_worker()
    item = create_queue_item(graph, workflow_name)
    async with queue_lock:
        queue_items[item["id"]] = item
        queue_order.appendleft(item["id"])
        queue_event.set()
        _persist_queue_state()
    await broadcast_queue_snapshot()
    return _public_queue_item(item)


async def list_queue_items() -> list[dict[str, Any]]:
    async with queue_lock:
        return [_public_queue_item(queue_items[item_id]) for item_id in queue_order]


async def get_queue_item(item_id: str) -> dict[str, Any]:
    async with queue_lock:
        item = queue_items.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found.")
        return _public_queue_item(item)


async def cancel_queue_item(item_id: str) -> dict[str, Any]:
    async with queue_lock:
        item = queue_items.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found.")

        if item["status"] in {"completed", "failed", "cancelled"}:
            return _public_queue_item(item)

        item["cancel_requested"] = True
        item["cancellable"] = False
        item["status"] = "cancelled"
        item["updated_at"] = _utc_now()
        item["logs"].append("Cancellation requested.")
        _persist_queue_state()

    await broadcast_queue_snapshot()
    return _public_queue_item(item)


async def retry_queue_item(item_id: str) -> dict[str, Any]:
    ensure_queue_worker()
    async with queue_lock:
        item = queue_items.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found.")

        next_item = create_queue_item(item.get("graph", {}), item.get("workflow_name", "trainer-workflow"))
        next_item["logs"] = [f"Retried from queue item {item_id}."]
        queue_items[next_item["id"]] = next_item
        queue_order.appendleft(next_item["id"])
        queue_event.set()
        _persist_queue_state()

    await broadcast_queue_snapshot()
    return _public_queue_item(next_item)


async def clear_queue_items(mode: str) -> list[dict[str, Any]]:
    normalized_mode = mode.strip().lower() or "finished"
    if normalized_mode not in {"finished", "all"}:
        raise HTTPException(status_code=400, detail="Unsupported clear mode.")

    async with queue_lock:
        removable_statuses = {"completed", "failed", "cancelled"} if normalized_mode == "finished" else {"queued", "running", "completed", "failed", "cancelled"}
        removable_ids = [item_id for item_id in list(queue_order) if queue_items.get(item_id, {}).get("status") in removable_statuses]

        for item_id in removable_ids:
            queue_items.pop(item_id, None)

        next_order = deque(item_id for item_id in queue_order if item_id in queue_items)
        queue_order.clear()
        queue_order.extend(next_order)
        if any(queue_items[item_id]["status"] == "queued" for item_id in queue_order):
            queue_event.set()
        else:
            queue_event.clear()
        _persist_queue_state()
        items = [_public_queue_item(queue_items[item_id]) for item_id in queue_order]

    await broadcast_queue_snapshot()
    return items


async def register_queue_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    queue_subscribers.add(websocket)
    await websocket.send_json(await queue_snapshot())


def unregister_queue_socket(websocket: WebSocket) -> None:
    queue_subscribers.discard(websocket)


_load_queue_state()
