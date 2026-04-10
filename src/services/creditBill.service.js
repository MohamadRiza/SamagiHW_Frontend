import api from './api';

const CreditBillService = {
  create: async (billData) => {
    try {
      // Ensure items array is properly formatted
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
      
      // Validate before sending
      if (!payload.customer_id || !payload.customer_name || !payload.customer_mobile) {
        return { success: false, error: 'Customer information is required' };
      }
      if (!payload.items || payload.items.length === 0) {
        return { success: false, error: 'Cart items are required' };
      }
      if (!payload.due_date) {
        return { success: false, error: 'Due date is required' };
      }
      
      const response = await api.post('/credit-bills', payload);
      return response.data.success 
        ? { success: true, data: response.data.data }
        : { success: false, error: response.data.error || 'Failed to create bill' };
    } catch (error) {
      console.error('Credit bill create error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Network error' 
      };
    }
  },
  
  getRecent: async (limit = 50) => {
    try {
      const response = await api.get('/credit-bills', { params: { limit } });
      return response.data.success 
        ? { success: true, data: response.data.data || [] }
        : { success: false, error: response.data.error || 'Failed to fetch bills' };
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/credit-bills/${id}`);
      return response.data.success 
        ? { success: true, data: response.data.data }
        : { success: false, error: response.data.error || 'Bill not found' };
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  },
  
  getOutstanding: async () => {
    try {
      const response = await api.get('/credit-bills/outstanding');
      return response.data.success 
        ? { success: true, data: response.data.data || [] }
        : { success: false, error: response.data.error || 'Failed to fetch outstanding' };
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  }
};

export default CreditBillService;