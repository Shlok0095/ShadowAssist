@echo off
title ShadowAssist v2 — dev ^(Electron in Task Manager^)
cd /d "%~dp0"

echo.
echo  Stopping any stuck Electron processes...
call npm run kill-electron

echo.
echo  Installing dependencies ^(if needed^)...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo  Building UI + starting app ^(npm start — Task Manager shows Electron^)...
call npm start
if errorlevel 1 (
  echo Start failed — see errors above.
  pause
  exit /b 1
)

pause
