import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Server URL
    withCredentials: true, // Send cookies
});

// Response interceptor to handle 401/403
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Not authenticated
            // Could redirect to login here but usually better handled in UI
        }
        return Promise.reject(error);
    }
);

export default api;
