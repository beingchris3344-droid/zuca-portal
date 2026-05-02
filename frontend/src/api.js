// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server
let currentBaseURL = LAPTOP_URL;
let currentSocketURL = LAPTOP_URL;
let isUsingRender = false;
let activeSocket = null;

// Create axios instances FIRST (before any async operations)
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

// ========== SWITCH FUNCTIONS - NO RELOAD ==========
const switchToRender = () => {
  if (isUsingRender) return;
  console.log('Switching to Render');
  isUsingRender = true;
  currentBaseURL = RENDER_URL;
  currentSocketURL = RENDER_URL;
  
  api.defaults.baseURL = RENDER_URL;
  publicApi.defaults.baseURL = RENDER_URL;
  
  localStorage.setItem('activeServer', 'render');
  sessionStorage.setItem('switchedToRender', 'true');
  
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = io(currentSocketURL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setupSocketEvents();
  }
};

const switchToLaptop = () => {
  if (!isUsingRender) return;
  console.log('Switching to Laptop');
  isUsingRender = false;
  currentBaseURL = LAPTOP_URL;
  currentSocketURL = LAPTOP_URL;
  
  api.defaults.baseURL = LAPTOP_URL;
  publicApi.defaults.baseURL = LAPTOP_URL;
  
  localStorage.setItem('activeServer', 'laptop');
  sessionStorage.setItem('switchedToRender', 'false');
  
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = io(currentSocketURL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setupSocketEvents();
  }
};

// ========== STARTUP - DETERMINE SERVER ==========
const initServer = async () => {
  const savedServer = localStorage.getItem('activeServer');
  const sessionSwitched = sessionStorage.getItem('switchedToRender') === 'true';
  
  if (savedServer === 'render' || sessionSwitched) {
    isUsingRender = true;
    currentBaseURL = RENDER_URL;
    currentSocketURL = RENDER_URL;
    api.defaults.baseURL = RENDER_URL;
    publicApi.defaults.baseURL = RENDER_URL;
    console.log(`Using Render (saved preference)`);
    return;
  }
  
  const laptopReachable = await isLaptopReachable();
  if (!laptopReachable) {
    isUsingRender = true;
    currentBaseURL = RENDER_URL;
    currentSocketURL = RENDER_URL;
    api.defaults.baseURL = RENDER_URL;
    publicApi.defaults.baseURL = RENDER_URL;
    localStorage.setItem('activeServer', 'render');
    sessionStorage.setItem('switchedToRender', 'true');
    console.log(`Laptop not reachable, using Render`);
  } else {
    isUsingRender = false;
    currentBaseURL = LAPTOP_URL;
    currentSocketURL = LAPTOP_URL;
    console.log(`Laptop reachable, using Laptop`);
  }
};

// ========== PERIODIC CHECK ==========
const startPeriodicCheck = () => {
  setInterval(async () => {
    const laptopReachable = await isLaptopReachable();
    
    if (laptopReachable && isUsingRender) {
      console.log('Laptop back, switching');
      switchToLaptop();
    } else if (!laptopReachable && !isUsingRender) {
      console.log('Laptop down, switching to Render');
      switchToRender();
    }
  }, 60000);
};

// ========== RESPONSE INTERCEPTORS ==========
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest._retry) return Promise.reject(error);
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    if (isNetworkError && !isUsingRender) {
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
    if (originalRequest._retry) return Promise.reject(error);
    
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ERR_NAME_NOT_RESOLVED');
    
    if (isNetworkError && !isUsingRender) {
      originalRequest._retry = true;
      switchToRender();
      originalRequest.baseURL = RENDER_URL;
      return publicApi(originalRequest);
    }
    return Promise.reject(error);
  }
);

// ========== SOCKET SETUP ==========
const setupSocketEvents = () => {
  if (!activeSocket) return;
  
  activeSocket.on('connect', () => {
    console.log('Socket connected');
  });
  
  activeSocket.on('connect_error', (error) => {
    console.log('Socket error:', error.message);
    if (!isUsingRender) {
      switchToRender();
    }
  });
};

// ========== INITIALIZE ==========
await initServer();
console.log(`🔗 Backend: ${currentBaseURL}`);

activeSocket = io(currentSocketURL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
setupSocketEvents();

startPeriodicCheck();

export const socket = activeSocket;

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;