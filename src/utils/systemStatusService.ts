import axios, { AxiosInstance } from "axios";
import { API_ENDPOINTS } from "./apiEndpoints";

import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

const apiClient: AxiosInstance = axios.create({
  ...AXIOS_CONFIG,
  timeout: 10000,
});
setupAxiosInterceptors(apiClient);

export interface CpuDetails {
  usage: number;
  cores: number;
  temperature: number;
  loadAverage: number[];
}

export interface RamDetails {
  total: number;
  used: number;
  free: number;
  usagePercentage: number;
}

export interface GeneralMetrics {
  uptime: string;
}

export interface SystemStatusData {
  cpuUsage: number;
  ramUsage: number;
  temperature: number;

  pythonScript: boolean;
  fail2ban: boolean;
  nginx: boolean;

  cpuDetails: CpuDetails;
  ramDetails: RamDetails;
  generalMetrics: GeneralMetrics;
}

interface ApiResponse {
  success: boolean;
  data: SystemStatusData;
  message?: string;
}

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

export class SystemStatusError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "SystemStatusError";
  }
}

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        console.error(`Errore di autenticazione/autorizzazione: ${status}`);
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
    return Promise.reject(error);
  },
);

export const fetchSystemStatus = async (): Promise<SystemStatusData> => {
  try {
    console.log("[DEBUG SystemStatus] Cookies disponibili:", document.cookie);

    const response = await apiClient.get<ApiResponse>(
      API_ENDPOINTS.GET_SYSTEM_STATUS.path,
    );

    if (!response.data || typeof response.data.success !== "boolean") {
      throw new SystemStatusError("Struttura della risposta API non valida");
    }

    if (response.data.success && response.data.data) {
      if (!isValidSystemStatusData(response.data.data)) {
        throw new SystemStatusError(
          "I dati ricevuti dall'API non sono nel formato atteso",
        );
      }
      return response.data.data;
    } else {
      throw new SystemStatusError(
        response.data.message || "La risposta dell'API non ha avuto successo",
      );
    }
  } catch (error) {
    if (error instanceof SystemStatusError) {
      console.error("Errore SystemStatus:", error.message, {
        statusCode: error.statusCode,
      });
      throw error;
    }

    if (axios.isAxiosError(error)) {
      let errorMessage = `Errore API: ${error.response?.status || "Unknown"} ${error.response?.statusText || "Unknown Error"}`;

      if (error.response) {
        try {
          const errorData: ApiErrorResponse = error.response.data;
          errorMessage =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            errorMessage;
        } catch (parseError) {
          console.warn(
            "Impossibile parsare la risposta di errore:",
            parseError,
          );
        }

        throw new SystemStatusError(errorMessage, error.response.status);
      }

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        throw new SystemStatusError(
          "Timeout: il server sta impiegando troppo tempo a rispondere",
        );
      }

      if (error.code === "NETWORK_ERROR" || !error.response) {
        throw new SystemStatusError(
          "Errore di connessione: impossibile raggiungere il server",
        );
      }
    }

    const unknownError = new SystemStatusError(
      `Errore imprevisto: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error(
      "Errore imprevisto durante il fetch dello stato del sistema:",
      error,
    );
    throw unknownError;
  }
};

function isValidSystemStatusData(data: any): data is SystemStatusData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const hasBasicFields =
    typeof data.cpuUsage === "number" &&
    typeof data.ramUsage === "number" &&
    typeof data.temperature === "number" &&
    typeof data.pythonScript === "boolean" &&
    typeof data.fail2ban === "boolean" &&
    typeof data.nginx === "boolean";

  if (!hasBasicFields) {
    console.warn("Campi base mancanti o non validi:", {
      cpuUsage: typeof data.cpuUsage,
      ramUsage: typeof data.ramUsage,
      temperature: typeof data.temperature,
      pythonScript: typeof data.pythonScript,
      fail2ban: typeof data.fail2ban,
      nginx: typeof data.nginx,
    });
    return false;
  }

  if (data.cpuDetails) {
    const validCpuDetails =
      typeof data.cpuDetails.usage === "number" &&
      typeof data.cpuDetails.cores === "number" &&
      typeof data.cpuDetails.temperature === "number" &&
      Array.isArray(data.cpuDetails.loadAverage);

    if (!validCpuDetails) {
      console.warn("CpuDetails non validi:", data.cpuDetails);
      return false;
    }
  }

  if (data.ramDetails) {
    const validRamDetails =
      typeof data.ramDetails.total === "number" &&
      typeof data.ramDetails.used === "number" &&
      typeof data.ramDetails.free === "number" &&
      typeof data.ramDetails.usagePercentage === "number";

    if (!validRamDetails) {
      console.warn("RamDetails non validi:", data.ramDetails);
      return false;
    }
  }

  if (data.generalMetrics) {
    const validGeneralMetrics = typeof data.generalMetrics.uptime === "string";
    if (!validGeneralMetrics) {
      console.warn("GeneralMetrics non validi:", data.generalMetrics);
      return false;
    }
  }

  return true;
}

export const formatUsagePercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatTemperature = (value: number): string => {
  return `${Math.round(value)}°C`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getStatusColor = (
  percentage: number,
): "green" | "yellow" | "red" => {
  if (percentage < 60) return "green";
  if (percentage < 80) return "yellow";
  return "red";
};

export const debugSystemStatus = {
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      await fetchSystemStatus();
      return { success: true, message: "Connessione all'endpoint riuscita" };
    } catch (error) {
      const errorMessage =
        error instanceof SystemStatusError
          ? error.message
          : `Errore sconosciuto: ${error}`;
      return { success: false, message: errorMessage };
    }
  },

  getEndpointInfo: () => {
    return {
      url: `${apiClient.defaults.baseURL}${API_ENDPOINTS.GET_SYSTEM_STATUS.path}`,
      method: API_ENDPOINTS.GET_SYSTEM_STATUS.method,
      authRequired: API_ENDPOINTS.GET_SYSTEM_STATUS.authRequired,
      description: API_ENDPOINTS.GET_SYSTEM_STATUS.description,
    };
  },
};

export interface SystemStatusDataPoint {
  timestamp: string;
  temperature: number;
  cpuUsage: number;
  ramUsage: number;
}

export interface SystemStatusHistory {
  data_points: SystemStatusDataPoint[];
  hours: number;
}

export const fetchSystemHistory = async (
  hours: number = 12,
): Promise<SystemStatusHistory> => {
  try {
    const response = await apiClient.get<ApiResponse>("/system/history", {
      params: { hours },
    });

    if (response.data.success && response.data.data) {
      return response.data.data as unknown as SystemStatusHistory;
    } else {
      throw new SystemStatusError(
        response.data.message ||
          "Errore nel recupero dello storico del sistema",
      );
    }
  } catch (error: any) {
    console.error("Errore nel recupero dello storico del sistema:", error);
    if (error instanceof SystemStatusError) {
      throw error;
    }
    throw new SystemStatusError(
      error?.message || "Errore sconosciuto nel recupero dello storico",
    );
  }
};
