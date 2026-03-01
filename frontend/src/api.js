// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

let BASE_URL;

if (hostname === "localhost") {
  // Local development
  BASE_URL = "http://localhost:5000";
} 
else {
  // Production (deployed frontend)
  BASE_URL = "https://zuca-portal2.onrender.com";
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