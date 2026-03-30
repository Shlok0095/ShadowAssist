@echo off
title ShadowAssist v2
cd /d "%~dp0"

REM Starts the portable exe only — no npm rebuild. Use after you have run npm run dist once.

if not exist "dist\ShadowAssist.exe" (
  echo dist\ShadowAssist.exe not found. Run: npm run dist
  pause
  exit /b 1
)

start "" "%~dp0dist\ShadowAssist.exe"
exit /b 0
