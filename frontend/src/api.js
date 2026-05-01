// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// ========== STARTUP CHECK - ONLY RUNS ONCE ==========
const checkLaptopAndSwitch = async () => {
  // Don't check if we already failed over this session
  if (sessionStorage.getItem('switchedToRender') === 'true') {
    console.log('📌 Already using Render (from earlier check)');
    return;
  }
  
  // If user manually wants Render
  if (localStorage.getItem('activeServer') === 'render') {
    console.log('📌 Using Render (user preference)');
    sessionStorage.setItem('switchedToRender', 'true');
    return;
  }
  
  try {
    console.log('🔍 Checking laptop availability...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    await fetch(`${LAPTOP_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Laptop is reachable, using as primary');
    sessionStorage.setItem('switchedToRender', 'false');
    
  } catch (error) {
    console.warn('⚠️ Laptop is NOT reachable, switching to Render');
    sessionStorage.setItem('switchedToRender', 'true');
    localStorage.setItem('activeServer', 'render');
    window.location.reload();
  }
};

// Determine which server to use
const getActiveServer = () => {
  if (sessionStorage.getItem('switchedToRender') === 'true') {
    return RENDER_URL;
  }
  if (localStorage.getItem('activeServer') === 'render') {
    return RENDER_URL;
  }
  return LAPTOP_URL;
};

// Wait for laptop check before creating axios instances
await checkLaptopAndSwitch();

let currentBaseURL = getActiveServer();
let currentSocketURL = currentBaseURL;

console.log(`🔗 Using backend: ${currentBaseURL}`);

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

// ========== FALLBACK INTERCEPTOR ==========
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