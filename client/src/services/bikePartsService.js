import api from './api';

const getParts = (filters) => {
    return api.get('/products', { params: filters });
};

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
    getPartById,
    createPart,
    updatePart,
    deletePart,
};

export default bikePartsService;
