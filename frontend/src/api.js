// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

// Define your backends
const PRIMARY_BACKEND = "https://zuca-backend-iw9p.onrender.com";
const SECONDARY_BACKEND = "https://zuca-portal2.onrender.com";

// Set initial backend
let currentBackend;
let BASE_URL;

if (hostname === "localhost") {
  // Local development
  currentBackend = "http://localhost:5000";
  BASE_URL = "http://localhost:5000";
} else {
  // Production - start with primary backend
  currentBackend = PRIMARY_BACKEND;
  BASE_URL = PRIMARY_BACKEND;
}

// Helper function to switch backend
const switchBackend = () => {
  if (hostname === "localhost") return;
  
  if (currentBackend === PRIMARY_BACKEND) {
    currentBackend = SECONDARY_BACKEND;
  } else if (currentBackend === SECONDARY_BACKEND) {
    currentBackend = PRIMARY_BACKEND;
  }
  
  BASE_URL = currentBackend;
  
  // Update axios instances with new baseURL
  publicApi.defaults.baseURL = BASE_URL;
  api.defaults.baseURL = BASE_URL;
  
  console.log(`🔄 Switched to backend: ${BASE_URL}`);
};

// Create axios instances
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Add token interceptor to authenticated api
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for authenticated api with failover
api.interceptors.response.use(
  (response) => {
    // Reset retry flag on success
    if (response.config._retried) {
      delete response.config._retried;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if we already tried switching backends for this request
    if (!originalRequest._retried) {
      originalRequest._retried = true;
      
      // Check if it's a backend/server error (not a client error like 400)
      const isBackendFailure = 
        error.message === "Network Error" ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        (error.response && error.response.status >= 500);
      
      // Only retry on backend failures and not in localhost
      if (isBackendFailure && hostname !== "localhost") {
        // Switch to the other backend
        switchBackend();
        
        // Update the request URL with new baseURL
        originalRequest.baseURL = BASE_URL;
        
        // Retry the request with new backend
        try {
          console.log(`🔄 Retrying request on secondary backend...`);
          const response = await api(originalRequest);
          return response;
        } catch (retryError) {
          // If second backend also fails, try one more time with original
          console.log(`⚠️ Secondary backend failed, trying primary again...`);
          switchBackend(); // Switch back to original
          originalRequest.baseURL = BASE_URL;
          
          try {
            const response = await api(originalRequest);
            return response;
          } catch (finalError) {
            console.error(`❌ All backends failed`);
            return Promise.reject(finalError);
          }
        }
      }
    }
    
    // If we've already tried switching, just reject
    return Promise.reject(error);
  }
);

// Response interceptor for public api with failover
publicApi.interceptors.response.use(
  (response) => {
    if (response.config._retried) {
      delete response.config._retried;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (!originalRequest._retried) {
      originalRequest._retried = true;
      
      const isBackendFailure = 
        error.message === "Network Error" ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        (error.response && error.response.status >= 500);
      
      if (isBackendFailure && hostname !== "localhost") {
        switchBackend();
        originalRequest.baseURL = BASE_URL;
        
        try {
          console.log(`🔄 Retrying public request on secondary backend...`);
          const response = await publicApi(originalRequest);
          return response;
        } catch (retryError) {
          console.log(`⚠️ Secondary backend failed, trying primary again...`);
          switchBackend();
          originalRequest.baseURL = BASE_URL;
          
          try {
            const response = await publicApi(originalRequest);
            return response;
          } catch (finalError) {
            console.error(`❌ All backends failed for public request`);
            return Promise.reject(finalError);
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// URL helpers - these are FUNCTIONS so they always get the current BASE_URL
export const CONTRIBUTION_TYPES_URL = () => `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;
export const DONATIONS_URL = () => `${BASE_URL}/api/donations`;
export const USER_URL = () => `${BASE_URL}/api/user`;
export const PROFILE_URL = () => `${BASE_URL}/api/profile`;

// Helper to get auth header
export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Helper to get current base URL (for debugging)
export const getCurrentBaseURL = () => BASE_URL;

// Helper to manually switch backend (if needed)
export const manualSwitchBackend = () => {
  switchBackend();
  return BASE_URL;
};

export default BASE_URL;