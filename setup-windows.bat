@echo off
echo 🚀 AetherPharma Windows Setup
echo Setting up your local development environment...

echo.
echo 📋 Checking Prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org
    exit /b 1
)
echo ✅ Node.js found

REM Check Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go not found. Please install Go 1.19+ from https://golang.org/dl
    exit /b 1
)
echo ✅ Go found

echo.
echo 📡 Setting up Backend...

REM Create environment file
if not exist ".env.local" (
    echo Creating .env.local for development...
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

echo Installing Go dependencies...
go mod tidy
go mod download
echo ✅ Go dependencies installed

echo.
echo 🎨 Setting up Frontend...

if not exist "frontend" (
    echo Creating React TypeScript project...
    npx create-react-app frontend --template typescript --yes
    
    cd frontend
    
    echo Installing UI dependencies...
    npm install recharts lucide-react date-fns react-hot-toast
    npm install -D tailwindcss postcss autoprefixer
    
    REM Initialize Tailwind using npx instead of global command
    npx tailwindcss init -p
    
    REM Configure Tailwind
    (
        echo /** @type {import('tailwindcss'^).Config} */
        echo module.exports = {
        echo   content: [
        echo     "./src/**/*.{js,jsx,ts,tsx}",
        echo   ],
        echo   theme: {
        echo     extend: {
        echo       colors: {
        echo         primary: {
        echo           50: '#eff6ff',
        echo           500: '#3b82f6',
        echo           600: '#2563eb',
        echo           700: '#1d4ed8',
        echo         }
        echo       }
        echo     },
        echo   },
        echo   plugins: [],
        echo }
    ) > tailwind.config.js
    
    REM Update CSS
    (
        echo @tailwind base;
        echo @tailwind components;
        echo @tailwind utilities;
        echo.
        echo body {
        echo   margin: 0;
        echo   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        echo     'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        echo     sans-serif;
        echo   -webkit-font-smoothing: antialiased;
        echo   -moz-osx-font-smoothing: grayscale;
        echo }
    ) > src\index.css
    
    cd ..
    echo ✅ Frontend setup complete
) else (
    echo ✅ Frontend already exists
)

echo.
echo 🔧 Creating development scripts...

REM Create Windows run script
(
    echo @echo off
    echo echo 🚀 Starting AetherPharma Development Environment
    echo.
    echo echo 📡 Starting Backend Server...
    echo start "Backend" cmd /k "set ENV=development && go run cmd/server/main.go"
    echo.
    echo echo Waiting for backend to start...
    echo timeout /t 3 /nobreak ^> nul
    echo.
    echo echo 🎨 Starting Frontend Server...
    echo start "Frontend" cmd /k "cd frontend && npm start"
    echo.
    echo echo ✅ Both servers are starting!
    echo echo Backend:  http://localhost:8080
    echo echo Frontend: http://localhost:3000
    echo echo.
    echo echo Press any key to exit...
    echo pause ^> nul
) > run-dev.bat

echo ✅ Development scripts created

echo.
echo 🎉 Setup Complete!
echo.
echo Quick Start:
echo 1. Run both servers: run-dev.bat
echo 2. Visit frontend: http://localhost:3000
echo 3. Test backend: curl http://localhost:8080/health
echo.
echo Happy coding! 🚀