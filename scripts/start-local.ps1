param(
  [switch]$NoFrontend,
  [switch]$NoBackend
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot/.."

if (-not $NoBackend) {
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$ProjectRoot/backend'; if (Test-Path .venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 }; python run.py"
  ) | Out-Null
}

if (-not $NoFrontend) {
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$ProjectRoot/frontend'; npm run dev"
  ) | Out-Null
}
