import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface UseAutoRefreshOptions {
  autoRefreshInterval?: number;
  enabledByDefault?: boolean;
  onRefresh?: () => void | Promise<void>;
}

interface UseAutoRefreshReturn {
  isAutoRefreshEnabled: boolean;
  isLoading: boolean;
  lastUpdate: Date | null;
  toggleRefreshMode: () => void;
  manualRefresh: () => void;
  setIsLoading: (loading: boolean) => void;
  refreshControls: JSX.Element;
}

export const useAutoRefresh = ({
  autoRefreshInterval = 1000,
  enabledByDefault = false,
  onRefresh,
}: UseAutoRefreshOptions = {}): UseAutoRefreshReturn => {
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] =
    useState(enabledByDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef<(() => void | Promise<void>) | undefined>(
    onRefresh,
  );

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const executeRefresh = useCallback(async () => {
    if (isLoading || !onRefreshRef.current) return;

    try {
      setIsLoading(true);
      await onRefreshRef.current();
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Errore durante il refresh:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    console.log(
      "useAutoRefresh - isEnabled:",
      isAutoRefreshEnabled,
      "interval:",
      autoRefreshInterval,
    );

    if (intervalRef.current) {
      console.log("Clearing previous interval:", intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isAutoRefreshEnabled && autoRefreshInterval > 0) {
      console.log(
        "Creando nuovo intervallo di",
        autoRefreshInterval / 1000,
        "secondi",
      );

      const interval = setInterval(() => {
        console.log(
          "🔄 Auto-refresh triggered:",
          new Date().toLocaleTimeString(),
        );
        executeRefresh();
      }, autoRefreshInterval);

      intervalRef.current = interval;
    }

    return () => {
      if (intervalRef.current) {
        console.log("🧹 Cleanup - Clearing interval:", intervalRef.current);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoRefreshEnabled, autoRefreshInterval, executeRefresh]);

  const toggleRefreshMode = useCallback(() => {
    const newMode = !isAutoRefreshEnabled;
    console.log("🔄 Toggling refresh mode to:", newMode ? "AUTO" : "MANUAL");

    setIsAutoRefreshEnabled(newMode);

    if (newMode) {
      console.log("✅ Auto-refresh enabled, executing immediate refresh");
      executeRefresh();
    }
  }, [isAutoRefreshEnabled, executeRefresh]);

  const manualRefresh = useCallback(() => {
    if (!isAutoRefreshEnabled && !isLoading) {
      console.log("🔄 Manual refresh triggered");
      executeRefresh();
    }
  }, [isAutoRefreshEnabled, isLoading, executeRefresh]);

  const refreshControls = (
    <div className="flex items-center gap-4">
      {}
      <div className="flex items-center gap-2">
        <RefreshCw
          className={`w-4 h-4 ${
            isAutoRefreshEnabled
              ? "text-green-400 animate-spin"
              : "text-blue-400"
          }`}
        />
        <span className="text-xs">
          {isAutoRefreshEnabled
            ? `Aggiornamento in tempo reale (${autoRefreshInterval / 1000}s)`
            : "Aggiornamento manuale"}
        </span>
      </div>

      {}
      <button
        onClick={toggleRefreshMode}
        className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-md border border-slate-600 transition-colors"
      >
        {isAutoRefreshEnabled ? "Passa a manuale" : "Attiva auto-refresh"}
      </button>

      {}
      {!isAutoRefreshEnabled && (
        <button
          onClick={manualRefresh}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {isLoading ? "Aggiornamento..." : "Aggiorna ora"}
        </button>
      )}

      {}
      {lastUpdate && (
        <div className="text-xs text-slate-400">
          Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );

  return {
    isAutoRefreshEnabled,
    isLoading,
    lastUpdate,
    toggleRefreshMode,
    manualRefresh,
    setIsLoading,
    refreshControls,
  };
};
