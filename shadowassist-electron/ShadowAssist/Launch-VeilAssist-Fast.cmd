@echo off
title VeilAssist v2
cd /d "%~dp0"

if not exist "dist\VeilAssist.exe" (
  echo dist\VeilAssist.exe not found. Run: npm run dist
  pause
  exit /b 1
)

start "" "%~dp0dist\VeilAssist.exe"
