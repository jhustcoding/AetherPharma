# 🚨 AetherPharma Project Rules & Guidelines

## 📋 **MANDATORY READING FOR ALL DEVELOPMENT**

**⚠️ WARNING: VIOLATION OF THESE RULES WILL RESULT IN PROJECT CHAOS**

These rules ensure consistency, maintainability, and prevent the confusion that led to our recent cleanup. **ALL** development must follow these guidelines.

---

## 🎯 **CORE PRINCIPLES**

### 1. **Single Source of Truth**
- ✅ `CLAUDE.md` = Project instructions & development commands
- ✅ `PROJECT_STRUCTURE.md` = Architecture overview
- ✅ `PROJECT_RULES.md` = This file (governance)
- ❌ **NEVER** create duplicate documentation

### 2. **File Location Enforcement**
- ✅ Frontend code: `frontend/src/` ONLY
- ✅ Backend code: `cmd/` and `internal/` ONLY  
- ✅ Scripts: `scripts/` ONLY
- ❌ **NEVER** create files in project root unless specified

### 3. **Archive Discipline**
- ✅ Unused files → `archive/` immediately
- ✅ Temporary files → Delete or archive
- ❌ **NEVER** leave unused files in active directories

---

## 🎨 **FRONTEND RULES**

### Directory Structure (ENFORCED)
```
frontend/
├── src/
│   ├── components/          # ✅ React components ONLY
│   ├── contexts/           # ✅ Global state management
│   ├── services/           # ✅ API client functions
│   ├── types.ts            # ✅ TypeScript interfaces
│   └── App.tsx             # ✅ Main application
├── public/                 # ✅ Static assets
├── package.json            # ✅ Dependencies
└── tailwind.config.js      # ✅ Styling config
```

### Component Rules
1. **Naming**: PascalCase (e.g., `UserProfile.tsx`)
2. **Structure**: 
   ```typescript
   // ✅ REQUIRED STRUCTURE
   import React, { useState, useEffect } from 'react';
   import { ComponentProps } from '../types';
   
   const ComponentName: React.FC<ComponentProps> = () => {
     // State management
     // Effect hooks
     // Event handlers
     // Render
   };
   
   export default ComponentName;
   ```

3. **State Management**:
   - ✅ Local state: `useState` for component-specific data
   - ✅ Global state: Context API in `contexts/`
   - ❌ **NEVER** prop drilling beyond 2 levels

4. **API Integration**:
   - ✅ Use services from `services/` directory
   - ✅ Handle errors with toast notifications
   - ✅ Show loading states
   - ❌ **NEVER** put API calls directly in components

### Styling Rules
1. **Tailwind CSS ONLY** - No custom CSS files
2. **Responsive Design**: Mobile-first approach
3. **Color Scheme**: Use project color variables
4. **Icons**: Lucide React icons only

---

## ⚙️ **BACKEND RULES**

### Directory Structure (ENFORCED)
```
cmd/server/main.go          # ✅ Application entry point ONLY
internal/
├── api/                    # ✅ HTTP handlers
├── auth/                   # ✅ Authentication logic
├── config/                 # ✅ Configuration management
├── database/               # ✅ Database operations
├── middleware/             # ✅ HTTP middleware
├── models/                 # ✅ Data models
├── services/               # ✅ Business logic
└── utils/                  # ✅ Shared utilities
```

### API Rules
1. **RESTful Design**: 
   ```go
   // ✅ REQUIRED PATTERN
   GET    /api/v1/resource          # List
   POST   /api/v1/resource          # Create
   GET    /api/v1/resource/:id      # Get
   PUT    /api/v1/resource/:id      # Update
   DELETE /api/v1/resource/:id      # Delete
   ```

2. **Response Format**:
   ```go
   // ✅ SUCCESS RESPONSE
   {
     "data": {...},
     "message": "Success message"
   }
   
   // ✅ ERROR RESPONSE
   {
     "error": "Error message",
     "code": "ERROR_CODE"
   }
   ```

3. **Handler Structure**:
   ```go
   func (h *Handlers) HandlerName(c *gin.Context) {
     // 1. Validate input
     // 2. Authentication/Authorization
     // 3. Business logic
     // 4. Database operations
     // 5. Response
   }
   ```

### Database Rules
1. **GORM Models**: All models in `internal/models/`
2. **Migrations**: Auto-migrate on startup
3. **Naming**: snake_case for database, camelCase for Go structs
4. **Encryption**: Use `EncryptedString` type for sensitive data

### Security Rules
1. **JWT Authentication**: Required for all protected routes
2. **Role-Based Access**: Use middleware permissions
3. **Input Validation**: Validate all inputs
4. **Audit Logging**: Log all data changes
5. **Rate Limiting**: Apply to all public endpoints

---

## 🗄️ **DATABASE RULES**

### Schema Management
1. **Primary Database**: PostgreSQL (production)
2. **Development Database**: SQLite (local development)
3. **Migration Strategy**: Auto-migrate via GORM
4. **Backup Strategy**: Automated daily backups

### Model Conventions
```go
// ✅ REQUIRED MODEL STRUCTURE
type ModelName struct {
    BaseModel                    // ID, CreatedAt, UpdatedAt, DeletedAt
    Field1    string            `gorm:"not null" json:"field1"`
    Field2    *string           `gorm:"index" json:"field2,omitempty"`
    // Relationships
    RelatedModel *RelatedModel `gorm:"foreignKey:RelatedModelID" json:"related_model,omitempty"`
}
```

### Data Integrity Rules
1. **Soft Deletes**: Use GORM's soft delete for all user data
2. **Foreign Keys**: Properly define relationships
3. **Indexes**: Add indexes for frequently queried fields
4. **Validation**: Use GORM validation tags

---

## 🌐 **HOSTING & DEPLOYMENT RULES**

### Environment Configuration
```yaml
# ✅ REQUIRED ENVIRONMENTS
- development  # Local development
- staging      # Pre-production testing
- production   # Live system
```

### Container Rules
1. **Docker Images**: 
   - Backend: `golang:1.21-alpine`
   - Frontend: `node:18-alpine`
   - Database: `postgres:15-alpine`

2. **Container Structure**:
   ```dockerfile
   # ✅ MULTI-STAGE BUILDS REQUIRED
   FROM golang:1.21-alpine AS builder
   # Build stage
   FROM alpine:latest AS production
   # Runtime stage
   ```

### Security Requirements
1. **HTTPS Only**: All production traffic encrypted
2. **Environment Variables**: Secrets via environment variables
3. **Network Security**: Private subnets for database
4. **Firewall Rules**: Minimal port exposure

---

## ☁️ **CLOUD INFRASTRUCTURE RULES**

### Architecture Requirements
```
Load Balancer (HTTPS)
    ↓
Frontend (React) → Backend (Go API)
    ↓                    ↓
CDN (Static Assets)   Database (PostgreSQL)
    ↓                    ↓
Backup Storage       Redis (Cache/Sessions)
```

### Resource Specifications
1. **Frontend**: 
   - Static hosting (S3 + CloudFront or Vercel)
   - CDN for global distribution

2. **Backend**:
   - Container orchestration (ECS/Kubernetes)
   - Auto-scaling based on CPU/memory
   - Health checks on `/health` endpoint

3. **Database**:
   - Managed PostgreSQL (RDS/Cloud SQL)
   - Read replicas for scaling
   - Automated backups

4. **Monitoring**:
   - Application metrics (Prometheus/CloudWatch)
   - Log aggregation (ELK Stack/CloudWatch Logs)
   - Uptime monitoring

---

## 🔄 **CI/CD PIPELINE RULES**

### Pipeline Stages (MANDATORY)
```yaml
1. Code Quality
   - Linting (ESLint, golangci-lint)
   - Type checking (TypeScript)
   - Security scanning

2. Testing
   - Unit tests (Go, React)
   - Integration tests
   - API tests

3. Build
   - Frontend build (React)
   - Backend build (Go binary)
   - Docker images

4. Deploy
   - Staging deployment
   - Production deployment (manual approval)
```

### Branch Strategy
```
main          # ✅ Production-ready code
develop       # ✅ Integration branch
feature/*     # ✅ Feature development
hotfix/*      # ✅ Production fixes
```

### Deployment Rules
1. **No Direct Production Deploys**: Always go through staging
2. **Rollback Strategy**: Automated rollback on health check failure
3. **Blue-Green Deployment**: Zero-downtime deployments
4. **Database Migrations**: Run before application deployment

---

## 📝 **DEVELOPMENT WORKFLOW RULES**

### Before Starting ANY Work
1. ✅ Read `CLAUDE.md` for current project state
2. ✅ Check `PROJECT_STRUCTURE.md` for architecture
3. ✅ Follow these rules in `PROJECT_RULES.md`
4. ✅ Create feature branch from `develop`

### During Development
1. ✅ Follow coding standards for your stack
2. ✅ Write tests for new functionality
3. ✅ Update documentation if needed
4. ✅ Use proper commit messages

### Before Merging
1. ✅ All tests pass
2. ✅ Code review completed
3. ✅ Documentation updated
4. ✅ No security vulnerabilities

### File Management
1. ✅ Archive unused files immediately
2. ✅ Use proper file locations
3. ✅ Clean up temporary files
4. ❌ **NEVER** leave duplicate files

---

## 🚨 **EMERGENCY PROCEDURES**

### Production Issues
1. **Immediate Response**: Scale down/rollback
2. **Investigation**: Check logs and metrics
3. **Communication**: Update stakeholders
4. **Resolution**: Fix and deploy hotfix
5. **Post-Mortem**: Document lessons learned

### Development Chaos Prevention
1. **Daily Cleanup**: Run `scripts/cleanup-project.sh`
2. **Weekly Review**: Check for rule violations
3. **Monthly Audit**: Architecture review

---

## ⚖️ **RULE ENFORCEMENT**

### Automated Checks
- [ ] Pre-commit hooks for linting
- [ ] CI pipeline fails on rule violations
- [ ] Automated file location validation

### Manual Reviews
- [ ] Code review checklist includes rule compliance
- [ ] Architecture review for major changes
- [ ] Documentation updates mandatory

---

## 📞 **GETTING HELP**

### When Rules Conflict
1. Discuss in team meeting
2. Update rules with consensus
3. Document decision rationale

### When Rules Are Unclear
1. Ask for clarification
2. Propose rule improvement
3. Update documentation

---

**⚠️ REMEMBER: These rules exist to prevent the chaos we just cleaned up. Follow them religiously!**

*Last Updated: August 2025*