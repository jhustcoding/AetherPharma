#!/bin/bash

# 🚨 AetherPharma Project Structure Validator
# Enforces PROJECT_RULES.md compliance

set -e

echo "🔍 AetherPharma Project Structure Validation"
echo "============================================"

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check required files exist
check_required_files() {
    info "Checking required project files..."
    
    required_files=(
        "CLAUDE.md"
        "PROJECT_STRUCTURE.md"
        "PROJECT_RULES.md"
        "run-dev.sh"
        "cmd/server/main.go"
        "frontend/package.json"
        "go.mod"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            success "Required file exists: $file"
        else
            error "Missing required file: $file"
        fi
    done
}

# Check frontend structure
check_frontend_structure() {
    info "Validating frontend structure..."
    
    if [[ ! -d "frontend/src" ]]; then
        error "frontend/src directory missing"
        return
    fi
    
    required_frontend_dirs=(
        "frontend/src/components"
        "frontend/src/contexts"
        "frontend/src/services"
    )
    
    for dir in "${required_frontend_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            success "Frontend directory exists: $dir"
        else
            error "Missing frontend directory: $dir"
        fi
    done
    
    # Check for frontend files in wrong locations
    if find . -maxdepth 1 -name "*.tsx" -o -name "*.jsx" | grep -q .; then
        error "React components found in project root (should be in frontend/src/components/)"
    fi
    
    # Check TypeScript config
    if [[ -f "frontend/tsconfig.json" ]]; then
        success "TypeScript config exists"
    else
        warning "Missing TypeScript config in frontend/"
    fi
}

# Check backend structure
check_backend_structure() {
    info "Validating backend structure..."
    
    required_backend_dirs=(
        "cmd/server"
        "internal/api"
        "internal/models"
        "internal/auth"
        "internal/config"
        "internal/database"
        "internal/middleware"
    )
    
    for dir in "${required_backend_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            success "Backend directory exists: $dir"
        else
            error "Missing backend directory: $dir"
        fi
    done
    
    # Check for Go files in wrong locations
    if find . -maxdepth 1 -name "*.go" | grep -q .; then
        error "Go files found in project root (should be in cmd/ or internal/)"
    fi
    
    # Check Go module
    if [[ -f "go.mod" ]]; then
        success "Go module file exists"
    else
        error "Missing go.mod file"
    fi
}

# Check for prohibited files
check_prohibited_files() {
    info "Checking for prohibited files..."
    
    # Check for files that should be archived
    prohibited_patterns=(
        "*-backup*"
        "*-old*"
        "*-temp*"
        "*.tmp"
        "test-*.sh"
        "setup-*.sh"
    )
    
    for pattern in "${prohibited_patterns[@]}"; do
        if find . -maxdepth 1 -name "$pattern" -not -path "./archive/*" | grep -q .; then
            warning "Found files matching prohibited pattern: $pattern (should be in archive/)"
        fi
    done
    
    # Check for duplicate documentation
    md_files=($(find . -maxdepth 1 -name "*.md" -not -name "CLAUDE.md" -not -name "PROJECT_STRUCTURE.md" -not -name "PROJECT_RULES.md" -not -name "README.md"))
    if [[ ${#md_files[@]} -gt 0 ]]; then
        warning "Found additional markdown files that might be duplicates: ${md_files[*]}"
    fi
}

# Check Docker configuration
check_docker_config() {
    info "Checking Docker configuration..."
    
    if [[ -f "docker-compose.yml" ]]; then
        success "Docker Compose file exists"
    else
        warning "Missing docker-compose.yml"
    fi
    
    if [[ -f "Dockerfile" ]]; then
        success "Dockerfile exists"
    else
        warning "Missing Dockerfile"
    fi
}

# Check scripts directory
check_scripts_directory() {
    info "Validating scripts directory..."
    
    if [[ -d "scripts" ]]; then
        success "Scripts directory exists"
        
        # Check for scripts in wrong locations
        if find . -maxdepth 1 -name "*.sh" -not -name "run-dev.sh" -not -name "fix-permissions.sh" | grep -q .; then
            warning "Found shell scripts in root (consider moving to scripts/)"
        fi
    else
        warning "Scripts directory missing"
    fi
}

# Check archive organization
check_archive() {
    info "Checking archive organization..."
    
    if [[ -d "archive" ]]; then
        success "Archive directory exists"
        
        required_archive_dirs=(
            "archive/unused-components"
            "archive/scripts"
            "archive/logs"
            "archive/docs"
        )
        
        for dir in "${required_archive_dirs[@]}"; do
            if [[ -d "$dir" ]]; then
                success "Archive subdirectory exists: $dir"
            else
                warning "Missing archive subdirectory: $dir"
            fi
        done
        
        if [[ -f "archive/README.md" ]]; then
            success "Archive README exists"
        else
            warning "Missing archive/README.md"
        fi
    else
        warning "Archive directory missing"
    fi
}

# Check environment files
check_environment() {
    info "Checking environment configuration..."
    
    if [[ -f ".env" ]]; then
        warning ".env file present (ensure it's gitignored)"
    fi
    
    if [[ -f ".gitignore" ]]; then
        success ".gitignore exists"
    else
        error "Missing .gitignore file"
    fi
}

# Run all checks
main() {
    echo ""
    check_required_files
    echo ""
    check_frontend_structure
    echo ""
    check_backend_structure
    echo ""
    check_prohibited_files
    echo ""
    check_docker_config
    echo ""
    check_scripts_directory
    echo ""
    check_archive
    echo ""
    check_environment
    echo ""
    
    # Summary
    echo "📊 VALIDATION SUMMARY"
    echo "===================="
    
    if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
        success "🎉 Perfect! Project structure is fully compliant with PROJECT_RULES.md"
    elif [[ $ERRORS -eq 0 ]]; then
        echo -e "${YELLOW}✅ Project structure is compliant with $WARNINGS warnings${NC}"
        echo -e "${YELLOW}   Consider addressing warnings for optimal organization${NC}"
    else
        echo -e "${RED}❌ Project structure has $ERRORS errors and $WARNINGS warnings${NC}"
        echo -e "${RED}   Please fix errors before proceeding with development${NC}"
        exit 1
    fi
    
    echo ""
    echo "📚 For detailed rules, see: PROJECT_RULES.md"
    echo "🏗️  For architecture info, see: PROJECT_STRUCTURE.md"
    echo "⚙️  For development commands, see: CLAUDE.md"
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi