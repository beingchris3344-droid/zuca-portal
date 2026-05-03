// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Get the server to use (checks localStorage)
const getActiveServer = () => {
  const saved = localStorage.getItem('activeServer');
  if (saved === 'render') return RENDER_URL;
  return LAPTOP_URL; // Default to laptop
};

// Set initial server
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

// Add auth token interceptor
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
  
  console.log(`🔄 Switching from ${currentBaseURL} to ${newServerURL}`);
  
  currentBaseURL = newServerURL;
  currentSocketURL = newServerURL;
  
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  localStorage.setItem('activeServer', newServerURL === RENDER_URL ? 'render' : 'laptop');
  
  // Reload page to apply new server
  window.location.reload();
};

// Function to check if laptop is healthy
const isLaptopHealthy = async () => {
  try {
    const response = await fetch(`${LAPTOP_URL}/health`, {
      method: 'GET',
      mode: 'no-cors', // This prevents CORS preflight
      signal: AbortSignal.timeout(5000)
    });
    return true; // If no-cors, we know it's reachable
  } catch (error) {
    console.log('Laptop health check failed:', error.message);
    return false;
  }
};

// MAIN FAILOVER LOGIC - Runs on every request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we're on laptop and request failed, switch to Render
    if (currentBaseURL === LAPTOP_URL) {
      console.warn('⚠️ Laptop request failed, automatically switching to Render...');
      switchToServer(RENDER_URL);
    }
    return Promise.reject(error);
  }
);

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we're on laptop and request failed, switch to Render
    if (currentBaseURL === LAPTOP_URL) {
      console.warn('⚠️ Laptop request failed, automatically switching to Render...');
      switchToServer(RENDER_URL);
    }
    return Promise.reject(error);
  }
);

// Check if laptop is back online every 30 seconds while on Render
setInterval(async () => {
  if (currentBaseURL === RENDER_URL) {
    const laptopHealthy = await isLaptopHealthy();
    if (laptopHealthy) {
      console.log('✅ Laptop is back online, switching back to primary...');
      switchToServer(LAPTOP_URL);
    }
  }
}, 30000);

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
  console.log('❌ Socket connection error:', error.message);
  // If socket fails on laptop, switch to Render
  if (currentBaseURL === LAPTOP_URL) {
    console.warn('⚠️ Socket failed on laptop, switching to Render...');
    switchToServer(RENDER_URL);
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