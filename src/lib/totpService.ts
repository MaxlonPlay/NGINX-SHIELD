export const generateTotpSecret = async (
  currentPassword: string,
  username?: string,
): Promise<{ qrCodeUrl: string; secretKey: string }> => {
  try {
    const response = await fetch("/api/totp/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        current_password: currentPassword,
        ...(username && { username }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Errore durante la configurazione TOTP",
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Configurazione TOTP fallita");
    }

    return {
      qrCodeUrl: data.qr_code,
      secretKey: data.secret,
    };
  } catch (error) {
    console.error("Errore durante la generazione del segreto TOTP:", error);
    throw error;
  }
};

export const verifyTotpSetup = async (
  totpCode: string,
): Promise<{ success: boolean; backupCodes: string[] }> => {
  try {
    const response = await fetch("/api/totp/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        totp_code: totpCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Errore durante la verifica TOTP");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Verifica TOTP fallita");
    }

    return {
      success: true,
      backupCodes: data.backup_codes || [],
    };
  } catch (error) {
    console.error("Errore durante la verifica TOTP:", error);
    throw error;
  }
};

export const disableTotp = async (
  currentPassword: string,
  totpCode: string,
): Promise<{ success: boolean }> => {
  try {
    const response = await fetch("/api/totp/disable", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        current_password: currentPassword,
        totp_code: totpCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Errore durante la disabilitazione TOTP",
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Disabilitazione TOTP fallita");
    }

    return { success: true };
  } catch (error) {
    console.error("Errore durante la disabilitazione TOTP:", error);
    throw error;
  }
};

export const getTotpStatus = async (): Promise<{
  totp_enabled: boolean;
  totp_configured: boolean;
  activated_at: string | null;
  has_backup_codes: boolean;
}> => {
  try {
    const response = await fetch("/api/totp/status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Errore durante il recupero dello stato TOTP",
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Recupero stato TOTP fallito");
    }

    return {
      totp_enabled: data.totp_enabled,
      totp_configured: data.totp_configured,
      activated_at: data.activated_at,
      has_backup_codes: data.has_backup_codes,
    };
  } catch (error) {
    console.error("Errore durante il recupero dello stato TOTP:", error);
    throw error;
  }
};

export const regenerateBackupCodes = async (
  currentPassword: string,
  totpCode: string,
): Promise<{ success: boolean; backupCodes: string[] }> => {
  try {
    const response = await fetch("/api/totp/regenerate-backup-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        current_password: currentPassword,
        totp_code: totpCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail ||
          "Errore durante la rigenerazione dei codici di backup",
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Rigenerazione codici di backup fallita");
    }

    return {
      success: true,
      backupCodes: data.backup_codes || [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "Errore durante la rigenerazione dei codici di backup:",
      errorMessage,
    );
    throw new Error(errorMessage);
  }
};

export const isTotpEnabled = async (): Promise<boolean> => {
  try {
    const status = await getTotpStatus();
    return status.totp_enabled;
  } catch (error) {
    console.error("Errore durante la verifica dello stato TOTP:", error);
    return false;
  }
};
