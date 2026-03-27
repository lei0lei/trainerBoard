# TrainerBoard

TrainerBoard is a unified **PWA frontend + FastAPI backend** workspace.

## Goals

- one frontend, connect to **local or remote** backends
- one backend contract for HTTP / WebSocket / SSH proxy
- same interaction model for:
  - local Windows development: PWA -> `localhost`
  - remote Linux deployment: PWA -> `https://host`
- plugin-oriented workbench UI

---

## Architecture

```text
frontend/   Next.js App Router, exported as a PWA-oriented static frontend
backend/    FastAPI service, filesystem / litegraph / terminal / SSH proxy
scripts/    local helper scripts
Dockerfile  Linux container build
```

### Runtime model

```text
PWA frontend
  -> HTTP API
  -> WebSocket
  -> FastAPI backend
       -> filesystem
       -> LiteGraph queue
       -> terminal proxy
       -> SSH proxy
```

The frontend can store multiple backend profiles and switch between them.

---

## Repository structure

```text
.
|- frontend/
|  |- src/
|  |  `- components/workbench/
|  |     |- core/               # workbench core, store, connection layer, contracts
|  |     `- plugins/            # builtin plugins + extensions
|  `- scripts/                  # plugin registry generation
|- backend/
|  |- app/                      # FastAPI app modules
|  |- requirements.txt
|  `- run.py
|- scripts/
|  |- start-local.ps1           # local Windows helper
|  `- start-local.sh            # local Linux/macOS helper
|- Dockerfile
`- README.md
```

---

## Environment modes

Only two main modes are kept now.

### 1. Development

Backend example:
- `backend/.env.development.example`

Frontend example:
- `frontend/.env.development.example`

Use this when:
- frontend runs with `npm run dev`
- backend runs with `python run.py`
- Next.js rewrites `/api/*` to `BACKEND_DEV_ORIGIN`

### 2. Linux / deployed backend

Backend example:
- `backend/.env.linux.example`

Frontend example:
- `frontend/.env.linux.example`

Use this when:
- frontend is built as static assets
- FastAPI serves `/api/*`
- PWA can connect to local or remote backend profiles

---

## Backend configuration highlights

Important backend env vars:

- `APP_ENV`
- `APP_HOST`
- `APP_PORT`
- `APP_INSTANCE_NAME`
- `APP_INSTANCE_ID`
- `SERVE_FRONTEND`
- `ALLOW_DEV_CORS`
- `CORS_ALLOWED_ORIGINS`
- `ENABLE_TERMINAL`
- `TERMINAL_SSH_HOST`
- `TERMINAL_SSH_PORT`
- `TERMINAL_SSH_USERNAME`
- `TERMINAL_SSH_PASSWORD`
- `TERMINAL_SSH_KEY_PATH`
- `TERMINAL_SSH_SHELL`

The backend now exposes richer metadata through:

- `GET /api/health`
- `GET /api/capabilities`
- `GET /api/terminal/capabilities`

---

## Local development

### 1. Start backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

Default backend address:

- `http://127.0.0.1:8000`

### 2. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend address:

- `http://127.0.0.1:3000`

### 3. Optional helper scripts

Windows:

```powershell
./scripts/start-local.ps1
```

Linux / macOS:

```bash
bash ./scripts/start-local.sh
```

---

## Production / remote deployment

Build frontend:

```bash
cd frontend
npm install
npm run build
```

Run backend:

```bash
cd backend
pip install -r requirements.txt
python run.py
```

If `SERVE_FRONTEND=true`, FastAPI serves the exported frontend from `frontend/out`.

You can also deploy the frontend statically behind Nginx and connect it to one or more FastAPI instances.

---

## Docker

```bash
docker build -t trainerboard .
docker run -p 8000:8000 trainerboard
```

---

## Current direction

- unified local/remote architecture
- no desktop shell as primary path
- SSH access goes through **backend WebSocket proxy**, not direct browser SSH
- workbench features stay plugin-oriented

---

## Validation

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
python -m compileall backend/app
```
