import api from './api';

const getParts = (filters) => api.get('/products', { params: filters });
const getCompanies = () => api.get('/products/groups/companies');
const getModelsByCompany = (company) => api.get('/products/groups/models', { params: { company } });
const getBrands = () => api.get('/products/groups/brands');
const getTypes = () => api.get('/products/groups/types');

const getPartById = (id) => {
    return api.get(`/products/${id}`);
};

const createPart = (payload) => {
    return api.post('/products', payload);
};

const updatePart = (id, payload) => {
    return api.put(`/products/${id}`, payload);
};

const deletePart = (id) => {
    return api.delete(`/products/${id}`);
};

const bikePartsService = {
    getParts,
    getCompanies,
    getModelsByCompany,
    getBrands,
    getTypes,
    getPartById,
    createPart,
    updatePart,
    deletePart,
};

export default bikePartsService;
