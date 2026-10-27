@echo off
title Co Vua Pro - Server
echo ===================================================
echo            KHOI DONG CO VUA PRO (ONLINE & OFFLINE)
echo ===================================================
echo Dang khoi chay may chu tai http://localhost:3000 ...
timeout /t 1 >nul
start "" "http://localhost:3000"
node server.js
pause
