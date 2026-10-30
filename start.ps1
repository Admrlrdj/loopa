# Menjalankan backend (8000) dan web (3000). Pakai: powershell -ExecutionPolicy Bypass -File start.ps1
# Opsi: -Scenario drowsy  -> mock memicu alert (untuk uji alur tanpa model)
param([string]$Scenario = "normal")
$root = $PSScriptRoot
$py = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) { Write-Error "Buat venv dulu: cd backend; py -m venv .venv; .venv\Scripts\pip install -r requirements.txt"; exit 1 }
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) { Push-Location (Join-Path $root "frontend"); npm install; Pop-Location }

$env:MOCK_SCENARIO = $Scenario
Start-Process -WorkingDirectory (Join-Path $root "backend") -FilePath $py -ArgumentList "-m","uvicorn","app.main:app","--port","8000"
Start-Process -WorkingDirectory (Join-Path $root "frontend") -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next","dev","-p","3000"
Write-Host "Backend: http://localhost:8000/docs   Web: http://localhost:3000"
