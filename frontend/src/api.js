// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server
let currentBaseURL = LAPTOP_URL;
let currentSocketURL = LAPTOP_URL;
let hasFailedOver = false;
let isChecking = false;

console.log(`🔗 Using backend: ${currentBaseURL}`);

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

// Function to silently switch to Render (NO RELOAD)
const switchToRender = () => {
  if (hasFailedOver) return;
  
  hasFailedOver = true;
  console.warn('🔄 Silently switching to Render backend...');
  
  currentBaseURL = RENDER_URL;
  currentSocketURL = RENDER_URL;
  
  // Update axios instances silently
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Reconnect socket silently
  if (window.currentSocket) {
    window.currentSocket.disconnect();
  }
  initSocket();
};

// Function to silently switch back to laptop (NO RELOAD)
const switchToLaptop = () => {
  console.log('🔄 Silently switching back to Laptop backend...');
  
  currentBaseURL = LAPTOP_URL;
  currentSocketURL = LAPTOP_URL;
  
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  if (window.currentSocket) {
    window.currentSocket.disconnect();
  }
  initSocket();
  
  hasFailedOver = false;
};

// Check if laptop is available (without interrupting user)
const isLaptopAvailable = async () => {
  try {
    const response = await fetch(`${LAPTOP_URL}/health`, {
      method: 'GET',
      mode: 'no-cors',
      signal: AbortSignal.timeout(3000)
    });
    return true;
  } catch {
    return false;
  }
};

// FAILOVER INTERCEPTOR - SILENT, NO RELOAD
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout');
    
    const isServerDown = error.response?.status === 502 || error.response?.status === 503;
    
    // If laptop is down and we haven't failed over yet, switch silently
    if ((isNetworkError || isServerDown) && currentBaseURL === LAPTOP_URL && !hasFailedOver) {
      console.warn('⚠️ Laptop unreachable, silently switching to Render...');
      switchToRender();
    }
    
    // Retry the failed request on the new server
    if (hasFailedOver && currentBaseURL === RENDER_URL && originalRequest) {
      originalRequest.baseURL = RENDER_URL;
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout');
    
    const isServerDown = error.response?.status === 502 || error.response?.status === 503;
    
    if ((isNetworkError || isServerDown) && currentBaseURL === LAPTOP_URL && !hasFailedOver) {
      console.warn('⚠️ Laptop unreachable, silently switching to Render...');
      switchToRender();
    }
    
    return Promise.reject(error);
  }
);

// Check if laptop is back every 60 seconds - switch back silently
setInterval(async () => {
  if (currentBaseURL === RENDER_URL && hasFailedOver) {
    const laptopAvailable = await isLaptopAvailable();
    if (laptopAvailable) {
      console.log('✅ Laptop is back, silently switching back...');
      switchToLaptop();
    }
  }
}, 60000);

// Socket initialization
let socketInstance = null;

const initSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
  
  socketInstance = io(currentSocketURL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  
  socketInstance.on('connect', () => {
    console.log(`✅ Socket connected to ${currentSocketURL}`);
  });
  
  socketInstance.on('connect_error', () => {
    if (currentBaseURL === LAPTOP_URL && !hasFailedOver) {
      switchToRender();
    }
  });
  
  window.currentSocket = socketInstance;
  return socketInstance;
};

export const socket = initSocket();

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;