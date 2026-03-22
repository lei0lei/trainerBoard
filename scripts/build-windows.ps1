$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot/.."

Write-Host "[1/4] Build frontend..." -ForegroundColor Cyan
Push-Location "$ProjectRoot/frontend"
npm install
npm run build
Pop-Location

Write-Host "[2/4] Install desktop dependencies..." -ForegroundColor Cyan
Push-Location "$ProjectRoot/desktop"
pip install -r requirements.txt
Pop-Location

Write-Host "[3/4] Package Windows desktop app..." -ForegroundColor Cyan
Push-Location $ProjectRoot
pyinstaller `
  --noconfirm `
  --name TrainerBoard `
  --windowed `
  --paths . `
  --add-data "backend;backend" `
  --add-data "frontend/out;frontend/out" `
  desktop/main.py
Pop-Location

Write-Host "[4/4] Done: dist/TrainerBoard" -ForegroundColor Green
