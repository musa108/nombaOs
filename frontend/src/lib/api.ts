const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auxo_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auxo_token');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auxo_token');
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async syncUser(clerkId: string, email: string, name: string) {
    return this.request<{ user: any; token: string }>('POST', '/auth/sync', { clerkId, email, name });
  }

  async getProfile() {
    return this.request<any>('GET', '/auth/profile');
  }

  // Business
  async setupBusiness(data: { businessName: string; industry: string; nombaAccountId?: string }) {
    return this.request<any>('POST', '/business/setup', data);
  }

  async getBusinessProfile() {
    return this.request<any>('GET', '/business/profile');
  }

  async getDashboard() {
    return this.request<any>('GET', '/business/dashboard');
  }

  // AI Chat
  async chat(message: string, conversationId?: string) {
    return this.request<{
      message: string;
      requiresConfirmation?: any;
      conversationId: string;
    }>('POST', '/ai/chat', { message, conversationId });
  }

  async confirmTransfer(details: {
    amount: number;
    beneficiaryAccountNumber: string;
    beneficiaryBankCode: string;
    narration: string;
  }) {
    return this.request<any>('POST', '/ai/confirm-transfer', details);
  }

  async clearConversation(id: string) {
    return this.request<any>('DELETE', `/ai/conversations/${id}`);
  }

  // Transactions
  async getTransactions(params?: any) {
    return this.request<any>('GET', '/transactions', undefined, params);
  }

  async getSalesReport(period: string) {
    return this.request<any>('GET', '/transactions/report', undefined, { period });
  }

  async syncNombaTransactions() {
    return this.request<any>('POST', '/transactions/sync-nomba');
  }

  // Invoices
  async getInvoices(params?: any) {
    return this.request<any>('GET', '/invoices', undefined, params);
  }

  async createInvoice(data: any) {
    return this.request<any>('POST', '/invoices', data);
  }

  async markInvoicePaid(id: string) {
    return this.request<any>('PUT', `/invoices/${id}/paid`);
  }

  async sendInvoiceReminder(id: string) {
    return this.request<any>('POST', `/invoices/${id}/reminder`);
  }

  // Customers
  async getCustomers(search?: string) {
    return this.request<any>('GET', '/customers', undefined, search ? { search } : undefined);
  }

  async getTopCustomers() {
    return this.request<any>('GET', '/customers/top');
  }

  async createCustomer(data: { name: string; email?: string; phone?: string }) {
    return this.request<any>('POST', '/customers', data);
  }

  // Products
  async getProducts(params?: any) {
    return this.request<any>('GET', '/products', undefined, params);
  }

  async createProduct(data: { name: string; category?: string; quantity: number; price: number }) {
    return this.request<any>('POST', '/products', data);
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>('PUT', `/products/${id}`, data);
  }

  async getLowStockProducts() {
    return this.request<any>('GET', '/products/low-stock');
  }

  async getInventorySummary() {
    return this.request<any>('GET', '/products/inventory-summary');
  }

  // Analytics
  async getRevenueAnalytics() {
    return this.request<any>('GET', '/analytics/revenue');
  }

  async getRevenueTrend(days = 30) {
    return this.request<any>('GET', '/analytics/trend', undefined, { days });
  }

  // Nomba
  async getNombaBalance() {
    return this.request<any>('GET', '/nomba/balance');
  }

  async getNombaBanks() {
    return this.request<any>('GET', '/nomba/banks');
  }

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    return this.request<any>('GET', '/nomba/verify-account', undefined, { accountNumber, bankCode });
  }

  // Notifications
  async getNotifications(unreadOnly = false) {
    return this.request<any>('GET', '/notifications', undefined, unreadOnly ? { unread: true } : {});
  }

  async getUnreadCount() {
    return this.request<number>('GET', '/notifications/count');
  }

  async markNotificationRead(id: string) {
    return this.request<any>('PUT', `/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.request<any>('PUT', '/notifications/read-all');
  }
}

export const api = new ApiClient();
