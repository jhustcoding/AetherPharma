# AetherPharma Archive

This directory contains archived files that were created during development but are no longer actively used in the current project structure.

## Directory Structure

### 📁 `unused-components/`
Contains components, files, and binaries that were created during development but replaced or made obsolete:

- **`root-src/`** - Original src directory from root level (replaced by frontend/src/)
- **`AuthContext-fixed.tsx`** - Fixed version of AuthContext (integrated into main codebase)
- **`hash-password.go`** - Password hashing utility (integrated into main backend)
- **`main`** - Old Go binary (replaced by proper build process)
- **`pharmacy-backend`** - Old backend binary (replaced by proper build process)

### 📁 `scripts/`
Development and setup scripts that are no longer needed:

- **Setup Scripts:**
  - `docker-setup.sh` - Docker environment setup
  - `get-docker.sh` - Docker installation script
  - `quick-setup.sh` - Quick development setup
  
- **Windows Scripts:**
  - `*.bat` - Windows batch files for setup
  - `*.ps1` - PowerShell scripts for Windows

- **Frontend Scripts:**
  - `bypass-cache-start.sh` - ESLint cache bypass script
  - `start-dev.sh` - Alternative development server start
  - `start-no-cache.sh` - Cache-free development start

### 📁 `logs/`
Development log files from various components:

- `backend-server.log` - Backend server logs
- `backend-test.log` - Backend testing logs  
- `backend.log` - General backend logs
- `database-server.log` - Database server logs
- `dev-server.log` - Development server logs
- `frontend-dev.log` - Frontend development logs
- `frontend-final.log` - Frontend build logs

### 📁 `docs/`
Documentation files created during development:

- **Development Guides:**
  - `DATABASE_SETUP_GUIDE.md`
  - `DOCKER_SETUP.md`
  - `LOCAL_DEVELOPMENT_GUIDE.md`
  - `FRONTEND_RUN_DEV_FIXES.md`
  - `WINDOWS_FRONTEND_FIX.md`

- **Security Documentation:**
  - `JWT_AUTHENTICATION_GUIDE.md`
  - `JWT_SECRET_SECURITY_EXPLAINED.md`
  - `UI_TOKEN_HANDLING_GUIDE.md`

- **Issue Resolution:**
  - `BACKEND_ERRORS_FIXED.md`
  - `FIXES_APPLIED.md`
  - `RECURRING_ISSUES_ANALYSIS.md`
  - `WINDOWS_ISSUE_RESOLVED.md`

- **Feature Documentation:**
  - `QR_ONLINE_ORDERING_FEATURES.md`
  - `DUAL_DATABASE_SUMMARY.md`

- **Other:**
  - `fix-auth.html` - Authentication debugging tool

## Current Active Project Structure

The main project now uses this clean structure:

```
AetherPharma/
├── cmd/server/main.go           # Backend entry point
├── internal/                    # Backend Go modules
├── frontend/                    # React frontend
├── docker/                      # Docker configuration
├── scripts/                     # Active utility scripts
├── CLAUDE.md                    # Project instructions
├── pharmacy.db                  # SQLite database
├── run-dev.sh                   # Main development script
├── fix-permissions.sh           # Permission fix utility
└── archive/                     # This directory
```

## Restoration

If you need to restore any archived files:

1. **Components/Code:** Copy from `unused-components/` back to appropriate location
2. **Scripts:** Copy from `scripts/` to root and make executable: `chmod +x script-name.sh`
3. **Documentation:** Reference files in `docs/` for historical context
4. **Logs:** Check `logs/` for debugging historical issues

## Notes

- All archived files were working at the time of archival
- Main functionality has been integrated into the current codebase
- Scripts may need path updates if restored
- Documentation reflects the state at time of creation

---
*Archive created: August 2025*
*Contains development artifacts from July-August 2025*