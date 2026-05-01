// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

let BASE_URL;
let SOCKET_URL;

const hostname = window.location.hostname;

// Your laptop Tailscale URL
const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
// Your Render backup URL
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Check if we should use Render (persist in localStorage)
const shouldUseRender = localStorage.getItem('useRender') === 'true';

// Choose primary based on environment
if (hostname === "localhost" || hostname === "127.0.0.1") {
  BASE_URL = "http://localhost:5000";
  SOCKET_URL = "http://localhost:5000";
} else if (hostname === "192.168.100.141") {
  BASE_URL = "http://192.168.100.141:5000";
  SOCKET_URL = "http://192.168.100.141:5000";
} else if (shouldUseRender) {
  // If we previously failed over, use Render directly
  BASE_URL = RENDER_URL;
  SOCKET_URL = RENDER_URL;
} else {
  // Try laptop first
  BASE_URL = LAPTOP_URL;
  SOCKET_URL = LAPTOP_URL;
}

// Create axios instances
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// INTERCEPTOR FOR BOTH API INSTANCES - THIS IS THE FIX!
const addFallbackInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If laptop failed and we haven't tried fallback yet
      if (error.code === 'ERR_NETWORK' && !originalRequest._retry && BASE_URL !== RENDER_URL) {
        originalRequest._retry = true;
        
        console.warn('⚠️ Laptop backend unreachable, falling back to Render...');
        
        // Store that we should use Render from now on
        localStorage.setItem('useRender', 'true');
        
        // Update URLs to Render
        BASE_URL = RENDER_URL;
        SOCKET_URL = RENDER_URL;
        originalRequest.baseURL = RENDER_URL;
        
        // Update ALL axios instances
        api.defaults.baseURL = RENDER_URL;
        publicApi.defaults.baseURL = RENDER_URL;
        
        // Retry the original request with new baseURL
        return axiosInstance(originalRequest);
      }
      
      return Promise.reject(error);
    }
  );
};

// Add interceptor to BOTH instances
addFallbackInterceptor(api);
addFallbackInterceptor(publicApi);

// Add auth token interceptor to both
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

// Socket.IO with proper fallback logic - FIXED VERSION
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
let currentSocket = null;

const initSocket = () => {
  // If we've already failed over, use Render URL
  const useRender = localStorage.getItem('useRender') === 'true';
  const socketUrl = useRender ? RENDER_URL : SOCKET_URL;
  
  console.log(`🔌 Connecting socket to: ${socketUrl}`);
  
  const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected! ID:', socket.id);
    reconnectAttempts = 0; // Reset attempts on successful connection
  });

  socket.on('connect_error', async (error) => {
    console.log(`❌ Socket connection error (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && localStorage.getItem('useRender') !== 'true') {
      console.log('🔄 Switching to Render for socket connection...');
      localStorage.setItem('useRender', 'true');
      
      // Force page reload to use Render URL for everything
      window.location.reload();
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

// Create and export the socket
export const socket = initSocket();

// Helper to manually check/switch to Render
export const forceSwitchToRender = () => {
  console.log('🔄 Manually switching to Render...');
  localStorage.setItem('useRender', 'true');
  window.location.reload();
};

export const CONTRIBUTION_TYPES_URL = () => `${api.defaults.baseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${api.defaults.baseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${api.defaults.baseURL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;