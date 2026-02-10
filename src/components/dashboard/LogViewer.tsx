import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  FileText,
  RefreshCw,
  Download,
  Search,
  Play,
  Pause,
} from "lucide-react";
import { logService } from "@/utils/logsService";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { t } from "i18next";

interface LogLine {
  text: string;
  timestamp?: string;
}

export const LogViewer = () => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
  const [availableLogs, setAvailableLogs] = useState<string[]>([]);
  const [selectedLogType, setSelectedLogType] = useState<string>("npm_debug");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [lastTotal, setLastTotal] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const autoRefreshTimerRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  const PAGE_SIZE = 100;

  const scrollRef = useInfiniteScroll({
    onLoadMore: loadMoreLogs,
    hasMore: logs.length < total,
    isLoading: isLoadingInitial,
    loadingMore: isLoadingMore,
    offset: 100,
  });

  useEffect(() => {
    loadAvailableLogs();
  }, []);

  useEffect(() => {
    resetAndLoadLogs();
  }, [selectedLogType]);

  useEffect(() => {
    if (autoRefresh && !isLoadingInitial) {
      autoRefreshTimerRef.current = setInterval(() => {
        checkForNewLogs();
      }, refreshInterval);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, selectedLogType, total, isLoadingInitial]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.trim() === "") {
        setFilteredLogs(logs);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = logs.filter((log) =>
          log.text.toLowerCase().includes(query),
        );
        setFilteredLogs(filtered);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, logs]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      isUserScrollingRef.current = !isAtBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const loadAvailableLogs = async () => {
    setIsLoadingLogs(true);
    setError(null);
    try {
      const response = await logService.getAvailableLogs();
      const logsList = response.available_logs || [];
      if (logsList.length === 0) {
        setError(t("logViewer.noLogsAvailable"));
        setAvailableLogs(["npm_debug"]);
        setSelectedLogType("npm_debug");
      } else {
        setAvailableLogs(logsList);
        if (!logsList.includes(selectedLogType)) {
          setSelectedLogType(logsList[0]);
        }
      }
    } catch (error) {
      console.error("Errore caricamento lista log:", error);
      setError(
        "Impossibile caricare la lista dei log. Verifica la connessione.",
      );
      setAvailableLogs(["npm_debug"]);
      setSelectedLogType("npm_debug");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const resetAndLoadLogs = async () => {
    setIsLoadingInitial(true);
    setError(null);
    setLogs([]);
    setTotal(0);
    setLastTotal(0);
    setOffset(PAGE_SIZE);

    try {
      const response = await logService.getLogs(selectedLogType, PAGE_SIZE, 0);
      const newLogs = response.logs || [];
      setLogs(newLogs.map((text: string) => ({ text })));
      setTotal(response.total || 0);
      setLastTotal(response.total || 0);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Errore caricamento log:", error);
      setError("Errore nel caricamento dei log");
      setLogs([]);
    }
    setIsLoadingInitial(false);
  };

  async function loadMoreLogs() {
    if (isLoadingMore || offset >= total) return;

    setIsLoadingMore(true);
    try {
      const response = await logService.getLogs(
        selectedLogType,
        PAGE_SIZE,
        offset,
      );

      const newLogs = response.logs || [];
      setLogs((prev) => [
        ...prev,
        ...newLogs.map((text: string) => ({ text })),
      ]);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch (error) {
      console.error("Errore caricamento log:", error);
      setError("Errore nel caricamento dei log");
    }
    setIsLoadingMore(false);
  }

  const checkForNewLogs = async () => {
    try {
      const response = await logService.getLogs(selectedLogType, 1, 0);

      const currentTotal = response.total || 0;

      if (currentTotal > lastTotal) {
        const newLogsCount = currentTotal - lastTotal;
        console.log(`🔄 Rilevati ${newLogsCount} nuovi log`);

        const newLogsResponse = await logService.getLogs(
          selectedLogType,
          newLogsCount,
          0,
        );

        const newLogs = newLogsResponse.logs || [];
        setLogs((prev) => [
          ...newLogs.map((text: string) => ({ text })),
          ...prev,
        ]);
        setTotal(currentTotal);
        setLastTotal(currentTotal);

        if (!isUserScrollingRef.current) {
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error("Errore controllo nuovi log:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const exportLogs = () => {
    const csvContent = [
      ["Log Line"],
      ...logs.map((log) => [`"${log.text.replace(/"/g, '""')}"`]),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLogType}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  return (
    <div className="space-y-6 min-h-screen">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-400" />
                {t("logViewer.title")}
                {autoRefresh && (
                  <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center">
                    <span className="animate-pulse mr-1">●</span>{" "}
                    {t("logViewer.live")}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("logViewer.description", {
                  refreshInterval: refreshInterval / 1000,
                })}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {}
              <Button
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                className={
                  autoRefresh
                    ? "bg-green-600 hover:bg-green-700"
                    : "border-slate-600 text-slate-900"
                }
              >
                {autoRefresh ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    {t("logViewer.pause")}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t("logViewer.start")}
                  </>
                )}
              </Button>

              {}
              <Select
                value={refreshInterval.toString()}
                onValueChange={(val) => setRefreshInterval(parseInt(val))}
              >
                <SelectTrigger className="w-20 bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="1000" className="text-white">
                    {t("logViewer.intervals.1s")}
                  </SelectItem>
                  <SelectItem value="3000" className="text-white">
                    {t("logViewer.intervals.3s")}
                  </SelectItem>
                  <SelectItem value="5000" className="text-white">
                    {t("logViewer.intervals.5s")}
                  </SelectItem>
                  <SelectItem value="10000" className="text-white">
                    {t("logViewer.intervals.10s")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedLogType}
                onValueChange={(val) => {
                  setSelectedLogType(val);
                  setSearchQuery("");
                }}
                disabled={isLoadingLogs || availableLogs.length === 0}
              >
                <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-white hover:bg-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue
                    placeholder={
                      isLoadingLogs ? "Caricamento..." : "Seleziona tipo log"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {availableLogs.length === 0 ? (
                    <div className="text-slate-400 text-sm p-2">
                      {t("logViewer.noLogsAvailable")}
                    </div>
                  ) : (
                    availableLogs.map((logType) => (
                      <SelectItem
                        key={logType}
                        value={logType}
                        className="text-white hover:bg-slate-700"
                      >
                        {logType}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={resetAndLoadLogs}
                variant="outline"
                size="sm"
                disabled={isLoadingInitial || isLoadingLogs}
                className="border-slate-600 text-slate-900"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoadingInitial ? "animate-spin" : ""}`}
                />
                {t("common.refresh")}
              </Button>
              <Button
                onClick={exportLogs}
                variant="outline"
                size="sm"
                disabled={logs.length === 0}
                className="border-slate-600 text-slate-900"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("logViewer.exportCSV")}
              </Button>
            </div>
          </div>

          {}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {}
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-slate-500" />
            <Input
              type="text"
              placeholder="Ricerca nei log..."
              value={searchQuery}
              onChange={handleSearch}
              className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            {searchQuery && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                }}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-900"
              >
                {t("common.clear")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-4 ">
              <span>
                {searchQuery.trim() ? (
                  <>
                    {t("common.found", {
                      count: filteredLogs.length,
                      total: logs.length,
                    })}
                  </>
                ) : (
                  <>
                    {t("logViewer.displayed")} {logs.length}{" "}
                    {t("logViewer.logsOf")} {total} {t("common.total")}
                  </>
                )}
              </span>
            </div>

            {}
            <div
              ref={(el) => {
                scrollContainerRef.current = el;
                if (scrollRef) {
                  (scrollRef as any).current = el;
                }
              }}
              className="h-[700px] overflow-y-auto space-y-1 bg-slate-900/30 p-4 rounded-lg border border-slate-700"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  {isLoadingInitial
                    ? "Caricamento log..."
                    : searchQuery.trim()
                      ? "Nessun risultato trovato"
                      : "Nessun log trovato"}
                </div>
              ) : (
                <>
                  {filteredLogs.map((log, index) => (
                    <div
                      key={`${selectedLogType}-${index}`}
                      className="p-2 bg-slate-800/50 rounded text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors border-l-2 border-blue-500/30 hover:border-blue-500"
                    >
                      {log.text}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
