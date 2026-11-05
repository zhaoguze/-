@echo off
chcp 65001 >nul 2>nul
title Northwest ICH - Local Server
cd /d "%~dp0"

set "NODE="
where node >nul 2>nul && set "NODE=node"
if not defined NODE if exist "C:\Users\asus\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" set "NODE=C:\Users\asus\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"

if not defined NODE (
  echo [ERROR] Node.js not found.
  echo Install Node.js 18+ from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Starting server with: %NODE%
start "Northwest ICH Server" cmd /k "%NODE%" server.js

timeout /t 2 >nul
start "" "http://127.0.0.1:4190/"

echo.
echo Site opened: http://127.0.0.1:4190/
echo AI chat backend runs in the "Northwest ICH Server" window.
echo Close that window to stop the server.
echo.
timeout /t 5 >nul
