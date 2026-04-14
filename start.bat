@echo off
:: EIL-Viz dev server — Windows startup script
:: Requires: Node.js 18+  (https://nodejs.org/)
::
:: On first run, install dependencies:
::   npm install
::
:: API URL defaults to http://127.0.0.1:8000 (set in .env).
:: The Vite proxy forwards /api/* requests to that address automatically.

cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
npm run dev
