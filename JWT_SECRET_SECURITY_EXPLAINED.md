# 🔐 JWT_SECRET Security: Frontend vs Backend

## ❌ **CRITICAL: Frontend NEVER Holds JWT_SECRET**

**The JWT_SECRET should ONLY exist on the backend server, NEVER on the frontend/UI.**

---

## 🎯 **How JWT Authentication Actually Works**

### **Backend Responsibilities:**
✅ **Holds JWT_SECRET securely**
✅ **Signs JWT tokens** using the secret
✅ **Verifies JWT tokens** when received
✅ **Validates token integrity**

### **Frontend Responsibilities:**
✅ **Receives signed tokens** from backend
✅ **Stores tokens** (localStorage/sessionStorage)
✅ **Sends tokens** in API requests
❌ **NEVER holds JWT_SECRET**
❌ **NEVER signs tokens**
❌ **NEVER verifies token signatures**

---

## 🔄 **Complete Authentication Flow**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend (has JWT_SECRET)
    participant DB as Database

    Note over B: JWT_SECRET = "super-secret-key-32-chars"
    
    F->>B: POST /login {username, password}
    B->>DB: Validate credentials
    B->>B: Generate token using JWT_SECRET
    Note over B: token = sign(payload, JWT_SECRET)
    B->>F: Return signed token
    Note over F: Stores token (no secret!)
    
    F->>B: API request + Authorization: Bearer {token}
    B->>B: Verify token using JWT_SECRET
    Note over B: verify(token, JWT_SECRET)
    B->>F: Return API response
```

---

## 🏗️ **Backend Implementation (HAS JWT_SECRET)**

### **Environment Configuration:**
```env
# Backend .env file
JWT_SECRET=your-super-secure-32-character-secret-key-here
JWT_EXPIRATION_HOURS=24
```

### **Token Generation (Backend Only):**
```go
// internal/auth/auth.go - BACKEND ONLY
func (s *AuthService) generateTokens(user *models.User) (string, string, int, error) {
    // Create claims
    claims := JWTClaims{
        UserID:   user.ID,
        Username: user.Username,
        Role:     user.Role,
        // ... other claims
    }

    // Sign token with JWT_SECRET (BACKEND ONLY!)
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signedToken, err := token.SignedString([]byte(s.config.Security.JWTSecret))
    
    return signedToken, refreshToken, expiresIn, err
}
```

### **Token Verification (Backend Only):**
```go
// internal/auth/auth.go - BACKEND ONLY
func (s *AuthService) validateToken(tokenString string) (*JWTClaims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        // Return JWT_SECRET for verification (BACKEND ONLY!)
        return []byte(s.config.Security.JWTSecret), nil
    })

    if err != nil {
        return nil, ErrTokenInvalid
    }

    claims, ok := token.Claims.(*JWTClaims)
    if !ok || !token.Valid {
        return nil, ErrTokenInvalid
    }

    return claims, nil
}
```

---

## 🎨 **Frontend Implementation (NO JWT_SECRET)**

### **Frontend Environment (NO SECRETS):**
```env
# Frontend .env file - NO JWT_SECRET!
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_APP_NAME=AetherPharma
# NO JWT_SECRET HERE!
```

### **Token Storage (Frontend):**
```typescript
// frontend/src/services/api.ts
class ApiService {
  private token: string | null = null;

  // Store received token (NOT the secret!)
  setToken(token: string) {
    this.token = token; // This is the SIGNED token, not the secret
    localStorage.setItem('auth_token', token);
  }

  // Send token in requests
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      // Send the signed token (NOT the secret!)
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    return response.json();
  }

  // Login - receive token from backend
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password }),
    });

    // Store the SIGNED token (not the secret!)
    this.setToken(response.access_token);
    
    return response;
  }
}
```

---

## 🔒 **Why JWT_SECRET Must Stay on Backend**

### **1. Security Reasons:**

#### **If Frontend Had JWT_SECRET:**
❌ **Anyone can inspect browser code/storage**
❌ **Secret exposed in JavaScript bundles**
❌ **Users could forge their own tokens**
❌ **Attackers could create admin tokens**
❌ **Complete security compromise**

#### **With Backend-Only JWT_SECRET:**
✅ **Secret stays on secure server**
✅ **Only backend can create valid tokens**
✅ **Frontend can't forge tokens**
✅ **Users can't elevate privileges**
✅ **Secure authentication system**

### **2. Browser Security Limitations:**
```javascript
// ❌ NEVER DO THIS - Exposed to everyone!
const JWT_SECRET = "super-secret-key"; // Visible in browser!

// ✅ Frontend only handles received tokens
const receivedToken = localStorage.getItem('auth_token');
```

---

## 🔍 **What Frontend Actually Stores**

### **Token Structure Frontend Receives:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE2Mzk5NjI0MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header (Base64):     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Payload (Base64):    eyJ1c2VyX2lkIjoiMTIzNCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE2Mzk5NjI0MDB9
Signature:           SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### **Frontend localStorage Contents:**
```javascript
// What's actually stored in browser
localStorage.getItem('auth_token') = "eyJhbGciOiJIUzI1NiIs..." // SIGNED token
localStorage.getItem('refresh_token') = "eyJhbGciOiJIUzI1NiIs..." // SIGNED refresh token
localStorage.getItem('user_data') = '{"id":"123","username":"admin","role":"admin"}'

// ❌ JWT_SECRET is NEVER stored here!
```

---

## 🎯 **Security Best Practices**

### **Backend Security:**
```go
// ✅ Secure secret storage
func LoadConfig() (*Config, error) {
    // Load from environment variables only
    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        return nil, fmt.Errorf("JWT_SECRET is required")
    }
    
    // Validate secret strength
    if len(jwtSecret) < 32 {
        return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters")
    }
    
    return &Config{
        Security: SecurityConfig{
            JWTSecret: jwtSecret, // Stays on server!
        },
    }, nil
}
```

### **Frontend Security:**
```typescript
// ✅ Secure token handling
class TokenManager {
  // Only store received tokens, never secrets
  static storeToken(token: string): void {
    // Validate token format (but not signature - that's backend's job)
    if (!token || !token.includes('.')) {
      throw new Error('Invalid token format');
    }
    
    localStorage.setItem('auth_token', token);
  }
  
  // Clear tokens on logout
  static clearTokens(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }
  
  // ❌ NEVER store or handle JWT_SECRET
  // static storeSecret(secret: string) - DON'T DO THIS!
}
```

---

## 🚨 **Common Security Mistakes to Avoid**

### **❌ WRONG - Exposing Secret to Frontend:**
```javascript
// ❌ NEVER DO THIS!
const config = {
  JWT_SECRET: "my-secret-key", // Exposed in bundle!
  API_URL: "http://localhost:8080"
};

// ❌ NEVER DO THIS!
fetch('/api/auth/login', {
  headers: {
    'JWT-Secret': 'my-secret-key' // Sent over network!
  }
});
```

### **✅ CORRECT - Backend-Only Secret:**
```javascript
// ✅ Frontend only handles API communication
const config = {
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  // NO JWT_SECRET here!
};

// ✅ Send only tokens, not secrets
fetch('/api/customers', {
  headers: {
    'Authorization': `Bearer ${storedToken}` // Signed token only
  }
});
```

---

## 🔍 **How to Verify Your Setup is Secure**

### **1. Check Frontend Code:**
```bash
# Search for JWT_SECRET in frontend code
grep -r "JWT_SECRET" frontend/
# Should return NO results!

# Check environment files
cat frontend/.env*
# Should NOT contain JWT_SECRET
```

### **2. Check Backend Code:**
```bash
# JWT_SECRET should only be in backend
grep -r "JWT_SECRET" internal/
# Should show config loading and usage only

# Check environment files
cat .env.local
# Should contain JWT_SECRET=...
```

### **3. Browser Developer Tools:**
```javascript
// In browser console - check localStorage
console.log(localStorage.getItem('auth_token')); // Should show token
console.log(localStorage.getItem('JWT_SECRET')); // Should be null!

// Check for secrets in window object
console.log(window.JWT_SECRET); // Should be undefined!
```

---

## ✅ **Summary: JWT_SECRET Security**

| Component | Has JWT_SECRET? | Responsibility |
|-----------|----------------|----------------|
| **Backend Server** | ✅ YES | Signs & verifies tokens |
| **Frontend/UI** | ❌ NO | Stores & sends tokens |
| **Database** | ❌ NO | Stores user data only |
| **localStorage** | ❌ NO | Stores signed tokens only |
| **Environment Variables** | ✅ Backend only | Secure configuration |

### **Key Points:**
1. 🔐 **JWT_SECRET = Backend server ONLY**
2. 🎨 **Frontend = Receives and sends signed tokens**
3. 🔒 **Security = Secret stays on server always**
4. ✅ **Verification = Backend validates token signatures**
5. 🚫 **Never = Expose secrets to browser/client**

---

**Your JWT authentication is secure as long as JWT_SECRET stays on the backend!** 🔐

The frontend only handles the signed tokens, never the secret key used to create them.