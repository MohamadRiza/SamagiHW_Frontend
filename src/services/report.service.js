import api from './api';

const ReportService = {
  // Get today's summary
  getTodaySummary: async () => {
    try {
      const response = await api.get('/reports/today-summary');
      return {
        success: response.data?.success || false,
        data: response.data?.summary || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get today summary error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get monthly summary
  getMonthlySummary: async (year, month) => {
    try {
      const response = await api.get(`/reports/monthly-summary?year=${year}&month=${month}`);
      return {
        success: response.data?.success || false,
        data: response.data?.summary || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get monthly summary error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get expense categories for filter dropdown
  getExpenseCategories: async () => {
    try {
      const response = await api.get('/reports/expense-categories');
      return {
        success: response.data?.success || false,
        data: response.data?.categories || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get expense categories error:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  // Get sales report
  getSalesReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      if (filters.cashier) params.append('cashier', filters.cashier);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/reports/sales?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.report || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get sales report error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get credit sales report
  getCreditSalesReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.customer) params.append('customer', filters.customer);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/reports/credit-sales?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.report || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get credit sales report error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get stock report
  getStockReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.lowStockOnly) params.append('lowStockOnly', 'true');
      if (filters.company) params.append('company', filters.company);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);

      const response = await api.get(`/reports/stock?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.report || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get stock report error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get expense report
  getExpenseReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/reports/expenses?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.report || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get expense report error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get purchase report
  getPurchaseReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.billType) params.append('billType', filters.billType);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/reports/purchases?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.report || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get purchase report error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }
};

export default ReportService;