# TrainerBoard Template

A unified **Next.js + shadcn/ui + FastAPI** starter that supports:

- Web development on Windows/macOS/Linux
- Linux deployment through a browser
- Windows desktop packaging with `pywebview + PyInstaller`

## Stack

- Frontend: Next.js App Router + Tailwind CSS + shadcn-style structure
- Backend: FastAPI
- Desktop: embedded FastAPI + pywebview
- Deployment: Docker for Linux, PyInstaller for Windows

## Project structure

```text
.
|- frontend/                # Next.js frontend
|- backend/                 # FastAPI backend
|- desktop/                 # Windows desktop entry
|- scripts/                 # helper scripts
|- Dockerfile               # Linux container build
`- README.md
```

## Requirements

- Node.js 20+
- npm 10+
- Python 3.10+

---

## Environment modes

This template now includes 3 preset environment examples.

### 1) Development

Frontend:

- `frontend/.env.development.example`
- Next.js always requests `/api/*`
- During `npm run dev`, Next.js rewrites `/api/*` to `BACKEND_DEV_ORIGIN`

Backend:

- `backend/.env.development.example`
- default host: `0.0.0.0`
- default port: `8000`
- frontend static serving: off

### 2) Linux

Frontend:

- `frontend/.env.linux.example`
- uses relative `/api/*`

Backend:

- `backend/.env.linux.example`
- default host: `0.0.0.0`
- default port: `8000`
- frontend static serving: on

### 3) Desktop

Frontend:

- `frontend/.env.desktop.example`
- uses relative `/api/*`

Backend/Desktop:

- `backend/.env.desktop.example`
- host: `127.0.0.1`
- port: `0` meaning auto-select a free localhost port
- frontend static serving: on

---

## Development run

### Frontend

```bash
cd frontend
npm install
# Copy frontend/.env.development.example to frontend/.env.local if needed
npm run dev
```

Frontend runs on:

- `http://127.0.0.1:3000`

Static preview after build:

```bash
cd frontend
npm run build
npm run start
```

> Because this project uses `output: export`, `next start` is not valid. `npm run start` now serves the generated `out/` directory as a static preview.

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
# Copy backend/.env.development.example to backend/.env if needed
python run.py
```

Backend runs on:

- `http://127.0.0.1:8000`

Health endpoint:

- `GET /api/health`

> In development, the frontend still calls `/api/health`; Next.js rewrites that request to the FastAPI server.

---

## Linux web deployment

Build frontend:

```bash
cd frontend
npm install
npm run build
```

Then run backend:

```bash
cd backend
pip install -r requirements.txt
# Copy backend/.env.linux.example to backend/.env if needed
python run.py
```

FastAPI will serve `frontend/out` and expose both:

- `/api/*`
- frontend static pages

---

## Docker deployment

```bash
docker build -t trainerboard-template .
docker run -p 8000:8000 trainerboard-template
```

Open:

- `http://127.0.0.1:8000`

---

## Windows desktop packaging

Install desktop dependencies:

```bash
pip install -r desktop/requirements.txt
```

Build:

```powershell
./scripts/build-windows.ps1
```

Output:

- `dist/TrainerBoard/`

Desktop behavior:

- frontend and backend are packaged together
- FastAPI starts inside the app
- the desktop app auto-selects a free localhost port
- pywebview opens that local URL

---

## Notes

- Frontend API requests are now **relative-path first**.
- Development mode uses a Next.js rewrite instead of a hardcoded public API URL.
- Desktop mode no longer hardcodes port `8000`; it uses an available localhost port automatically.

If you want, I can continue next with:

1. login page
2. dashboard layout
3. SQLite/PostgreSQL integration
4. Docker Compose
5. one-click dev startup scripts
