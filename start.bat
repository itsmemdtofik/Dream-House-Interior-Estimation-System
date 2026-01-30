@echo off
REM Dream House Interior - Estimation System Startup Script for Windows

setlocal enabledelayedexpansion

echo.
echo 🚀 Starting Dream House Interior - Estimation System...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Check if backend directory exists
if not exist "%SCRIPT_DIR%backend" (
    echo ❌ Backend directory not found.
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "%SCRIPT_DIR%frontend" (
    echo ❌ Frontend directory not found.
    pause
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist "%SCRIPT_DIR%backend\venv" (
    echo 📦 Creating virtual environment...
    cd /d "%SCRIPT_DIR%backend"
    python -m venv venv
    echo ✅ Virtual environment created
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call "%SCRIPT_DIR%backend\venv\Scripts\activate.bat"

REM Install/update dependencies
echo 📥 Installing Python dependencies...
cd /d "%SCRIPT_DIR%backend"
pip install -q -r requirements.txt
echo ✅ Dependencies installed

echo.
echo ================== STARTUP INFO ==================
echo ✅ Backend will start on: http://localhost:8000
echo ✅ Frontend will start on: http://localhost:3000
echo ✅ API Documentation: http://localhost:8000/docs
echo.
echo ⏳ Starting backend and frontend...
echo.

REM Start backend server in a new cmd window
cd /d "%SCRIPT_DIR%backend"
start "Dream House Backend - FastAPI" cmd /k uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo ✅ Backend started

timeout /t 2 /nobreak

REM Start frontend server in a new cmd window
cd /d "%SCRIPT_DIR%frontend"
start "Dream House Frontend" cmd /k python -m http.server 3000
echo ✅ Frontend started

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎉 System is ready! Opening browser...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

timeout /t 2 /nobreak

REM Open browser
start http://localhost:3000

echo Done! Both servers are running in separate windows.
echo Close the command windows to stop the servers.
pause
