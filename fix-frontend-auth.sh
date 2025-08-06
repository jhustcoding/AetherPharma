#!/bin/bash

echo "🔧 Fixing Frontend Authentication Issue..."
echo ""

# Check if the user can modify the file
if [ ! -w frontend/src/contexts/AuthContext.tsx ]; then
    echo "⚠️  The AuthContext.tsx file is owned by root. Fixing permissions first..."
    
    # Try to fix permissions
    sudo chown $(whoami):staff frontend/src/contexts/AuthContext.tsx
    
    if [ $? -ne 0 ]; then
        echo "❌ Could not change file ownership. Please run:"
        echo "   sudo chown $(whoami):staff frontend/src/contexts/AuthContext.tsx"
        echo ""
        exit 1
    fi
fi

echo "✅ File permissions OK"
echo ""

# Create backup
echo "📋 Creating backup of current AuthContext.tsx..."
cp frontend/src/contexts/AuthContext.tsx frontend/src/contexts/AuthContext.tsx.backup.$(date +%s)

# Replace with fixed version
echo "🔄 Replacing demo authentication with real API calls..."
cp AuthContext-fixed.tsx frontend/src/contexts/AuthContext.tsx

if [ $? -eq 0 ]; then
    echo "✅ AuthContext.tsx has been updated successfully!"
    echo ""
    echo "🔄 Next steps:"
    echo "1. Clear browser localStorage to remove demo tokens:"
    echo "   - Open browser developer tools (F12)"
    echo "   - Go to Application/Storage -> Local Storage"
    echo "   - Clear all auth-related entries"
    echo ""
    echo "2. If frontend is running, restart it:"
    echo "   cd frontend && ./start-dev-safe.sh"
    echo ""
    echo "3. Login again with: admin / admin123"
    echo ""
    echo "✅ The 'Invalid token' errors should now be resolved!"
else
    echo "❌ Failed to update AuthContext.tsx"
    exit 1
fi