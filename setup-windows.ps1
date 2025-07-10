Write-Host "🚀 AetherPharma Windows Setup" -ForegroundColor Blue
Write-Host "Setting up your local development environment..." -ForegroundColor White

Write-Host "`n📋 Checking Prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Go
try {
    $goVersion = go version
    Write-Host "✅ Go found" -ForegroundColor Green
} catch {
    Write-Host "❌ Go not found. Please install Go 1.19+ from https://golang.org/dl" -ForegroundColor Red
    exit 1
}

Write-Host "`n📡 Setting up Backend..." -ForegroundColor Yellow

# Create environment file
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local for development..." -ForegroundColor White
    
    $envContent = @"
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

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# HIPAA (disabled for development)
HIPAA_MODE=false
AUDIT_LOGGING=true
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
}

Write-Host "Installing Go dependencies..." -ForegroundColor White
go mod tidy
go mod download
Write-Host "✅ Go dependencies installed" -ForegroundColor Green

Write-Host "`n🎨 Setting up Frontend..." -ForegroundColor Yellow

if (-not (Test-Path "frontend")) {
    Write-Host "Creating React TypeScript project..." -ForegroundColor White
    npx create-react-app frontend --template typescript --yes
    
    Set-Location frontend
    
    Write-Host "Installing UI dependencies..." -ForegroundColor White
    npm install recharts lucide-react date-fns react-hot-toast
    npm install -D tailwindcss postcss autoprefixer
    
    # Initialize Tailwind using npx
    npx tailwindcss init -p
    
    # Configure Tailwind
    $tailwindConfig = @"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
"@
    $tailwindConfig | Out-File -FilePath "tailwind.config.js" -Encoding UTF8
    
    # Update CSS
    $cssContent = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
"@
    $cssContent | Out-File -FilePath "src\index.css" -Encoding UTF8
    
    Set-Location ..
    Write-Host "✅ Frontend setup complete" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend already exists" -ForegroundColor Green
}

Write-Host "`n🔧 Creating development scripts..." -ForegroundColor Yellow

# Create PowerShell run script
$runDevScript = @"
Write-Host "🚀 Starting AetherPharma Development Environment" -ForegroundColor Blue

Write-Host "📡 Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; `$env:ENV='development'; go run cmd/server/main.go"

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend'; npm start"

Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8080"
Write-Host "Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Press any key to continue..."
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@

$runDevScript | Out-File -FilePath "run-dev.ps1" -Encoding UTF8

Write-Host "✅ Development scripts created" -ForegroundColor Green

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Blue
Write-Host ""
Write-Host "Quick Start:" -ForegroundColor Green
Write-Host "1. Run both servers: .\run-dev.ps1" -ForegroundColor Yellow
Write-Host "2. Visit frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "3. Test backend: curl http://localhost:8080/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Blue