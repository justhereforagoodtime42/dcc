@echo off
setlocal
title Nexora Installer
cd /d "%~dp0"

echo.
echo  Nexora one-click installer
echo  -------------------------
echo  Quit Discord completely before continuing.
echo.

REM Prefer the PowerShell script next to this .bat (from the release zip).
if exist "%~dp0Install-Nexora.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Nexora.ps1"
) else (
  echo Local script missing — downloading from GitHub Releases...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://github.com/justhereforagoodtime42/dcc/releases/download/nexora-latest/Install-Nexora.ps1 | iex"
)

echo.
pause
endlocal
