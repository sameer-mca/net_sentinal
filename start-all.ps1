# ==============================================================================
# NetSentinel Startup Orchestrator (Windows PowerShell)
# ==============================================================================
# Opens three independent terminal windows for the complete NetSentinel stack:
# 1. Backend Server (Express + Socket.io on port 5000)
# 2. Capture & Detection Engine (Python 3.10+ Scapy / Simulator)
# 3. Web Dashboard (React + Vite on port 5173)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Starting NetSentinel Intrusion Detection System    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend API & Socket.io Server
$backendDir = Join-Path $scriptDir "backend"
Write-Host "[1/3] Launching Backend Server on port 5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    `$Host.UI.RawUI.WindowTitle = 'NetSentinel - Backend API Server (Port 5000)';
    Write-Host '>>> NetSentinel Backend Server' -ForegroundColor Cyan;
    Set-Location '$backendDir';
    npm run dev
"

# 2. Start Python Capture & Detection Engine
$captureDir = Join-Path $scriptDir "capture"
Write-Host "[2/3] Launching Python Packet Capture & Threat Engine..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    `$Host.UI.RawUI.WindowTitle = 'NetSentinel - Python Capture Engine';
    Write-Host '>>> NetSentinel Packet Capture & Intrusion Detection Service' -ForegroundColor Yellow;
    Write-Host 'NOTE: Live packet capture requires Npcap and Administrator privileges.' -ForegroundColor Magenta;
    Write-Host '      If capturing live wire traffic, relaunch this terminal as Administrator.' -ForegroundColor Magenta;
    Set-Location '$captureDir';
    if (Test-Path '.\venv\Scripts\Activate.ps1') {
        .\venv\Scripts\Activate.ps1
    }
    python -u main.py
"

# 3. Start React Frontend Dashboard
$frontendDir = Join-Path $scriptDir "frontend"
Write-Host "[3/3] Launching React Web Dashboard on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    `$Host.UI.RawUI.WindowTitle = 'NetSentinel - React Web Dashboard (Port 5173)';
    Write-Host '>>> NetSentinel React Frontend' -ForegroundColor Green;
    Set-Location '$frontendDir';
    npm run dev
"

Write-Host "`nAll three NetSentinel services are launching in separate windows." -ForegroundColor Green
Write-Host "Web Dashboard URL: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API URL:   http://localhost:5000/api" -ForegroundColor White
Write-Host "Default Admin:     admin@netsentinel.local / Admin@12345`n" -ForegroundColor Gray
