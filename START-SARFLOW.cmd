@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS, then reopen this launcher.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Dependencies missing. Run npm ci in this folder first.
  pause
  exit /b 1
)
node scripts\launch-sarflow.mjs
if errorlevel 1 (
  echo.
  echo SARFlow could not start. See the error above.
  pause
  exit /b 1
)
