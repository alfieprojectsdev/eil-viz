@echo off
:: EIL-Viz dev server — Windows startup script
:: Requires: Node.js 20.19+  (https://nodejs.org/)
::
:: Installs dependencies on first run (skipped if node_modules exists).
::
:: The Vite dev server proxies /api/* to http://127.0.0.1:8000 (eil-calc).
:: To use a different backend, set VITE_DEV_API_TARGET before running, e.g.
::   set VITE_DEV_API_TARGET=http://192.168.1.10:8000

cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    call npm install || exit /b 1
)
call npm run dev
