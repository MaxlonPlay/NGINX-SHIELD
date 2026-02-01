import { useState, useEffect, forwardRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Server,
  Wifi,
  AlertCircle,
  CheckCircle,
  Cpu,
  MemoryStick,
  Activity,
  Thermometer,
  RefreshCw,
} from "lucide-react";

import {
  fetchSystemStatus,
  SystemStatusData,
  SystemStatusError,
  formatUsagePercentage,
  formatTemperature,
  getStatusColor,
} from "@/utils/systemStatusService";

import { useAutoRefresh } from "@/hooks/useAutoRefresh";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { t } from "i18next";

const Progress = forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
  }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-slate-700",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all duration-300 ease-in-out",
        indicatorClassName,
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

interface SystemStatusProps {
  autoRefreshInterval?: number;
  enableAutoRefresh?: boolean;
}

export const SystemStatus = ({
  autoRefreshInterval = 2000,
  enableAutoRefresh = true,
}: SystemStatusProps = {}) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(
    null,
  );
  const [error, setError] = useState<SystemStatusError | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const data = await fetchSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      console.error(t("stats.systemStatusError"), err);
      setError(
        err instanceof SystemStatusError
          ? err
          : new SystemStatusError(t("common.unknownError")),
      );
    }
  }, []);

  const {
    isAutoRefreshEnabled,
    isLoading,
    lastUpdate,
    toggleRefreshMode,
    manualRefresh,
    setIsLoading,
  } = useAutoRefresh({
    autoRefreshInterval,
    enabledByDefault: enableAutoRefresh,
    onRefresh: fetchData,
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusTextColor = (
    value: number,
    type: "cpu" | "ram" | "temperature",
  ) => {
    if (type === "temperature") {
      return value > 70
        ? "text-red-400"
        : value >= 60
          ? "text-orange-400"
          : "text-green-400";
    }
    return value > 80
      ? "text-red-400"
      : value >= 60
        ? "text-orange-400"
        : "text-green-400";
  };

  const getProgressColor = (
    value: number,
    type: "cpu" | "ram" | "temperature",
  ) => {
    if (type === "temperature") {
      return value > 70
        ? "bg-red-500"
        : value >= 60
          ? "bg-orange-500"
          : "bg-green-500";
    }
    if (type === "cpu") {
      return value > 80
        ? "bg-red-500"
        : value >= 60
          ? "bg-orange-500"
          : "bg-blue-500";
    }
    if (type === "ram") {
      return value > 80
        ? "bg-red-500"
        : value >= 60
          ? "bg-orange-500"
          : "bg-purple-500";
    }
    return "bg-blue-500";
  };

  const handleRetry = async () => {
    setIsLoading(true);
    await fetchData();
    setIsLoading(false);
  };

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 border-red-500/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
              {t("errors.systemError")}
            </div>

            {}
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">
                {isAutoRefreshEnabled
                  ? "Auto-refresh attivo"
                  : "Aggiornamento manuale"}
              </div>
              <button
                onClick={toggleRefreshMode}
                className="p-1 text-slate-400 hover:text-white transition-colors text-xs"
                title={
                  isAutoRefreshEnabled
                    ? "Disattiva auto-refresh"
                    : "Attiva auto-refresh"
                }
              >
                <RefreshCw
                  className={`h-3 w-3 ${isAutoRefreshEnabled ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t("errors.cannotRetriveSystemData")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-300">{error.message}</span>
              </div>
            </div>

            {!isAutoRefreshEnabled && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span>
                  {isLoading ? t("common.loading") : t("common.retry")}
                </span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !systemStatus) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-blue-400 animate-spin" />
            {t("common.loading")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Recupero dati del sistema in corso...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {}
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const services = systemStatus
    ? [
        {
          name: "Monitoraggio minacce",
          status: systemStatus.pythonScript,
          icon: Activity,
        },
        { name: "Fail2Ban", status: systemStatus.fail2ban, icon: Wifi },
        { name: "Nginx", status: systemStatus.nginx, icon: Server },
      ]
    : [];

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Server className="h-5 w-5 mr-2 text-green-400" />
            Stato Sistema
          </div>

          {}
          <div className="flex items-center gap-3">
            {}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw
                className={`w-3 h-3 ${
                  isAutoRefreshEnabled
                    ? "text-green-400 animate-spin"
                    : "text-blue-400"
                }`}
              />
              <span>
                {isAutoRefreshEnabled
                  ? `Auto (${autoRefreshInterval / 1000}s)`
                  : "Manuale"}
              </span>
            </div>

            {}
            <button
              onClick={toggleRefreshMode}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
              title={
                isAutoRefreshEnabled
                  ? "Passa a modalità manuale"
                  : "Attiva auto-refresh"
              }
            >
              {isAutoRefreshEnabled ? "Auto" : "Man"}
            </button>

            {}
            {!isAutoRefreshEnabled && (
              <button
                onClick={manualRefresh}
                disabled={isLoading}
                className="p-1 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                title="Aggiorna ora"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-slate-400 flex items-center justify-between">
          <span>Monitoraggio servizi critici</span>
          {lastUpdate && (
            <span className="text-xs">
              Ultimo controllo: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {systemStatus && (
          <div className="space-y-3">
            {}
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <service.icon className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-300">{service.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {service.status ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Attivo</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 text-sm">Errore</span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {}
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Cpu className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-300">Uso CPU</span>
                </div>
                <span
                  className={`text-sm ${getStatusTextColor(systemStatus.cpuUsage, "cpu")}`}
                >
                  {formatUsagePercentage(systemStatus.cpuUsage)}
                </span>
              </div>
              <Progress
                value={systemStatus.cpuUsage}
                max={100}
                indicatorClassName={getProgressColor(
                  systemStatus.cpuUsage,
                  "cpu",
                )}
              />
            </div>

            {}
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <MemoryStick className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-300">Uso RAM</span>
                </div>
                <span
                  className={`text-sm ${getStatusTextColor(systemStatus.ramUsage, "ram")}`}
                >
                  {formatUsagePercentage(systemStatus.ramUsage)}
                </span>
              </div>
              <Progress
                value={systemStatus.ramUsage}
                max={100}
                indicatorClassName={getProgressColor(
                  systemStatus.ramUsage,
                  "ram",
                )}
              />
            </div>

            {}
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Thermometer className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-300">Temperatura</span>
                </div>
                <span
                  className={`text-sm ${getStatusTextColor(systemStatus.temperature, "temperature")}`}
                >
                  {formatTemperature(systemStatus.temperature)}
                </span>
              </div>
              <Progress
                value={systemStatus.temperature}
                max={100}
                indicatorClassName={getProgressColor(
                  systemStatus.temperature,
                  "temperature",
                )}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
