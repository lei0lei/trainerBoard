import os
import socket
import sys
import threading
import time
import urllib.request
from pathlib import Path

import uvicorn
import webview


BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("APP_ENV", "desktop")

from backend.app.main import app  # noqa: E402
from backend.app.config import get_settings  # noqa: E402


def find_free_port(host: str) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def wait_until_ready(url: str, timeout: float = 15.0) -> None:
    started_at = time.time()
    while time.time() - started_at < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1):
                return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError(f"Server did not start in time: {url}")


def main() -> None:
    settings = get_settings()
    host = settings.app_host
    port = settings.app_port if settings.app_port != 0 else find_free_port(host)
    base_url = f"http://{host}:{port}"

    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    wait_until_ready(f"{base_url}/api/health")

    webview.create_window(
        title="TrainerBoard",
        url=base_url,
        width=1280,
        height=800,
        min_size=(1100, 720),
    )
    webview.start(debug=False)

    server.should_exit = True
    server_thread.join(timeout=3)


if __name__ == "__main__":
    main()
