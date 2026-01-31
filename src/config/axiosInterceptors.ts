import axios, { AxiosInstance, AxiosError } from "axios";

export const setupAxiosInterceptors = (apiClient: AxiosInstance) => {
  apiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        console.warn("[AXIOS] Token scaduto (401) - Reindirizzamento al login");

        localStorage.removeItem("nginxshield_auth");
        sessionStorage.removeItem("nginxshield_session");
        localStorage.removeItem("fallback_access_token");

        window.dispatchEvent(new CustomEvent("auth:unauthorized"));

        window.location.reload();
      }

      return Promise.reject(error);
    },
  );
};
