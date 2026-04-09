import api from './api';

const BillService = {
  create: (items) => api.post('/bills', { items }).then(res => res.data),
  getRecent: (limit = 50) => api.get('/bills', { params: { limit } }).then(res => res.data),
  getById: (id) => api.get(`/bills/${id}`).then(res => res.data)
};

export default BillService;