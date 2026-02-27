import axios from 'axios';

const API = axios.create({
    baseURL: '/api',
});

// Add JWT token to every request
API.interceptors.request.use((config) => {
    const userInfo = localStorage.getItem('civicShieldUser');
    if (userInfo) {
        const { token } = JSON.parse(userInfo);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auth API
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const loginAdmin = (data) => API.post('/auth/admin/login', data);
export const getProfile = () => API.get('/auth/profile');

// Complaint API
export const submitComplaint = (formData) => API.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMyComplaints = () => API.get('/complaints/my');
export const getComplaintById = (id) => API.get(`/complaints/${id}`);
export const getAdminComplaints = () => API.get('/complaints/admin');
export const getAuthorityComplaints = () => API.get('/complaints/authority');
export const adminActionOnComplaint = (id, data) => API.put(`/complaints/${id}/admin-action`, data);
export const authorityActionOnComplaint = (id, data) => API.put(`/complaints/${id}/authority-action`, data);
export const updateConsent = (id, consent) => API.put(`/complaints/${id}/consent`, { consent });
export const requestUserData = (id) => API.put(`/complaints/${id}/request-data`);
export const escalateComplaint = (id) => API.post(`/complaints/${id}/escalate`);
export const userResolve = (id, data) => API.put(`/complaints/${id}/user-resolve`, data);
export const getLawsuitInfo = () => API.get('/complaints/lawsuit-info');
export const getAllComplaints = () => API.get('/complaints/all');

export default API;
