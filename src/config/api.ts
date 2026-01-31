export const API_BASE_URL = `${typeof window !== "undefined" ? window.location.protocol : "http:"}//${typeof window !== "undefined" ? window.location.host : "localhost"}/api`;

export const AXIOS_CONFIG = {
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
};

export const API_TIMEOUT = 30000;

export const API_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
};
