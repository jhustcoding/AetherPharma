@echo off
title Fix react-scripts Issue

echo 🔧 Fixing react-scripts issue on Windows...
echo.

REM Check if we're in the right directory
if not exist "frontend" (
    echo ❌ Error: frontend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo 📍 Current directory: %CD%
echo.

echo 🧹 Step 1: Cleaning up existing installation...
cd frontend

if exist "node_modules" (
    echo Removing node_modules...
    rmdir /s /q node_modules
)

if exist "package-lock.json" (
    echo Removing package-lock.json...
    del package-lock.json
)

echo ✅ Cleanup complete
echo.

echo 📦 Step 2: Fresh installation of dependencies...
call npm cache clean --force
call npm install

if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

echo 🔍 Step 3: Verifying react-scripts installation...
if exist "node_modules\.bin\react-scripts.cmd" (
    echo ✅ react-scripts.cmd found
) else (
    echo ⚠️  react-scripts.cmd not found, installing specifically...
    call npm install react-scripts@5.0.1
)

echo.
echo 🧪 Step 4: Testing react-scripts...
call node_modules\.bin\react-scripts --version
if %errorlevel% equ 0 (
    echo ✅ react-scripts is working!
) else (
    echo ⚠️  Direct test failed, trying npm script...
    call npm run start --version
)

echo.
echo 🎯 Step 5: Testing npm start...
echo Starting frontend server for 5 seconds to test...
timeout /t 2 /nobreak > nul

start /B npm start
timeout /t 5 /nobreak > nul

echo.
taskkill /f /im node.exe > nul 2>&1

echo ✅ All tests completed!
echo.
echo 🚀 Frontend is now ready. You can use:
echo    npm start                (from frontend directory)
echo    ..\run-dev.bat          (from project root)
echo    ..\run-dev.ps1          (PowerShell version)
echo.
cd ..

pause