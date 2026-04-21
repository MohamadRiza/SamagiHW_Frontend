import api from './api';

const ExpenseCategoryService = {
  getAll: async () => {
    try {
      const response = await api.get('/expense-categories');
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  create: async (name, description = null, color = '#3b82f6') => {
    try {
      const response = await api.post('/expense-categories', { name, description, color });
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Create category error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  update: async (id, name, description = null, color = null) => {
    try {
      const response = await api.put(`/expense-categories/${id}`, { name, description, color });
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update category error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },
  
  delete: async (id) => {
    try {
      const response = await api.delete(`/expense-categories/${id}`);
      return {
        success: response.data?.success || false,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Delete category error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }
};

export default ExpenseCategoryService;