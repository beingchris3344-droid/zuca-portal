// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

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

// ========== SWITCH TO LAPTOP SILENTLY ==========
const switchToLaptop = () => {
  console.log('🔄 Switching back to Laptop backend...');
  
  // Update the active server in localStorage
  localStorage.setItem('activeServer', 'laptop');
  sessionStorage.setItem('switchedToRender', 'false');
  
  // Reload the page to use laptop
  window.location.reload();
};

// ========== STARTUP CHECK - RUNS ONCE ==========
const checkLaptopAndSwitch = async () => {
  // Check if we're currently on Render (by checking URL or localStorage)
  const currentServer = localStorage.getItem('activeServer');
  const isOnRender = currentServer === 'render' || sessionStorage.getItem('switchedToRender') === 'true';
  
  if (isOnRender) {
    console.log('📌 Currently on Render, will check for laptop periodically...');
    return;
  }
  
  // If we're supposed to be on laptop, check if it's actually reachable
  if (currentServer !== 'render') {
    const laptopReachable = await isLaptopReachable();
    if (!laptopReachable) {
      console.warn('⚠️ Laptop not reachable, switching to Render');
      localStorage.setItem('activeServer', 'render');
      sessionStorage.setItem('switchedToRender', 'true');
      window.location.reload();
    } else {
      console.log('✅ Laptop is reachable, using as primary');
    }
  }
};

// Determine which server to use
const getActiveServer = () => {
  // If we've explicitly switched to Render in this session
  if (sessionStorage.getItem('switchedToRender') === 'true') {
    return RENDER_URL;
  }
  // If user preference is Render
  if (localStorage.getItem('activeServer') === 'render') {
    return RENDER_URL;
  }
  // Default to laptop
  return LAPTOP_URL;
};

// Run startup check
await checkLaptopAndSwitch();

let currentBaseURL = getActiveServer();
let currentSocketURL = currentBaseURL;

console.log(`🔗 Using backend: ${currentBaseURL}`);

// ========== PERIODIC CHECK FOR LAPTOP (every 60 seconds) ==========
// This runs ONLY when we're on Render, to check if laptop is back
if (currentBaseURL === RENDER_URL) {
  console.log('🔍 Will check for laptop availability every 60 seconds...');
  
  setInterval(async () => {
    const laptopReachable = await isLaptopReachable();
    
    if (laptopReachable) {
      console.log('✅ Laptop is back online! Switching to laptop to save Render hours...');
      switchToLaptop();
    } else {
      console.log('🔍 Laptop still offline, staying on Render');
    }
  }, 60000); // Check every 60 seconds
}

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

// ========== FAILOVER INTERCEPTOR (only for network errors) ==========
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only switch if we're on laptop and haven't switched yet
    if (currentBaseURL === LAPTOP_URL && sessionStorage.getItem('switchedToRender') !== 'true') {
      const isNetworkError = error.code === 'ERR_NETWORK' || 
                             error.code === 'ECONNABORTED' ||
                             error.message?.includes('timeout') ||
                             error.message?.includes('ERR_NAME_NOT_RESOLVED');
      
      const isServerDown = error.response?.status === 502 || error.response?.status === 503;
      
      if (isNetworkError || isServerDown) {
        console.warn('⚠️ Laptop failed, switching to Render...');
        sessionStorage.setItem('switchedToRender', 'true');
        localStorage.setItem('activeServer', 'render');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (currentBaseURL === LAPTOP_URL && sessionStorage.getItem('switchedToRender') !== 'true') {
      const isNetworkError = error.code === 'ERR_NETWORK' || 
                             error.code === 'ECONNABORTED' ||
                             error.message?.includes('timeout') ||
                             error.message?.includes('ERR_NAME_NOT_RESOLVED');
      
      const isServerDown = error.response?.status === 502 || error.response?.status === 503;
      
      if (isNetworkError || isServerDown) {
        console.warn('⚠️ Laptop failed, switching to Render...');
        sessionStorage.setItem('switchedToRender', 'true');
        localStorage.setItem('activeServer', 'render');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Socket.IO
export const socket = io(currentSocketURL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket error:', error.message);
  if (currentBaseURL === LAPTOP_URL && sessionStorage.getItem('switchedToRender') !== 'true') {
    console.warn('⚠️ Socket failed, switching to Render...');
    sessionStorage.setItem('switchedToRender', 'true');
    localStorage.setItem('activeServer', 'render');
    window.location.reload();
  }
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;