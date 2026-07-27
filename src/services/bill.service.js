import api from './api';

const BillService = {
  create: (items, paymentMethod = 'CASH') => api.post('/bills', { items, paymentMethod }).then(res => res.data),
  getRecent: (limit = 50) => api.get('/bills', { params: { limit } }).then(res => res.data),
  getById: (id) => api.get(`/bills/${id}`).then(res => res.data)
};

export default BillService;