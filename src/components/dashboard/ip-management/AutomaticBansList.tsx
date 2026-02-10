import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  Shield,
  Gavel,
  Network,
  MapPin,
  Building,
  Globe,
} from "lucide-react";
import BanEntryCard from "./BanEntryCard";
import { BanEntry } from "./types";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Button } from "@/components/ui/button";
import { getUniqueCIDRData, createCIDRBanReason } from "./banUtils";

interface AutomaticBansListProps {
  automaticBans: BanEntry[];
  isLoading: boolean;
  loadingMoreAutomatic: boolean;
  hasMoreAutomatic: boolean;
  limit: number;
  confirmingUnban: { ip: string; type: "automatic" | "manual" } | null;
  onFilterClick: (query: string) => void;
  onUnbanRequest: (ip: string, type: "automatic" | "manual") => void;
  performUnban: (ip: string, type: "automatic" | "manual") => Promise<void>;
  setConfirmingUnban: React.Dispatch<
    React.SetStateAction<{ ip: string; type: "automatic" | "manual" } | null>
  >;
  onLoadMore: () => void;
  totalAutomaticBansCount: number;
  onBanCIDR: (cidr: string, reason: string) => Promise<void>;
  onBanMultipleCIDRs: (
    cidrs: Array<{
      cidr: string;
      asn?: string;
      organization?: string;
      country?: string;
    }>,
  ) => Promise<void>;
}

const AutomaticBansList: FC<AutomaticBansListProps> = ({
  automaticBans,
  isLoading,
  loadingMoreAutomatic,
  hasMoreAutomatic,
  confirmingUnban,
  onFilterClick,
  onUnbanRequest,
  performUnban,
  setConfirmingUnban,
  onLoadMore,
  totalAutomaticBansCount,
  onBanCIDR,
  onBanMultipleCIDRs,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useInfiniteScroll({
    onLoadMore: onLoadMore,
    hasMore: hasMoreAutomatic,
    isLoading: isLoading,
    loadingMore: loadingMoreAutomatic,
    offset: 20,
  });

  const [confirmingMassBan, setConfirmingMassBan] = useState<BanEntry[] | null>(
    null,
  );
  const [isBanningMass, setIsBanningMass] = useState(false);

  const uniqueCIDRs = getUniqueCIDRData(automaticBans);

  const handleMassBanConfirmation = () => {
    setConfirmingMassBan(automaticBans);
  };

  const handlePerformMassBan = async () => {
    if (confirmingMassBan) {
      setIsBanningMass(true);
      try {
        await onBanMultipleCIDRs(uniqueCIDRs);
        setConfirmingMassBan(null);
      } catch (error) {
        console.error("Errore durante il ban di massa:", error);
      } finally {
        setIsBanningMass(false);
      }
    }
  };

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" />
              {t("ipManagement.automaticBansDisplayed")} {automaticBans.length}{" "}
              / {totalAutomaticBansCount || 0}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("ipManagement.automaticBansDescription")}
            </CardDescription>
          </div>
          {automaticBans.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMassBanConfirmation}
              disabled={isLoading || !!confirmingMassBan}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200 ease-in-out"
            >
              <Gavel className="h-4 w-4 mr-1" />
              {t("ipManagement.banAllCIDRs")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div
            ref={scrollContainerRef}
            className="space-y-3 max-h-96 overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            {isLoading &&
            automaticBans.length === 0 &&
            totalAutomaticBansCount === 0 ? (
              <div className="text-center text-slate-400 py-8 flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />{" "}
                {t("common.loading")}
              </div>
            ) : automaticBans.length === 0 && totalAutomaticBansCount === 0 ? (
              <div className="text-center text-slate-400 py-8">
                {t("ipManagement.noAutomaticBans")}
              </div>
            ) : automaticBans.length === 0 && totalAutomaticBansCount > 0 ? (
              <div className="text-center text-slate-400 py-8">
                {t("ipManagement.noAutomaticBansWithFilters")}
              </div>
            ) : (
              automaticBans.map((ban, index) => (
                <div key={`${ban.ip}-${ban.type}-${ban.timestamp}-${index}`}>
                  <BanEntryCard
                    ban={ban}
                    onFilterClick={onFilterClick}
                    onUnbanRequest={onUnbanRequest}
                    confirmingUnban={confirmingUnban}
                    isLoading={isLoading}
                    performUnban={performUnban}
                    setConfirmingUnban={setConfirmingUnban}
                    onBanCIDR={onBanCIDR}
                  />
                </div>
              ))
            )}
            {loadingMoreAutomatic && hasMoreAutomatic && (
              <div className="text-center text-slate-400 py-4 flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />{" "}
                {t("ipManagement.loadingMoreAutomatic")}
              </div>
            )}
            {!hasMoreAutomatic &&
              automaticBans.length > 0 &&
              !loadingMoreAutomatic && (
                <div className="text-center text-slate-500 py-4 text-sm">
                  {t("ipManagement.endOfAutomaticList")}
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {}
      {confirmingMassBan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center">
                <Gavel className="h-6 w-6 mr-2 text-yellow-400" />
                {t("cidrBan.confirmMassBanTitle")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("cidrBan.confirmMassBanDescription", {
                  count: uniqueCIDRs.length,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Network className="h-4 w-4 mr-2 text-blue-400" />
                  {t("cidrBan.networksList")}
                </h4>
                <div className="space-y-3">
                  {uniqueCIDRs.map((cidrData) => (
                    <div
                      key={cidrData.cidr}
                      className="bg-slate-800/50 border border-slate-600 rounded-lg p-3"
                    >
                      <div className="flex items-center mb-2">
                        <Network className="h-4 w-4 mr-2 text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-300 font-mono font-semibold">
                          {cidrData.cidr}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {cidrData.asn && (
                          <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                            <MapPin className="h-3 w-3 mr-1" />{" "}
                            {t("banEntry.asn")} {cidrData.asn}
                          </span>
                        )}
                        {cidrData.organization && (
                          <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                            <Building className="h-3 w-3 mr-1" />{" "}
                            {cidrData.organization}
                          </span>
                        )}
                        {cidrData.country && (
                          <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                            <Globe className="h-3 w-3 mr-1" />{" "}
                            {cidrData.country}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setConfirmingMassBan(null)}
                  variant="ghost"
                  disabled={isBanningMass}
                  className="text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors duration-200"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handlePerformMassBan}
                  disabled={isBanningMass}
                  className="bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                >
                  {isBanningMass ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("common.banning")}
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      {t("buttons.confirmBan")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default AutomaticBansList;
