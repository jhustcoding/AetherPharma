#!/bin/sh
# PostgreSQL Migration Fix Script

echo "=== Fixing PostgreSQL Migration Issue ==="

# Update GORM and PostgreSQL driver to latest versions
echo "Updating Go dependencies..."
go get -u gorm.io/gorm@latest
go get -u gorm.io/driver/postgres@latest
go get -u github.com/jackc/pgx/v5@latest

# Update go.mod
go mod tidy

echo "Dependencies updated!"
echo "Run this script in the backend container to fix PostgreSQL migrations"