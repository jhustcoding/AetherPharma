import { config } from '../config';

const API_BASE_URL = config.API_BASE_URL;

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
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API Error: ${response.status} ${response.statusText}`;
      
      // Handle specific error cases
      if (response.status === 401) {
        // Only clear token if the error specifically mentions invalid/expired token
        const errorMsg = errorData.error || '';
        if (errorMsg.includes('invalid') || errorMsg.includes('expired') || errorMsg.includes('malformed')) {
          this.clearToken();
          throw new Error('Authentication failed. Please log in again.');
        } else {
          // Don't clear token for other 401 errors (might be temporary)
          throw new Error('Access denied. Please try again.');
        }
      } else if (response.status === 403) {
        throw new Error('Access denied. Insufficient permissions.');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Authentication
  async login(username: string, password: string) {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.setToken(response.access_token);
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async createCustomer(customer: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // Products
  async getProducts() {
    return this.request('/products');
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  // Sales
  async getSales() {
    return this.request('/sales');
  }

  async createSale(sale: any) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  }

  // Suppliers
  async getSuppliers(page = 1, limit = 10, search = ''): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    return this.request(`/suppliers?${params}`);
  }

  async getSupplier(id: string): Promise<any> {
    return this.request(`/suppliers/${id}`);
  }

  async createSupplier(supplier: any): Promise<any> {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  }

  async updateSupplier(id: string, supplier: any): Promise<any> {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getDashboardAnalytics() {
    return this.request<{
      today_sales: number;
      total_customers: number;
      total_products: number;
      low_stock_alerts: number;
    }>('/analytics/dashboard');
  }

  async getInventoryMovementAnalytics() {
    return this.request<any>('/analytics/inventory-movement');
  }

  async getSalesAnalytics(timeRange: string = '7d') {
    return this.request<any>(`/analytics/sales?time_range=${timeRange}`);
  }

  async getCustomerAnalytics() {
    return this.request<any>('/analytics/customers');
  }

  async getDiscountAnalytics() {
    return this.request<{
      total_orders: number;
      senior_citizen_orders: number;
      pwd_orders: number;
      total_discount_amount: number;
      senior_citizen_discount_amount: number;
      pwd_discount_amount: number;
      average_discount: number;
    }>('/analytics/discounts');
  }

  // QR Code
  async scanQR(code: string) {
    return this.request('/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Online Orders
  async addToCart(item: any) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async getCart() {
    return this.request('/cart');
  }

  async createOrder(order: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }
}

export const apiService = new ApiService();
export default ApiService;