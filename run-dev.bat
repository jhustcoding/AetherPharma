@echo off
title AetherPharma Development Environment

echo 🚀 Starting AetherPharma Development Environment
echo.

REM Check if .env.local exists, if not create it
if not exist ".env.local" (
    echo 📋 Creating development environment file...
    (
        echo # Development Environment
        echo ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_USER=pharmacy_user
        echo DB_PASSWORD=password123
        echo DB_NAME=pharmacy_local
        echo DB_SSL_MODE=disable
        echo.
        echo # Server Configuration
        echo SERVER_HOST=localhost
        echo SERVER_PORT=8080
        echo GIN_MODE=debug
        echo.
        echo # Security (for development^)
        echo ENCRYPTION_KEY=12345678901234567890123456789012
        echo JWT_SECRET=your-jwt-secret-key-for-development
        echo.
        echo # CORS (allow frontend^)
        echo CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
        echo.
        echo # Redis (optional for development^)
        echo REDIS_HOST=localhost
        echo REDIS_PORT=6379
        echo REDIS_PASSWORD=
        echo REDIS_DB=0
        echo.
        echo # Logging
        echo LOG_LEVEL=debug
        echo LOG_FORMAT=text
        echo.
        echo # HIPAA (disabled for development^)
        echo HIPAA_MODE=false
        echo AUDIT_LOGGING=true
    ) > .env.local
    echo ✅ Created .env.local
)

REM Check if Go is installed
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go is not installed. Please install Go first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Frontend dependencies installed
)

echo 📡 Starting Backend Server...
start "AetherPharma Backend" cmd /k "title Backend Server && set ENV=development && go run cmd/server/main.go"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo 🎨 Starting Frontend Server...
start "AetherPharma Frontend" cmd /k "title Frontend Server && cd frontend && call npm start"

echo.
echo ✅ Both servers are starting!
echo 🔗 URLs:
echo    Backend:  http://localhost:8080
echo    Frontend: http://localhost:3000
echo    Health:   http://localhost:8080/health
echo.
echo 📝 Close this window or press Ctrl+C in the server windows to stop
echo.
echo Press any key to exit this launcher...
pause > nul