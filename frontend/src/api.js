// frontend/src/api.js
import axios from "axios";
import { io } from "socket.io-client";

let BASE_URL;

const hostname = window.location.hostname;

if (hostname === "localhost" || hostname === "127.0.0.1") {
  BASE_URL = "http://localhost:5000";
} else if (hostname === "192.168.100.141") {
  BASE_URL = "http://192.168.100.141:5000";
} else if (hostname === "http://10.92.196.169") {
  BASE_URL = "http://10.92.196.169:5000";
} else {
  BASE_URL = "https://zuca-backend-iw9p.onrender.com";
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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== SOCKET.IO SETUP - NORMAL ==========
// Will work on Render, and on Vercel it will use whatever works
export const socket = io(BASE_URL, {
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
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

// ========== END SOCKET.IO ==========

export const CONTRIBUTION_TYPES_URL = `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL;