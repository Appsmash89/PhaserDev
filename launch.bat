@echo off
title PHASER-NEXT-HYBRID Launcher
echo ===================================================
echo   PHASER-NEXT-HYBRID: HIGH-PERFORMANCE ENGINE
echo ===================================================
echo.
echo Launching Experience...
echo.

:: Open the browser to the local server address
start "" "http://localhost:3000"

:: Start the development server
echo Initializing Dev Server (NPM)...
call npm.cmd run dev

:: If the server stops, keep the window open so the user can see any errors
pause
