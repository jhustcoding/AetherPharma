import { Customer, CustomerPurchaseHistory, Sale } from '../types';

export interface CustomerStats {
  totalSpent: number;
  totalPurchases: number;
  lastPurchase?: string;
  uniqueMedications: number;
  averageOrderValue: number;
  customerSince: string;
  loyaltyPoints: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CustomerSearchFilters {
  searchTerm?: string;
  hasAllergies?: boolean;
  hasMedicalHistory?: boolean;
  hasInsurance?: boolean;
  ageRange?: { min: number; max: number };
  registrationDateRange?: { start: string; end: string };
}

export class CustomerService {
  private static customers: Customer[] = [];
  private static purchaseHistory: CustomerPurchaseHistory[] = [];

  static async getAllCustomers(): Promise<Customer[]> {
    // In a real app, this would fetch from API
    return this.customers;
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    return this.customers.find(customer => customer.id === id) || null;
  }

  static async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'qrCode'>): Promise<Customer> {
    const newCustomer: Customer = {
      ...customerData,
      id: `CUST_${Date.now()}`,
      createdAt: new Date().toISOString(),
      qrCode: `QR_${Date.now()}`
    };

    this.customers.push(newCustomer);
    return newCustomer;
  }

  static async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const customerIndex = this.customers.findIndex(customer => customer.id === id);
    if (customerIndex === -1) return null;

    this.customers[customerIndex] = { ...this.customers[customerIndex], ...updates };
    return this.customers[customerIndex];
  }

  static async deleteCustomer(id: string): Promise<boolean> {
    const customerIndex = this.customers.findIndex(customer => customer.id === id);
    if (customerIndex === -1) return false;

    this.customers.splice(customerIndex, 1);
    return true;
  }

  static async searchCustomers(filters: CustomerSearchFilters): Promise<Customer[]> {
    let filtered = this.customers;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term)
      );
    }

    if (filters.hasAllergies !== undefined) {
      filtered = filtered.filter(customer =>
        filters.hasAllergies ? customer.allergies.length > 0 : customer.allergies.length === 0
      );
    }

    if (filters.hasMedicalHistory !== undefined) {
      filtered = filtered.filter(customer =>
        filters.hasMedicalHistory ? customer.medicalHistory.length > 0 : customer.medicalHistory.length === 0
      );
    }

    if (filters.hasInsurance !== undefined) {
      filtered = filtered.filter(customer =>
        filters.hasInsurance ? !!customer.insuranceInfo : !customer.insuranceInfo
      );
    }

    if (filters.ageRange) {
      filtered = filtered.filter(customer => {
        const age = this.calculateAge(customer.dateOfBirth);
        return age >= filters.ageRange!.min && age <= filters.ageRange!.max;
      });
    }

    if (filters.registrationDateRange) {
      filtered = filtered.filter(customer => {
        const createdDate = new Date(customer.createdAt);
        const startDate = new Date(filters.registrationDateRange!.start);
        const endDate = new Date(filters.registrationDateRange!.end);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    return filtered;
  }

  static async getCustomerStats(customerId: string): Promise<CustomerStats | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    const customerPurchases = this.purchaseHistory.filter(p => p.customerId === customerId);
    const totalSpent = customerPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalPurchases = customerPurchases.length;
    const lastPurchase = customerPurchases.length > 0 
      ? customerPurchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0].purchaseDate
      : undefined;

    const uniqueMedications = new Set(customerPurchases.map(p => p.productName)).size;
    const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    // Calculate loyalty points (1 point per peso spent)
    const loyaltyPoints = Math.floor(totalSpent);

    // Assess risk level based on medical history and age
    const age = this.calculateAge(customer.dateOfBirth);
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (age > 65 || customer.medicalHistory.length > 2) {
      riskLevel = 'high';
    } else if (age > 50 || customer.medicalHistory.length > 0 || customer.allergies.length > 0) {
      riskLevel = 'medium';
    }

    return {
      totalSpent,
      totalPurchases,
      lastPurchase,
      uniqueMedications,
      averageOrderValue,
      customerSince: customer.createdAt,
      loyaltyPoints,
      riskLevel
    };
  }

  static async getCustomerPurchaseHistory(customerId: string): Promise<CustomerPurchaseHistory[]> {
    return this.purchaseHistory
      .filter(purchase => purchase.customerId === customerId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  static async addPurchaseHistory(purchase: CustomerPurchaseHistory): Promise<void> {
    this.purchaseHistory.push(purchase);
  }

  static async getCustomersByMedication(medicationName: string): Promise<Customer[]> {
    return this.customers.filter(customer =>
      customer.currentMedications.some(med =>
        med.toLowerCase().includes(medicationName.toLowerCase())
      )
    );
  }

  static async getCustomersWithAllergies(allergyName?: string): Promise<Customer[]> {
    if (allergyName) {
      return this.customers.filter(customer =>
        customer.allergies.some(allergy =>
          allergy.toLowerCase().includes(allergyName.toLowerCase())
        )
      );
    }
    return this.customers.filter(customer => customer.allergies.length > 0);
  }

  static async getCustomerMedicationInteractions(customerId: string, newMedication: string): Promise<string[]> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return [];

    // This would typically check against a drug interaction database
    const interactions: string[] = [];
    
    // Simple example - in real app, this would be more sophisticated
    const commonInteractions = {
      'warfarin': ['aspirin', 'ibuprofen', 'vitamin k'],
      'metformin': ['alcohol', 'contrast dyes'],
      'lisinopril': ['potassium supplements', 'nsaids']
    };

    const newMedLower = newMedication.toLowerCase();
    customer.currentMedications.forEach(currentMed => {
      const currentMedLower = currentMed.toLowerCase();
      
      // Check if current medication has known interactions with new medication
      Object.entries(commonInteractions).forEach(([drug, interactsWith]) => {
        if (currentMedLower.includes(drug) && interactsWith.some(med => newMedLower.includes(med))) {
          interactions.push(`${currentMed} may interact with ${newMedication}`);
        }
        if (newMedLower.includes(drug) && interactsWith.some(med => currentMedLower.includes(med))) {
          interactions.push(`${newMedication} may interact with ${currentMed}`);
        }
      });
    });

    return interactions;
  }

  static async getCustomerAllergyWarnings(customerId: string, productName: string): Promise<string[]> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return [];

    const warnings: string[] = [];
    const productLower = productName.toLowerCase();

    customer.allergies.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      
      // Check for common allergy-medication associations
      if (allergyLower.includes('penicillin') && productLower.includes('amoxicillin')) {
        warnings.push(`Patient is allergic to ${allergy}. ${productName} contains penicillin.`);
      }
      if (allergyLower.includes('sulfa') && productLower.includes('sulfamethoxazole')) {
        warnings.push(`Patient is allergic to ${allergy}. ${productName} contains sulfa.`);
      }
      if (allergyLower.includes('aspirin') && productLower.includes('aspirin')) {
        warnings.push(`Patient is allergic to ${allergy}. ${productName} contains aspirin.`);
      }
    });

    return warnings;
  }

  static async generateCustomerReport(customerId: string): Promise<any> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    const stats = await this.getCustomerStats(customerId);
    const purchaseHistory = await this.getCustomerPurchaseHistory(customerId);
    
    return {
      customer,
      stats,
      purchaseHistory,
      generatedAt: new Date().toISOString(),
      reportType: 'customer_profile'
    };
  }

  private static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Initialize with mock data
  static initializeWithMockData(customers: Customer[], purchaseHistory: CustomerPurchaseHistory[]): void {
    this.customers = [...customers];
    this.purchaseHistory = [...purchaseHistory];
  }
}