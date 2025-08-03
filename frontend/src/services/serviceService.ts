import { Service, ServiceCategory } from '../types';
import { apiService } from './api';

export interface ServiceResponse {
  services: Service[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceCategoryOption {
  value: string;
  label: string;
}

export class ServiceService {
  static async getServices(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: ServiceCategory;
    activeOnly?: boolean;
  }): Promise<ServiceResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.activeOnly) searchParams.append('active_only', 'true');

    const queryString = searchParams.toString();
    const url = queryString ? `/services?${queryString}` : '/services';
    
    return apiService.get<ServiceResponse>(url);
  }

  static async getService(id: string): Promise<Service> {
    return apiService.get<Service>(`/services/${id}`);
  }

  static async createService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    return apiService.post<Service>('/services', service);
  }

  static async updateService(id: string, service: Partial<Service>): Promise<Service> {
    return apiService.put<Service>(`/services/${id}`, service);
  }

  static async deleteService(id: string): Promise<void> {
    return apiService.delete(`/services/${id}`);
  }

  static async getServiceCategories(): Promise<{ categories: ServiceCategoryOption[] }> {
    return apiService.get<{ categories: ServiceCategoryOption[] }>('/services/categories');
  }
}