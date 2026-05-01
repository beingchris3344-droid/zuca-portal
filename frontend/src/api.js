// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Get the server to use
const getActiveServer = () => {
  const saved = localStorage.getItem('activeServer');
  if (saved === 'render') return RENDER_URL;
  return LAPTOP_URL;
};

let currentBaseURL = getActiveServer();
let currentSocketURL = currentBaseURL;

// Track failures - ONLY for network errors (server completely down)
let consecutiveNetworkFailures = 0;
let isSwitching = false;
const FAILURE_THRESHOLD = 2;

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
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

publicApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Function to switch servers
const switchToServer = (newServerURL) => {
  if (currentBaseURL === newServerURL) return;
  if (isSwitching) return;
  
  isSwitching = true;
  console.log(`🔄 Switching from ${currentBaseURL} to ${newServerURL}`);
  
  currentBaseURL = newServerURL;
  currentSocketURL = newServerURL;
  
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  localStorage.setItem('activeServer', newServerURL === RENDER_URL ? 'render' : 'laptop');
  
  consecutiveNetworkFailures = 0;
  
  setTimeout(() => {
    isSwitching = false;
    window.location.reload();
  }, 100);
};

// Function to check if laptop is truly healthy (server running)
const isLaptopHealthy = async () => {
  try {
    const response = await fetch(`${LAPTOP_URL}/health`, {
      method: 'GET',
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000)
    });
    return true;
  } catch (error) {
    return false;
  }
};

// ========== FAILOVER INTERCEPTOR - ONLY FOR NETWORK ERRORS ==========
// NOT for 400, 401, 403, 404, 422, 500, etc.
// ONLY when the server is COMPLETELY UNREACHABLE
api.interceptors.response.use(
  (response) => {
    // Reset counter on ANY successful response
    consecutiveNetworkFailures = 0;
    return response;
  },
  async (error) => {
    // ONLY switch on NETWORK ERRORS (server completely down)
    // NOT on HTTP errors like 400, 401, 403, 404, 500, etc.
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout');
    
    // Also switch on 502/503 (server crashed/overloaded)
    const isServerDown = error.response?.status === 502 ||
                         error.response?.status === 503;
    
    if ((isNetworkError || isServerDown) && currentBaseURL === LAPTOP_URL && !isSwitching) {
      consecutiveNetworkFailures++;
      console.log(`⚠️ Laptop UNREACHABLE (${consecutiveNetworkFailures}/${FAILURE_THRESHOLD}) - Server may be down`);
      
      if (consecutiveNetworkFailures >= FAILURE_THRESHOLD) {
        console.warn('⚠️ Laptop backend is down! Switching to Render...');
        switchToServer(RENDER_URL);
      }
    } else if (error.response) {
      // This is an HTTP error (like 400, 401, 404, etc.) - DO NOT SWITCH
      // These are application-level errors, not server-down errors
      console.log(`📌 HTTP ${error.response.status} error - NOT switching servers`);
    }
    
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => {
    consecutiveNetworkFailures = 0;
    return response;
  },
  async (error) => {
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNABORTED' ||
                           error.message?.includes('timeout');
    
    const isServerDown = error.response?.status === 502 ||
                         error.response?.status === 503;
    
    if ((isNetworkError || isServerDown) && currentBaseURL === LAPTOP_URL && !isSwitching) {
      consecutiveNetworkFailures++;
      console.log(`⚠️ Laptop UNREACHABLE (${consecutiveNetworkFailures}/${FAILURE_THRESHOLD}) - Server may be down`);
      
      if (consecutiveNetworkFailures >= FAILURE_THRESHOLD) {
        console.warn('⚠️ Laptop backend is down! Switching to Render...');
        switchToServer(RENDER_URL);
      }
    } else if (error.response) {
      console.log(`📌 HTTP ${error.response.status} error - NOT switching servers`);
    }
    
    return Promise.reject(error);
  }
);

// Check if laptop is back online every 30 seconds (while on Render)
setInterval(async () => {
  if (currentBaseURL === RENDER_URL && !isSwitching) {
    const laptopHealthy = await isLaptopHealthy();
    if (laptopHealthy) {
      console.log('✅ Laptop backend is back online! Switching back to primary...');
      switchToServer(LAPTOP_URL);
    }
  }
}, 30000);

// Socket.IO with same logic
let socketFailureCount = 0;
const SOCKET_FAILURE_THRESHOLD = 2;

export const socket = io(currentSocketURL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
  socketFailureCount = 0;
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket connection error:', error.message);
  
  if (currentBaseURL === LAPTOP_URL && !isSwitching) {
    socketFailureCount++;
    console.log(`⚠️ Socket connection failed (${socketFailureCount}/${SOCKET_FAILURE_THRESHOLD})`);
    
    if (socketFailureCount >= SOCKET_FAILURE_THRESHOLD) {
      console.warn('⚠️ Socket cannot connect to laptop! Switching to Render...');
      switchToServer(RENDER_URL);
    }
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