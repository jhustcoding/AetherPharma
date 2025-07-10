const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
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

  // Analytics
  async getDashboardAnalytics() {
    return this.request('/analytics/dashboard');
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