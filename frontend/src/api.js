// frontend/src/api.js
import axios from "axios";

const hostname = window.location.hostname;

let BASE_URL;

if (hostname === "localhost") {
  // Local development
  BASE_URL = "http://localhost:5000";
} 
else {
  // Production (deployed frontend) → backend URL
  BASE_URL = "https://zuca-portal2.onrender.com";
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const CONTRIBUTION_TYPES_URL = `${BASE_URL}/api/contribution-types`;
export const CONTRIBUTION_TYPE_URL = (id) => `${BASE_URL}/api/contribution-types/${id}`;
export const PLEDGE_URL = (id) => `${BASE_URL}/api/pledges/${id}`;

export const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// frontend/src/api.js (add at the bottom)

export const getNormalContributions = async () => {
  try {
    const res = await api.get("/api/users/contributions");
    return res.data; // { contributions: [...] }
  } catch (err) {
    console.error("Error fetching normal contributions:", err);
    return { contributions: [] };
  }
};

export const getJumuiyaContributions = async () => {
  try {
    const res = await api.get("/api/users/jumuiya-contributions");
    return res.data; // { contributions: [...] }
  } catch (err) {
    console.error("Error fetching jumuiya contributions:", err);
    return { contributions: [] };
  }
};

export default BASE_URL;