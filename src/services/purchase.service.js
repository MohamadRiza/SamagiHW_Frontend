import api from './api';

const PurchaseService = {
  // Get purchases with filters
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.bill_type) params.append('bill_type', filters.bill_type);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
      if (filters.showOutstanding) params.append('showOutstanding', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/purchases?${params.toString()}`);

      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get purchases error:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get purchase by ID
  getById: async (id) => {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Purchase ID required'
        };
      }

      const response = await api.get(`/purchases/${id}`);

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

  // Create purchase
  create: async (purchaseData) => {
    try {
      const formData = new FormData();
      formData.append('title', purchaseData.title);
      formData.append('bill_type', purchaseData.bill_type);
      formData.append('bill_amount', purchaseData.bill_amount.toString());
      formData.append('purchase_date', purchaseData.purchase_date);

      if (purchaseData.bill_type === 'credit') {
        formData.append(
          'outstanding_amount',
          purchaseData.outstanding_amount?.toString() || purchaseData.bill_amount.toString()
        );
        formData.append(
          'paid_amount',
          purchaseData.paid_amount?.toString() || '0'
        );
      } else {
        formData.append('paid_amount', purchaseData.bill_amount.toString());
      }

      if (purchaseData.notes) formData.append('notes', purchaseData.notes);
      if (purchaseData.bill_file) formData.append('bill_file', purchaseData.bill_file);

      const response = await api.post('/purchases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Create purchase error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Update purchase
  update: async (id, purchaseData) => {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Purchase ID required'
        };
      }

      const response = await api.put(`/purchases/${id}`, purchaseData);

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update purchase error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Update payment
  updatePayment: async (id, paymentData) => {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Purchase ID required'
        };
      }

      const response = await api.put(`/purchases/${id}/payment`, paymentData);

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Update payment error:', error);
      return {
        success: false,
        data: null,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Delete purchase
  delete: async (id) => {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Purchase ID required'
        };
      }

      const response = await api.delete(`/purchases/${id}`);

      return {
        success: response.data?.success || false,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Delete purchase error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  },

  // Get stats
  getStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/purchases/stats?${params.toString()}`);

      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Network error'
      };
    }
  }
};

export default PurchaseService;