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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Remove token and user data
      localStorage.removeItem('token');
      
      // Get the current path
      const currentPath = window.location.pathname;
      
      // Only redirect to login if not already on login page
      if (currentPath !== '/login') {
        // カスタムイベントを発火してReactアプリに通知
        window.dispatchEvent(new CustomEvent('unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api; 