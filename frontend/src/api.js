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

// ========== CHECK IF LAPTOP IS REACHABLE ==========
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

// ========== SWITCH TO RENDER - NO RELOAD ==========
const switchToRender = () => {
  if (isUsingRender) return;
  console.log('🔄 Switching to Render (no reload)');
  isUsingRender = true;
  currentBaseURL = RENDER_URL;
  currentSocketURL = RENDER_URL;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Update localStorage
  localStorage.setItem('activeServer', 'render');
  sessionStorage.setItem('switchedToRender', 'true');
  
  // Reconnect socket silently
  if (activeSocket) {
    activeSocket.disconnect();
    initSocket();
  }
};

// ========== SWITCH TO LAPTOP - NO RELOAD ==========
const switchToLaptop = () => {
  if (!isUsingRender) return;
  console.log('🔄 Switching to Laptop (no reload)');
  isUsingRender = false;
  currentBaseURL = LAPTOP_URL;
  currentSocketURL = LAPTOP_URL;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Update localStorage
  localStorage.setItem('activeServer', 'laptop');
  sessionStorage.setItem('switchedToRender', 'false');
  
  // Reconnect socket silently
  if (activeSocket) {
    activeSocket.disconnect();
    initSocket();
  }
};

// ========== STARTUP CHECK - NO RELOAD ==========
const checkLaptopAndSwitch = async () => {
  const currentServer = localStorage.getItem('activeServer');
  const isOnRender = currentServer === 'render' || sessionStorage.getItem('switchedToRender') === 'true';
  
  if (isOnRender) {
    console.log('📌 Currently on Render');
    isUsingRender = true;
    currentBaseURL = RENDER_URL;
    currentSocketURL = RENDER_URL;
    api.defaults.baseURL = currentBaseURL;
    publicApi.defaults.baseURL = currentBaseURL;
    return;
  }
  
  // Check laptop silently
  const laptopReachable = await isLaptopReachable();
  if (!laptopReachable) {
    console.warn('⚠️ Laptop not reachable, using Render');
    isUsingRender = true;
    currentBaseURL = RENDER_URL;
    currentSocketURL = RENDER_URL;
    api.defaults.baseURL = currentBaseURL;
    publicApi.defaults.baseURL = currentBaseURL;
    localStorage.setItem('activeServer', 'render');
    sessionStorage.setItem('switchedToRender', 'true');
  } else {
    console.log('✅ Laptop is reachable, using as primary');
    isUsingRender = false;
    currentBaseURL = LAPTOP_URL;
    currentSocketURL = LAPTOP_URL;
    localStorage.setItem('activeServer', 'laptop');
    sessionStorage.setItem('switchedToRender', 'false');
  }
};

// Run startup check (no reload)
await checkLaptopAndSwitch();

console.log(`🔗 Using backend: ${currentBaseURL}`);

// ========== PERIODIC CHECK (every 60 seconds) - NO RELOAD ==========
setInterval(async () => {
  const laptopReachable = await isLaptopReachable();
  
  if (laptopReachable && isUsingRender) {
    console.log('✅ Laptop is back online! Switching to laptop...');
    switchToLaptop();
  } else if (!laptopReachable && !isUsingRender) {
    console.log('⚠️ Laptop unreachable, switching to Render...');
    switchToRender();
  }
}, 60000);

// Create axios instances
export const api = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000
});

export const publicApi = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000
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

// ========== FAILOVER INTERCEPTOR - NO RELOAD, JUST RETRY ==========
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
    
    if ((isNetworkError || isServerDown) && !isUsingRender) {
      originalRequest._retry = true;
      switchToRender();
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

// ========== SOCKET.IO ==========
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
    console.log('✅ Socket connected! ID:', activeSocket.id);
  });
  
  activeSocket.on('connect_error', (error) => {
    console.log('❌ Socket error:', error.message);
    if (!isUsingRender) {
      switchToRender();
    }
  });
  
  activeSocket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  return activeSocket;
};

export const socket = initSocket();

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;