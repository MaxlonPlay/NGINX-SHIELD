import React, { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Building,
  Globe,
  Network,
  AlertTriangle,
  Loader2,
  Ban,
  Shield,
  X,
  Gavel,
  Info,
  Database,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createCIDRBanReason } from "./banUtils";
import { authService } from "@/utils/apiService";

export interface IPInfo {
  ip: string;
  country?: string;
  network?: string;
  asn?: string;
  organization?: string;
  // Ban info from /api/bans/check/{ip}
  banned_in_database?: boolean;
  banned_in_fail2ban?: boolean;
  ban_type?: string;
  ban_reason?: string;
  status?: string;
}

interface IPInfoCardProps {
  info: IPInfo | null;
  isLoading: boolean;
  onBanCIDR?: (cidr: string, reason: string) => Promise<void>;
  onWhitelistSuccess?: () => void;
}

const IPInfoCard: FC<IPInfoCardProps> = ({ info, isLoading, onBanCIDR, onWhitelistSuccess }) => {
  const [isBanningCIDR, setIsBanningCIDR] = useState(false);
  const [isAddingWhitelist, setIsAddingWhitelist] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<{
    type: "ban" | "whitelist";
    cidr: string;
  } | null>(null);
  const { toast } = useToast();
  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Informazioni IP</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!info) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Informazioni IP</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-400">
          Inserisci un IP per visualizzare le informazioni
        </CardContent>
      </Card>
    );
  }

  const statusColor = info.banned_in_database || info.banned_in_fail2ban ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300";
  const statusText = info.banned_in_database || info.banned_in_fail2ban
    ? `Bannato (${info.ban_type || "Sconosciuto"})`
    : "Non Bannato";

  const handleBanCIDRClick = async () => {
    if (!info?.network || !onBanCIDR) return;

    setIsBanningCIDR(true);
    try {
      const reason = createCIDRBanReason({
        cidr: info.network,
        asn: info.asn,
        organization: info.organization,
        country: info.country,
      });
      await onBanCIDR(info.network, reason);
      setConfirmingAction(null);
    } catch (error) {
      console.error("Errore nel ban del CIDR:", error);
    } finally {
      setIsBanningCIDR(false);
    }
  };

  const handleAddToWhitelistClick = async () => {
    if (!info?.network) return;

    setIsAddingWhitelist(true);
    try {
      await authService.addWhitelistEntry({
        type: "cidr",
        value: info.network,
        description: `CIDR da ricerca info - ASN: ${info.asn || "N/A"}, Org: ${info.organization || "N/A"}, Paese: ${info.country || "N/A"}`,
      });

      toast({
        title: "Aggiunto alla Whitelist",
        description: `${info.network} è stato aggiunto alla whitelist`,
      });

      setConfirmingAction(null);
      onWhitelistSuccess?.();
    } catch (error: any) {
      console.error("Errore aggiunta whitelist:", error);
      const errorMsg = error?.message || "Errore nell'aggiunta alla whitelist";
      toast({
        title: "Errore",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsAddingWhitelist(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-400" />
            {info.ip}
          </CardTitle>
          <span className={`text-xs px-3 py-1 rounded font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* All Info on Single Row */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-700 overflow-x-auto">
          {/* IP Address */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">IP</p>
              <p className="text-xs font-mono font-semibold text-slate-100 whitespace-nowrap">
                {info.ip}
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-10 bg-slate-700 flex-shrink-0" />

          {/* Country */}
          {(info.country) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Paese</p>
                <p className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                  {info.country}
                </p>
              </div>
            </div>
          )}

          {/* Separator */}
          {(info.country) && <div className="w-px h-10 bg-slate-700 flex-shrink-0" />}

          {/* Network CIDR */}
          {(info.network) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Network className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Network</p>
                <p className="text-xs font-mono font-semibold text-slate-100 whitespace-nowrap">
                  {info.network}
                </p>
              </div>
              <div className="flex gap-1 ml-1">
                {onBanCIDR && (
                  <>
                    <Button
                      size="icon"
                      onClick={() => setConfirmingAction({ type: "ban", cidr: info.network })}
                      disabled={isBanningCIDR || isAddingWhitelist}
                      className="h-6 w-6 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800/50 text-white flex-shrink-0"
                      title="Ban CIDR"
                    >
                      <Ban className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => setConfirmingAction({ type: "whitelist", cidr: info.network })}
                      disabled={isAddingWhitelist || isBanningCIDR}
                      className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white flex-shrink-0"
                      title="Aggiungi CIDR a whitelist"
                    >
                      <Shield className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Separator */}
          {(info.network) && <div className="w-px h-10 bg-slate-700 flex-shrink-0" />}

          {/* ASN */}
          {(info.asn) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">ASN</p>
                <p className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                  {info.asn}
                </p>
              </div>
            </div>
          )}

          {/* Separator */}
          {(info.asn) && <div className="w-px h-10 bg-slate-700 flex-shrink-0" />}

          {/* Organization */}
          {(info.organization) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Building className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Org</p>
                <p className="text-xs font-semibold text-slate-100 whitespace-nowrap truncate max-w-xs">
                  {info.organization}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Ban Information */}
        {(info.banned_in_database || info.banned_in_fail2ban) && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-900/30 border border-red-800/50 mt-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-red-300 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Ban Status</p>
              <div className="text-xs text-red-300/90 space-y-1 mt-1">
                {info.banned_in_database && (
                  <p className="flex items-center"><Database className="w-3 h-3 mr-1" /> Database: Bannato</p>
                )}
                {info.banned_in_fail2ban && (
                  <p className="flex items-center"><Lock className="w-3 h-3 mr-1" /> Fail2ban: Bannato</p>
                )}
                {info.status && (
                  <p>• Status: {info.status}</p>
                )}
                {info.ban_reason && (
                  <p className="mt-2">Motivo: {info.ban_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Confirmation Modal */}
    {confirmingAction && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="bg-slate-800 border-slate-700 shadow-2xl max-w-md w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center">
              {confirmingAction.type === "ban" ? (
                <Gavel className="h-6 w-6 mr-2 text-yellow-400" />
              ) : (
                <Info className="h-6 w-6 mr-2 text-blue-400" />
              )}
              {confirmingAction.type === "ban" ? "Conferma Ban CIDR" : "Aggiungi a Whitelist"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center">
                <Network className="h-4 w-4 mr-2 text-blue-400" />
                {confirmingAction.type === "ban" ? "CIDR da Bannare" : "CIDR da Aggiungere"}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Network className="h-4 w-4 mr-2 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-300 font-mono font-semibold break-all">
                    {confirmingAction.cidr}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  {info?.asn && (
                    <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                      <Globe className="h-3 w-3 mr-1" /> ASN: {info.asn}
                    </span>
                  )}
                  {info?.organization && (
                    <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                      <Building className="h-3 w-3 mr-1" /> {info.organization}
                    </span>
                  )}
                  {info?.country && (
                    <span className="flex items-center bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                      <MapPin className="h-3 w-3 mr-1" /> {info.country}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {confirmingAction.type === "ban" && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-xs text-red-300 flex items-start">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" /> Questo CIDR sarà bannato nel database e in fail2ban
                </p>
              </div>
            )}

            {confirmingAction.type === "whitelist" && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
                <p className="text-xs text-emerald-300 flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" /> Questo CIDR sarà aggiunto alla whitelist
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setConfirmingAction(null)}
                variant="ghost"
                disabled={isBanningCIDR || isAddingWhitelist}
                className="text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors duration-200"
              >
                Annulla
              </Button>
              <Button
                onClick={confirmingAction.type === "ban" ? handleBanCIDRClick : handleAddToWhitelistClick}
                disabled={isBanningCIDR || isAddingWhitelist}
                className={confirmingAction.type === "ban" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200"}
              >
                {isBanningCIDR || isAddingWhitelist ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {confirmingAction.type === "ban" ? "Bannando..." : "Aggiungendo..."}
                  </>
                ) : (
                  confirmingAction.type === "ban" ? "Banna CIDR" : "Aggiungi a Whitelist"
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

export default IPInfoCard;
