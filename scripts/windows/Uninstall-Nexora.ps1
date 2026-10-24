#Requires -Version 5.1
<#
.SYNOPSIS
  Removes the Nexora / Vencord-style patch from Discord Stable (Windows).
#>

$ErrorActionPreference = "Stop"

$InstallRoot = Join-Path $env:LOCALAPPDATA "NexoraClient"
$InstallerUrl = "https://github.com/Vencord/Installer/releases/latest/download/VencordInstallerCli.exe"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Download-File($Url, $OutFile) {
    $dir = Split-Path $OutFile -Parent
    if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
        & curl.exe -fsSL -L -o $OutFile $Url
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
    } else {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
    }
}

try {
    Write-Host "Nexora uninstall" -ForegroundColor Yellow

    Get-Process -Name "Discord", "DiscordPTB", "DiscordCanary" -ErrorAction SilentlyContinue |
        ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch { } }

    $cli = Join-Path $InstallRoot "Installer\VencordInstallerCli.exe"
    if (-not (Test-Path $cli)) {
        Write-Step "Installer CLI missing — downloading…"
        New-Item -ItemType Directory -Force -Path (Split-Path $cli) | Out-Null
        Download-File $InstallerUrl $cli
    }

    if (Test-Path (Join-Path $InstallRoot "dist\patcher.js")) {
        $env:VENCORD_USER_DATA_DIR = $InstallRoot
        $env:VENCORD_DEV_INSTALL = "1"
    }

    Write-Step "Unpatching Discord Stable…"
    $p = Start-Process -FilePath $cli -ArgumentList @("-uninstall", "-branch", "stable") -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) {
        Write-Host "Uninstaller exit code $($p.ExitCode) (Discord may already be stock)." -ForegroundColor Yellow
    }

    Write-Step "Done. Discord should be stock again."
    Write-Host "Optional: delete $InstallRoot if you want to free disk space."
    Write-Host "Your themes/settings in %AppData%\Nexora were NOT deleted."
}
catch {
    Write-Host "Uninstall failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
