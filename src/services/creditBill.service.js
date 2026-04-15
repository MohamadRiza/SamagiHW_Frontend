import api from './api';

const CreditBillService = {
  // Create credit bill
  create: async (billData) => {
    try {
      const payload = {
        customer_id: billData.customer_id,
        customer_name: billData.customer_name?.trim(),
        customer_mobile: billData.customer_mobile?.trim(),
        items: Array.isArray(billData.items) ? billData.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name?.trim(),
          barcode: item.barcode?.trim(),
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseInt(item.quantity) || 1,
          discount_lkr: parseFloat(item.discount_lkr) || 0
        })) : [],
        due_date: billData.due_date,
        notes: billData.notes?.trim() || null
      };
      
      if (!payload.customer_id || !payload.customer_name || !payload.customer_mobile) {
        return { success: false, error: 'Customer information is required', data: null };
      }
      if (!payload.items || payload.items.length === 0) {
        return { success: false, error: 'Cart items are required', data: null };
      }
      if (!payload.due_date) {
        return { success: false, error: 'Due date is required', data: null };
      }
      
      const response = await api.post('/credit-bills', payload);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Credit bill create error:', error);
      return { 
        success: false, 
        data: null,
        error: error.response?.data?.error || error.message || 'Network error' 
      };
    }
  },
  
  // Get recent credit bills
  getRecent: async (limit = 50) => {
    try {
      const response = await api.get('/credit-bills', { params: { limit } });
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get recent bills error:', error);
      return { success: false, data: [], error: error.message || 'Network error' };
    }
  },
  
  // Get single bill by ID
  getById: async (id) => {
    try {
      if (!id) return { success: false, data: null, error: 'Bill ID required' };
      const response = await api.get(`/credit-bills/${id}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || null,
        error: response.data?.error || null
      };
    } catch (error) {
      return { success: false, data: null, error: error.message || 'Network error' };
    }
  },
  
  // Get outstanding bills
  getOutstanding: async () => {
    try {
      const response = await api.get('/credit-bills/outstanding');
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        error: response.data?.error || null
      };
    } catch (error) {
      return { success: false, data: [], error: error.message || 'Network error' };
    }
  },

  // ✅ Get pending bills with filters
  getPending: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.customerId) params.append('customerId', filters.customerId);
      // ✅ Only append status if it's a valid value (not 'all')
      if (filters.status && ['pending', 'partial'].includes(filters.status)) {
        params.append('status', filters.status);
      }
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const url = `/credit-bills/pending${queryString ? '?' + queryString : ''}`;
      
      const response = await api.get(url);
      
      return {
        success: response.data?.success || false,
        data: Array.isArray(response.data?.data) ? response.data.data : [],
        error: response.data?.error || null
      };
    } catch (error) {
      console.error('Get pending bills error:', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Network error',
        statusCode: error.response?.status
      };
    }
  },

  // ✅ Update bill payment
  updatePayment: async (billId, paymentData) => {
    try {
      if (!billId) return { success: false, data: null, error: 'Bill ID required' };
      
      const response = await api.put(`/credit-bills/${billId}/payment`, {
        paid_amount: parseFloat(paymentData.paid_amount) || 0,
        payment_method: paymentData.payment_method || 'CASH',
        notes: paymentData.notes?.trim() || null
      });
      
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
        error: error.response?.data?.error || error.message || 'Failed to update payment'
      };
    }
  },

  // ✅ Get customer's bill history
  getByCustomer: async (customerId) => {
    try {
      if (!customerId) return { success: false, data: [], error: 'Customer ID required' };
      const response = await api.get(`/credit-bills/customer/${customerId}`);
      return {
        success: response.data?.success || false,
        data: Array.isArray(response.data?.data) ? response.data.data : [],
        error: response.data?.error || null
      };
    } catch (error) {
      return { success: false, data: [], error: error.message || 'Network error' };
    }
  },

// ✅ Reprint bill receipt
reprintBill: async (billId) => {
  try {
    if (!billId) return { success: false, data: null, error: 'Bill ID required' };
    const response = await api.get(`/credit-bills/${billId}/reprint`);
    return {
      success: response.data?.success || false,
      data: response.data?.data || null,
      error: response.data?.error || null
    };
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to fetch bill' };
  }
},

// ✅ Get paid bills with filters
getPaid: async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Search: only append if non-empty
    if (filters.search && filters.search.trim().length >= 2) {
      params.append('search', filters.search.trim());
    }
    
    // Customer ID: only append if valid number
    if (filters.customerId && !isNaN(parseInt(filters.customerId))) {
      params.append('customerId', parseInt(filters.customerId).toString());
    }
    
    // Date filters: only append if valid ISO date format
    if (filters.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
      params.append('dateTo', filters.dateTo);
    }
    
    // SortBy: whitelist validation
    const validSorts = ['created_at', 'due_date', 'grand_total', 'customer_name', 'bill_number'];
    if (filters.sortBy && validSorts.includes(filters.sortBy)) {
      params.append('sortBy', filters.sortBy);
    }
    
    // Order: ASC or DESC
    if (filters.order && ['ASC', 'DESC'].includes(filters.order.toUpperCase())) {
      params.append('order', filters.order.toUpperCase());
    }
    
    // Limit: valid positive number
    if (filters.limit && !isNaN(parseInt(filters.limit))) {
      const limit = parseInt(filters.limit);
      if (limit > 0 && limit <= 1000) {
        params.append('limit', limit.toString());
      }
    }
    
    const queryString = params.toString();
    const url = `/credit-bills/paid${queryString ? '?' + queryString : ''}`;
    
    const response = await api.get(url);
    
    return {
      success: response.data?.success || false,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      stats: response.data?.stats || null,
      error: response.data?.error || null
    };
  } catch (error) {
    console.error('Get paid bills service error:', error);
    return {
      success: false,
      data: [],
      stats: null,
      error: error.response?.data?.error || error.message || 'Network error',
      statusCode: error.response?.status
    };
  }
},
};

export default CreditBillService;