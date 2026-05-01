// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server and failover state
let currentBaseURL = LAPTOP_URL; // Start with laptop
let currentSocketURL = LAPTOP_URL;
let isFailingOver = false;
let failoverAttempts = 0;
const MAX_FAILOVER_ATTEMPTS = 2;

// Helper to test if a server is TRULY reachable and healthy
const testServerReachability = async (url, timeout = 5000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Must get 200-299 status
    if (!response.ok) {
      console.log(`${url} health check failed with status: ${response.status}`);
      return false;
    }
    
    // Verify response body is valid
    const data = await response.json();
    const isValid = data && (data.status === 'ok' || data.message);
    
    if (isValid) {
      console.log(`${url} is healthy ✅`);
    } else {
      console.log(`${url} returned invalid health response`);
    }
    
    return isValid;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`${url} health check timed out after ${timeout}ms`);
    } else {
      console.log(`${url} health check failed:`, error.message);
    }
    return false;
  }
};

// Create axios instances
export const api = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 8000
});

export const publicApi = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 8000
});

// Add auth token interceptor
const addAuthToken = (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(addAuthToken);
publicApi.interceptors.request.use(addAuthToken);

// Function to switch servers
const switchToServer = async (newServerURL, reason) => {
  if (currentBaseURL === newServerURL) return;
  
  console.log(`🔄 Switching from ${currentBaseURL} to ${newServerURL} (Reason: ${reason})`);
  
  currentBaseURL = newServerURL;
  currentSocketURL = newServerURL;
  
  // Update axios instances
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  // Store preference
  localStorage.setItem('lastWorkingServer', newServerURL);
  localStorage.setItem('lastServerSwitch', Date.now().toString());
  
  // Reconnect socket
  if (window.currentSocket) {
    window.currentSocket.disconnect();
  }
  initSocket();
};

// Main failover interceptor
const failoverInterceptor = async (error) => {
  const originalRequest = error.config;
  
  // Don't retry if we already tried or if it's not a connection error
  if (originalRequest._retry || isFailingOver) {
    return Promise.reject(error);
  }
  
  // Check if it's a network error or server unavailable
  const isNetworkError = error.code === 'ERR_NETWORK' || 
                         error.code === 'ECONNABORTED' ||
                         error.message?.includes('timeout') ||
                         error.response?.status === 503 ||
                         error.response?.status === 502;
  
  if (!isNetworkError) {
    return Promise.reject(error);
  }
  
  originalRequest._retry = true;
  isFailingOver = true;
  failoverAttempts++;
  
  console.warn(`⚠️ Server ${currentBaseURL} failed. Attempting failover (${failoverAttempts}/${MAX_FAILOVER_ATTEMPTS})...`);
  
  try {
    const targetServer = currentBaseURL === LAPTOP_URL ? RENDER_URL : LAPTOP_URL;
    
    // Test if target server is reachable
    const isReachable = await testServerReachability(targetServer);
    
    if (isReachable) {
      console.log(`✅ ${targetServer} is reachable, switching...`);
      await switchToServer(targetServer, `${currentBaseURL} failed`);
      
      // Update the original request to use new server
      originalRequest.baseURL = currentBaseURL;
      
      // Retry the request
      const response = await api(originalRequest);
      isFailingOver = false;
      failoverAttempts = 0;
      return response;
    } else {
      console.log(`❌ ${targetServer} is also unreachable`);
      
      if (failoverAttempts >= MAX_FAILOVER_ATTEMPTS) {
        // Both servers appear down
        console.error('🔥 Both servers are unreachable!');
        isFailingOver = false;
        return Promise.reject(new Error('Service temporarily unavailable. Please try again.'));
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      isFailingOver = false;
      return failoverInterceptor(error);
    }
  } catch (failoverError) {
    console.error('Failover failed:', failoverError);
    isFailingOver = false;
    return Promise.reject(error);
  }
};

// Add interceptor to both instances
api.interceptors.response.use(
  response => response,
  failoverInterceptor
);

publicApi.interceptors.response.use(
  response => response,
  failoverInterceptor
);

// Socket.IO with automatic failover
let socketInstance = null;
let reconnectAttempts = 0;
const MAX_SOCKET_RECONNECT = 5;

const initSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
  
  console.log(`🔌 Connecting socket to ${currentSocketURL}`);
  
  socketInstance = io(currentSocketURL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: MAX_SOCKET_RECONNECT,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
    timeout: 10000
  });
  
  socketInstance.on('connect', () => {
    console.log(`✅ Socket connected to ${currentSocketURL} ID: ${socketInstance.id}`);
    reconnectAttempts = 0;
  });
  
  socketInstance.on('connect_error', async (error) => {
    console.log(`❌ Socket error to ${currentSocketURL}:`, error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_SOCKET_RECONNECT) {
      console.log('🔄 Socket failed, attempting server failover...');
      const targetServer = currentBaseURL === LAPTOP_URL ? RENDER_URL : LAPTOP_URL;
      const isReachable = await testServerReachability(targetServer);
      
      if (isReachable) {
        await switchToServer(targetServer, 'Socket connection failed');
      } else {
        console.log('⚠️ Backup server also unreachable, will retry socket later');
        reconnectAttempts = MAX_SOCKET_RECONNECT - 1;
      }
    }
  });
  
  socketInstance.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  window.currentSocket = socketInstance;
  return socketInstance;
};

// Initialize socket
export const socket = initSocket();

// Periodically check if primary server (laptop) is back online
setInterval(async () => {
  if (currentBaseURL === RENDER_URL) {
    console.log('🔍 Checking if laptop is back online...');
    const isLaptopReachable = await testServerReachability(LAPTOP_URL);
    
    if (isLaptopReachable) {
      console.log('✅ Laptop is back online! Switching back to primary...');
      await switchToServer(LAPTOP_URL, 'Primary server restored');
    }
  }
}, 30000); // Check every 30 seconds

// Force switch functions for manual override
export const forceSwitchToLaptop = async () => {
  const isReachable = await testServerReachability(LAPTOP_URL);
  if (isReachable) {
    await switchToServer(LAPTOP_URL, 'Manual override');
    return true;
  }
  console.error('❌ Laptop is not reachable');
  return false;
};

export const forceSwitchToRender = async () => {
  const isReachable = await testServerReachability(RENDER_URL);
  if (isReachable) {
    await switchToServer(RENDER_URL, 'Manual override');
    return true;
  }
  console.error('❌ Render is not reachable');
  return false;
};

// Helper to check current status
export const getCurrentServer = () => ({
  url: currentBaseURL,
  isPrimary: currentBaseURL === LAPTOP_URL,
  socketConnected: socketInstance?.connected || false
});

// Export URL helpers
export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;