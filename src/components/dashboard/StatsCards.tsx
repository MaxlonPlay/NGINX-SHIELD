import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  RefreshCw,
} from "lucide-react";
import { authService } from "../../utils/apiService";
import { WhitelistEntry } from "@/utils/apiEndpoints";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { fetchBanCounts } from "@/utils/banManager";
import { t } from "i18next";

interface StatsCardsProps {
  refreshKey: number;
  autoRefreshInterval?: number;
}

interface WhitelistResponse {
  success: boolean;
  entries: WhitelistEntry[];
  total: number;
  timestamp: string;
}

export const StatsCards = ({
  refreshKey,
  autoRefreshInterval = 1000,
}: StatsCardsProps) => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    blockedRequests: 0,
    whitelistTotalEntries: 0,
    whitelistIPs: 0,
    whitelistCIDRs: 0,
    whitelistDomains: 0,
    activeThreats: 0,
    bannedIPs: 0,
    last24hRequests: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const whitelistStatsResponse = await authService.getWhitelistStats();

      let totalWhitelistEntries = 0;
      let ipEntries = 0;
      let cidrEntries = 0;
      let domainEntries = 0;

      if (whitelistStatsResponse && whitelistStatsResponse.stats) {
        const stats = whitelistStatsResponse.stats;
        totalWhitelistEntries = stats.total_entries || 0;
        ipEntries = stats.by_type?.ip || 0;
        cidrEntries = stats.by_type?.cidr || 0;
        domainEntries = stats.by_type?.domain || 0;
      }

      let bannedIPsCount = 0;
      try {
        const banCountsResponse = await fetchBanCounts();
        if (banCountsResponse) {
          bannedIPsCount = banCountsResponse.total || 0;
        }
      } catch (err) {
        console.warn("Errore caricamento conteggi ban:", err);
      }

      const newStats = {
        totalRequests: 0,
        blockedRequests: 0,
        whitelistTotalEntries: totalWhitelistEntries,
        whitelistIPs: ipEntries,
        whitelistCIDRs: cidrEntries,
        whitelistDomains: domainEntries,
        activeThreats: 0,
        bannedIPs: bannedIPsCount,
        last24hRequests: 0,
      };

      setStats(newStats);
    } catch (error) {
      console.error("Errore caricamento statistiche:", error);
    }
  }, []);

  const {
    isAutoRefreshEnabled,
    isLoading,
    lastUpdate,
    toggleRefreshMode,
    manualRefresh,
    refreshControls,
  } = useAutoRefresh({
    autoRefreshInterval,
    enabledByDefault: false,
    onRefresh: loadStats,
  });

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [refreshKey, loadStats]);

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-center justify-between text-sm text-slate-400">
        {refreshControls}
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {t("stats.totalRequests")}
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400">
              {stats.last24hRequests} {t("stats.last24h")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {t("stats.blockedRequests")}
            </CardTitle>
            <Shield className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {stats.blockedRequests.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400">
              {stats.totalRequests > 0
                ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(
                    1,
                  )
                : 0}
              {t("stats.percentageTotal")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {t("stats.bannedIPs")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {stats.bannedIPs}
            </div>
            <p className="text-xs text-slate-400">
              {t("stats.automaticAndManual")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {t("stats.whitelist")}
            </CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {stats.whitelistTotalEntries}
            </div>
            <p className="text-xs text-slate-400">
              {t("stats.totalAuthorized")}
            </p>
            <div className="text-xs text-slate-400 mt-2">
              <span className="font-semibold text-green-300">
                {t("common.ip")}:
              </span>{" "}
              {stats.whitelistIPs} &bull;{" "}
              <span className="font-semibold text-blue-300">
                {t("common.cidr")}:
              </span>{" "}
              {stats.whitelistCIDRs} &bull;{" "}
              <span className="font-semibold text-purple-300">
                {t("common.domain")}:
              </span>{" "}
              {stats.whitelistDomains}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
