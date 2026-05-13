// frontend/src/api.js

import axios from "axios";

const hostname = window.location.hostname;

// ---------- BACKEND URLS ----------
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

// ---------- MAIN API ----------
export const api = axios.create({
  baseURL: activeBaseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------- PUBLIC API ----------
export const publicApi = axios.create({
  baseURL: activeBaseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------- AUTH TOKEN ----------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // Always use current active backend
    config.baseURL = activeBaseURL;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- PUBLIC API BASE URL ----------
publicApi.interceptors.request.use(
  (config) => {
    config.baseURL = activeBaseURL;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- FAILOVER SYSTEM ----------
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite retries
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const shouldFailover =
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.response.status >= 500;

    if (shouldFailover) {
      originalRequest._retry = true;

      console.log("Primary backend failed.");
      console.log("Switching to backup backend...");

      // Switch globally
      activeBaseURL = BACKUP_URL;

      // Retry failed request
      originalRequest.baseURL = BACKUP_URL;

      return axios(originalRequest);
    }

    return Promise.reject(error);
  }
);

// ---------- HEALTH CHECK ----------
const checkPrimaryHealth = async () => {
  try {
    const response = await axios.get(
      `${PRIMARY_URL}/health`,
      {
        timeout: 5000,
      }
    );

    if (response.status === 200) {
      // Restore primary if backup is active
      if (activeBaseURL !== PRIMARY_URL) {
        console.log("Primary backend restored.");
        console.log("Switching back to primary backend...");

        activeBaseURL = PRIMARY_URL;
      }
    }
  } catch (error) {
    // Primary still unavailable
  }
};

// ---------- CHECK PRIMARY EVERY 30s ----------
setInterval(checkPrimaryHealth, 30000);

// ---------- URL HELPERS ----------
export const CONTRIBUTION_TYPES_URL = () =>
  `${activeBaseURL}/api/contribution-types`;

export const CONTRIBUTION_TYPE_URL = (id) =>
  `${activeBaseURL}/api/contribution-types/${id}`;

export const PLEDGE_URL = (id) =>
  `${activeBaseURL}/api/pledges/${id}`;

// ---------- AUTH HEADER HELPER ----------
export const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ---------- EXPORT ACTIVE URL ----------
export const getActiveBackend = () => activeBaseURL;

export default api;