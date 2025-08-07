# Docker Deployment Configurations

This folder contains various Docker Compose configurations for different deployment scenarios.

## 🚀 Production Deployment (Recommended)

**Primary Configuration:**
- `truenas-docker-compose-production.yaml` - **MAIN production config for TrueNAS SCALE**
  - Uses Tailscale IP (100.104.33.63)
  - PostgreSQL database with proper migrations
  - Environment optimized for production
  - CORS and security configured

## 🔧 Development Configurations

**Local Development:**
- `docker-compose.yml` - Standard local development setup
- `docker-compose.production.yml` - Local production testing

**TrueNAS Testing:**
- `docker-compose.nas.yml` - NAS-specific configuration
- `truenas-simple-compose.yml` - Simplified NAS deployment

## 📝 Alternative Configurations

**Minimal/Testing:**
- `truenas-docker-compose-minimal.yaml` - Minimal resource configuration
- `truenas-docker-compose-simple.yaml` - Simple setup for testing
- `truenas-docker-compose-fast.yaml` - Fast startup configuration
- `truenas-simple-test.yaml` - Quick test setup

**Legacy/Demo:**
- `docker-compose.demo.yml` - Demo environment
- `truenas-docker-compose-test.yaml` - Test environment
- `render.yaml` - Render.com deployment config

## 🎯 Quick Start

**For TrueNAS SCALE deployment:**
```bash
docker-compose -f deployment/truenas-docker-compose-production.yaml up -d
```

**For local development:**
```bash
docker-compose -f deployment/docker-compose.yml up -d
```

## 🌐 Network Configuration

- **Local Network**: Uses `192.168.0.9` 
- **Tailscale Network**: Uses `100.104.33.63` (production config)
- **Ports**: Frontend (3000), Backend (8080), PostgreSQL (5432)

## 📊 Database

All configurations use PostgreSQL with automatic migrations and default user creation.

Default credentials: `admin` / `admin123`