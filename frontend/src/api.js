// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

let BASE_URL;

if (hostname === "localhost") {
  BASE_URL = "http://localhost:5000";
} 
else if (hostname.startsWith("100.")) {
  BASE_URL = "http://100.79.107.46:5000";
} 
else if (hostname.startsWith("192.168.")) {
  BASE_URL = "http://192.168.100.141:5000";
} 
else {
  BASE_URL = "http://192.168.100.141:5000";
}

// ====================
// AXIOS INSTANCE (NEW)
// ====================
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto-attach token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ====================
// Keep Existing Exports (SAFE)
// ====================
export const CONTRIBUTION_TYPES_URL = `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export default BASE_URL; // 👈 KEEP THIS so nothing breaks