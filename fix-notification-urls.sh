#!/bin/bash
# Fix specific hardcoded URLs in NotificationContext.tsx that cause "Failed to fetch" errors

echo "Fixing NotificationContext API URLs..."

# Create a temporary file with the updated content
cat > /tmp/notification_fix.js << 'EOF'
const fs = require('fs');

// Read the file
const filePath = process.argv[2];
const content = fs.readFileSync(filePath, 'utf8');

// Replace hardcoded localhost URLs with template literals using config
let updatedContent = content;

// Add import if not present
if (!updatedContent.includes("from '../config'")) {
    updatedContent = updatedContent.replace(
        "import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';",
        "import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';\nimport { config } from '../config';"
    );
}

// Replace specific hardcoded URLs
updatedContent = updatedContent.replace(
    /const response = await fetch\('http:\/\/localhost:8080\/api\/v1\/customers'\);/g,
    "const response = await fetch(`${config.API_BASE_URL}/customers`);"
);

updatedContent = updatedContent.replace(
    /const response = await fetch\('http:\/\/localhost:8080\/api\/v1\/orders'/g,
    "const response = await fetch(`${config.API_BASE_URL}/orders`"
);

updatedContent = updatedContent.replace(
    /await fetch\(`http:\/\/localhost:8080\/api\/v1\/orders\/\${orderId}\/status`/g,
    "await fetch(`${config.API_BASE_URL}/orders/${orderId}/status`"
);

// Write the updated content back
fs.writeFileSync(filePath, updatedContent);
console.log('Updated NotificationContext.tsx URLs');
EOF

# Run the fix for NotificationContext
node /tmp/notification_fix.js "frontend/src/contexts/NotificationContext.tsx"

# Clean up temp file
rm /tmp/notification_fix.js

echo "NotificationContext API URL fixes complete!"