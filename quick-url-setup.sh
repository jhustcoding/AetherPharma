#!/bin/bash
# Quick setup script for "aetherpharma" URL

TRUENAS_IP="192.168.1.100"  # Change this to your TrueNAS IP

echo "Setting up 'aetherpharma' URL..."

# For Mac
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Adding aetherpharma to your Mac's hosts file..."
    echo "$TRUENAS_IP aetherpharma" | sudo tee -a /etc/hosts
    echo "✅ You can now access: http://aetherpharma"
fi

# Generate command for customer
echo ""
echo "Send this command to your customer:"
echo "================================================"
echo "echo '$TRUENAS_IP aetherpharma' | sudo tee -a /etc/hosts"
echo "================================================"
echo ""
echo "After running, they can access: http://aetherpharma"