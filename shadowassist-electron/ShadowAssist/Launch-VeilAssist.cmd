@echo off
title VeilAssist v2
cd /d "%~dp0"

REM  Rebuild portable + start VeilAssist.exe (shows VeilAssist in Task Manager).
REM  Faster while coding: Launch-VeilAssist-Dev.cmd

echo.
echo  Stopping VeilAssist if it is already running (avoids locked files during build)...
call npm run kill-veilassist 2>nul

echo  Rebuilding dist\VeilAssist.exe with your latest project files...
call npm run dist
if errorlevel 1 (
  echo  Build failed. See log above.
  pause
  exit /b 1
)

if not exist "dist\VeilAssist.exe" (
  echo.
  echo  dist\VeilAssist.exe was not created. Check the build log above.
  pause
  exit /b 1
)

echo.
echo  Starting VeilAssist (packaged exe — shows VeilAssist in Task Manager)...
echo.
start "" "%~dp0dist\VeilAssist.exe"
