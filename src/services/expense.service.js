import api from './api';

const ExpenseService = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await api.get(`/expenses?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get expenses error:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  getById: async (id) => {
    try {
      if (!id) return { success: false, data: null, error: 'Expense ID required' };
      const response = await api.get(`/expenses/${id}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message || 'Network error'
      };
    }
  },
  
  create: async (expenseData) => {
    try {
      const payload = {
        reason: expenseData.reason?.trim(),
        amount: parseFloat(expenseData.amount),
        category_id: parseInt(expenseData.category_id),
        expense_date: expenseData.expense_date || new Date().toISOString()
      };
      
      if (!payload.reason || !payload.amount || !payload.category_id) {
        return { success: false, error: 'Reason, amount, and category are required', data: null };
      }
      
      const response = await api.post('/expenses', payload);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Create expense error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  update: async (id, expenseData) => {
    try {
      if (!id) return { success: false, error: 'Expense ID required', data: null };
      
      const payload = {
        reason: expenseData.reason?.trim(),
        amount: parseFloat(expenseData.amount),
        category_id: parseInt(expenseData.category_id),
        expense_date: expenseData.expense_date || new Date().toISOString()
      };
      
      const response = await api.put(`/expenses/${id}`, payload);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update expense error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  delete: async (id) => {
    try {
      if (!id) return { success: false, error: 'Expense ID required' };
      const response = await api.delete(`/expenses/${id}`);
      return {
        success: response.data?.success || false,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Delete expense error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  getTotal: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      
      const response = await api.get(`/expenses/total?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || { total: 0, formatted: 'LKR 0.00' },
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get expenses total error:', error);
      return {
        success: false,
        data: { total: 0, formatted: 'LKR 0.00' },
        error: error.message || 'Network error'
      };
    }
  },
  
  getByCategory: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      const response = await api.get(`/expenses/by-category?${params.toString()}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get expenses by category error:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Network error'
      };
    }
  }
};

export default ExpenseService;