// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server
let currentBaseURL = LAPTOP_URL;
let currentSocketURL = LAPTOP_URL;
let activeSocket = null;
let isSwitching = false;

// ========== CHECK SERVER HEALTH (FAST, 2 SECOND TIMEOUT) ==========
const checkServerHealth = async (url, timeout = 2000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    // 401 means server IS running (just needs auth)
    return response.status === 200 || response.status === 401;
  } catch {
    return false;
  }
};

// ========== FIND BEST SERVER AT STARTUP (PARALLEL CHECK) ==========
const findBestServer = async () => {
  console.log('🔍 Checking servers in parallel...');
  
  // Check both servers at the same time
  const [laptopAlive, renderAlive] = await Promise.all([
    checkServerHealth(LAPTOP_URL, 2000),
    checkServerHealth(RENDER_URL, 2000)
  ]);
  
  console.log(`Laptop: ${laptopAlive ? '✅' : '❌'}, Render: ${renderAlive ? '✅' : '❌'}`);
  
  // Prefer laptop if alive, otherwise Render
  if (laptopAlive) {
    return { url: LAPTOP_URL, isRender: false };
  } else if (renderAlive) {
    return { url: RENDER_URL, isRender: true };
  } else {
    // Both dead - default to laptop
    return { url: LAPTOP_URL, isRender: false };
  }
};

// ========== SILENT SWITCH (NO RELOAD) ==========
const switchToServer = (newUrl, isRender) => {
  if (isSwitching || currentBaseURL === newUrl) return;
  
  isSwitching = true;
  console.log(`🔄 Silently switching to ${newUrl}`);
  
  currentBaseURL = newUrl;
  currentSocketURL = newUrl;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Update storage
  localStorage.setItem('activeServer', isRender ? 'render' : 'laptop');
  sessionStorage.setItem('currentServer', isRender ? 'render' : 'laptop');
  
  // Reconnect socket silently
  if (activeSocket) {
    activeSocket.disconnect();
    initSocket();
  }
  
  isSwitching = false;
};

// ========== STARTUP - FIND BEST SERVER FAST ==========
const bestServer = await findBestServer();
currentBaseURL = bestServer.url;
currentSocketURL = bestServer.url;

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

// ========== FAILOVER INTERCEPTOR - NO RELOAD, FAST RETRY ==========
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest._retry) return Promise.reject(error);
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    if (isNetworkError) {
      originalRequest._retry = true;
      
      // Check which server is alive
      const laptopAlive = await checkServerHealth(LAPTOP_URL, 1500);
      const renderAlive = await checkServerHealth(RENDER_URL, 1500);
      
      if (currentBaseURL === LAPTOP_URL && renderAlive) {
        console.warn('⚠️ Laptop failed, switching to Render');
        switchToServer(RENDER_URL, true);
        originalRequest.baseURL = RENDER_URL;
        return api(originalRequest);
      } else if (currentBaseURL === RENDER_URL && laptopAlive) {
        console.warn('⚠️ Render failed, switching to Laptop');
        switchToServer(LAPTOP_URL, false);
        originalRequest.baseURL = LAPTOP_URL;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest._retry) return Promise.reject(error);
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    if (isNetworkError) {
      originalRequest._retry = true;
      
      const laptopAlive = await checkServerHealth(LAPTOP_URL, 1500);
      const renderAlive = await checkServerHealth(RENDER_URL, 1500);
      
      if (currentBaseURL === LAPTOP_URL && renderAlive) {
        switchToServer(RENDER_URL, true);
        originalRequest.baseURL = RENDER_URL;
        return publicApi(originalRequest);
      } else if (currentBaseURL === RENDER_URL && laptopAlive) {
        switchToServer(LAPTOP_URL, false);
        originalRequest.baseURL = LAPTOP_URL;
        return publicApi(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// ========== SOCKET.IO ==========
const initSocket = () => {
  const token = localStorage.getItem("token");
  
  if (activeSocket) {
    activeSocket.disconnect();
  }
  
  activeSocket = io(currentSocketURL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    auth: token ? { token } : undefined
  });
  
  activeSocket.on('connect', () => {
    console.log('✅ Socket connected');
  });
  
  activeSocket.on('connect_error', async (error) => {
    console.log('❌ Socket error:', error.message);
    
    // Try switching on socket failure
    const laptopAlive = await checkServerHealth(LAPTOP_URL, 1500);
    const renderAlive = await checkServerHealth(RENDER_URL, 1500);
    
    if (currentBaseURL === LAPTOP_URL && renderAlive) {
      switchToServer(RENDER_URL, true);
    } else if (currentBaseURL === RENDER_URL && laptopAlive) {
      switchToServer(LAPTOP_URL, false);
    }
  });
  
  return activeSocket;
};

export const socket = initSocket();

// ========== PERIODIC BACKUP CHECK (every 60 seconds, NO RELOAD) ==========
setInterval(async () => {
  const laptopAlive = await checkServerHealth(LAPTOP_URL, 2000);
  
  // If we're on Render but laptop is back, switch silently
  if (currentBaseURL === RENDER_URL && laptopAlive) {
    console.log('✅ Laptop is back! Silently switching to save Render hours');
    switchToServer(LAPTOP_URL, false);
  }
}, 60000);

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;