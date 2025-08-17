import api from './api';

const register = (userData) => {
    return api.post('/auth/register', userData);
};

const login = (userData) => {
    return api.post('/auth/login', userData);
};

const authService = {
    register,
    login,
};

export default authService;
