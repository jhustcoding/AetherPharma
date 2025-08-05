#!/bin/bash
# Test backend connectivity from within TrueNAS
# Run this script inside your TrueNAS shell

echo "=== Testing Backend Connectivity ==="

# Check if containers are running
echo "1. Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n2. Backend container logs (last 20 lines):"
docker logs aetherpharma-backend --tail 20

echo -e "\n3. Test backend health from inside container:"
docker exec aetherpharma-backend curl -f http://localhost:8080/health 2>/dev/null && echo "✅ Backend health OK" || echo "❌ Backend health failed"

echo -e "\n4. Test backend API from inside container:"
docker exec aetherpharma-backend curl -f http://localhost:8080/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null && echo "✅ API endpoint accessible" || echo "❌ API endpoint failed"

echo -e "\n5. Network connectivity test from host:"
curl -f http://192.168.0.9:8080/health 2>/dev/null && echo "✅ External access OK" || echo "❌ External access failed"

echo -e "\n6. Port binding check:"
netstat -tlnp | grep :8080 && echo "✅ Port 8080 is bound" || echo "❌ Port 8080 not bound"

echo -e "\n7. Backend environment variables:"
docker exec aetherpharma-backend env | grep -E "(SERVER_HOST|SERVER_PORT|GIN_HOST|GIN_PORT|DB_HOST|DB_TYPE)"

echo -e "\n=== Troubleshooting Commands ==="
echo "If backend is not accessible:"
echo "• Check logs: docker logs aetherpharma-backend"
echo "• Restart backend: docker restart aetherpharma-backend"
echo "• Check database: docker exec aetherpharma-postgres pg_isready -U pharmacy_user"
echo "• Test database connection: docker exec aetherpharma-backend PGPASSWORD=pharmacy_password psql -h postgres -U pharmacy_user -d pharmacy_db -c 'SELECT 1;'"