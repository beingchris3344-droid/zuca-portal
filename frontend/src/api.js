// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

const hostname = window.location.hostname;

let BASE_URL;

if (hostname === "localhost") {
  BASE_URL = "http://localhost:5000";
} else {
  BASE_URL = "https://zuca-portal-iypb.vercel.app";
}

// Create axios instances with credentials
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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== SOCKET.IO SETUP - NO CREDENTIALS ==========
export const socket = io(BASE_URL, {
  transports: ['polling'],  // Only polling
  autoConnect: true,
  // No withCredentials - this was causing the CORS error
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
});

// ========== END SOCKET.IO ==========

export const CONTRIBUTION_TYPES_URL = `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;