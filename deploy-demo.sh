#!/bin/bash
# Quick deployment script for demo purposes

echo "🚀 AetherPharma Demo Deployment Script"
echo "======================================"

# Check if all required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    # Check for Git
    if ! command -v git &> /dev/null; then
        echo "❌ Git is not installed. Please install Git first."
        echo "   Run: xcode-select --install"
        exit 1
    fi
    
    # Check for Go
    if ! command -v go &> /dev/null; then
        echo "❌ Go is not installed. Please install Go 1.21+"
        echo "   Visit: https://go.dev/dl/"
        exit 1
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+"
        echo "   Run: brew install node"
        exit 1
    fi
    
    echo "✅ All requirements met!"
}

# Setup the project
setup_project() {
    echo "Setting up AetherPharma..."
    
    # Clone if not already cloned
    if [ ! -d "AetherPharma" ]; then
        git clone https://github.com/jhustcoding/AetherPharma.git
        cd AetherPharma
    else
        cd AetherPharma
        git pull origin main
    fi
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    go mod download
    
    # Install frontend dependencies
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
}

# Start the application
start_app() {
    echo "Starting AetherPharma..."
    echo "========================"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:8080"
    echo "========================"
    echo "Default login: admin / admin123"
    echo "========================"
    
    # Run the development script
    ./run-dev.sh
}

# Main execution
check_requirements
setup_project
start_app