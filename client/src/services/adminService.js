import api from './api';

export const createVendorWithShop = (payload) => api.post('/admin/vendors/create', payload);

const adminService = { createVendorWithShop };
export default adminService;
