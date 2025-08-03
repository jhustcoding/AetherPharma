import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

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
      // In a real app, you'd verify the token with the server
      // For now, we'll decode the stored user info
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
      
      // Demo accounts for testing (since backend is not running)
      const demoAccounts = [
        { 
          username: 'admin', 
          password: 'admin123', 
          role: 'admin' as UserRole,
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@aetherpharma.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin' as UserRole,
            is_active: true,
            last_login_at: new Date().toISOString()
          }
        },
        { 
          username: 'pharmacist1', 
          password: 'admin123', 
          role: 'pharmacist' as UserRole,
          user: {
            id: '2',
            username: 'pharmacist1',
            email: 'pharmacist1@aetherpharma.com',
            first_name: 'John',
            last_name: 'Pharmacist',
            role: 'pharmacist' as UserRole,
            is_active: true,
            last_login_at: new Date().toISOString()
          }
        },
        { 
          username: 'assistant1', 
          password: 'admin123', 
          role: 'assistant' as UserRole,
          user: {
            id: '3',
            username: 'assistant1',
            email: 'assistant1@aetherpharma.com',
            first_name: 'Jane',
            last_name: 'Assistant',
            role: 'assistant' as UserRole,
            is_active: true,
            last_login_at: new Date().toISOString()
          }
        }
      ];

      // Find matching demo account
      const account = demoAccounts.find(acc => acc.username === username && acc.password === password);
      
      if (!account) {
        throw new Error('Invalid username or password');
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData: User = {
        id: account.user.id,
        username: account.user.username,
        email: account.user.email,
        firstName: account.user.first_name,
        lastName: account.user.last_name,
        role: account.user.role,
        isActive: account.user.is_active,
        lastLoginAt: account.user.last_login_at
      };

      setUser(userData);
      localStorage.setItem('user_info', JSON.stringify(userData));
      localStorage.setItem('auth_token', `demo_token_${userData.id}`);
      
      toast.success(`Welcome back, ${userData.firstName}!`);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Invalid username or password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_info');
    localStorage.removeItem('auth_token');
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
        analytics: ['read'],
        qr: ['create', 'read', 'scan'],
        inventory: ['create', 'read', 'update', 'delete']
      },
      pharmacist: {
        customers: ['create', 'read', 'update'],
        products: ['read', 'update'],
        orders: ['create', 'read', 'update'],
        sales: ['create', 'read'],
        analytics: ['read'],
        qr: ['read', 'scan'],
        inventory: ['read', 'update']
      },
      assistant: {
        customers: ['read'],
        products: ['read'],
        orders: ['create', 'read'],
        sales: ['read'],
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