# 🔐 JWT Authentication Guide - Frontend & Backend

## 📋 **Table of Contents**
1. [JWT Authentication Overview](#jwt-authentication-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Authentication Flow](#authentication-flow)
5. [Token Management](#token-management)
6. [Security Considerations](#security-considerations)
7. [API Endpoints](#api-endpoints)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## 🎯 **JWT Authentication Overview**

**JWT (JSON Web Token)** is used for secure authentication in the AetherPharma system. It provides stateless authentication where user information is encoded in the token itself.

### **Key Components:**
- **Access Token**: Short-lived token for API requests (24 hours)
- **Refresh Token**: Long-lived token for getting new access tokens (7 days)
- **JWT Secret**: Server-side secret key for signing/verifying tokens
- **Claims**: User information embedded in the token

### **Token Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE2Mzk5NjI0MDB9.signature
|-- Header --|        |-- Payload --|        |-- Signature --|
```

---

## 🏗️ **Backend Implementation**

### **1. JWT Configuration**

**Location:** `internal/config/config.go`
```go
type SecurityConfig struct {
    JWTSecret           string        // Secret key for signing
    JWTExpirationHours  int          // Token expiration (24 hours)
    BCryptCost          int          // Password hashing cost
    MaxLoginAttempts    int          // Login attempt limit
    LoginLockoutMinutes int          // Account lockout duration
}
```

**Environment Variables:**
```env
JWT_SECRET=your-super-secure-secret-key-32-chars
JWT_EXPIRATION_HOURS=24
BCRYPT_COST=12
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```

### **2. Token Generation**

**Location:** `internal/auth/auth.go`
```go
func (s *AuthService) generateTokens(user *models.User) (accessToken, refreshToken string, expiresIn int, err error) {
    sessionID := uuid.New().String()
    now := time.Now()
    expiresIn = s.config.Security.JWTExpirationHours * 3600

    // Access Token Claims
    accessClaims := JWTClaims{
        UserID:    user.ID,
        Username:  user.Username,
        Email:     user.Email,
        Role:      user.Role,
        SessionID: sessionID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.config.Security.JWTExpirationHours) * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(now),
            Issuer:    "pharmacy-backend",
            Subject:   user.ID.String(),
        },
    }

    // Generate Access Token
    accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    accessToken, err = accessTokenObj.SignedString([]byte(s.config.Security.JWTSecret))

    // Refresh Token (7x longer expiration)
    refreshClaims := accessClaims
    refreshClaims.ExpiresAt = jwt.NewNumericDate(now.Add(time.Duration(s.config.Security.JWTExpirationHours*7) * time.Hour))
    
    refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
    refreshToken, err = refreshTokenObj.SignedString([]byte(s.config.Security.JWTSecret))

    return accessToken, refreshToken, expiresIn, nil
}
```

### **3. Token Validation**

```go
func (s *AuthService) validateToken(tokenString string) (*JWTClaims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(s.config.Security.JWTSecret), nil
    })

    if err != nil {
        return nil, ErrTokenInvalid
    }

    claims, ok := token.Claims.(*JWTClaims)
    if !ok || !token.Valid {
        return nil, ErrTokenInvalid
    }

    if claims.ExpiresAt.Before(time.Now()) {
        return nil, ErrTokenExpired
    }

    return claims, nil
}
```

### **4. Middleware Protection**

```go
func JWTAuthMiddleware(authService *auth.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(401, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        claims, err := authService.ValidateToken(tokenString)
        if err != nil {
            c.JSON(401, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }

        // Check if session is blacklisted
        if blacklisted, _ := authService.IsSessionBlacklisted(c, claims.SessionID); blacklisted {
            c.JSON(401, gin.H{"error": "Session has been invalidated"})
            c.Abort()
            return
        }

        // Add user info to context
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)
        c.Set("role", claims.Role)
        c.Set("session_id", claims.SessionID)
        
        c.Next()
    }
}
```

---

## 🎨 **Frontend Implementation**

### **1. API Service Configuration**

**Location:** `frontend/src/services/api.ts`
```typescript
class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token_timestamp', Date.now().toString());
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_timestamp');
    localStorage.removeItem('user_data');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.error?.includes('expired')) {
        await this.handleTokenExpiration();
        // Retry request with new token
        return this.request(endpoint, options);
      } else {
        this.clearToken();
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

### **2. Authentication Methods**

```typescript
// Login
async login(email: string, password: string): Promise<LoginResponse> {
  const response = await this.request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: email, password }),
  });

  // Store tokens and user data
  this.setToken(response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  localStorage.setItem('user_data', JSON.stringify(response.user));
  
  return response;
}

// Logout
async logout(): Promise<void> {
  try {
    await this.request('/auth/logout', { method: 'POST' });
  } finally {
    this.clearToken();
  }
}

// Refresh Token
async refreshToken(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await this.request<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  this.setToken(response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  localStorage.setItem('user_data', JSON.stringify(response.user));
}
```

### **3. Token Management**

```typescript
// Check if token is expired
isTokenExpired(): boolean {
  const token = localStorage.getItem('auth_token');
  const timestamp = localStorage.getItem('token_timestamp');
  
  if (!token || !timestamp) return true;
  
  const tokenAge = Date.now() - parseInt(timestamp);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  return tokenAge > maxAge;
}

// Handle token expiration
private async handleTokenExpiration(): Promise<void> {
  try {
    await this.refreshToken();
  } catch (error) {
    console.error('Token refresh failed:', error);
    this.clearToken();
    window.location.href = '/login';
  }
}

// Auto-refresh token before expiration
startTokenRefreshTimer(): void {
  const refreshInterval = 23 * 60 * 60 * 1000; // 23 hours
  
  setInterval(async () => {
    if (this.token && !this.isTokenExpired()) {
      try {
        await this.refreshToken();
        console.log('Token refreshed automatically');
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }
  }, refreshInterval);
}
```

### **4. React Authentication Context**

```typescript
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app start
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData && !apiService.isTokenExpired()) {
      apiService.setToken(token);
      setUser(JSON.parse(userData));
      apiService.startTokenRefreshTimer();
    } else {
      apiService.clearToken();
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
      apiService.startTokenRefreshTimer();
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 🔄 **Authentication Flow**

### **1. Login Process**
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant R as Redis

    U->>F: Enter credentials
    F->>B: POST /auth/login {username, password}
    B->>DB: Validate user credentials
    B->>B: Generate JWT tokens
    B->>R: Store session info
    B->>F: Return {access_token, refresh_token, user}
    F->>F: Store tokens in localStorage
    F->>U: Redirect to dashboard
```

### **2. API Request with Authentication**
```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant R as Redis

    F->>B: API Request + Authorization: Bearer {token}
    B->>B: Validate JWT signature
    B->>B: Check token expiration
    B->>R: Check if session blacklisted
    B->>B: Extract user claims
    B->>F: Return API response
```

### **3. Token Refresh Process**
```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant R as Redis

    F->>B: POST /auth/refresh {refresh_token}
    B->>B: Validate refresh token
    B->>R: Check if session blacklisted
    B->>B: Generate new tokens
    B->>R: Blacklist old session
    B->>F: Return new {access_token, refresh_token}
    F->>F: Update stored tokens
```

### **4. Logout Process**
```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant R as Redis

    F->>B: POST /auth/logout
    B->>R: Add session to blacklist
    B->>F: Confirm logout
    F->>F: Clear all stored tokens
    F->>F: Redirect to login
```

---

## 🔑 **Token Management**

### **Backend Token Storage**
```go
// Redis-based session blacklisting
func (s *AuthService) Logout(ctx context.Context, userID uuid.UUID, sessionID string) error {
    key := fmt.Sprintf("blacklist:session:%s", sessionID)
    expiration := time.Duration(s.config.Security.JWTExpirationHours) * time.Hour
    
    return s.redis.Set(ctx, key, "1", expiration).Err()
}
```

### **Frontend Token Storage**
```typescript
// Secure token storage strategy
class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user_data';
  private static readonly TIMESTAMP_KEY = 'token_timestamp';

  static storeTokens(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
  }

  static clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static isTokenValid(): boolean {
    const token = this.getAccessToken();
    const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
    
    if (!token || !timestamp) return false;
    
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return tokenAge < maxAge;
  }
}
```

---

## 🔒 **Security Considerations**

### **1. Token Security**
- **JWT Secret**: 32+ character random string
- **Token Expiration**: Access tokens expire in 24 hours
- **Refresh Tokens**: 7-day expiration with rotation
- **Session Blacklisting**: Redis-based session invalidation
- **HTTPS Only**: Tokens transmitted over secure connections

### **2. Storage Security**
```typescript
// Secure storage implementation
class SecureStorage {
  // Consider using sessionStorage for more sensitive data
  static setSecureItem(key: string, value: string): void {
    if (window.location.protocol === 'https:') {
      localStorage.setItem(key, value);
    } else {
      // Development only - use sessionStorage
      sessionStorage.setItem(key, value);
    }
  }

  static getSecureItem(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }
}
```

### **3. CSRF Protection**
```typescript
// Add CSRF token to requests
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    ...(this.token && { Authorization: `Bearer ${this.token}` }),
    ...options.headers,
  };

  // ... rest of request logic
}
```

---

## 🌐 **API Endpoints**

### **Authentication Endpoints**
```bash
# Login
POST /api/v1/auth/login
Content-Type: application/json
{
  "username": "admin@pharmacy.com",
  "password": "securepassword"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@pharmacy.com",
    "role": "admin"
  }
}

# Refresh Token
POST /api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

# Logout
POST /api/v1/auth/logout
Authorization: Bearer {access_token}

# Change Password
PUT /api/v1/auth/password
Authorization: Bearer {access_token}
Content-Type: application/json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

### **Protected Endpoints**
```bash
# All protected endpoints require Authorization header
Authorization: Bearer {access_token}

# Example: Get customers
GET /api/v1/customers
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Example: Create product
POST /api/v1/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
{
  "name": "Paracetamol 500mg",
  "price": 5.50
}
```

---

## ⚠️ **Error Handling**

### **Backend Error Responses**
```go
// Custom error types
var (
    ErrInvalidCredentials = errors.New("invalid credentials")
    ErrAccountLocked     = errors.New("account is locked")
    ErrTokenExpired      = errors.New("token has expired")
    ErrTokenInvalid      = errors.New("token is invalid")
    ErrPermissionDenied  = errors.New("permission denied")
)

// Error response format
type ErrorResponse struct {
    Error      string `json:"error"`
    Code       string `json:"code,omitempty"`
    Message    string `json:"message,omitempty"`
    Details    any    `json:"details,omitempty"`
    Timestamp  string `json:"timestamp"`
}
```

### **Frontend Error Handling**
```typescript
// API error handling
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handling in API service
private async handleApiError(response: Response): Promise<never> {
  const errorData = await response.json();
  
  switch (response.status) {
    case 401:
      if (errorData.error?.includes('expired')) {
        await this.handleTokenExpiration();
      } else {
        this.clearToken();
        window.location.href = '/login';
      }
      break;
    case 403:
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    case 429:
      throw new ApiError(429, 'RATE_LIMIT', 'Too many requests');
    default:
      throw new ApiError(response.status, errorData.code, errorData.error);
  }
}
```

---

## ✅ **Best Practices**

### **1. Security Best Practices**
- ✅ Use HTTPS in production
- ✅ Store JWT secret securely
- ✅ Implement token rotation
- ✅ Add rate limiting
- ✅ Use session blacklisting
- ✅ Validate all token claims
- ✅ Implement proper CORS
- ✅ Add CSRF protection

### **2. Performance Best Practices**
- ✅ Cache user data locally
- ✅ Implement token refresh timer
- ✅ Use Redis for session management
- ✅ Optimize token payload size
- ✅ Implement connection pooling

### **3. UX Best Practices**
- ✅ Show loading states during authentication
- ✅ Graceful error handling
- ✅ Automatic token refresh
- ✅ Remember user session
- ✅ Clear security messaging

### **4. Development Best Practices**
```typescript
// Environment-based configuration
const config = {
  development: {
    tokenExpiration: 24 * 60 * 60 * 1000, // 24 hours
    autoRefresh: true,
    debugMode: true
  },
  production: {
    tokenExpiration: 60 * 60 * 1000, // 1 hour
    autoRefresh: true,
    debugMode: false
  }
};
```

---

## 🎯 **Implementation Checklist**

### **Backend Setup** ✅
- [x] JWT configuration in config.go
- [x] Token generation in auth service
- [x] Token validation middleware
- [x] Session blacklisting with Redis
- [x] Role-based authorization
- [x] Password security with bcrypt
- [x] Account lockout protection

### **Frontend Setup** ✅
- [x] API service with token management
- [x] Authentication context/provider
- [x] Token storage and retrieval
- [x] Automatic token refresh
- [x] Error handling and recovery
- [x] Login/logout UI components
- [x] Protected route handling

### **Security Features** ✅
- [x] Secure token storage
- [x] HTTPS enforcement
- [x] CSRF protection
- [x] Rate limiting
- [x] Audit logging
- [x] Session management
- [x] Permission validation

---

**Your JWT authentication system is now fully documented and ready for implementation!** 🔐🚀

This guide provides everything needed to understand and implement secure JWT authentication in your pharmacy management system.