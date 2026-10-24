#Requires -Version 5.1
<#
.SYNOPSIS
  One-click Nexora installer for Discord Stable (Windows).

.DESCRIPTION
  Downloads the latest Nexora build from GitHub Releases, then patches Discord
  using the Vencord Installer CLI. No Node.js / git / pnpm required.
#>

$ErrorActionPreference = "Stop"

$Repo = "justhereforagoodtime42/dcc"
$ReleaseTag = "nexora-latest"
$InstallRoot = Join-Path $env:LOCALAPPDATA "NexoraClient"
$ZipUrl = "https://github.com/$Repo/releases/download/$ReleaseTag/Nexora-Windows.zip"
$InstallerUrl = "https://github.com/Vencord/Installer/releases/latest/download/VencordInstallerCli.exe"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Assert-Windows {
    if ($env:OS -ne "Windows_NT") {
        throw "This installer only supports Windows."
    }
}

function Stop-Discord {
    Write-Step "Closing Discord (if running)…"
    Get-Process -Name "Discord", "DiscordPTB", "DiscordCanary" -ErrorAction SilentlyContinue |
        ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch { }
        }
    Start-Sleep -Seconds 1
}

function Ensure-DiscordStable {
    $discord = Join-Path $env:LOCALAPPDATA "Discord"
    if (-not (Test-Path $discord)) {
        throw "Discord Stable not found at $discord. Install Discord from https://discord.com/download first, open it once, then re-run this installer."
    }
}

function Download-File($Url, $OutFile) {
    Write-Host "    $Url"
    $dir = Split-Path $OutFile -Parent
    if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    # Prefer curl.exe (Windows 10+) for reliable redirects; fall back to Invoke-WebRequest
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
        & curl.exe -fsSL -L -o $OutFile $Url
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
    } else {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
    }
}

function Expand-NexoraZip($ZipPath, $Dest) {
    if (Test-Path $Dest) {
        Remove-Item $Dest -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    Expand-Archive -Path $ZipPath -DestinationPath $Dest -Force

    # Support both "dist/..." at root and nested layouts
    if (-not (Test-Path (Join-Path $Dest "dist\patcher.js"))) {
        $found = Get-ChildItem $Dest -Recurse -Filter "patcher.js" -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($found) {
            $distDir = Split-Path $found.FullName -Parent
            $parent = Split-Path $distDir -Parent
            if ((Split-Path $distDir -Leaf) -eq "dist") {
                # Move contents up if zip nested an extra folder
                if ($parent -ne $Dest) {
                    Get-ChildItem $parent | ForEach-Object {
                        Move-Item $_.FullName -Destination $Dest -Force
                    }
                }
            }
        }
    }

    if (-not (Test-Path (Join-Path $Dest "dist\patcher.js"))) {
        throw "Downloaded zip is missing dist/patcher.js — release may be incomplete. Try again later."
    }
}

function Get-InstallerCli($DestDir) {
    $bin = Join-Path $DestDir "Installer\VencordInstallerCli.exe"
    New-Item -ItemType Directory -Force -Path (Split-Path $bin) | Out-Null
    Download-File $InstallerUrl $bin
    return $bin
}

function Install-IntoDiscord($InstallRoot, $Cli) {
    Write-Step "Patching Discord Stable…"
    $env:VENCORD_USER_DATA_DIR = $InstallRoot
    $env:VENCORD_DEV_INSTALL = "1"
    $env:NEXORA_USER_DATA_DIR = Join-Path $env:APPDATA "Nexora"

    $p = Start-Process -FilePath $Cli -ArgumentList @("-install", "-branch", "stable") -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) {
        throw "Installer exited with code $($p.ExitCode). If Discord was already modded, uninstall the other mod first, then re-run."
    }
}

# --- main ---
try {
    Assert-Windows
    Write-Host "Nexora one-click installer" -ForegroundColor Green
    Write-Host "Install folder: $InstallRoot"

    Ensure-DiscordStable
    Stop-Discord

    $tmp = Join-Path $env:TEMP ("nexora-install-" + [guid]::NewGuid().ToString("n"))
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $zip = Join-Path $tmp "Nexora-Windows.zip"

    Write-Step "Downloading Nexora build…"
    Download-File $ZipUrl $zip

    Write-Step "Extracting to $InstallRoot…"
    Expand-NexoraZip $zip $InstallRoot

    Write-Step "Downloading Vencord Installer CLI…"
    $cli = Get-InstallerCli $InstallRoot

    Install-IntoDiscord $InstallRoot $cli

    Write-Step "Done!"
    Write-Host ""
    Write-Host "Open Discord. You should see Nexora in settings." -ForegroundColor Green
    Write-Host "Bundled themes land in %AppData%\Nexora\themes on first launch."
    Write-Host "Keep this folder: $InstallRoot (Discord loads Nexora from here)."
    Write-Host ""
    Write-Host "Later: restart Discord to pick up Nexora updates automatically."
    Write-Host "If Discord itself updates and breaks the patch, run this installer again."
}
catch {
    Write-Host ""
    Write-Host "Install failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($tmp -and (Test-Path $tmp)) {
        Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
