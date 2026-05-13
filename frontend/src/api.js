// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

// Define your backends
const PRIMARY_BACKEND = "https://zuca-portal2.onrender.com";
const SECONDARY_BACKEND = "https://zuca-backend-iw9p.onrender.com";



let BASE_URL;
let currentBackend = PRIMARY_BACKEND;
let isSwitching = false; // Prevent multiple simultaneous switches

if (hostname === "localhost") {
  // Local development
  BASE_URL = "http://localhost:5000";
} else {
  // Production - start with primary backend
  BASE_URL = PRIMARY_BACKEND;
}

// Create a public API instance (NO authentication)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Create an authenticated API instance (WITH authentication)
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Helper function to switch backend silently
export const switchBackend = () => {
  if (isSwitching) return BASE_URL;
  
  isSwitching = true;
  
  if (currentBackend === PRIMARY_BACKEND) {
    currentBackend = SECONDARY_BACKEND;
  } else {
    currentBackend = PRIMARY_BACKEND;
  }
  BASE_URL = currentBackend;
  
  // Update all axios instances with new baseURL
  publicApi.defaults.baseURL = BASE_URL;
  api.defaults.baseURL = BASE_URL;
  
  // Silent switch - no console logs in production
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Switched to backend: ${BASE_URL}`);
  }
  
  isSwitching = false;
  return BASE_URL;
};

// Add token interceptor FIRST
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generic retry function with exponential backoff
const retryWithBackoff = async (fn, retries = 2, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Response interceptor for authenticated api with seamless failover
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops
    if (originalRequest._retryCount >= 3) {
      return Promise.reject(error);
    }
    
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    // Check if this is a retryable error
    const isRetryable = 
      error.message === "Network Error" || 
      error.code === "ECONNABORTED" ||
      error.response?.status >= 500 ||
      error.response?.status === 429; // Rate limit
    
    if (isRetryable && hostname !== "localhost") {
      originalRequest._retryCount++;
      
      // Try switching backend after first failure
      if (originalRequest._retryCount === 1) {
        switchBackend();
        originalRequest.baseURL = BASE_URL;
        
        // Retry with new backend
        try {
          return await api(originalRequest);
        } catch (retryError) {
          // If second backend also fails, try original with delay
          if (originalRequest._retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            originalRequest.baseURL = currentBackend === PRIMARY_BACKEND ? SECONDARY_BACKEND : PRIMARY_BACKEND;
            return await api(originalRequest);
          }
          return Promise.reject(retryError);
        }
      }
      
      // If both backends failed, retry with exponential backoff
      if (originalRequest._retryCount < 3) {
        const delay = 1000 * Math.pow(2, originalRequest._retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await api(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Same seamless failover for publicApi
publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (originalRequest._retryCount >= 3) {
      return Promise.reject(error);
    }
    
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    const isRetryable = 
      error.message === "Network Error" || 
      error.code === "ECONNABORTED" ||
      error.response?.status >= 500 ||
      error.response?.status === 429;
    
    if (isRetryable && hostname !== "localhost") {
      originalRequest._retryCount++;
      
      if (originalRequest._retryCount === 1) {
        switchBackend();
        originalRequest.baseURL = BASE_URL;
        
        try {
          return await publicApi(originalRequest);
        } catch (retryError) {
          if (originalRequest._retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            originalRequest.baseURL = currentBackend === PRIMARY_BACKEND ? SECONDARY_BACKEND : PRIMARY_BACKEND;
            return await publicApi(originalRequest);
          }
          return Promise.reject(retryError);
        }
      }
      
      if (originalRequest._retryCount < 3) {
        const delay = 1000 * Math.pow(2, originalRequest._retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await publicApi(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Export URL helpers
export const CONTRIBUTION_TYPES_URL = () => `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;