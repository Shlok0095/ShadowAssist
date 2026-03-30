@echo off
title ShadowAssist v2
cd /d "%~dp0"

REM ---------------------------------------------------------------------------
REM  This script rebuilds the portable app, then starts dist\ShadowAssist.exe.
REM  The exe only picks up code/UI changes after a full "npm run dist" — if you
REM  only double-click the exe without rebuilding, you keep seeing an old build.
REM
REM  Faster while coding (no repackage): double-click Launch-ShadowAssist-Dev.cmd
REM  or run: npm start
REM ---------------------------------------------------------------------------

echo.
echo  Stopping ShadowAssist if it is already running ^(avoids locked files during build^)...
call npm run kill-shadowassist

echo.
echo  Rebuilding dist\ShadowAssist.exe with your latest project files...
echo  ^(Vite + electron-builder — first run can take several minutes.^)
echo.
call npm run dist
if errorlevel 1 (
  echo.
  echo  Build failed. Fix the errors above, then run this script again.
  pause
  exit /b 1
)

if not exist "dist\ShadowAssist.exe" (
  echo.
  echo  dist\ShadowAssist.exe was not created. Check the build log above.
  pause
  exit /b 1
)

echo.
echo  Starting ShadowAssist ^(packaged exe — shows ShadowAssist in Task Manager^)...
echo  To fully quit: tray icon ^> right-click ^> Quit. ^(Closing the panel does not exit.^)
echo  Force-close from project folder: npm run kill-shadowassist
start "" "%~dp0dist\ShadowAssist.exe"
exit /b 0
