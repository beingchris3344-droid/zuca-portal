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

// Helper to check if laptop is alive
const checkLaptopHealth = async () => {
  try {
    await axios.get(`${LAPTOP_URL}/api/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

// Get initial server choice
const getInitialServer = () => {
  // On localhost, use local server
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { base: "http://localhost:5000", socket: "http://localhost:5000" };
  }
  
  // On local network, use local IP
  if (hostname === "192.168.100.141") {
    return { base: "http://192.168.100.141:5000", socket: "http://192.168.100.141:5000" };
  }
  
  // Check localStorage preference but with expiry (15 minutes)
  const storedServer = localStorage.getItem('activeServer');
  const storedTimestamp = localStorage.getItem('serverTimestamp');
  const now = Date.now();
  
  // If preference is stale (>15 min) or doesn't exist, check laptop health
  if (!storedServer || !storedTimestamp || (now - parseInt(storedTimestamp)) > 900000) {
    // Check laptop health asynchronously, but return default for now
    checkLaptopHealth().then(isLaptopAlive => {
      if (isLaptopAlive && storedServer !== 'laptop') {
        console.log('🔄 Laptop is back online! Switching back...');
        localStorage.setItem('activeServer', 'laptop');
        localStorage.setItem('serverTimestamp', Date.now().toString());
        window.location.reload();
      }
    });
    
    // Default to laptop first (will failover if needed)
    return { base: LAPTOP_URL, socket: LAPTOP_URL };
  }
  
  // Use stored preference
  if (storedServer === 'laptop') {
    return { base: LAPTOP_URL, socket: LAPTOP_URL };
  } else {
    return { base: RENDER_URL, socket: RENDER_URL };
  }
};

const initialServers = getInitialServer();
BASE_URL = initialServers.base;
SOCKET_URL = initialServers.socket;

console.log(`🌐 Using backend: ${BASE_URL}`);

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

// Add fallback interceptor to both instances
const addFallbackInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Don't retry if already retrying or if it's a non-network error
      if (originalRequest._retry || error.code !== 'ERR_NETWORK') {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      const currentServer = localStorage.getItem('activeServer');
      const isCurrentlyOnLaptop = currentServer === 'laptop' || !currentServer;
      
      console.log(`⚠️ Request failed to ${axiosInstance.defaults.baseURL}`);
      
      // If currently on laptop and failed, try Render
      if (isCurrentlyOnLaptop) {
        console.warn('🔄 Laptop unreachable, falling back to Render...');
        localStorage.setItem('activeServer', 'render');
        localStorage.setItem('serverTimestamp', Date.now().toString());
        
        // Update all URLs
        const newBaseURL = RENDER_URL;
        api.defaults.baseURL = newBaseURL;
        publicApi.defaults.baseURL = newBaseURL;
        originalRequest.baseURL = newBaseURL;
        
        // Retry the request with new base URL
        return axiosInstance(originalRequest);
      } 
      // If currently on Render and laptop is the target, check if laptop is available
      else if (!isCurrentlyOnLaptop && originalRequest.baseURL === LAPTOP_URL) {
        // Check if laptop is actually available
        const isLaptopAlive = await checkLaptopHealth();
        if (isLaptopAlive) {
          console.log('✅ Laptop is back online, switching back...');
          localStorage.setItem('activeServer', 'laptop');
          localStorage.setItem('serverTimestamp', Date.now().toString());
          originalRequest.baseURL = LAPTOP_URL;
          return axiosInstance(originalRequest);
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Add interceptor to BOTH instances
addFallbackInterceptor(api);
addFallbackInterceptor(publicApi);

// Add auth token interceptor to both
const authInterceptor = (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(authInterceptor);
publicApi.interceptors.request.use(authInterceptor);

// Socket connection with bidirectional failover
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
let currentSocket = null;

const initSocket = () => {
  const activeServer = localStorage.getItem('activeServer');
  const socketUrl = activeServer === 'render' ? RENDER_URL : LAPTOP_URL;
  
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
    console.log('✅ Socket connected to:', socketUrl);
    reconnectAttempts = 0;
  });

  socket.on('connect_error', async (error) => {
    console.log(`❌ Socket connection error (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    reconnectAttempts++;
    
    const activeServer = localStorage.getItem('activeServer');
    const isOnLaptop = activeServer === 'laptop' || !activeServer;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (isOnLaptop) {
        // Try switching to Render
        console.log('🔄 Switching to Render for socket...');
        localStorage.setItem('activeServer', 'render');
        localStorage.setItem('serverTimestamp', Date.now().toString());
        window.location.reload();
      } else {
        // On Render, check if laptop is back
        const isLaptopAlive = await checkLaptopHealth();
        if (isLaptopAlive) {
          console.log('🔄 Laptop is back! Switching to laptop...');
          localStorage.setItem('activeServer', 'laptop');
          localStorage.setItem('serverTimestamp', Date.now().toString());
          window.location.reload();
        } else {
          // Keep trying Render
          reconnectAttempts = 0; // Reset counter to keep trying
        }
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

// Create and export the socket
export const socket = initSocket();

// Manual server switcher for debugging
export const switchServer = async (server) => {
  if (server === 'laptop') {
    const isAlive = await checkLaptopHealth();
    if (!isAlive) {
      console.error('❌ Laptop is not reachable!');
      return false;
    }
  }
  
  localStorage.setItem('activeServer', server);
  localStorage.setItem('serverTimestamp', Date.now().toString());
  window.location.reload();
  return true;
};

// Health check helper
export const checkCurrentServer = async () => {
  const currentURL = api.defaults.baseURL;
  try {
    await axios.get(`${currentURL}/api/health`, { timeout: 5000 });
    console.log(`✅ ${currentURL} is healthy`);
    return true;
  } catch (error) {
    console.log(`❌ ${currentURL} is unhealthy`);
    return false;
  }
};

export const CONTRIBUTION_TYPES_URL = () => `${api.defaults.baseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${api.defaults.baseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${api.defaults.baseURL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;