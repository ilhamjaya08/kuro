# Kuro Installation Script for Windows
# Run as Administrator

param(
    [string]$InstallPath = "$env:ProgramFiles\Kuro"
)

$ErrorActionPreference = "Stop"

$REPO = "ilhamjaya08/kuro"
$BINARY_NAME = "kuro.exe"

Write-Host @"
     /$$   /$$ /$$   /$$ /$$$$$$$   /$$$$$$
    | `$`$  /`$`$/| `$`$  | `$`$| `$`$__  `$`$ /`$`$__  `$`$
    | `$`$ /`$`$/ | `$`$  | `$`$| `$`$  \ `$`$| `$`$  \ `$`$
    | `$`$`$`$`$/  | `$`$  | `$`$| `$`$`$`$`$`$`$/| `$`$  | `$`$
    | `$`$  `$`$  | `$`$  | `$`$| `$`$__  `$`$| `$`$  | `$`$
    | `$`$\  `$`$ | `$`$  | `$`$| `$`$  \ `$`$| `$`$  | `$`$
    | `$`$ \  `$`$|  `$`$`$`$`$`$/| `$`$  | `$`$|  `$`$`$`$`$/
    |__/  \__/ \______/ |__/  |__/ \______/

    Background HTTP Cron Scheduler
    Installation Script for Windows
"@ -ForegroundColor Cyan

Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
Write-Host "✓ Detected architecture: $arch" -ForegroundColor Green

$downloadUrl = "https://github.com/$REPO/releases/download/beta/kuro-windows-$arch.exe"

Write-Host "Downloading Kuro binary..." -ForegroundColor Cyan

try {
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    $binaryPath = Join-Path $InstallPath $BINARY_NAME

    Invoke-WebRequest -Uri $downloadUrl -OutFile $binaryPath -UseBasicParsing

    Write-Host "✓ Binary downloaded" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download binary: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Adding Kuro to PATH..." -ForegroundColor Cyan

$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$InstallPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallPath", "Machine")
    Write-Host "✓ Added to PATH" -ForegroundColor Green
} else {
    Write-Host "✓ Already in PATH" -ForegroundColor Green
}

Write-Host "Checking for NSSM (Non-Sucking Service Manager)..." -ForegroundColor Cyan

if (Get-Command nssm -ErrorAction SilentlyContinue) {
    Write-Host "✓ NSSM found, creating service..." -ForegroundColor Green

    $serviceName = "Kuro"
    if (Get-Service $serviceName -ErrorAction SilentlyContinue) {
        nssm stop $serviceName
        nssm remove $serviceName confirm
    }

    nssm install $serviceName $binaryPath "--daemon"
    nssm set $serviceName AppDirectory $InstallPath
    nssm set $serviceName DisplayName "Kuro Daemon"
    nssm set $serviceName Description "Background HTTP Cron Scheduler"
    nssm set $serviceName Start SERVICE_AUTO_START

    nssm start $serviceName

    Write-Host "✓ Service created and started" -ForegroundColor Green
} else {
    Write-Host "⚠ NSSM not found. Service not created." -ForegroundColor Yellow
    Write-Host "  You can install NSSM from: https://nssm.cc/" -ForegroundColor Yellow
    Write-Host "  Or run 'kuro --daemon' manually" -ForegroundColor Yellow
}

Write-Host "Verifying installation..." -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")

if (Test-Path $binaryPath) {
    Write-Host "✓ Kuro installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "Open a new terminal and run 'kuro' to get started." -ForegroundColor Cyan
    Write-Host "(You may need to restart your terminal for PATH changes to take effect)" -ForegroundColor Yellow
} else {
    Write-Host "✗ Installation verification failed" -ForegroundColor Red
    exit 1
}
