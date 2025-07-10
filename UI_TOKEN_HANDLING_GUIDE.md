# 🎨 UI Token Handling Guide - Complete Frontend JWT Management

## 🎯 **How Frontend Handles Signed JWT Tokens**

The UI receives **signed tokens** from the backend and manages them throughout the user session. Here's exactly how it works:

---

## 🔄 **Complete Token Lifecycle**

```mermaid
flowchart TD
    A[User Login] --> B[Backend Signs Token]
    B --> C[Frontend Receives Token]
    C --> D[Store in localStorage]
    D --> E[Send with API Requests]
    E --> F[Token Expires?]
    F -->|No| E
    F -->|Yes| G[Auto Refresh Token]
    G --> H[Update Stored Token]
    H --> E
    I[User Logout] --> J[Clear All Tokens]
```

---

## 🏗️ **1. Receiving Tokens from Backend**

### **Login Response Structure:**
```typescript
// What the backend sends to frontend
interface LoginResponse {
  access_token: string;    // Signed JWT token
  refresh_token: string;   // Signed refresh token  
  expires_in: number;      // Token expiration (seconds)
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}
```

### **Login Implementation:**
```typescript
// frontend/src/services/api.ts
class ApiService {
  private token: string | null = null;

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const loginData: LoginResponse = await response.json();
    
    // Handle the received tokens
    this.handleTokenReceived(loginData);
    
    return loginData;
  }

  private handleTokenReceived(loginData: LoginResponse): void {
    // Store the signed tokens (NOT the secret!)
    this.setToken(loginData.access_token);
    this.setRefreshToken(loginData.refresh_token);
    this.setUserData(loginData.user);
    this.setTokenTimestamp();
    
    // Start auto-refresh timer
    this.startTokenRefreshTimer();
  }
}
```

---

## 💾 **2. Storing Tokens Securely**

### **Token Storage Strategy:**
```typescript
// frontend/src/services/TokenManager.ts
class TokenManager {
  // Storage keys
  private static readonly ACCESS_TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly TIMESTAMP_KEY = 'token_timestamp';

  // Store access token
  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
    console.log('✅ Access token stored');
  }

  // Store refresh token
  static setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    console.log('✅ Refresh token stored');
  }

  // Store user data
  static setUserData(user: any): void {
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user));
    console.log('✅ User data stored');
  }

  // Get access token
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  // Get refresh token
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Get user data
  static getUserData(): any | null {
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Clear all tokens
  static clearAllTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
    console.log('🧹 All tokens cleared');
  }
}
```

### **What's Actually Stored:**
```javascript
// Browser localStorage contents after login:
localStorage.getItem('auth_token') = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MDkxMjM0NTZ9.signature"

localStorage.getItem('refresh_token') = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJleHAiOjE3MDkxMjM0NTZ9.signature"

localStorage.getItem('user_data') = 
  '{"id":"123","username":"admin","email":"admin@pharmacy.com","role":"admin"}'

localStorage.getItem('token_timestamp') = 
  "1709037056000"
```

---

## 📤 **3. Sending Tokens with API Requests**

### **Automatic Token Attachment:**
```typescript
// frontend/src/services/api.ts
class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = TokenManager.getAccessToken();
    
    // Build headers with token
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
    console.log(`🔑 Token: ${token ? 'Present' : 'Missing'}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token-related errors
    await this.handleTokenErrors(response);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Example API calls that automatically include tokens
  async getCustomers() {
    return this.request('/customers'); // Token automatically attached!
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    }); // Token automatically attached!
  }
}
```

### **HTTP Request Example:**
```http
GET /api/v1/customers HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MDkxMjM0NTZ9.signature
```

---

## 🔄 **4. Token Refresh Management**

### **Automatic Token Refresh:**
```typescript
// frontend/src/services/api.ts
class ApiService {
  private refreshTimer: NodeJS.Timeout | null = null;

  // Start automatic token refresh
  startTokenRefreshTimer(): void {
    // Refresh 1 hour before expiration (23 hours for 24-hour tokens)
    const refreshInterval = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
    
    this.refreshTimer = setInterval(async () => {
      const token = TokenManager.getAccessToken();
      if (token && !this.isTokenExpired()) {
        try {
          await this.refreshToken();
          console.log('🔄 Token automatically refreshed');
        } catch (error) {
          console.error('❌ Auto-refresh failed:', error);
          this.handleRefreshFailure();
        }
      }
    }, refreshInterval);
    
    console.log('⏰ Token refresh timer started');
  }

  // Manual token refresh
  async refreshToken(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Refreshing token...');

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const refreshData: LoginResponse = await response.json();
    
    // Update stored tokens with new ones
    TokenManager.setAccessToken(refreshData.access_token);
    TokenManager.setRefreshToken(refreshData.refresh_token);
    TokenManager.setUserData(refreshData.user);
    
    console.log('✅ Token refreshed successfully');
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const timestamp = localStorage.getItem('token_timestamp');
    if (!timestamp) return true;
    
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return tokenAge > maxAge;
  }
}
```

---

## ⚠️ **5. Error Handling for Token Issues**

### **Token Error Management:**
```typescript
// frontend/src/services/api.ts
class ApiService {
  private async handleTokenErrors(response: Response): Promise<void> {
    if (response.status === 401) {
      const errorData = await response.clone().json();
      
      if (errorData.error?.includes('expired')) {
        console.log('🔄 Token expired, attempting refresh...');
        await this.handleTokenExpiration();
      } else if (errorData.error?.includes('invalid')) {
        console.log('❌ Invalid token, logging out...');
        this.handleInvalidToken();
      } else if (errorData.error?.includes('blacklisted')) {
        console.log('🚫 Session invalidated, logging out...');
        this.handleInvalidatedSession();
      }
    }
  }

  private async handleTokenExpiration(): Promise<void> {
    try {
      await this.refreshToken();
      console.log('✅ Token refreshed after expiration');
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.handleRefreshFailure();
    }
  }

  private handleInvalidToken(): void {
    console.log('🧹 Clearing invalid tokens');
    TokenManager.clearAllTokens();
    this.redirectToLogin();
  }

  private handleInvalidatedSession(): void {
    console.log('🧹 Clearing invalidated session');
    TokenManager.clearAllTokens();
    this.redirectToLogin();
  }

  private handleRefreshFailure(): void {
    console.log('🧹 Clearing tokens after refresh failure');
    TokenManager.clearAllTokens();
    this.redirectToLogin();
  }

  private redirectToLogin(): void {
    window.location.href = '/login';
  }
}
```

---

## 🎨 **6. React Component Integration**

### **Authentication Context:**
```typescript
// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app start
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log('🔍 Checking for existing authentication...');
    
    const storedToken = TokenManager.getAccessToken();
    const storedUser = TokenManager.getUserData();
    
    if (storedToken && storedUser && !apiService.isTokenExpired()) {
      console.log('✅ Valid token found, user is authenticated');
      setToken(storedToken);
      setUser(storedUser);
      apiService.setToken(storedToken);
      apiService.startTokenRefreshTimer();
    } else {
      console.log('❌ No valid token found');
      TokenManager.clearAllTokens();
    }
    
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    console.log('🔐 Logging in user...');
    
    try {
      const response = await apiService.login(email, password);
      setToken(response.access_token);
      setUser(response.user);
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out user...');
    
    try {
      await apiService.logout();
    } catch (error) {
      console.error('⚠️ Logout request failed:', error);
    } finally {
      TokenManager.clearAllTokens();
      setToken(null);
      setUser(null);
      console.log('✅ Logout complete');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!user && !!token,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### **Using Authentication in Components:**
```typescript
// frontend/src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomers();
    }
  }, [isAuthenticated]);

  const loadCustomers = async () => {
    try {
      console.log('📡 Loading customers...');
      const data = await apiService.getCustomers(); // Token automatically sent!
      setCustomers(data);
      console.log('✅ Customers loaded');
    } catch (error) {
      console.error('❌ Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <header>
        <h1>Welcome, {user?.username}!</h1>
        <button onClick={logout}>Logout</button>
      </header>
      
      <main>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div>
            <h2>Customers ({customers.length})</h2>
            {/* Customer list */}
          </div>
        )}
      </main>
    </div>
  );
};
```

---

## 🛡️ **7. Security Considerations**

### **Token Security Best Practices:**
```typescript
// frontend/src/utils/TokenSecurity.ts
class TokenSecurity {
  // Validate token format (basic check)
  static isValidTokenFormat(token: string): boolean {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Get token payload (without verification - just for display)
  static getTokenPayload(token: string): any | null {
    try {
      if (!this.isValidTokenFormat(token)) return null;
      
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  // Check if token is close to expiration
  static isTokenCloseToExpiry(token: string, minutesBefore: number = 60): boolean {
    const payload = this.getTokenPayload(token);
    if (!payload || !payload.exp) return true;
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const warningTime = expirationTime - (minutesBefore * 60 * 1000);
    
    return Date.now() > warningTime;
  }

  // Secure token storage check
  static isSecureContext(): boolean {
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost';
  }
}
```

### **Environment-Based Storage:**
```typescript
// frontend/src/services/SecureStorage.ts
class SecureStorage {
  static setItem(key: string, value: string): void {
    if (TokenSecurity.isSecureContext()) {
      // Production: Use localStorage over HTTPS
      localStorage.setItem(key, value);
    } else {
      // Development: Use sessionStorage as fallback
      sessionStorage.setItem(key, value);
      console.warn('⚠️ Using sessionStorage in non-secure context');
    }
  }

  static getItem(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
```

---

## 🔍 **8. Token Debugging and Monitoring**

### **Token Debug Helper:**
```typescript
// frontend/src/utils/TokenDebugger.ts
class TokenDebugger {
  static logTokenInfo(): void {
    const token = TokenManager.getAccessToken();
    if (!token) {
      console.log('🔍 No token found');
      return;
    }

    const payload = TokenSecurity.getTokenPayload(token);
    if (payload) {
      console.log('🔍 Token Debug Info:', {
        userId: payload.user_id,
        username: payload.username,
        role: payload.role,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
        timeUntilExpiry: new Date(payload.exp * 1000).getTime() - Date.now(),
        isExpired: payload.exp * 1000 < Date.now()
      });
    }
  }

  static monitorTokenStatus(): void {
    setInterval(() => {
      const token = TokenManager.getAccessToken();
      if (token && TokenSecurity.isTokenCloseToExpiry(token, 30)) {
        console.warn('⚠️ Token expires in less than 30 minutes');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}
```

---

## ✅ **Summary: How UI Handles Tokens**

### **Token Lifecycle in Frontend:**
1. 🔐 **Receive** signed tokens from backend after login
2. 💾 **Store** tokens in localStorage (secure HTTPS context)
3. 📤 **Send** tokens automatically with every API request
4. 🔄 **Refresh** tokens before expiration (auto + manual)
5. ⚠️ **Handle** token errors (expired, invalid, blacklisted)
6. 🧹 **Clear** tokens on logout or errors

### **What Frontend Does with Tokens:**
✅ **Stores signed tokens** (not secrets!)
✅ **Sends tokens in Authorization headers**
✅ **Manages token lifecycle** (refresh, expiry)
✅ **Handles authentication state**
✅ **Provides user context** throughout app

### **What Frontend NEVER Does:**
❌ **Stores JWT_SECRET**
❌ **Signs tokens**
❌ **Verifies token signatures**
❌ **Creates new tokens**
❌ **Modifies token content**

---

**Your UI handles signed tokens securely and efficiently!** 🎨🔐

The frontend receives signed tokens from the backend and manages them throughout the user session, automatically attaching them to API requests and handling refresh/expiration seamlessly.