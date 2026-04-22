import api from './api';

const ChequeService = {
  // Get unique companies for autocomplete
  getCompanies: async () => {
    try {
      const response = await api.get('/cheques/companies');

      return {
        success: response.data?.success || false,
        data: response.data?.data?.companies || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get companies error:', error);

      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get cheques with filters
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      if (filters.company) params.append('company', filters.company);
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/cheques?${params.toString()}`);

      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get cheques error:', error);

      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get cheque by ID
  getById: async (id) => {
    try {
      if (!id) {
        return { success: false, data: null, error: 'Cheque ID required' };
      }

      const response = await api.get(`/cheques/${id}`);

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

  // Create cheque
  create: async (chequeData) => {
    try {
      const payload = {
        company_name: chequeData.company_name?.trim(),
        cheque_number: chequeData.cheque_number?.trim(),
        amount: parseFloat(chequeData.amount),
        cheque_date: chequeData.cheque_date,
        type: chequeData.type,
        status: chequeData.status || 'pending',
        notes: chequeData.notes?.trim() || null
      };

      if (
        !payload.company_name ||
        !payload.cheque_number ||
        !payload.amount ||
        !payload.cheque_date ||
        !payload.type
      ) {
        return {
          success: false,
          data: null,
          error: 'All required fields must be filled'
        };
      }

      const response = await api.post('/cheques', payload);

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Create cheque error:', error);

      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Update cheque
  update: async (id, chequeData) => {
    try {
      if (!id) {
        return { success: false, data: null, error: 'Cheque ID required' };
      }

      const payload = {
        company_name: chequeData.company_name?.trim(),
        cheque_number: chequeData.cheque_number?.trim(),
        amount: parseFloat(chequeData.amount),
        cheque_date: chequeData.cheque_date,
        type: chequeData.type,
        status: chequeData.status,
        notes: chequeData.notes?.trim() || null
      };

      const response = await api.put(`/cheques/${id}`, payload);

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update cheque error:', error);

      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Delete cheque
  delete: async (id) => {
    try {
      if (!id) {
        return { success: false, error: 'Cheque ID required' };
      }

      const response = await api.delete(`/cheques/${id}`);

      return {
        success: response.data?.success || false,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Delete cheque error:', error);

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get reminders
  getReminders: async () => {
    try {
      const response = await api.get('/cheques/reminders');

      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get reminders error:', error);

      return {
        success: false,
        data: [],
        error: error.message || 'Network error'
      };
    }
  },

  // Dashboard summary
  getDashboardSummary: async () => {
    try {
      const response = await api.get('/cheques/dashboard');

      return {
        success: response.data?.success || false,
        data: response.data?.data?.summary || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get dashboard summary error:', error);

      return {
        success: false,
        data: null,
        error: error.message || 'Network error'
      };
    }
  }
};

export default ChequeService;