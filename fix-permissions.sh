#!/bin/bash

# Fix permission issues for Node.js development
echo "Fixing Node.js permission issues..."

# Change npm's default directory to avoid permission issues
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH if not already there
if ! echo $PATH | grep -q "$HOME/.npm-global/bin"; then
    echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
    echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
fi

# Fix ownership of any existing cache/node_modules
if [ -d "frontend/node_modules" ]; then
    echo "Fixing frontend/node_modules ownership..."
    sudo chown -R $(whoami):staff frontend/node_modules/ 2>/dev/null || true
fi

if [ -d "node_modules" ]; then
    echo "Fixing root node_modules ownership..."
    sudo chown -R $(whoami):staff node_modules/ 2>/dev/null || true
fi

# Set npm cache to user directory
npm config set cache ~/.npm-cache

echo "Permission fixes applied. Restart your terminal or run 'source ~/.zshrc'"