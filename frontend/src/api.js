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

// Choose primary based on environment
if (hostname === "localhost" || hostname === "127.0.0.1") {
  BASE_URL = "http://localhost:5000";
  SOCKET_URL = "http://localhost:5000";
} else if (hostname === "192.168.100.141") {
  BASE_URL = "http://192.168.100.141:5000";
  SOCKET_URL = "http://192.168.100.141:5000";
} else {
  // Production: Try laptop first, fallback to Render
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
    if (error.code === 'ERR_NETWORK' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('Laptop backend unreachable, falling back to Render...');
      
      // Update BASE_URL to Render for future requests
      BASE_URL = RENDER_URL;
      originalRequest.baseURL = RENDER_URL;
      
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

// Socket.IO with fallback logic
let socketInstance;

const initSocket = () => {
  const socketUrl = SOCKET_URL;
  
  const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  socket.on('connect_error', async (error) => {
    console.log('Socket connection failed, falling back to Render...');
    // Switch to Render for socket
    window.__USE_RENDER = true;
    window.location.reload(); // Reload to use Render
  });

  return socket;
};

export const socket = initSocket();

socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

export const CONTRIBUTION_TYPES_URL = `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;