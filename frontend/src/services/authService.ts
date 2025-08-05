import { apiService } from './api';
import { config } from '../config';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    last_login_at: string;
  };
}

export class AuthService {
  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
      
      // Set token in API service
      apiService.setToken(data.access_token);
      
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      apiService.clearToken();
    }
  }

  static getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  static isTokenValid(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;
    
    try {
      // Basic token validation - check if it's not a demo token
      return !token.startsWith('demo_token_');
    } catch {
      return false;
    }
  }
}