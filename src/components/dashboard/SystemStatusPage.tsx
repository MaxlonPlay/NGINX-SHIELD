import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RebootingScreen } from "@/pages/RebootingScreen";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Server,
  Cpu,
  MemoryStick,
  Thermometer,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Activity,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchSystemStatus,
  fetchSystemHistory,
  SystemStatusData,
  SystemStatusHistory,
  SystemStatusDataPoint,
  SystemStatusError,
  formatUsagePercentage,
  formatTemperature,
} from "@/utils/systemStatusService";
import { authService } from "@/utils/apiService";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "orange" | "red" | "green";
  isLoading?: boolean;
  chartData?: any[];
  dataKey?: string;
}

const MetricCard = ({
  title,
  value,
  unit,
  icon,
  color,
  isLoading,
  chartData,
  dataKey,
}: MetricCardProps) => {
  const colorClasses = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    red: "text-red-400",
    green: "text-green-400",
  };

  const chartColors = {
    blue: { line: "#93c5fd", area: "#3b82f6" },
    purple: { line: "#d8b4fe", area: "#a855f7" },
    orange: { line: "#fed7aa", area: "#f97316" },
    red: { line: "#fca5a5", area: "#ef4444" },
    green: { line: "#86efac", area: "#22c55e" },
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
      {}
      {chartData && chartData.length > 0 && dataKey && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`gradient-${color}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartColors[color].area}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartColors[color].area}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <YAxis domain={[0, 100]} hide />
              <Area
                type="monotone"
                dataKey={dataKey}
                fill={`url(#gradient-${color})`}
                stroke={chartColors[color].line}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {}
      <CardContent className="pt-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-2">{title}</p>
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${colorClasses[color]}`}>
                  {value}
                </span>
                <span className="text-slate-400 text-sm">{unit}</span>
              </div>
            )}
          </div>
          <div className={`${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PeriodSelectorProps {
  selectedPeriod: number;
  onPeriodChange: (hours: number) => void;
  isLoading?: boolean;
}

const PeriodSelector = ({
  selectedPeriod,
  onPeriodChange,
  isLoading,
}: PeriodSelectorProps) => {
  const { t } = useTranslation();
  const periods = [
    { label: t("systemStatus.periods.lastHour"), value: 1 },
    { label: t("systemStatus.periods.last6h"), value: 6 },
    { label: t("systemStatus.periods.last12h"), value: 12 },
    { label: t("systemStatus.periods.last24h"), value: 24 },
    { label: t("systemStatus.periods.last7d"), value: 24 * 7 },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {periods.map((period) => (
        <Button
          key={period.value}
          onClick={() => onPeriodChange(period.value)}
          variant={selectedPeriod === period.value ? "default" : "outline"}
          size="sm"
          disabled={isLoading}
          className={
            selectedPeriod === period.value
              ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              : "bg-slate-700/60 border-slate-500 text-slate-50 hover:bg-slate-600 hover:text-white font-medium"
          }
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
};

export const SystemStatusPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(
    null,
  );
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  const [historyData, setHistoryData] = useState<SystemStatusHistory | null>(
    null,
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  const [restartingServices, setRestartingServices] = useState<Set<string>>(
    new Set(),
  );
  const [pendingRestarts, setPendingRestarts] = useState<string[]>([]);
  const [confirmBackendRestart, setConfirmBackendRestart] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRestartService = useCallback(async (serviceName: string) => {
    if (serviceName === "backend") {
      setConfirmBackendRestart(true);
      return;
    }

    await performRestart(serviceName);
  }, []);

  const performRestart = useCallback(
    async (serviceName: string) => {
      try {
        setRestartingServices((prev) => new Set([...prev, serviceName]));

        const response = await authService.restartService(serviceName);

        if (response.data.success || response.success) {
          toast({
            title: t("systemStatus.restart.restartRequested"),
            description: t("systemStatus.restart.restartingDesc", {
              service: serviceName,
            }),
            variant: "default",
          });

          if (serviceName === "backend") {
            setIsRebooting(true);
            return;
          }

          setPendingRestarts((prev) => [...new Set([...prev, serviceName])]);
        }
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          t("systemStatus.errors.restartErrorDesc");
        toast({
          title: t("systemStatus.errors.restartError"),
          description: message,
          variant: "destructive",
        });
      } finally {
        setRestartingServices((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serviceName);
          return newSet;
        });
      }
    },
    [toast, navigate],
  );

  useEffect(() => {
    if (pendingRestarts.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const response = await authService.getPendingRestarts();
        const pending = response.data?.data?.pending_restarts || [];
        setPendingRestarts(pending);

        if (pending.length === 0) {
          toast({
            title: t("systemStatus.restart.restarted"),
            description: t("systemStatus.restart.restartedDesc"),
            variant: "default",
          });
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [pendingRestarts.length, toast]);

  const fetchRealtimeData = useCallback(async () => {
    try {
      setRealtimeLoading(true);
      setError(null);
      const data = await fetchSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      const message =
        err instanceof SystemStatusError
          ? err.message
          : t("systemStatus.errors.unknown");
      setError(message);
      toast({
        title: t("systemStatus.errors.title"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setRealtimeLoading(false);
    }
  }, [toast]);

  const fetchHistoricalData = useCallback(
    async (hours: number) => {
      try {
        setHistoryLoading(true);
        setError(null);
        const data = await fetchSystemHistory(hours);
        setHistoryData(data);
      } catch (err) {
        const message =
          err instanceof SystemStatusError
            ? err.message
            : t("systemStatus.errors.unknown");
        setError(message);
        toast({
          title: t("systemStatus.errors.title"),
          description: message,
          variant: "destructive",
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchRealtimeData();
    fetchHistoricalData(selectedPeriod);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRealtimeData, 5000);
    return () => clearInterval(interval);
  }, [fetchRealtimeData]);

  const handlePeriodChange = (hours: number) => {
    setSelectedPeriod(hours);
    fetchHistoricalData(hours);
  };

  const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded p-3">
          <p className="text-slate-300 text-sm">
            {new Date(data.timestamp).toLocaleString("it-IT")}
          </p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }} className="text-sm">
              {entry.name}:{" "}
              {typeof entry.value === "number"
                ? entry.value.toFixed(1)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {}
      {isRebooting && <RebootingScreen />}

      {!isRebooting && (
        <div className="w-full space-y-6">
          {}
          <Dialog
            open={confirmBackendRestart}
            onOpenChange={setConfirmBackendRestart}
          >
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                  {t("systemStatus.restart.confirmTitle")}
                </DialogTitle>
                <DialogDescription className="text-slate-300 space-y-3 mt-4">
                  <p>
                    <strong>{t("systemStatus.restart.warning")}</strong>{" "}
                    {t("systemStatus.restart.backendDesc")}
                  </p>
                  <p>{t("systemStatus.restart.stopProcessing")}</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                    <li>{t("systemStatus.restart.consequences.logout")}</li>
                    <li>{t("systemStatus.restart.consequences.relogin")}</li>
                    <li>{t("systemStatus.restart.consequences.dataLoss")}</li>
                  </ul>
                  <p className="font-semibold text-slate-300">
                    {t("systemStatus.restart.confirm")}
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  onClick={() => setConfirmBackendRestart(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  {t("systemStatus.restart.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    setConfirmBackendRestart(false);
                    performRestart("backend");
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {t("systemStatus.restart.confirmBackend")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="h-6 w-6 text-green-400" />
                {t("systemStatus.realtimeStatus")}
              </h2>
              <Button
                onClick={fetchRealtimeData}
                disabled={realtimeLoading}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${realtimeLoading ? "animate-spin" : ""}`}
                />
                {t("systemStatus.update")}
              </Button>
            </div>

            {error && (
              <Card className="bg-red-900/20 border-red-500/50 mb-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title={t("systemStatus.metrics.cpu")}
                value={
                  systemStatus
                    ? formatUsagePercentage(systemStatus.cpuUsage)
                    : "-"
                }
                unit="%"
                icon={<Cpu className="h-8 w-8" />}
                color="blue"
                isLoading={realtimeLoading && !systemStatus}
                chartData={historyData?.data_points.slice(-20)}
                dataKey="cpuUsage"
              />
              <MetricCard
                title={t("systemStatus.metrics.ram")}
                value={
                  systemStatus
                    ? formatUsagePercentage(systemStatus.ramUsage)
                    : "-"
                }
                unit="%"
                icon={<MemoryStick className="h-8 w-8" />}
                color="purple"
                isLoading={realtimeLoading && !systemStatus}
                chartData={historyData?.data_points.slice(-20)}
                dataKey="ramUsage"
              />
              <MetricCard
                title={t("systemStatus.metrics.temperature")}
                value={
                  systemStatus
                    ? formatTemperature(systemStatus.temperature)
                    : "-"
                }
                unit="°C"
                icon={<Thermometer className="h-8 w-8" />}
                color="orange"
                isLoading={realtimeLoading && !systemStatus}
                chartData={historyData?.data_points.slice(-20)}
                dataKey="temperature"
              />
              <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden md:col-span-2 lg:col-span-1">
                <CardContent className="pt-6">
                  <h3 className="text-slate-300 font-semibold mb-4 text-sm">
                    {t("systemStatus.overview.title")}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 mb-2">
                        {t("systemStatus.overview.servicesLabel")}
                      </p>
                      <div className="space-y-1 ml-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.services.threatMonitoring")}
                          </span>
                          <div className="flex items-center gap-1">
                            {systemStatus?.pythonScript ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-green-400 text-xs">
                                  {t("systemStatus.services.active")}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-red-400 text-xs">
                                  {t("systemStatus.services.error")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.services.fail2ban")}
                          </span>
                          <div className="flex items-center gap-1">
                            {systemStatus?.fail2ban ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-green-400 text-xs">
                                  {t("systemStatus.services.active")}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-red-400 text-xs">
                                  {t("systemStatus.services.error")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.services.nginx")}
                          </span>
                          <div className="flex items-center gap-1">
                            {systemStatus?.nginx ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-green-400 text-xs">
                                  {t("systemStatus.services.active")}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-red-400 text-xs">
                                  {t("systemStatus.services.error")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-3">
                      <p className="text-slate-400 mb-2">
                        {t("systemStatus.overview.metricsLabel")}
                      </p>
                      <div className="space-y-1 ml-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.overview.cpuLabel")}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-xs font-semibold ${
                                systemStatus && systemStatus.cpuUsage > 70
                                  ? "text-orange-400"
                                  : "text-green-400"
                              }`}
                            >
                              {formatUsagePercentage(
                                systemStatus?.cpuUsage || 0,
                              )}
                            </span>
                            {systemStatus && systemStatus.cpuUsage > 70 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.overview.ramLabel")}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-xs font-semibold ${
                                systemStatus && systemStatus.ramUsage > 70
                                  ? "text-orange-400"
                                  : "text-green-400"
                              }`}
                            >
                              {formatUsagePercentage(
                                systemStatus?.ramUsage || 0,
                              )}
                            </span>
                            {systemStatus && systemStatus.ramUsage > 70 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            {t("systemStatus.overview.tempLabel")}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-xs font-semibold ${
                                systemStatus && systemStatus.temperature > 80
                                  ? "text-red-400"
                                  : systemStatus &&
                                      systemStatus.temperature >= 60
                                    ? "text-orange-400"
                                    : "text-green-400"
                              }`}
                            >
                              {formatTemperature(
                                systemStatus?.temperature || 0,
                              )}
                            </span>
                            {systemStatus && systemStatus.temperature > 80 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                            ) : systemStatus &&
                              systemStatus.temperature >= 60 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-blue-400" />
                {t("systemStatus.services.title")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {t("systemStatus.services.backend")}
                      </h3>
                      <div className="flex items-center gap-2">
                        {systemStatus?.pythonScript ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t("systemStatus.serviceDescriptions.backend")}
                    </p>
                    <Button
                      onClick={() => handleRestartService("backend")}
                      disabled={
                        restartingServices.has("backend") ||
                        pendingRestarts.includes("backend")
                      }
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 mr-2 ${restartingServices.has("backend") ? "animate-spin" : ""}`}
                      />
                      {pendingRestarts.includes("backend")
                        ? t("systemStatus.restart.restarting")
                        : t("systemStatus.restart.button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {t("systemStatus.services.frontend")}
                      </h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t("systemStatus.serviceDescriptions.frontend")}
                    </p>
                    <Button
                      onClick={() => handleRestartService("frontend")}
                      disabled={
                        restartingServices.has("frontend") ||
                        pendingRestarts.includes("frontend")
                      }
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 mr-2 ${restartingServices.has("frontend") ? "animate-spin" : ""}`}
                      />
                      {pendingRestarts.includes("frontend")
                        ? t("systemStatus.restart.restarting")
                        : t("systemStatus.restart.button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {t("systemStatus.services.analyzer")}
                      </h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t("systemStatus.serviceDescriptions.analyzer")}
                    </p>
                    <Button
                      onClick={() => handleRestartService("analyzer")}
                      disabled={
                        restartingServices.has("analyzer") ||
                        pendingRestarts.includes("analyzer")
                      }
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 mr-2 ${restartingServices.has("analyzer") ? "animate-spin" : ""}`}
                      />
                      {pendingRestarts.includes("analyzer")
                        ? t("systemStatus.restart.restarting")
                        : t("systemStatus.restart.button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {t("systemStatus.services.geolocate")}
                      </h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t("systemStatus.serviceDescriptions.geolocate")}
                    </p>
                    <Button
                      onClick={() => handleRestartService("geolocate")}
                      disabled={
                        restartingServices.has("geolocate") ||
                        pendingRestarts.includes("geolocate")
                      }
                      size="sm"
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 mr-2 ${restartingServices.has("geolocate") ? "animate-spin" : ""}`}
                      />
                      {pendingRestarts.includes("geolocate")
                        ? t("systemStatus.restart.restarting")
                        : t("systemStatus.restart.button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Server className="h-6 w-6 text-blue-400" />
                {t("systemStatus.history.title")}
              </h2>
            </div>

            <Card className="bg-slate-800/50 border-slate-700 mb-4">
              <CardContent className="pt-6">
                <PeriodSelector
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={handlePeriodChange}
                  isLoading={historyLoading}
                />
              </CardContent>
            </Card>

            {historyLoading ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6 flex items-center justify-center h-96">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    <p className="text-slate-400">
                      {t("systemStatus.history.loading")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : historyData && historyData.data_points.length > 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    {t("systemStatus.history.systemHistoryTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={historyData.data_points}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                      />
                      <YAxis
                        stroke="#94a3b8"
                        label={{
                          value: "%",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                      <Line
                        type="monotone"
                        dataKey="cpuUsage"
                        stroke="#3b82f6"
                        name={t("systemStatus.history.chartLabels.cpu")}
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="ramUsage"
                        stroke="#a855f7"
                        name={t("systemStatus.history.chartLabels.ram")}
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f97316"
                        name={t("systemStatus.history.chartLabels.temperature")}
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>{t("systemStatus.history.noData")}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
};
