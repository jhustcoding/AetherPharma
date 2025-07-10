# Secure Pharmacy Management Backend

A production-ready, secure backend API for pharmacy management systems built with Go, featuring comprehensive security measures, HIPAA compliance, and medical data encryption.

## 🛡️ Security Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Medical Data Encryption**: AES-256-GCM encryption for sensitive patient information
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **Audit Logging**: Comprehensive audit trails for compliance
- **CORS Protection**: Configurable CORS policies
- **Input Validation**: SQL injection and XSS protection
- **Account Security**: Account lockout after failed login attempts
- **Session Management**: Token blacklisting and session invalidation
- **HIPAA Compliance**: Medical data handling compliance features

## 🏗️ Architecture

```
pharmacy-backend/
├── cmd/server/           # Application entry point
├── internal/
│   ├── api/             # HTTP handlers
│   ├── auth/            # Authentication service
│   ├── config/          # Configuration management
│   ├── database/        # Database migrations
│   ├── middleware/      # Security middleware
│   ├── models/          # Data models
│   └── utils/           # Utility functions
├── docker/              # Docker configuration
├── migrations/          # Database migrations
└── docs/               # API documentation
```

## 🚀 Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/pharmacy-backend.git
   cd pharmacy-backend
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb pharmacy_db
   
   # Start Redis
   redis-server
   ```

5. **Run the application**
   ```bash
   go run cmd/server/main.go
   ```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f pharmacy-api

# Stop services
docker-compose down
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `ENVIRONMENT` | Environment mode | `development` |
| `JWT_SECRET` | JWT signing secret | *required* |
| `ENCRYPTION_KEY` | AES encryption key (32 chars) | *required* |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `pharmacy_user` |
| `DB_PASSWORD` | Database password | *required* |
| `DB_NAME` | Database name | `pharmacy_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `HIPAA_MODE` | Enable HIPAA compliance | `true` |
| `AUDIT_LOGGING` | Enable audit logging | `true` |

### Security Configuration

```env
# Strong JWT secret (32+ characters)
JWT_SECRET=your-super-secret-jwt-key-32-characters-long

# AES encryption key (exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# Rate limiting
RATE_LIMIT_RPS=10
RATE_LIMIT_BURST=20

# Account security
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```

## 🔐 API Authentication

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Use Bearer Token
```bash
curl -X GET http://localhost:8080/api/v1/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/change-password` - Change password

### Customer Management
- `GET /api/v1/customers` - List customers
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/:id` - Get customer details
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

### Product Management
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get product details
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/low-stock` - Low stock alerts
- `GET /api/v1/products/expiring` - Expiring products

### Sales Management
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales/:id` - Get sale details
- `POST /api/v1/sales/:id/refund` - Process refund

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard metrics
- `GET /api/v1/analytics/sales` - Sales analytics
- `GET /api/v1/analytics/customers` - Customer analytics
- `GET /api/v1/analytics/inventory-movement` - Inventory analysis

## � User Roles & Permissions

### Admin
- Full system access
- User management
- Audit log access
- System configuration

### Manager
- Customer management
- Product management
- Sales management
- Analytics access

### Pharmacist
- Customer management (limited)
- Product management (limited)
- Sales processing
- Analytics access

### Assistant
- Read-only access
- Basic sales operations

## 🔒 Security Best Practices

### Production Deployment

1. **Environment Variables**
   ```bash
   # Generate secure keys
   openssl rand -base64 32  # JWT secret
   openssl rand -hex 16     # Encryption key
   ```

2. **Database Security**
   ```env
   DB_SSL_MODE=require
   DB_PASSWORD=strong_database_password
   ```

3. **SSL/TLS**
   ```nginx
   # Use HTTPS in production
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
   }
   ```

4. **Firewall Rules**
   ```bash
   # Allow only necessary ports
   ufw allow 443/tcp
   ufw allow 80/tcp
   ufw deny 8080/tcp  # Don't expose API directly
   ```

### Compliance Features

- **HIPAA Compliance**: Encrypted medical data storage
- **Audit Logging**: All actions logged with timestamps
- **Access Control**: Role-based permissions
- **Data Retention**: Configurable retention policies
- **Secure Communication**: HTTPS/TLS encryption

## 🧪 Testing

### Unit Tests
```bash
go test ./...
```

### Integration Tests
```bash
go test -tags=integration ./...
```

### API Testing
```bash
# Using curl or Postman
curl -X GET http://localhost:8080/health
```

## 📋 Default Credentials

**Admin User:**
- Username: `admin`
- Password: `admin123`
- Role: `admin`

**Pharmacist User:**
- Username: `pharmacist1`
- Password: `admin123`
- Role: `pharmacist`

⚠️ **Change default passwords in production!**

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL service
   systemctl status postgresql
   
   # Test connection
   psql -h localhost -U pharmacy_user -d pharmacy_db
   ```

2. **Redis Connection Error**
   ```bash
   # Check Redis service
   systemctl status redis
   
   # Test connection
   redis-cli ping
   ```

3. **Permission Denied**
   ```bash
   # Check user permissions
   SELECT * FROM users WHERE username = 'your_username';
   ```

### Logs

```bash
# View application logs
docker-compose logs -f pharmacy-api

# View database logs
docker-compose logs -f postgres

# View Redis logs
docker-compose logs -f redis
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Security Guide](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guide](./docs/contributing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@pharmacy-backend.com
- Documentation: [docs.pharmacy-backend.com](https://docs.pharmacy-backend.com)

## 🔮 Roadmap

- [ ] Advanced analytics and reporting
- [ ] Mobile app integration
- [ ] Prescription management
- [ ] Insurance integration
- [ ] Inventory forecasting
- [ ] Multi-location support
- [ ] API rate limiting per user
- [ ] Automated backups
- [ ] Compliance reports
- [ ] Drug interaction checking

---

**⚠️ Security Notice**: This is a medical application handling sensitive patient data. Always follow proper security practices and comply with local healthcare regulations.