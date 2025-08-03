#!/bin/bash

# AetherPharma Project Cleanup Script
# This script helps maintain a clean project structure by archiving unused files

echo "🧹 AetherPharma Project Cleanup"
echo "================================"

# Create archive directory if it doesn't exist
mkdir -p archive/{unused-components,scripts,logs,docs}

# Function to archive files safely
archive_files() {
    local files=("$@")
    local destination="$1"
    shift
    
    for file in "${files[@]}"; do
        if [ -f "$file" ] || [ -d "$file" ]; then
            echo "📦 Archiving: $file → archive/$destination/"
            mv "$file" "archive/$destination/" 2>/dev/null || echo "   ⚠️  Could not move $file"
        fi
    done
}

# Archive log files
echo "📋 Archiving log files..."
archive_files logs *.log frontend/*.log

# Archive backup/temporary files
echo "🗃️  Archiving backup files..."
archive_files unused-components *-backup* *-old* *-temp* *.tmp

# Archive development binaries
echo "⚙️  Archiving development binaries..."
archive_files unused-components main pharmacy-backend *.exe

# Archive Windows-specific files (if on non-Windows system)
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    echo "🪟 Archiving Windows files..."
    archive_files scripts *.bat *.ps1
fi

# Archive old documentation
echo "📚 Archiving old documentation..."
find . -name "*.md" -not -path "./archive/*" -not -name "README.md" -not -name "CLAUDE.md" -not -name "PROJECT_STRUCTURE.md" -exec mv {} archive/docs/ \; 2>/dev/null

# Clean node_modules in root (keep frontend/node_modules)
if [ -d "node_modules" ] && [ -d "frontend/node_modules" ]; then
    echo "🧽 Cleaning duplicate node_modules..."
    rm -rf node_modules
fi

# Clean empty directories
echo "🗂️  Removing empty directories..."
find . -type d -empty -not -path "./archive/*" -not -path "./.*" -delete 2>/dev/null

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Project structure summary:"
echo "   • Active backend: cmd/, internal/, *.go files"
echo "   • Active frontend: frontend/src/"
echo "   • Configuration: CLAUDE.md, docker-compose.yml, *.json"
echo "   • Development: run-dev.sh, fix-permissions.sh"
echo "   • Archive: archive/ (organized by type)"
echo ""
echo "🔍 To see the full structure: ls -la"
echo "📖 For detailed info: cat PROJECT_STRUCTURE.md"