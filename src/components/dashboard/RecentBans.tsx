import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Clock,
  Trash2,
  Server,
  Flag,
  Code,
  Network,
  User,
  Building,
  Loader2,
  Check,
  X,
  Filter,
  XCircle,
} from "lucide-react";
import { fetchBans, unbanIP } from "@/utils/banManager";
import { t } from "i18next";

interface BanEntry {
  ip: string;
  reason: string;
  timestamp: string;
  type: "automatic" | "manual";
  httpCode?: number;
  domain?: string;
  urlPath?: string;
  userAgent?: string;
  network?: string;
  organization?: string;
  country?: string;
  asn?: string;
}

const getTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Pochi istanti fa";
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;
  return new Date(timestamp).toLocaleDateString("it-IT");
};

interface RecentBansProps {
  onFilterClick?: (query: string) => void;
}

export const RecentBans = ({ onFilterClick }: RecentBansProps) => {
  const [recentBans, setRecentBans] = useState<BanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingUnban, setConfirmingUnban] = useState<{
    ip: string;
    type: "automatic" | "manual";
  } | null>(null);
  const [unbanning, setUnbanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRecentBans = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { automaticBans } = await fetchBans(50, 0, 0, searchQuery);

      const sortedBans = automaticBans.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setRecentBans(sortedBans);
    } catch (err) {
      console.error("Errore nel caricamento dei ban recenti:", err);
      setError(
        err instanceof Error ? err.message : "Errore durante il caricamento",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentBans();

    const interval = setInterval(loadRecentBans, 30000);

    return () => clearInterval(interval);
  }, [searchQuery]);

  const handleTagClick = (value: string) => {
    let filterValue = value;
    if (value.includes(":")) {
      filterValue = value.split(":").pop()?.trim() || value;
    }

    if (onFilterClick) {
      onFilterClick(filterValue);
    } else {
      setSearchQuery(filterValue);
    }
  };

  const handleUnbanRequest = (ip: string, type: "automatic" | "manual") => {
    setConfirmingUnban({ ip, type });
  };

  const performUnban = async (ip: string, type: "automatic" | "manual") => {
    setUnbanning(true);

    try {
      await unbanIP(ip, type);

      setRecentBans((prev) => prev.filter((ban) => ban.ip !== ip));
      setConfirmingUnban(null);

      setTimeout(loadRecentBans, 1000);
    } catch (err) {
      console.error("Errore durante lo sblocco:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Errore durante lo sblocco dell'IP",
      );
    } finally {
      setUnbanning(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <CardTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-400" />
              {t("recentBans.title")}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("recentBans.description")}
            </CardDescription>
          </div>

          {}
          {searchQuery && (
            <div className="flex items-center space-x-2 bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-2">
              <Filter className="h-4 w-4 text-blue-400" />
              <span
                className="text-blue-300 text-sm font-mono max-w-[200px] truncate"
                title={searchQuery}
              >
                {searchQuery}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/50 h-6 w-6 p-0 ml-1"
                title="Rimuovi filtro"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="space-y-2 max-h-[400px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {isLoading ? (
            <div className="text-center text-slate-400 py-8 flex items-center justify-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" /> Caricamento...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-4">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
              {error}
              <Button
                onClick={loadRecentBans}
                variant="ghost"
                size="sm"
                className="mt-2 text-slate-400 hover:text-slate-300"
              >
                Riprova
              </Button>
            </div>
          ) : recentBans.length === 0 ? (
            <div className="text-center text-slate-400 py-4">
              {searchQuery ? (
                <>
                  <Filter className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                  {t("recentBans.noResults")}"{searchQuery}"
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-slate-400 hover:text-slate-300 block mx-auto"
                  >
                    {t("recentBans.removeFilter")}
                  </Button>
                </>
              ) : (
                <>{t("recentBans.noBans")}</>
              )}
            </div>
          ) : (
            recentBans.map((ban, index) => {
              const isConfirming =
                confirmingUnban?.ip === ban.ip &&
                confirmingUnban?.type === ban.type;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-900/50 rounded hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center space-x-2 flex-grow min-w-0">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                      {}
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className="text-white font-mono text-xs font-semibold cursor-pointer hover:text-blue-300 transition-colors"
                          onClick={() => handleTagClick(ban.ip)}
                          title="Clicca per filtrare per questo IP"
                        >
                          {ban.ip}
                        </span>
                        <span className="flex items-center space-x-1 text-slate-500 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{getTimeAgo(ban.timestamp)}</span>
                        </span>
                      </div>

                      {}
                      <p
                        className="text-slate-400 text-xs truncate mb-1 cursor-pointer hover:text-slate-300 transition-colors"
                        onClick={() => handleTagClick(ban.reason)}
                        title={`Clicca per filtrare: ${ban.reason}`}
                      >
                        {ban.reason}
                      </p>

                      {}
                      <div className="flex flex-wrap items-center text-slate-500 text-xs gap-x-2 gap-y-0.5">
                        {ban.httpCode && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() =>
                              handleTagClick(ban.httpCode!.toString())
                            }
                            title="Clicca per filtrare per questo codice HTTP"
                          >
                            <Code className="h-2.5 w-2.5" />
                            <span>{ban.httpCode}</span>
                          </span>
                        )}
                        {ban.domain && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.domain!)}
                            title="Clicca per filtrare per questo dominio"
                          >
                            <Server className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[100px]">
                              {ban.domain}
                            </span>
                          </span>
                        )}
                        {ban.urlPath && (
                          <span
                            className="flex items-center space-x-1 truncate max-w-[120px] cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.urlPath!)}
                            title={`Clicca per filtrare: ${ban.urlPath}`}
                          >
                            <span>Path: {ban.urlPath}</span>
                          </span>
                        )}
                        {ban.userAgent && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.userAgent!)}
                            title={`Clicca per filtrare: ${ban.userAgent}`}
                          >
                            <User className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[100px]">
                              {ban.userAgent}
                            </span>
                          </span>
                        )}
                        {ban.network && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.network!)}
                            title="Clicca per filtrare per questo network"
                          >
                            <Network className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[100px]">
                              {ban.network}
                            </span>
                          </span>
                        )}
                        {ban.asn && (
                          <span
                            className="flex items-center space-x-1 truncate max-w-[100px] cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.asn!)}
                            title={`Clicca per filtrare: ${ban.asn}`}
                          >
                            <span>ASN: {ban.asn}</span>
                          </span>
                        )}
                        {ban.organization && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.organization!)}
                            title={`Clicca per filtrare: ${ban.organization}`}
                          >
                            <Building className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[120px]">
                              {ban.organization}
                            </span>
                          </span>
                        )}
                        {ban.country && (
                          <span
                            className="flex items-center space-x-1 cursor-pointer hover:text-slate-300 transition-colors"
                            onClick={() => handleTagClick(ban.country!)}
                            title="Clicca per filtrare per questo paese"
                          >
                            <Flag className="h-2.5 w-2.5" />
                            <span>{ban.country}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    {isConfirming ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => performUnban(ban.ip, ban.type)}
                          disabled={unbanning}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0"
                          title="Conferma sblocco"
                        >
                          {unbanning ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingUnban(null)}
                          disabled={unbanning}
                          className="text-slate-400 hover:text-slate-300 h-7 w-7 p-0"
                          title="Annulla"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnbanRequest(ban.ip, ban.type)}
                        disabled={unbanning}
                        className="text-green-400 hover:text-green-300 hover:bg-green-900/20 h-7 w-7 p-0"
                        title="Sblocca IP"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
