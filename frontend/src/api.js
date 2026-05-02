// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server (can change without reload)
let currentBaseURL = LAPTOP_URL;
let currentSocketURL = LAPTOP_URL;
let isUsingRender = false;
let activeSocket = null;
let failedRequestsQueue = [];

// ========== SILENT SERVER SWITCH (NO RELOAD) ==========
const switchToRender = () => {
  if (isUsingRender) return;
  
  console.log('🔄 Silently switching to Render (no reload)');
  isUsingRender = true;
  currentBaseURL = RENDER_URL;
  currentSocketURL = RENDER_URL;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Reconnect socket silently
  if (activeSocket) {
    activeSocket.disconnect();
    initSocket();
  }
  
  // Retry any failed requests
  failedRequestsQueue.forEach(req => req());
  failedRequestsQueue = [];
};

const switchToLaptop = () => {
  if (!isUsingRender) return;
  
  console.log('🔄 Silently switching back to Laptop (no reload)');
  isUsingRender = false;
  currentBaseURL = LAPTOP_URL;
  currentSocketURL = LAPTOP_URL;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Reconnect socket silently
  if (activeSocket) {
    activeSocket.disconnect();
    initSocket();
  }
};

// ========== CHECK LAPTOP AVAILABILITY (SILENT) ==========
const isLaptopReachable = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch(`${LAPTOP_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};

// ========== BACKGROUND HEALTH CHECK ==========
// Check laptop health every 30 seconds in background
setInterval(async () => {
  const laptopReachable = await isLaptopReachable();
  
  if (laptopReachable && isUsingRender) {
    console.log('Laptop is back, silently switching');
    switchToLaptop();
  } else if (!laptopReachable && !isUsingRender) {
    console.log('Laptop unreachable, silently switching to Render');
    switchToRender();
  }
}, 30000);

// Create axios instances
export const api = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000
});

export const publicApi = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000
});

// Auth token interceptor
const addAuthToken = (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(addAuthToken);
publicApi.interceptors.request.use(addAuthToken);

// ========== FAILOVER INTERCEPTOR - SILENT RETRY ==========
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    const isServerDown = error.response?.status === 502 || error.response?.status === 503;
    
    // If request failed and we're on laptop, try Render silently
    if ((isNetworkError || isServerDown) && !isUsingRender) {
      originalRequest._retry = true;
      
      // Silently switch to Render
      switchToRender();
      
      // Retry the same request on Render
      originalRequest.baseURL = RENDER_URL;
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    const isServerDown = error.response?.status === 502 || error.response?.status === 503;
    
    if ((isNetworkError || isServerDown) && !isUsingRender) {
      originalRequest._retry = true;
      switchToRender();
      originalRequest.baseURL = RENDER_URL;
      return publicApi(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// ========== SOCKET.IO - SILENT RECONNECT ==========
const initSocket = () => {
  if (activeSocket) {
    activeSocket.disconnect();
  }
  
  activeSocket = io(currentSocketURL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  
  activeSocket.on('connect', () => {
    console.log('Socket connected');
  });
  
  activeSocket.on('connect_error', () => {
    if (!isUsingRender) {
      switchToRender();
      // Socket will reconnect automatically to Render
    }
  });
  
  return activeSocket;
};

export const socket = initSocket();

// Export URLs (dynamic - always current)
export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;