import api from './api';

// ✅ Helper: standard response formatter
const formatResponse = (response) => {
  return {
    success: response?.data?.success || false,
    data: response?.data?.data ?? null,
    error: response?.data?.error || null
  };
};

// ✅ Helper: error handler
const handleError = (error, defaultMessage = 'Network error') => {
  console.error('API Error:', error);
  return {
    success: false,
    data: null,
    error: error?.response?.data?.error || error?.message || defaultMessage,
    backendError: error?.response?.data || null
  };
};

// ✅ Helper: validate mobile (Sri Lanka format: 07XXXXXXXX)
const isValidMobile = (mobile) => {
  if (!mobile) return false;
  const clean = mobile.replace(/\s/g, '');
  return /^07[01245678]\d{7}$/.test(clean);
};

// ✅ Helper: sanitize customer payload
const sanitizeCustomer = (data) => ({
  customer_type: data?.customer_type || 'individual',
  name: data?.name?.trim(),
  company_name: data?.company_name?.trim() || null,
  mobile: data?.mobile?.trim(),
  email: data?.email?.trim() || null,
  address: data?.address?.trim(),
  city: data?.city?.trim(),
  nic_id: data?.nic_id?.trim() || null
});

const CustomerService = {
  // ✅ Get all customers
  getAll: async () => {
    try {
      const response = await api.get('/customers');
      return {
        ...formatResponse(response),
        data: Array.isArray(response?.data?.data) ? response.data.data : []
      };
    } catch (error) {
      return {
        ...handleError(error),
        data: []
      };
    }
  },

  // ✅ Search customers (min 2 chars)
  search: async (query) => {
    try {
      const cleanQuery = query?.trim();
      if (!cleanQuery || cleanQuery.length < 2) {
        return { success: true, data: [], error: null };
      }

      const response = await api.get('/customers/search', {
        params: { q: cleanQuery }
      });

      return {
        ...formatResponse(response),
        data: Array.isArray(response?.data?.data) ? response.data.data : []
      };
    } catch (error) {
      return {
        ...handleError(error),
        data: []
      };
    }
  },

  // ✅ Create customer with full validation
  create: async (customerData) => {
    try {
      const payload = sanitizeCustomer(customerData);

      console.log('📤 Creating customer:', payload);

      // ✅ Required field validation
      if (!payload.name || !payload.mobile || !payload.address || !payload.city) {
        return {
          success: false,
          data: null,
          error: 'Name, mobile, address, and city are required'
        };
      }

      // ✅ Mobile format validation (Sri Lankan)
      if (!isValidMobile(payload.mobile)) {
        return {
          success: false,
          data: null,
          error: 'Invalid mobile format. Use: 07XXXXXXXX (e.g., 0712345678)'
        };
      }

      const response = await api.post('/customers', payload);

      // ✅ Ensure we return the full customer object
      const formatted = formatResponse(response);
      if (formatted.success && formatted.data) {
        // Ensure data has all expected fields
        formatted.data = {
          id: formatted.data.id,
          name: formatted.data.name,
          mobile: formatted.data.mobile,
          address: formatted.data.address,
          city: formatted.data.city,
          company_name: formatted.data.company_name,
          email: formatted.data.email,
          nic_id: formatted.data.nic_id,
          customer_type: formatted.data.customer_type,
          outstanding_balance: formatted.data.outstanding_balance || 0,
          credit_limit: formatted.data.credit_limit || 0,
          created_at: formatted.data.created_at
        };
      }
      return formatted;

    } catch (error) {
      return handleError(error, 'Failed to create customer');
    }
  },

  // ✅ Get customer by ID
  getById: async (id) => {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: 'Customer ID is required'
        };
      }

      const response = await api.get(`/customers/${id}`);
      return formatResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to fetch customer');
    }
  }
};

export default CustomerService;