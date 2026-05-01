// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const LAPTOP_URL = "https://chris-laptop.tail96b26f.ts.net";
const RENDER_URL = "https://zuca-backend-iw9p.onrender.com";

// Track current server and failover state
let currentBaseURL = LAPTOP_URL;
let currentSocketURL = LAPTOP_URL;
let isFailingOver = false;
let isWakingRender = false;
let failoverAttempts = 0;
const MAX_FAILOVER_ATTEMPTS = 2;

// Helper to test if a server is reachable (handles Render sleep)
const testServerReachability = async (url, timeout = 10000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = Date.now();
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    const duration = Date.now() - startTime;
    clearTimeout(timeoutId);
    
    // 401 means server IS running (just needs auth)
    if (response.status === 401) {
      console.log(`${url} is ONLINE (${duration}ms) ✅`);
      return true;
    }
    
    if (response.ok) {
      console.log(`${url} is healthy (${duration}ms) ✅`);
      return true;
    }
    
    console.log(`${url} returned ${response.status} (${duration}ms)`);
    return false;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`${url} timeout after ${timeout}ms - may be sleeping`);
    } else {
      console.log(`${url} unreachable:`, error.message);
    }
    return false;
  }
};

// Special function to wake up Render (with longer timeout)
const wakeUpRender = async () => {
  if (isWakingRender) return false;
  
  isWakingRender = true;
  console.log('⏰ Render is sleeping. Attempting to wake it up (this takes 30-60 seconds)...');
  
  try {
    // Use a much longer timeout for cold start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 65 second timeout
    
    const startTime = Date.now();
    const response = await fetch(`${RENDER_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    const duration = Date.now() - startTime;
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 401) {
      console.log(`✅ Render woke up successfully! (${duration}ms)`);
      isWakingRender = false;
      return true;
    }
    
    console.log(`⚠️ Render responded but with status: ${response.status}`);
    isWakingRender = false;
    return false;
    
  } catch (error) {
    console.log(`❌ Render wake-up failed:`, error.message);
    isWakingRender = false;
    return false;
  }
};

// Create axios instances with longer timeout for Render
export const api = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 30000 // 30 second timeout (Render cold start)
});

export const publicApi = axios.create({
  baseURL: currentBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 30000
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
  
  api.defaults.baseURL = currentBaseURL;
  publicApi.defaults.baseURL = currentBaseURL;
  
  localStorage.setItem('lastWorkingServer', newServerURL);
  localStorage.setItem('lastServerSwitch', Date.now().toString());
  
  if (window.currentSocket) {
    window.currentSocket.disconnect();
  }
  initSocket();
};

// Main failover interceptor
const failoverInterceptor = async (error) => {
  const originalRequest = error.config;
  
  if (originalRequest._retry || isFailingOver) {
    return Promise.reject(error);
  }
  
  // Check if it's a network error or timeout
  const isNetworkError = error.code === 'ERR_NETWORK' || 
                         error.code === 'ECONNABORTED' ||
                         error.message?.includes('timeout');
  
  if (!isNetworkError) {
    return Promise.reject(error);
  }
  
  originalRequest._retry = true;
  isFailingOver = true;
  failoverAttempts++;
  
  console.warn(`⚠️ Server ${currentBaseURL} failed. Attempting failover (${failoverAttempts}/${MAX_FAILOVER_ATTEMPTS})...`);
  
  try {
    const targetServer = currentBaseURL === LAPTOP_URL ? RENDER_URL : LAPTOP_URL;
    
    // Special handling for Render (might be sleeping)
    let isReachable = false;
    if (targetServer === RENDER_URL) {
      // Try to wake up Render first
      isReachable = await wakeUpRender();
      if (!isReachable) {
        console.log('⚠️ Render did not respond to wake-up, trying regular check...');
        isReachable = await testServerReachability(targetServer, 15000);
      }
    } else {
      isReachable = await testServerReachability(targetServer);
    }
    
    if (isReachable) {
      console.log(`✅ ${targetServer} is reachable, switching...`);
      await switchToServer(targetServer, `${currentBaseURL} failed`);
      
      originalRequest.baseURL = currentBaseURL;
      
      // Increase timeout for the retry if switching to Render
      if (currentBaseURL === RENDER_URL) {
        originalRequest.timeout = 45000; // 45 seconds for first request after wake
      }
      
      const response = await api(originalRequest);
      isFailingOver = false;
      failoverAttempts = 0;
      return response;
    } else {
      console.log(`❌ ${targetServer} is also unreachable`);
      
      if (failoverAttempts >= MAX_FAILOVER_ATTEMPTS) {
        console.error('🔥 Both servers are unreachable!');
        isFailingOver = false;
        return Promise.reject(new Error('Service temporarily unavailable. Please refresh and try again.'));
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      isFailingOver = false;
      return failoverInterceptor(error);
    }
  } catch (failoverError) {
    console.error('Failover failed:', failoverError);
    isFailingOver = false;
    return Promise.reject(error);
  }
};

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
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    transports: ['websocket', 'polling'],
    timeout: 20000, // 20 second timeout for socket
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
      
      let isReachable = false;
      if (targetServer === RENDER_URL) {
        isReachable = await wakeUpRender();
      } else {
        isReachable = await testServerReachability(targetServer);
      }
      
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

export const socket = initSocket();

// Check if primary server is back (with special handling)
setInterval(async () => {
  if (currentBaseURL === RENDER_URL) {
    console.log('🔍 Checking if laptop is back online...');
    const isLaptopReachable = await testServerReachability(LAPTOP_URL, 5000);
    
    if (isLaptopReachable) {
      console.log('✅ Laptop is back online! Switching back to primary...');
      await switchToServer(LAPTOP_URL, 'Primary server restored');
    }
  }
}, 30000);

// Manual switch functions
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
  console.log('🔄 Manually switching to Render...');
  const isReachable = await wakeUpRender();
  if (isReachable) {
    await switchToServer(RENDER_URL, 'Manual override');
    return true;
  }
  console.error('❌ Render is not reachable');
  return false;
};

export const getCurrentServer = () => ({
  url: currentBaseURL,
  isPrimary: currentBaseURL === LAPTOP_URL,
  socketConnected: socketInstance?.connected || false
});

export const CONTRIBUTION_TYPES_URL = () => `${currentBaseURL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${currentBaseURL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${currentBaseURL}/api/pledges/${id}`;
export const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default currentBaseURL;