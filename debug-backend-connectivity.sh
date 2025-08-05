#!/bin/bash
# Debug backend connectivity issues in TrueNAS deployment

echo "=== AetherPharma Backend Connectivity Debug ==="
echo "Checking backend server accessibility..."

# Test if backend is reachable
echo "1. Testing backend health endpoint..."
curl -v http://192.168.0.9:8080/health 2>&1 | head -20

echo -e "\n2. Testing basic connectivity..."
curl -v http://192.168.0.9:8080/ 2>&1 | head -20

echo -e "\n3. Testing API endpoint..."
curl -v http://192.168.0.9:8080/api/v1/auth/login 2>&1 | head -20

echo -e "\n4. Check if port 8080 is open..."
timeout 5 bash -c "</dev/tcp/192.168.0.9/8080" && echo "Port 8080 is open" || echo "Port 8080 is closed/unreachable"

echo -e "\n5. Network connectivity test..."
ping -c 3 192.168.0.9

echo -e "\n=== Run this inside TrueNAS to check containers ==="
echo "docker ps"
echo "docker logs aetherpharma-backend | tail -50"
echo "docker logs aetherpharma-postgres | tail -20"
echo "docker exec -it aetherpharma-backend curl -f http://localhost:8080/health"