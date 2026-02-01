import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBans,
  unbanIP,
  fetchTotalAutomaticBansCount,
  fetchTotalManualBansCount,
  banCIDR,
  banMultipleCIDRs,
  formatApiError,
} from "@/utils/banManager";
import ManualBanForm from "./ip-management/ManualBanForm";
import SearchAndFilter from "./ip-management/SearchAndFilter";
import AutomaticBansList from "./ip-management/AutomaticBansList";
import ManualBansList from "./ip-management/ManualBansList";
import { BanEntry } from "./ip-management/types";
import { createCIDRBanReason } from "./ip-management/banUtils";

export const IPManagement = () => {
  const [automaticBans, setAutomaticBans] = useState<BanEntry[]>([]);
  const [manualBans, setManualBans] = useState<BanEntry[]>([]);
  const [filteredAutomaticBans, setFilteredAutomaticBans] = useState<
    BanEntry[]
  >([]);
  const [filteredManualBans, setFilteredManualBans] = useState<BanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMoreAutomatic, setLoadingMoreAutomatic] = useState(false);
  const [loadingMoreManual, setLoadingMoreManual] = useState(false);
  const [confirmingUnban, setConfirmingUnban] = useState<{
    ip: string;
    type: "automatic" | "manual";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { toast } = useToast();

  const [limit] = useState(100);
  const [automaticOffset, setAutomaticOffset] = useState(0);
  const [manualOffset, setManualOffset] = useState(0);
  const [hasMoreAutomatic, setHasMoreAutomatic] = useState(true);
  const [hasMoreManual, setHasMoreManual] = useState(true);
  const [totalAutomaticBansCount, setTotalAutomaticBansCount] =
    useState<number>(0);
  const [totalManualBansCount, setTotalManualBansCount] = useState<number>(0);

  useEffect(() => {
    const filterBans = () => {
      const allFilters = [...activeFilters];

      if (searchQuery.trim()) {
        allFilters.push(searchQuery.trim());
      }

      if (allFilters.length === 0) {
        setFilteredAutomaticBans(automaticBans);
        setFilteredManualBans(manualBans);
        return;
      }

      const filtered = (bans: BanEntry[]) =>
        bans.filter((ban) => {
          return allFilters.every((filter) => {
            const query = filter.toLowerCase();
            return (
              ban.ip.toLowerCase().includes(query) ||
              ban.reason?.toLowerCase().includes(query) ||
              false ||
              ban.domain?.toLowerCase().includes(query) ||
              false ||
              ban.urlPath?.toLowerCase().includes(query) ||
              false ||
              ban.userAgent?.toLowerCase().includes(query) ||
              false ||
              ban.network?.toLowerCase().includes(query) ||
              false ||
              ban.asn?.toLowerCase().includes(query) ||
              false ||
              ban.organization?.toLowerCase().includes(query) ||
              false ||
              ban.country?.toLowerCase().includes(query) ||
              false
            );
          });
        });

      setFilteredAutomaticBans(filtered(automaticBans));
      setFilteredManualBans(filtered(manualBans));
    };

    filterBans();
  }, [activeFilters, searchQuery, automaticBans, manualBans]);

  const loadTotalAutomaticBansCount = useCallback(async () => {
    try {
      const count = await fetchTotalAutomaticBansCount();
      setTotalAutomaticBansCount(count);
    } catch (error) {
      console.error(
        "Errore nel caricamento del conteggio totale dei ban automatici:",
        error,
      );
    }
  }, []);

  const loadTotalManualBansCount = useCallback(async () => {
    try {
      const count = await fetchTotalManualBansCount();
      setTotalManualBansCount(count);
    } catch (error) {
      console.error(
        "Errore nel caricamento del conteggio totale dei ban manuali:",
        error,
      );
    }
  }, []);

  const loadBannedIPs = useCallback(async () => {
    setIsLoading(true);
    console.log("DEBUG: Caricamento ban iniziale");

    try {
      const { automaticBans: newAutomaticBans, manualBans: newManualBans } =
        await fetchBans(limit, 0, 0, "");

      setAutomaticBans(newAutomaticBans);
      setManualBans(newManualBans);
      setFilteredAutomaticBans(newAutomaticBans);
      setFilteredManualBans(newManualBans);

      setAutomaticOffset(limit);
      setManualOffset(limit);

      setHasMoreAutomatic(newAutomaticBans.length === limit);
      setHasMoreManual(newManualBans.length === limit);
    } catch (error) {
      console.error("DEBUG: Errore caricamento IP bannati:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la lista IP bannati",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit, toast]);

  useEffect(() => {
    console.log("DEBUG: useEffect triggerato al mount. Carico dati iniziali");
    loadBannedIPs();
    loadTotalAutomaticBansCount();
    loadTotalManualBansCount();
  }, []);

  const performUnban = async (ip: string, type: "automatic" | "manual") => {
    setIsLoading(true);
    console.log("DEBUG: isLoading impostato a TRUE per unban");
    try {
      await unbanIP(ip, type);

      toast({
        title: "IP Sbloccato",
        description: `${ip} è stato rimosso dai ban`,
      });

      if (type === "automatic") {
        setAutomaticBans((prev) => prev.filter((ban) => ban.ip !== ip));
        loadTotalAutomaticBansCount();
      } else {
        setManualBans((prev) => prev.filter((ban) => ban.ip !== ip));
        loadTotalManualBansCount();
      }
    } catch (error) {
      console.error("DEBUG: Errore unban IP:", error);
      toast({
        title: "Errore",
        description: "Errore durante lo sblocco dell'IP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setConfirmingUnban(null);
      console.log("DEBUG: isLoading impostato a FALSE dopo unban");
    }
  };

  const handleUnbanIPRequest = (ip: string, type: "automatic" | "manual") => {
    setConfirmingUnban({ ip, type });
  };

  const handleFilterClick = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const handleRemoveFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
  };

  const handleLoadMoreAutomatic = async () => {
    if (loadingMoreAutomatic || !hasMoreAutomatic) return;

    setLoadingMoreAutomatic(true);
    console.log(
      `DEBUG: Caricamento altri ban automatici, offset: ${automaticOffset}`,
    );

    try {
      const { automaticBans: newAutomaticBans } = await fetchBans(
        limit,
        automaticOffset,
        0,
        "",
      );

      if (newAutomaticBans.length > 0) {
        setAutomaticBans((prev) => [...prev, ...newAutomaticBans]);
        setAutomaticOffset((prev) => prev + limit);
        setHasMoreAutomatic(newAutomaticBans.length === limit);
      } else {
        setHasMoreAutomatic(false);
      }
    } catch (error) {
      console.error("DEBUG: Errore caricamento altri ban automatici:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare altri ban automatici",
        variant: "destructive",
      });
    } finally {
      setLoadingMoreAutomatic(false);
    }
  };

  const handleLoadMoreManual = async () => {
    if (loadingMoreManual || !hasMoreManual) return;

    setLoadingMoreManual(true);
    console.log(
      `DEBUG: Caricamento altri ban manuali, offset: ${manualOffset}`,
    );

    try {
      const { manualBans: newManualBans } = await fetchBans(
        limit,
        0,
        manualOffset,
        "",
      );

      if (newManualBans.length > 0) {
        setManualBans((prev) => [...prev, ...newManualBans]);
        setManualOffset((prev) => prev + limit);
        setHasMoreManual(newManualBans.length === limit);
      } else {
        setHasMoreManual(false);
      }
    } catch (error) {
      console.error("DEBUG: Errore caricamento altri ban manuali:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare altri ban manuali",
        variant: "destructive",
      });
    } finally {
      setLoadingMoreManual(false);
    }
  };

  const handleBanCIDR = async (cidr: string, reason: string) => {
    setIsLoading(true);
    try {
      const result = await banCIDR(cidr, reason);

      toast({
        title: "CIDR Bannato",
        description: `La rete ${cidr} è stata bannata correttamente`,
      });

      if (result.warning) {
        toast({
          title: "⚠️ Avviso",
          description: result.warning,
          variant: "default",
        });
      }

      await Promise.all([
        loadBannedIPs(),
        loadTotalAutomaticBansCount(),
        loadTotalManualBansCount(),
      ]);
    } catch (error) {
      console.error("Errore ban CIDR:", error);
      const errorResult = formatApiError(error);

      let errorTitle = "Errore nel Ban del CIDR";
      let errorDescription = errorResult.message;

      if (errorResult.message.includes("fail2ban")) {
        errorTitle = "Errore fail2ban";
        const hint =
          "fail2ban sia installato | fail2ban sia in esecuzione | L'utente abbia i permessi";
        errorDescription = `${errorResult.message}\n\n💡 Verifica che: ${hint}`;
      }

      if (errorResult.causes && errorResult.causes.length > 0) {
        const causesList = errorResult.causes.map((c) => `• ${c}`).join(" | ");
        errorDescription += `\n\n📋 Possibili cause: ${causesList}`;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanMultipleCIDRs = async (
    cidrs: Array<{
      cidr: string;
      asn?: string;
      organization?: string;
      country?: string;
    }>,
  ) => {
    setIsLoading(true);
    try {
      const cidrsToban = cidrs.map((cidrData) => ({
        cidr: cidrData.cidr,
        reason: createCIDRBanReason(cidrData, true),
      }));

      const result = await banMultipleCIDRs(cidrsToban);

      toast({
        title: "Ban di Massa Completato",
        description: `${result.data?.successful || 0} CIDR bannati con successo, ${result.data?.failed || 0} falliti`,
      });

      await Promise.all([
        loadBannedIPs(),
        loadTotalAutomaticBansCount(),
        loadTotalManualBansCount(),
      ]);
    } catch (error) {
      console.error("Errore ban multiplo CIDR:", error);
      const errorResult = formatApiError(error);

      toast({
        title: "Errore nel Ban di Massa",
        description: errorResult.message,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ManualBanForm
        isLoading={isLoading}
        onBanSuccess={() => {
          loadBannedIPs();
          loadTotalManualBansCount();
        }}
        onReloadRequest={() => {
          loadBannedIPs();
          loadTotalManualBansCount();
        }}
      />

      <SearchAndFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={() => {}}
        isLoading={isLoading}
        activeFilters={activeFilters}
        onAddFilter={handleAddFilter}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
        <div className="flex-1">
          <AutomaticBansList
            automaticBans={filteredAutomaticBans}
            isLoading={isLoading}
            loadingMoreAutomatic={loadingMoreAutomatic}
            hasMoreAutomatic={hasMoreAutomatic}
            limit={limit}
            confirmingUnban={confirmingUnban}
            onFilterClick={handleFilterClick}
            onUnbanRequest={handleUnbanIPRequest}
            performUnban={performUnban}
            setConfirmingUnban={setConfirmingUnban}
            onLoadMore={handleLoadMoreAutomatic}
            totalAutomaticBansCount={totalAutomaticBansCount}
            onBanCIDR={handleBanCIDR}
            onBanMultipleCIDRs={handleBanMultipleCIDRs}
          />
        </div>
        <div className="flex-1">
          <ManualBansList
            manualBans={filteredManualBans}
            isLoading={isLoading}
            loadingMoreManual={loadingMoreManual}
            hasMoreManual={hasMoreManual}
            limit={limit}
            confirmingUnban={confirmingUnban}
            onFilterClick={handleFilterClick}
            onUnbanRequest={handleUnbanIPRequest}
            performUnban={performUnban}
            setConfirmingUnban={setConfirmingUnban}
            onLoadMore={handleLoadMoreManual}
            totalManualBansCount={totalManualBansCount}
            onBanCIDR={handleBanCIDR}
          />
        </div>
      </div>
    </div>
  );
};
