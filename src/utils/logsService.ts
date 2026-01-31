import axios from "axios";
import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

const apiClient = axios.create(AXIOS_CONFIG);

setupAxiosInterceptors(apiClient);

apiClient.interceptors.request.use((config) => {
  const fallbackToken = localStorage.getItem("fallback_access_token");
  if (fallbackToken && config.headers) {
    config.headers["Authorization"] = `Bearer ${fallbackToken}`;
  }
  return config;
});

export const logService = {
  getAvailableLogs: async () => {
    try {
      console.log("[LOGS] Fetching available logs...");
      const response = await apiClient.get("/logs/available");
      console.log("[LOGS SUCCESS] Available logs:", response.data);
      return response.data;
    } catch (error) {
      console.error("[LOGS ERROR] Failed to fetch available logs:", error);
      throw error;
    }
  },

  getLogs: async (
    logType: string = "npm_debug",
    limit?: number,
    offset: number = 0,
    search?: string,
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("log_type", logType);
      if (limit !== undefined) params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (search) params.append("search", search);

      console.log(`[LOGS] Fetching ${logType} logs with params:`, {
        limit,
        offset,
        search,
      });

      const response = await apiClient.get(`/logs?${params.toString()}`);
      console.log("[LOGS SUCCESS] Logs retrieved:", {
        total: response.data.data?.total,
        count: response.data.data?.logs?.length,
      });
      return response.data;
    } catch (error) {
      console.error("[LOGS ERROR] Failed to fetch logs:", error);
      throw error;
    }
  },

  getLogsStats: async (logType: string = "npm_debug") => {
    try {
      console.log(`[LOGS] Fetching stats for ${logType}...`);
      const response = await apiClient.get(`/logs/stats?log_type=${logType}`);
      console.log("[LOGS SUCCESS] Stats retrieved:", response.data);
      return response.data;
    } catch (error) {
      console.error("[LOGS ERROR] Failed to fetch logs stats:", error);
      throw error;
    }
  },

  searchLogs: async (
    logType: string = "npm_debug",
    query: string = "",
    limit: number = 100,
  ) => {
    try {
      console.log(`[LOGS] Searching in ${logType} with query: "${query}"`);
      const params = new URLSearchParams();
      params.append("log_type", logType);
      params.append("query", query);
      params.append("limit", limit.toString());

      const response = await apiClient.get(`/logs/search?${params.toString()}`);
      console.log("[LOGS SUCCESS] Search results:", {
        total: response.data.data?.total,
        count: response.data.data?.logs?.length,
      });
      return response.data;
    } catch (error) {
      console.error("[LOGS ERROR] Search failed:", error);
      throw error;
    }
  },
};
