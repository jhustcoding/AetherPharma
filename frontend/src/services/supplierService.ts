import { Supplier } from '../types';
import { apiService } from './api';

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export class SupplierService {
  static async getSuppliers(page = 1, limit = 10, search = ''): Promise<SupplierListResponse> {
    try {
      return await apiService.getSuppliers(page, limit, search) as SupplierListResponse;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  }

  static async getSupplier(id: string): Promise<Supplier> {
    try {
      return await apiService.getSupplier(id) as Supplier;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  }

  static async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    try {
      return await apiService.createSupplier(supplier) as Supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  static async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    try {
      return await apiService.updateSupplier(id, supplier) as Supplier;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  static async deleteSupplier(id: string): Promise<void> {
    try {
      await apiService.deleteSupplier(id);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
}