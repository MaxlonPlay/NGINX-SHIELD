import axios from "axios";
import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

const apiClient = axios.create(AXIOS_CONFIG);
setupAxiosInterceptors(apiClient);

export interface BanEntry {
  ip: string;
  reason: string;
  timestamp: string;
  type: "automatic" | "manual";
  httpCode?: number;
  domain?: string;
  urlPath?: string;
  userAgent?: string;
  organization?: string;
  country?: string;
}

export interface BanResponse {
  success: boolean;
  message: string;
  data?: {
    automaticBans: BanEntry[];
    manualBans: BanEntry[];
    hasMoreAutomatic: boolean;
    hasMoreManual: boolean;
    totals?: {
      automatic: number;
      manual: number;
      total: number;
    };
  };
}

interface BanCountsResponse {
  success: boolean;
  message: string;
  data: {
    total_automatic_bans: number;
    total_manual_bans: number;
    total_bans: number;
  };
}

interface ManualBanRequest {
  ip: string;
  reason: string;
}

export const fetchBans = async (
  limit: number = 10,
  automaticOffset: number = 0,
  manualOffset: number = 0,
  searchQuery: string = "",
): Promise<{
  automaticBans: BanEntry[];
  manualBans: BanEntry[];
  hasMoreAutomatic: boolean;
  hasMoreManual: boolean;
}> => {
  try {
    const params = {
      limit: limit.toString(),
      automatic_offset: automaticOffset.toString(),
      manual_offset: manualOffset.toString(),
      ...(searchQuery.trim() && { search: searchQuery.trim() }),
    };

    const response = await apiClient.get<BanResponse>("/bans", { params });
    return {
      automaticBans: response.data.data?.automaticBans || [],
      manualBans: response.data.data?.manualBans || [],
      hasMoreAutomatic: response.data.data?.hasMoreAutomatic || false,
      hasMoreManual: response.data.data?.hasMoreManual || false,
    };
  } catch (error) {
    console.error("Errore in fetchBans:", error);
    throw error;
  }
};

export const fetchBanCounts = async (): Promise<{
  totalAutomatic: number;
  totalManual: number;
  total: number;
}> => {
  try {
    const response = await apiClient.get<BanCountsResponse>("/bans/counts");
    return {
      totalAutomatic: response.data.data.total_automatic_bans,
      totalManual: response.data.data.total_manual_bans,
      total: response.data.data.total_bans,
    };
  } catch (error) {
    console.error("Errore in fetchBanCounts:", error);
    throw error;
  }
};

export const fetchTotalAutomaticBansCount = async (): Promise<number> => {
  const counts = await fetchBanCounts();
  return counts.totalAutomatic;
};

export const fetchTotalManualBansCount = async (): Promise<number> => {
  const counts = await fetchBanCounts();
  return counts.totalManual;
};

export const banIP = async (ip: string, reason: string): Promise<void> => {
  if (!ip.trim()) {
    throw new Error("Indirizzo IP è obbligatorio");
  }

  if (!reason.trim() || reason.trim().length < 3) {
    throw new Error("Il motivo del ban deve essere di almeno 3 caratteri");
  }

  try {
    const requestData: ManualBanRequest = {
      ip: ip.trim(),
      reason: reason.trim(),
    };
    await apiClient.post("/bans/manual", requestData);
  } catch (error) {
    console.error("Errore in banIP:", error);
    throw error;
  }
};

export const unbanIP = async (
  ip: string,
  type: "automatic" | "manual",
): Promise<void> => {
  if (!ip.trim()) {
    throw new Error("Indirizzo IP è obbligatorio");
  }

  if (!["automatic", "manual"].includes(type)) {
    throw new Error("Tipo di ban non valido");
  }

  try {
    await apiClient.delete("/bans", {
      params: {
        ip: ip.trim(),
        ban_type: type,
      },
    });
  } catch (error) {
    console.error("Errore in unbanIP:", error);
    throw error;
  }
};

export const fetchBanStats = async () => {
  try {
    const response = await apiClient.get("/bans/stats");
    return response.data;
  } catch (error) {
    console.error("Errore in fetchBanStats:", error);
    throw error;
  }
};

export const fetchFail2banStatus = async () => {
  try {
    const response = await apiClient.get("/bans/fail2ban-status");
    return response.data;
  } catch (error) {
    console.error("Errore in fetchFail2banStatus:", error);
    throw error;
  }
};

export const checkIPBanStatus = async (ip: string) => {
  if (!ip.trim()) {
    throw new Error("Indirizzo IP è obbligatorio");
  }

  try {
    const response = await apiClient.get(
      `/bans/check/${encodeURIComponent(ip.trim())}`,
    );
    return response.data;
  } catch (error) {
    console.error("Errore in checkIPBanStatus:", error);
    throw error;
  }
};

export const fetchIPGeoInfo = async (ip: string) => {
  if (!ip.trim()) {
    throw new Error("Indirizzo IP è obbligatorio");
  }

  try {
    const response = await apiClient.get(
      `/bans/geo-info/${encodeURIComponent(ip.trim())}`,
    );
    return response.data;
  } catch (error) {
    console.error("Errore in fetchIPGeoInfo:", error);
    throw error;
  }
};

export const bulkBanIPs = async (banRequests: ManualBanRequest[]) => {
  if (banRequests.length === 0) {
    throw new Error("Nessun IP da bannare");
  }

  if (banRequests.length > 10) {
    throw new Error("Massimo 10 IP per richiesta bulk");
  }

  for (const req of banRequests) {
    if (!req.ip.trim()) {
      throw new Error("Tutti gli IP sono obbligatori");
    }
    if (!req.reason.trim() || req.reason.trim().length < 3) {
      throw new Error("Tutti i motivi devono essere di almeno 3 caratteri");
    }
  }

  try {
    const response = await apiClient.post("/bans/bulk-manual", banRequests);
    return response.data;
  } catch (error) {
    console.error("Errore in bulkBanIPs:", error);
    throw error;
  }
};

export const exportBannedIPs = async (format: "json" | "csv" = "json") => {
  try {
    if (format === "csv") {
      const response = await apiClient.get("/bans/export", {
        params: { format },
        responseType: "text",
      });
      return response.data;
    } else {
      const response = await apiClient.get("/bans/export", {
        params: { format },
      });
      return response.data;
    }
  } catch (error) {
    console.error("Errore in exportBannedIPs:", error);
    throw error;
  }
};

export const formatApiError = (
  error: any,
): { message: string; causes?: string[]; error_type?: string } => {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;

    if (Array.isArray(detail)) {
      return {
        message: detail.map((err: any) => err.msg).join(", "),
        error_type: "validation_error",
      };
    }

    if (typeof detail === "object") {
      return {
        message: detail.message || detail.detail || "Errore sconosciuto",
        causes: detail.causes || [],
        error_type: detail.error_type,
      };
    }

    if (typeof detail === "string") {
      return { message: detail };
    }
  }

  if (error?.response?.data?.success === false) {
    return {
      message: error.response.data.message || "Errore sconosciuto",
      causes: error.response.data.causes || [],
      error_type: error.response.data.error_type,
    };
  }

  if (error?.message && typeof error.message === "string") {
    return { message: error.message };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  const status = error?.response?.status || error?.status;
  if (status) {
    switch (status) {
      case 400:
        return {
          message: "Richiesta non valida. Controlla i dati inseriti.",
          error_type: "validation_error",
        };
      case 401:
        return {
          message: "Sessione scaduta. Effettua nuovamente il login.",
          error_type: "auth_error",
        };
      case 403:
        return {
          message: "Accesso negato. Non hai i permessi necessari.",
          error_type: "auth_error",
        };
      case 404:
        return {
          message: "Risorsa non trovata.",
          error_type: "not_found",
        };
      case 409:
        return {
          message: "Conflitto: l'IP potrebbe essere già bannato.",
          error_type: "already_exists",
        };
      case 422:
        return {
          message: "Dati di input non validi. Controlla formato IP e motivo.",
          error_type: "validation_error",
        };
      case 500:
        return {
          message: "Errore interno del server. Riprova più tardi.",
          error_type: "server_error",
          causes: [
            "Errore del server",
            "Problema con fail2ban",
            "Problema con il database",
          ],
        };
      case 502:
        return {
          message:
            "Errore di fail2ban. Controlla la configurazione del servizio.",
          error_type: "fail2ban_error",
          causes: [
            "fail2ban non in esecuzione",
            "fail2ban non configurato correttamente",
            "Permessi insufficienti",
          ],
        };
      case 503:
        return {
          message:
            "Servizio temporaneamente non disponibile. Riprova più tardi.",
          error_type: "service_unavailable",
        };
      default:
        return {
          message: `Errore del server (${status}). Riprova più tardi.`,
          error_type: "unknown",
        };
    }
  }

  if (error?.message?.includes("Network")) {
    return {
      message:
        "Errore di connessione. Verifica la connessione di rete e che il server sia raggiungibile.",
      error_type: "network_error",
    };
  }

  return {
    message: "Errore sconosciuto. Riprova più tardi.",
    error_type: "unknown",
  };
};

export interface CIDRBanRequest {
  cidr: string;
  reason: string;
}

export interface IPInCIDREntry {
  id: number;
  ip: string;
  type: "automatic" | "manual";
}

export interface CheckIPsInCIDRResponse {
  success: boolean;
  message: string;
  data: {
    cidr: string;
    count: number;
    ips_found: IPInCIDREntry[];
  };
}

export const banCIDR = async (
  cidr: string,
  reason: string,
): Promise<{
  success: boolean;
  message: string;
  warning?: string;
  data?: any;
}> => {
  try {
    console.log("🔍 Tentativo ban CIDR (usando endpoint multiplo):", {
      cidr,
      reason,
      reasonLength: reason.length,
    });

    const response = await banMultipleCIDRs([{ cidr, reason }]);

    console.log("✅ Risposta ban CIDR:", response);

    if (response.successful > 0) {
      return {
        success: true,
        message: `CIDR ${cidr} bannato con successo`,
        data: response,
      };
    } else {
      const firstResult = response.results?.[0];
      throw new Error(firstResult?.message || "Ban fallito");
    }
  } catch (error) {
    console.error("❌ Errore in banCIDR:", error);

    if (error?.response) {
      console.error("📋 Dettagli errore:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
    }

    throw error;
  }
};

export const findIPsInCIDR = async (
  cidr: string,
): Promise<{
  success: boolean;
  message: string;
  ips_found: IPInCIDREntry[];
  count: number;
}> => {
  try {
    const response = await apiClient.post<CheckIPsInCIDRResponse>(
      "/bans/cidr/check-ips",
      { cidr },
    );
    return {
      success: response.data.success,
      message: response.data.message,
      ips_found: response.data.data.ips_found || [],
      count: response.data.data.count || 0,
    };
  } catch (error) {
    console.error("Errore in findIPsInCIDR:", error);
    throw error;
  }
};

export const unbanIPsInCIDR = async (
  cidr: string,
  ip_ids: number[],
): Promise<{
  success: boolean;
  message: string;
  unbanned_ips: any[];
  failed_ips: any[];
}> => {
  try {
    const response = await apiClient.post("/bans/cidr/unban-ips", {
      cidr,
      ip_ids,
    });
    return {
      success: response.data.success,
      message: response.data.message,
      unbanned_ips: response.data.data?.unbanned_ips || [],
      failed_ips: response.data.data?.failed_ips || [],
    };
  } catch (error) {
    console.error("Errore in unbanIPsInCIDR:", error);
    throw error;
  }
};

export const banMultipleCIDRs = async (
  cidrs: CIDRBanRequest[],
): Promise<{
  success: boolean;
  message: string;
  successful: number;
  failed: number;
  results: any[];
}> => {
  try {
    const response = await apiClient.post("/bans/cidr/ban-multiple", { cidrs });
    return {
      success: response.data.success,
      message: response.data.message,
      successful: response.data.data?.successful || 0,
      failed: response.data.data?.failed || 0,
      results: response.data.data?.results || [],
    };
  } catch (error) {
    console.error("Errore in banMultipleCIDRs:", error);
    throw error;
  }
};
