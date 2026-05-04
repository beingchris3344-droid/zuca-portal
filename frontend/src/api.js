import axios from "axios";
import { io } from "socket.io-client";

// Use environment variable, fallback to localhost for development
const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

console.log(`🔗 Using backend: ${BASE_URL}`);

// Axios instances
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000
});

export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000
});

// Attach token
const attachToken = (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachToken);
publicApi.interceptors.request.use(attachToken);

// Socket.IO
export const socket = io(BASE_URL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ Socket error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Socket disconnected:", reason);
});

// Helpers
export const CONTRIBUTION_TYPES_URL = () => `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;
export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export default BASE_URL;