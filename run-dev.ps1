#!/usr/bin/env pwsh

# Set execution policy for this session (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

Write-Host "🚀 Starting AetherPharma Development Environment" -ForegroundColor Blue
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if .env.local exists, if not create it
if (-not (Test-Path ".env.local")) {
    Write-Host "📋 Creating development environment file..." -ForegroundColor Yellow
    @"
# Development Environment
ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=pharmacy_user
DB_PASSWORD=password123
DB_NAME=pharmacy_local
DB_SSL_MODE=disable

# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=8080
GIN_MODE=debug

# Security (for development)
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=your-jwt-secret-key-for-development

# CORS (allow frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (optional for development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# HIPAA (disabled for development)
HIPAA_MODE=false
AUDIT_LOGGING=true
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
}

# Check if Go is installed
if (-not (Test-Command "go")) {
    Write-Host "❌ Go is not installed. Please install Go first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed. Please install Node.js with npm." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if frontend dependencies are installed
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "frontend"
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
        Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to install frontend dependencies: $_" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Verify react-scripts is available
Push-Location "frontend"
$reactScriptsPath = Join-Path "node_modules" ".bin" "react-scripts.cmd"
if (-not (Test-Path $reactScriptsPath)) {
    Write-Host "⚠️  react-scripts not found, trying to reinstall..." -ForegroundColor Yellow
    npm install react-scripts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install react-scripts" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Pop-Location

Write-Host "📡 Starting Backend Server..." -ForegroundColor Green

# Start backend in a new PowerShell window
$backendScript = @"
`$Host.UI.RawUI.WindowTitle = 'AetherPharma Backend Server'
`$env:ENV = 'development'
Write-Host 'Starting backend server...' -ForegroundColor Green
go run cmd/server/main.go
Read-Host 'Backend stopped. Press Enter to close'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green

# Start frontend in a new PowerShell window
$frontendScript = @"
`$Host.UI.RawUI.WindowTitle = 'AetherPharma Frontend Server'
Set-Location 'frontend'
Write-Host 'Starting frontend server...' -ForegroundColor Green
npm start
Read-Host 'Frontend stopped. Press Enter to close'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8080"
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Health:   http://localhost:8080/health"
Write-Host ""
Write-Host "📝 Close the server windows or press Ctrl+C in them to stop" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit this launcher"