import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { config } from '../config';

export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'assistant';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token and get user info
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || token.startsWith('demo_token_')) {
        // Remove old demo tokens
        logout();
        return;
      }

      // For now, just restore user from localStorage without backend verification
      // TODO: Implement /auth/verify endpoint in backend if needed
      const storedUser = localStorage.getItem('user_info');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Call real backend API
      const response = await fetch(config.getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid username or password');
      }

      const data = await response.json();
      
      const userData: User = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
        role: data.user.role,
        isActive: data.user.is_active,
        lastLoginAt: data.user.last_login_at
      };

      setUser(userData);
      localStorage.setItem('user_info', JSON.stringify(userData));
      localStorage.setItem('auth_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      toast.success(`Welcome back, ${userData.firstName}!`);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid username or password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_info');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    toast.success('Logged out successfully');
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    // Role-based permissions
    const permissions: Record<UserRole, Record<string, string[]>> = {
      admin: {
        users: ['create', 'read', 'update', 'delete'],
        customers: ['create', 'read', 'update', 'delete'],
        products: ['create', 'read', 'update', 'delete'],
        orders: ['create', 'read', 'update', 'delete'],
        sales: ['create', 'read', 'update', 'delete', 'refund'],
        suppliers: ['create', 'read', 'update', 'delete'],
        analytics: ['read'],
        audit: ['read'],
        qr: ['create', 'read', 'scan'],
        inventory: ['create', 'read', 'update', 'delete']
      },
      manager: {
        users: ['read', 'update'],
        customers: ['create', 'read', 'update', 'delete'],
        products: ['create', 'read', 'update', 'delete'],
        orders: ['create', 'read', 'update'],
        sales: ['create', 'read', 'update', 'refund'],
        suppliers: ['create', 'read', 'update', 'delete'],
        analytics: ['read'],
        qr: ['create', 'read', 'scan'],
        inventory: ['create', 'read', 'update', 'delete']
      },
      pharmacist: {
        customers: ['create', 'read', 'update'],
        products: ['read', 'update'],
        orders: ['create', 'read', 'update'],
        sales: ['create', 'read'],
        suppliers: ['read'],
        analytics: ['read'],
        qr: ['read', 'scan'],
        inventory: ['read', 'update']
      },
      assistant: {
        customers: ['read'],
        products: ['read'],
        orders: ['create', 'read'],
        sales: ['read'],
        suppliers: ['read'],
        qr: ['read', 'scan'],
        inventory: ['read']
      }
    };

    const userPermissions = permissions[user.role];
    const resourcePermissions = userPermissions[resource];
    
    return resourcePermissions ? resourcePermissions.includes(action) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isEmployee = (): boolean => {
    return user?.role === 'assistant' || user?.role === 'pharmacist';
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    isAdmin,
    isEmployee
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};