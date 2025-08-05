#!/bin/bash
# Fix hardcoded localhost URLs in frontend code

echo "Fixing hardcoded API URLs in frontend..."

# Find all TypeScript/JavaScript files and replace localhost:8080 with config-based URLs
find frontend/src -name "*.ts" -o -name "*.tsx" | while read file; do
    echo "Processing: $file"
    
    # Skip config.ts file itself
    if [[ "$file" == *"config.ts"* ]]; then
        continue
    fi
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Replace hardcoded URLs with config import
    # First, add config import if not already present
    if ! grep -q "import.*config.*from.*config" "$file"; then
        # Add import after existing imports
        sed -i.tmp '/^import/a\
import { config } from '\''../config'\'';' "$file" 2>/dev/null || true
        rm -f "$file.tmp"
    fi
    
    # Replace hardcoded URLs
    sed -i.tmp "s|'http://localhost:8080/api/v1|'\${config.API_BASE_URL}|g" "$file"
    sed -i.tmp "s|\"http://localhost:8080/api/v1|\"\${config.API_BASE_URL}|g" "$file"
    sed -i.tmp "s|\`http://localhost:8080/api/v1|\`\${config.API_BASE_URL}|g" "$file"
    
    # Clean up temp files
    rm -f "$file.tmp"
    
    # Check if file changed
    if ! cmp -s "$file" "$file.bak"; then
        echo "  ✓ Updated $file"
    else
        echo "  - No changes needed for $file"
    fi
    
    # Remove backup
    rm -f "$file.bak"
done

echo "API URL fixes complete!"