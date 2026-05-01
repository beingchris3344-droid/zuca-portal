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

// Add automatic fallback to Render when laptop is down
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If laptop failed and we haven't tried fallback yet
    if (error.code === 'ERR_NETWORK' && !originalRequest._retry && BASE_URL !== RENDER_URL) {
      originalRequest._retry = true;
      
      console.warn('Laptop backend unreachable, falling back to Render...');
      
      // Store that we should use Render from now on
      localStorage.setItem('useRender', 'true');
      
      // Update URLs to Render
      BASE_URL = RENDER_URL;
      SOCKET_URL = RENDER_URL;
      originalRequest.baseURL = RENDER_URL;
      
      // Update axios instance baseURL
      api.defaults.baseURL = RENDER_URL;
      publicApi.defaults.baseURL = RENDER_URL;
      
      // Retry the request with Render
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Socket.IO with proper fallback logic
let socketInstance;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

const initSocket = () => {
  // If we've already failed over, use Render URL
  const socketUrl = localStorage.getItem('useRender') === 'true' ? RENDER_URL : SOCKET_URL;
  
  const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  socket.on('connect_error', async (error) => {
    reconnectAttempts++;
    console.log(`Socket connection failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && localStorage.getItem('useRender') !== 'true') {
      console.log('Switching to Render for socket connection...');
      localStorage.setItem('useRender', 'true');
      
      // Close current socket
      socket.disconnect();
      
      // Create new socket connection to Render
      const newSocket = io(RENDER_URL, {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        path: '/socket.io',
      });
      
      // Replace the socket instance
      window.__socket = newSocket;
      return newSocket;
    }
  });

  return socket;
};

export const socket = initSocket();

socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
  reconnectAttempts = 0; // Reset attempts on successful connection
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

export const CONTRIBUTION_TYPES_URL = () => `${api.defaults.baseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${api.defaults.baseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${api.defaults.baseURL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;