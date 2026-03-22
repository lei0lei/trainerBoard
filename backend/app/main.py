from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.fs_api import router as filesystem_router
from app.litegraph_api import router as litegraph_router
from app.terminal_api import router as terminal_router


settings = get_settings()
FRONTEND_OUT_DIR = settings.frontend_out_dir

app = FastAPI(title="TrainerBoard API", version="0.1.0")
app.include_router(filesystem_router)
app.include_router(litegraph_router)
app.include_router(terminal_router)

if settings.allow_dev_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "trainerboard-fastapi",
        "version": "0.1.0",
    }


if settings.serve_frontend and FRONTEND_OUT_DIR.exists():
    assets_dir = FRONTEND_OUT_DIR / "_next"
    if assets_dir.exists():
        app.mount("/_next", StaticFiles(directory=assets_dir), name="next-assets")

    @app.get("/", include_in_schema=False)
    async def index() -> FileResponse:
        return FileResponse(FRONTEND_OUT_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend_files(full_path: str) -> FileResponse:
        requested_path = FRONTEND_OUT_DIR / full_path
        if requested_path.is_file():
            return FileResponse(requested_path)

        nested_index = requested_path / "index.html"
        if nested_index.is_file():
            return FileResponse(nested_index)

        fallback_index = FRONTEND_OUT_DIR / "index.html"
        if fallback_index.exists():
            return FileResponse(fallback_index)

        raise HTTPException(status_code=404, detail="Frontend build not found.")
