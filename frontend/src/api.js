// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

// Define your backends
const PRIMARY_BACKEND = "https://zuca-backend-iw9p.onrender.com";
const SECONDARY_BACKEND = "https://zuca-portal2.onrender.com";

let BASE_URL;

if (hostname === "localhost") {
  BASE_URL = "http://localhost:5000";
} else {
  BASE_URL = PRIMARY_BACKEND;
}

// Create axios instances
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// SIMPLE FAILOVER - This will definitely work
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If this is the first retry attempt
    if (!originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if backend is down (network error or 5xx)
      if (error.message === "Network Error" || (error.response && error.response.status >= 500)) {
        
        // Switch to secondary backend
        const newBaseURL = SECONDARY_BACKEND;
        console.log(`Primary backend failed! Switching to: ${newBaseURL}`);
        
        // Update base URL
        api.defaults.baseURL = newBaseURL;
        originalRequest.baseURL = newBaseURL;
        
        // Retry the request
        return api(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Same for publicApi
publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (!originalRequest._retry) {
      originalRequest._retry = true;
      
      if (error.message === "Network Error" || (error.response && error.response.status >= 500)) {
        const newBaseURL = SECONDARY_BACKEND;
        console.log(`Primary backend failed! Switching to: ${newBaseURL}`);
        
        publicApi.defaults.baseURL = newBaseURL;
        originalRequest.baseURL = newBaseURL;
        
        return publicApi(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// URL helpers
export const CONTRIBUTION_TYPES_URL = () => `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;