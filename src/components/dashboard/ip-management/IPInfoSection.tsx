import React, { FC, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import IPInfoCard, { IPInfo } from "./IPInfoCard";
import { useToast } from "@/hooks/use-toast";
import { banCIDR } from "@/utils/banManager";
import { useTranslation } from "react-i18next";

interface IPInfoSectionProps {
  onBanSuccess?: () => void;
}

const IPInfoSection: FC<IPInfoSectionProps> = ({ onBanSuccess }) => {
  const { t } = useTranslation();
  const [ipQuery, setIpQuery] = useState("");
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isValidIP = (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$|^([a-f0-9:]+:+)+[a-f0-9]+$/i;
    return ipv4Regex.test(ip.trim());
  };

  const fetchIPInfo = useCallback(
    async (ip: string) => {
      const trimmedIP = ip.trim();

      if (!trimmedIP) {
        setError(t("ipInfo.errors.enterIP"));
        return;
      }

      if (!isValidIP(trimmedIP)) {
        setError(t("ipInfo.errors.invalidFormat"));
        toast({
          title: t("common.error"),
          description: t("ipInfo.errors.enterValidIP"),
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const geoResponse = await fetch(
          `/api/bans/geo-info/${encodeURIComponent(trimmedIP)}`,
        );

        if (!geoResponse.ok) {
          const errorData = await geoResponse.json();
          throw new Error(
            errorData.detail || t("ipInfo.errors.cannotGetGeoInfo"),
          );
        }

        const geoData = await geoResponse.json();

        let banData = null;
        try {
          const banResponse = await fetch(
            `/api/bans/check/${encodeURIComponent(trimmedIP)}`,
          );
          if (banResponse.ok) {
            const banResponseData = await banResponse.json();
            banData = banResponseData.data;
          }
        } catch (err) {
          console.warn(t("ipInfo.errors.cannotVerifyBan"), err);
        }

        const combinedInfo = {
          ip: trimmedIP,
          ...geoData.data,

          ...(banData && {
            banned_in_database: banData.banned_in_database,
            banned_in_fail2ban: banData.banned_in_fail2ban,
            ban_type: banData.ban_type,
            ban_reason: banData.ban_reason,
            status: banData.status,
          }),
        };

        setIpInfo(combinedInfo);

        toast({
          title: t("ipInfo.success.loaded"),
          description: t("ipInfo.success.loadedDescription", { ip: trimmedIP }),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("ipInfo.errors.unknown");
        setError(errorMessage);

        toast({
          title: t("common.error"),
          description: errorMessage,
          variant: "destructive",
        });

        setIpInfo(null);
      } finally {
        setIsLoading(false);
      }
    },
    [toast, t],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIPInfo(ipQuery);
  };

  const handleClear = () => {
    setIpQuery("");
    setIpInfo(null);
    setError(null);
  };

  const handleBanCIDR = async (cidr: string, reason: string) => {
    try {
      await banCIDR(cidr, reason);
      toast({
        title: t("ipInfo.success.cidrBanned"),
        description: t("ipInfo.success.cidrBannedDescription", { cidr }),
      });
      onBanSuccess?.();
    } catch (error) {
      console.error(t("ipInfo.errors.banCIDR"), error);
      toast({
        title: t("common.error"),
        description: t("ipInfo.errors.cannotBanCIDR"),
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-400" />
            {t("ipInfo.title")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t("ipInfo.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t("ipInfo.placeholder")}
                value={ipQuery}
                onChange={(e) => {
                  setIpQuery(e.target.value);
                  setError(null);
                }}
                className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                disabled={isLoading}
                autoComplete="off"
              />
              <Button
                type="submit"
                disabled={isLoading || !ipQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white transition-colors duration-200 ease-in-out gap-2"
              >
                <Search className="w-4 h-4" />
                {t("ipInfo.search")}
              </Button>
              {ipQuery && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="border-slate-600 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/50 text-white transition-colors duration-200 ease-in-out"
                >
                  {t("ipInfo.clear")}
                </Button>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {ipInfo && (
        <IPInfoCard
          info={ipInfo}
          isLoading={isLoading}
          onBanCIDR={handleBanCIDR}
          onWhitelistSuccess={() => {
            fetchIPInfo(ipInfo.ip);
          }}
        />
      )}
    </div>
  );
};

export default IPInfoSection;
