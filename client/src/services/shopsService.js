import api from './api';

const getShops = (params = {}) => api.get('/shops', { params });
const getShop = (id) => api.get(`/shops/${id}`);
const createShop = (payload) => api.post('/shops', payload);
const updateShop = (id, payload) => api.put(`/shops/${id}`, payload);
const deleteShop = (id) => api.delete(`/shops/${id}`);

export default { getShops, getShop, createShop, updateShop, deleteShop };
