import axios, { AxiosInstance, AxiosError } from "axios";
import { API_ENDPOINTS } from "./apiEndpoints";
import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  requires_password_change: boolean;
  is_first_login: boolean;
  access_token: string;
  token_type: string;
}

interface AuthStatus {
  logged_in: boolean;
  is_first_login: boolean;
  requires_password_change: boolean;
}

interface PasswordChangeRequest {
  current_password: string;
  new_username: string;
  new_password: string;
}

interface SystemConfig {
  LOG_DIR: string;
  IGNORE_WHITELIST: boolean;
  ENABLE_WHITELIST_LOG: boolean;
  CODES_TO_ALLOW: number[];
  MAX_REQUESTS: number;
  TIME_FRAME: number;
  JAIL_NAME: string;
}

interface EmailConfig {
  enabled: boolean;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  username: string;
  password: string;
  from: string;
  to: string[];
  subject: string;
}

interface EmailConfigUpdate {
  enabled: boolean;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  username: string;
  password: string;
  from_: string;
  to: string[];
  subject: string;
}

interface WhitelistEntry {
  ip_address: string;
  description?: string | null;
  created_at?: string;
  expires_at?: string | null;
}

const apiClient: AxiosInstance = axios.create(AXIOS_CONFIG);
setupAxiosInterceptors(apiClient);

apiClient.interceptors.request.use(
  (config) => {
    const fallbackToken = localStorage.getItem("fallback_access_token");
    if (fallbackToken && config.headers) {
      config.headers["Authorization"] = `Bearer ${fallbackToken}`;
      console.log("[API] Usando token da localStorage come fallback");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(
      "[API SUCCESS]",
      response.config.method?.toUpperCase(),
      response.config.url,
      response.status,
    );
    return response;
  },
  (error: AxiosError) => {
    console.error(
      "[API ERROR]",
      error.config?.method?.toUpperCase(),
      error.config?.url,
      error.response?.status,
      error.message,
    );
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        console.error(`Errore di autenticazione/autorizzazione: ${status}`);
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    requiresPasswordChange: boolean;
    isFirstLogin: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.LOGIN.path,
        credentials,
      );

      const {
        requires_password_change,
        is_first_login,
        message,
        access_token,
      } = response.data;

      if (access_token) {
        localStorage.setItem("fallback_access_token", access_token);
        console.log("[API Login] Token salvato in localStorage come fallback");
      }

      window.dispatchEvent(
        new CustomEvent("auth:login", {
          detail: {
            message,
            requiresPasswordChange: requires_password_change,
            isFirstLogin: is_first_login,
          },
        }),
      );

      return {
        success: true,
        requiresPasswordChange: requires_password_change,
        isFirstLogin: is_first_login,
        message,
      };
    } catch (error: any) {
      let errorMessage = "Credenziali non valide o errore durante il login.";

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 422) {
          throw error;
        }

        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.LOGOUT.path);

      localStorage.removeItem("fallback_access_token");

      window.dispatchEvent(
        new CustomEvent("auth:logout", {
          detail: { message: response.data.message },
        }),
      );

      window.location.reload();

      return response.data;
    } catch (error: any) {
      let errorMessage = "Errore durante il logout.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      window.location.reload();
      throw new Error(errorMessage);
    }
  },

  async getUserInfo(): Promise<{
    success: boolean;
    user: { username: string; last_password_update: string };
  }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USER_INFO.path);
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante il recupero delle informazioni utente.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async getAuthStatus(): Promise<AuthStatus> {
    try {
      const response = await apiClient.get<AuthStatus>(
        API_ENDPOINTS.AUTH_STATUS.path,
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "Errore nel recupero dello stato di autenticazione:",
        error,
      );

      return {
        logged_in: false,
        is_first_login: false,
        requires_password_change: false,
      };
    }
  },

  async updateCredentials(
    credentials: PasswordChangeRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.UPDATE_CREDENTIALS.path,
        credentials,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage = "Errore durante l'aggiornamento delle credenziali.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async getWhitelistEntries(): Promise<WhitelistEntry[]> {
    try {
      const response = await apiClient.get<WhitelistEntry[]>(
        API_ENDPOINTS.GET_WHITELIST_ENTRIES.path,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante il recupero delle voci della whitelist.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async addWhitelistEntry(
    entry: WhitelistEntry,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ADD_WHITELIST_ENTRY.path,
        entry,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage = "Errore durante l'aggiunta della voce alla whitelist.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async removeWhitelistEntry(entry: { type: string; value: string }) {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.REMOVE_WHITELIST_ENTRY.path,
        { data: entry },
      );
      return response.data;
    } catch (error: any) {
      let errorMessage = "Errore sconosciuto durante la rimozione dell'entry.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async getWhitelistStats(): Promise<any> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.GET_WHITELIST_STATS.path,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage = "Errore nel recupero delle statistiche whitelist.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async getSystemConfig(): Promise<SystemConfig> {
    try {
      const response = await apiClient.get<SystemConfig>(
        API_ENDPOINTS.GET_SYSTEM_CONFIG.path,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante il recupero della configurazione del sistema.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async updateSystemConfig(config: SystemConfig): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>(
        API_ENDPOINTS.UPDATE_SYSTEM_CONFIG.path,
        config,
      );
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante l'aggiornamento della configurazione del sistema.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async getMailConfig(): Promise<{ success: boolean; config: EmailConfig }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        config: EmailConfig;
      }>(API_ENDPOINTS.GET_MAIL_CONFIG.path);
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante il recupero della configurazione email.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  async updateMailConfig(
    config: EmailConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { from, ...configRest } = config;
      const configForBackend: EmailConfigUpdate = {
        ...configRest,
        from_: from,
      } as EmailConfigUpdate;

      const response = await apiClient.put<{
        success: boolean;
        message: string;
      }>(API_ENDPOINTS.UPDATE_MAIL_CONFIG.path, configForBackend);
      return response.data;
    } catch (error: any) {
      let errorMessage =
        "Errore durante l'aggiornamento della configurazione email.";
      if (axios.isAxiosError(error) && error.response) {
        if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "detail" in error.response.data
        ) {
          errorMessage = (error.response.data as any).detail;
        } else if (
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
        ) {
          errorMessage = (error.response.data as any).message;
        } else {
          errorMessage = `Errore server (${error.response.status}): ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  },

  debug: {
    getCurrentToken: () => {
      console.warn("Impossibile accedere al token HttpOnly da JavaScript.");
      return "Token HttpOnly (non accessibile da JS)";
    },
    getFullToken: () => {
      console.warn("Impossibile accedere al token HttpOnly da JavaScript.");
      return "Token HttpOnly (non accessibile da JS)";
    },
    isTokenValid: () => {
      console.warn(
        "Impossibile verificare la validità di un token HttpOnly da JavaScript. La validazione avviene sul server.",
      );
      return false;
    },
    clearToken: () => {
      console.warn(
        "Impossibile cancellare direttamente un token HttpOnly da JavaScript. Utilizzare `authService.logout()` per effettuare il logout tramite API.",
      );
    },
    getTokenPayload: () => {
      console.warn(
        "Impossibile decodificare il payload di un token HttpOnly da JavaScript.",
      );
      return null;
    },
    logTokenInfo: () => {
      console.warn(
        "Le informazioni sul token HttpOnly non sono accessibili da JavaScript. La validazione e gestione avvengono lato server.",
      );
    },
  },

  getSecureConfig: async () => {
    try {
      const response = await apiClient.get("/secure-config");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSecureConfig: async (secureConfig: { SECURE_COOKIES: boolean }) => {
    try {
      const response = await apiClient.post("/secure-config", secureConfig);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getHealthStatus: async () => {
    try {
      const response = await apiClient.get("/health");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  restartService: async (serviceName: string) => {
    try {
      const response = await apiClient.post(`/services/restart/${serviceName}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRestartStatus: async (serviceName: string) => {
    try {
      const response = await apiClient.get(
        `/services/restart-status/${serviceName}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPendingRestarts: async () => {
    try {
      const response = await apiClient.get("/services/pending-restarts");
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export type { EmailConfig, SystemConfig };
