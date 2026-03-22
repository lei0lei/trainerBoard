from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app import litegraph_queue_service as queue_service


router = APIRouter(prefix="/api/litegraph", tags=["litegraph"])
settings: Settings = get_settings()
workflows_dir = settings.litegraph_store_dir / "workflows"
workflows_dir.mkdir(parents=True, exist_ok=True)


class SaveWorkflowRequest(BaseModel):
    graph: dict[str, Any]


class QueueRunRequest(BaseModel):
    graph: dict[str, Any]
    workflow_name: str = Field(default="trainer-workflow")


class ClearQueueRequest(BaseModel):
    mode: str = Field(default="finished")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return cleaned or "trainer-workflow"


def _workflow_path(name: str) -> Path:
    safe = _sanitize_name(name)
    path = (workflows_dir / f"{safe}.json").resolve()
    try:
        path.relative_to(workflows_dir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid workflow name.") from exc
    return path


@router.get("/workflows")
async def list_workflows() -> dict[str, list[dict[str, Any]]]:
    items = []
    for path in sorted(workflows_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        items.append(
            {
                "name": path.stem,
                "updated_at": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
                "size": path.stat().st_size,
            }
        )
    return {"items": items}


@router.get("/workflows/{workflow_name}")
async def load_workflow(workflow_name: str) -> dict[str, Any]:
    path = _workflow_path(workflow_name)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found.")

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Workflow file is invalid JSON.") from exc

    return {
        "name": path.stem,
        "graph": payload,
    }


@router.put("/workflows/{workflow_name}")
async def save_workflow(workflow_name: str, payload: SaveWorkflowRequest) -> dict[str, Any]:
    path = _workflow_path(workflow_name)
    path.write_text(json.dumps(payload.graph, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "status": "saved",
        "name": path.stem,
        "updated_at": _utc_now(),
    }


@router.post("/queue")
async def enqueue_workflow(payload: QueueRunRequest) -> dict[str, Any]:
    return {"item": await queue_service.enqueue_workflow_run(payload.graph, payload.workflow_name)}


@router.get("/queue")
async def list_queue() -> dict[str, list[dict[str, Any]]]:
    return {"items": await queue_service.list_queue_items()}


@router.get("/queue/{item_id}")
async def get_queue_item(item_id: str) -> dict[str, Any]:
    return {"item": await queue_service.get_queue_item(item_id)}


@router.post("/queue/{item_id}/cancel")
async def cancel_queue_item(item_id: str) -> dict[str, Any]:
    return {"item": await queue_service.cancel_queue_item(item_id)}


@router.post("/queue/{item_id}/retry")
async def retry_queue_item(item_id: str) -> dict[str, Any]:
    return {"item": await queue_service.retry_queue_item(item_id)}


@router.post("/queue/clear")
async def clear_queue(payload: ClearQueueRequest) -> dict[str, list[dict[str, Any]]]:
    return {"items": await queue_service.clear_queue_items(payload.mode)}


@router.websocket("/ws")
async def queue_socket(websocket: WebSocket) -> None:
    await queue_service.register_queue_socket(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        queue_service.unregister_queue_socket(websocket)
