// frontend/src/api.js

import axios from "axios";

const hostname = window.location.hostname;

// ---------- BACKENDS ----------
const PRIMARY_URL =
  hostname === "localhost"
    ? "http://localhost:5000"
    : "https://zuca-backend-iw9p.onrender.com";

const BACKUP_URL =
  hostname === "localhost"
    ? "http://localhost:5001"
    : "https://zuca-portal2.onrender.com";

// ---------- ACTIVE SERVER ----------
let activeBaseURL = PRIMARY_URL;

// ---------- AXIOS INSTANCE ----------
export const api = axios.create({
  baseURL: activeBaseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------- REQUEST INTERCEPTOR ----------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  config.baseURL = activeBaseURL;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ---------- RESPONSE INTERCEPTOR (FAILOVER) ----------
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const config = error.config;

    const shouldFailover =
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.response?.status >= 500;

    if (shouldFailover && !config._retry) {
      config._retry = true;

      console.log("Primary backend failed → switching to backup");

      activeBaseURL = BACKUP_URL;

      return axios.request({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
        headers: config.headers,
        baseURL: BACKUP_URL,
        timeout: config.timeout || 15000,
      });
    }

    return Promise.reject(error);
  }
);

// ---------- HEALTH CHECK (RESTORE PRIMARY) ----------
const checkPrimary = async () => {
  try {
    await axios.get(`${PRIMARY_URL}/health`, { timeout: 5000 });

    if (activeBaseURL !== PRIMARY_URL) {
      console.log("Primary restored → switching back");

      activeBaseURL = PRIMARY_URL;
    }
  } catch (e) {
    // still down
  }
};

setInterval(checkPrimary, 30000);

// ---------- PUBLIC API ----------
export const publicApi = api;

// ---------- HELPERS ----------
export const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getActiveBackend = () => activeBaseURL;

export default api;