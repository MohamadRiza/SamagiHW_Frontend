import api from './api';

const ProductService = {
  // Get all products with filters
  getAll: (params = {}) => {
    return api.get('/products', { params }).then(res => res.data);
  },
  
  // Get single product
  getById: (id) => api.get(`/products/${id}`).then(res => res.data),
  
  // Create product
  create: (productData) => api.post('/products', productData).then(res => res.data),
  
  // Update product
  update: (id, productData) => api.put(`/products/${id}`, productData).then(res => res.data),
  
  // Delete product
  delete: (id) => api.delete(`/products/${id}`).then(res => res.data),
  
  // Deduct stock for billing
  deductStock: (productId, quantity) => 
    api.post('/products/deduct-stock', { productId, quantity }).then(res => res.data),
  
  // Get low stock alerts
  getLowStock: (threshold) => 
    api.get('/products/low-stock', { params: { threshold } }).then(res => res.data)
};

export default ProductService;