import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import BanEntryCard from "./BanEntryCard";
import { BanEntry } from "./types";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface ManualBansListProps {
  manualBans: BanEntry[];
  isLoading: boolean;
  loadingMoreManual: boolean;
  hasMoreManual: boolean;
  limit: number;
  confirmingUnban: { ip: string; type: "automatic" | "manual" } | null;
  onFilterClick: (query: string) => void;
  onUnbanRequest: (ip: string, type: "automatic" | "manual") => void;
  performUnban: (ip: string, type: "automatic" | "manual") => Promise<void>;
  setConfirmingUnban: React.Dispatch<
    React.SetStateAction<{ ip: string; type: "automatic" | "manual" } | null>
  >;
  onLoadMore: () => void;
  totalManualBansCount: number;
  onBanCIDR: (cidr: string, reason: string) => Promise<void>;
}

const ManualBansList: FC<ManualBansListProps> = ({
  manualBans,
  isLoading,
  loadingMoreManual,
  hasMoreManual,
  confirmingUnban,
  onFilterClick,
  onUnbanRequest,
  performUnban,
  setConfirmingUnban,
  onLoadMore,
  totalManualBansCount,
  onBanCIDR,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useInfiniteScroll({
    onLoadMore: onLoadMore,
    hasMore: hasMoreManual,
    isLoading: isLoading,
    loadingMore: loadingMoreManual,
    offset: 20,
  });

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          {}
          <Shield className="h-5 w-5 mr-2 text-red-400 flex-shrink-0" />
          {t("ipManagement.manualBansDisplayed")} {manualBans.length} /
          {totalManualBansCount || 0}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {t("ipManagement.manualBansDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollContainerRef}
          className="space-y-3 max-h-96 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {isLoading &&
          manualBans.length === 0 &&
          totalManualBansCount === 0 ? (
            <div className="text-center text-slate-400 py-8 flex items-center justify-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />{" "}
              {t("common.loading")}
            </div>
          ) : manualBans.length === 0 && totalManualBansCount === 0 ? (
            <div className="text-center text-slate-400 py-8">
              {t("ipManagement.noManualBans")}
            </div>
          ) : manualBans.length === 0 && totalManualBansCount > 0 ? (
            <div className="text-center text-slate-400 py-8">
              {t("ipManagement.noManualBansWithFilters")}
            </div>
          ) : (
            manualBans.map((ban, index) => (
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
          {loadingMoreManual && hasMoreManual && (
            <div className="text-center text-slate-400 py-4 flex items-center justify-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />{" "}
              {t("ipManagement.loadingMoreManual")}
            </div>
          )}
          {!hasMoreManual && manualBans.length > 0 && !loadingMoreManual && (
            <div className="text-center text-slate-500 py-4 text-sm">
              {t("ipManagement.endOfManualList")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ManualBansList;
