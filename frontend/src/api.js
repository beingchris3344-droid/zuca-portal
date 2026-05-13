// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

// Define your backends
const BACKENDS = [
  "https://zuca-backend-iw9p.onrender.com",
  "https://zuca-portal2.onrender.com"
];

let BASE_URL;

if (hostname === "localhost") {
  BASE_URL = "http://localhost:5000";
} else {
  BASE_URL = BACKENDS[0]; // Start with first
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

// Function to try all backends
const tryAllBackends = async (requestConfig, isPublic = false) => {
  let lastError = null;
  
  for (const backend of BACKENDS) {
    try {
      console.log(`Trying backend: ${backend}`);
      
      // Create a new config with this backend
      const config = {
        ...requestConfig,
        baseURL: backend,
        url: requestConfig.url,
      };
      
      // Make the request
      const response = isPublic 
        ? await publicApi(config)
        : await api(config);
      
      // If successful, update the default backend for future requests
      if (isPublic) {
        publicApi.defaults.baseURL = backend;
      } else {
        api.defaults.baseURL = backend;
      }
      
      console.log(`✅ Success with backend: ${backend}`);
      return response;
      
    } catch (error) {
      console.log(`❌ Failed with backend: ${backend}`);
      lastError = error;
    }
  }
  
  // All backends failed
  throw lastError;
};

// Response interceptor for authenticated api
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loop
    if (originalRequest._triedAllBackends) {
      return Promise.reject(error);
    }
    
    // Check if it's a backend error
    const isBackendError = 
      error.message === "Network Error" ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      (error.response && error.response.status >= 500);
    
    if (isBackendError && hostname !== "localhost") {
      originalRequest._triedAllBackends = true;
      console.log("⚠️ Backend failed, trying all available backends...");
      
      try {
        return await tryAllBackends(originalRequest, false);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Response interceptor for public api
publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (originalRequest._triedAllBackends) {
      return Promise.reject(error);
    }
    
    const isBackendError = 
      error.message === "Network Error" ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      (error.response && error.response.status >= 500);
    
    if (isBackendError && hostname !== "localhost") {
      originalRequest._triedAllBackends = true;
      console.log("⚠️ Backend failed, trying all available backends...");
      
      try {
        return await tryAllBackends(originalRequest, true);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

// URL helpers
export const CONTRIBUTION_TYPES_URL = () => `${api.defaults.baseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${api.defaults.baseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${api.defaults.baseURL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Helper to get current backend
export const getCurrentBackend = () => api.defaults.baseURL;

export default BASE_URL;