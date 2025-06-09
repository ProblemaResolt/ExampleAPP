import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  },
  withCredentials: true // Enable sending cookies
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('=== Request Interceptor Debug ===');
    console.log('Request URL:', config.url);
    console.log('Request Method:', config.method);
    console.log('Token exists:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header set:', config.headers.Authorization.substring(0, 20) + '...');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('=== Response Interceptor Debug ===');
    console.log('Response URL:', response.config.url);
    console.log('Response Status:', response.status);
    return response;
  },
  (error) => {
    console.error('=== Response Error Debug ===');
    console.error('Error URL:', error.config?.url);
    console.error('Error Status:', error.response?.status);
    console.error('Error Message:', error.response?.data?.message);
    console.error('Error Details:', error.response?.data);

    if (error.response?.status === 401) {
      console.log('401 Unauthorized - Clearing token and redirecting to login');
      // Remove token and user data
      localStorage.removeItem('token');
      
      // Get the current path
      const currentPath = window.location.pathname;
      console.log('Current path:', currentPath);
      
      // Only redirect to login if not already on login page
      if (currentPath !== '/login') {
        console.log('Redirecting to login page');
        // Use window.location.href for initial redirect
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api; 