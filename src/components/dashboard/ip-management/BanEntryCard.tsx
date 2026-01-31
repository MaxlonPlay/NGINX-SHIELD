import React, { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Trash2,
  Shield,
  Network,
  MapPin,
  Building,
  Globe,
  Loader2,
} from "lucide-react";
import { getTimeAgo } from "./getTimeAgo";
import { BanEntry } from "./types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { createCIDRBanReason } from "./banUtils";

interface BanEntryCardProps {
  ban: BanEntry;
  onFilterClick: (query: string) => void;
  onUnbanRequest: (ip: string, type: "automatic" | "manual") => void;
  confirmingUnban: { ip: string; type: "automatic" | "manual" } | null;
  isLoading: boolean;
  performUnban: (ip: string, type: "automatic" | "manual") => Promise<void>;
  setConfirmingUnban: React.Dispatch<
    React.SetStateAction<{ ip: string; type: "automatic" | "manual" } | null>
  >;
  onBanCIDR: (cidr: string, reason: string) => Promise<void>;
}

const BanEntryCard: FC<BanEntryCardProps> = ({
  ban,
  onFilterClick,
  onUnbanRequest,
  confirmingUnban,
  isLoading,
  performUnban,
  setConfirmingUnban,
  onBanCIDR,
}) => {
  const isConfirming =
    confirmingUnban?.ip === ban.ip && confirmingUnban?.type === ban.type;
  const [confirmingCIDR, setConfirmingCIDR] = useState<{
    ip: string;
    cidr: string;
    asn?: string;
    organization?: string;
    country?: string;
  } | null>(null);
  const [isBanningCIDR, setIsBanningCIDR] = useState(false);

  const handleCIDRConfirmation = (ban: BanEntry) => {
    const cidr =
      ban.network || `${ban.ip.split(".").slice(0, 3).join(".")}.0/24`;
    setConfirmingCIDR({
      ip: ban.ip,
      cidr,
      asn: ban.asn,
      organization: ban.organization,
      country: ban.country,
    });
  };

  const handlePerformCIDRBan = async () => {
    if (confirmingCIDR) {
      setIsBanningCIDR(true);
      try {
        const reason = createCIDRBanReason(confirmingCIDR);
        await onBanCIDR(confirmingCIDR.cidr, reason);

        setConfirmingCIDR(null);
      } catch (error) {
        console.error("Errore nel ban del CIDR:", error);
      } finally {
        setIsBanningCIDR(false);
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors">
        <div className="flex items-center space-x-4">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-white font-mono text-sm bg-slate-700 px-2 py-1 rounded cursor-pointer hover:bg-slate-600 transition-colors"
                onClick={() => onFilterClick(ban.ip)}
                title="Clicca per filtrare per questo IP"
              >
                {ban.ip}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                  ban.type === "automatic"
                    ? "bg-blue-900/50 text-blue-300 hover:bg-blue-900/70"
                    : "bg-red-900/50 text-red-300 hover:bg-red-900/70"
                }`}
                onClick={() =>
                  onFilterClick(
                    ban.type === "automatic" ? "Automatico" : "Manuale",
                  )
                }
                title="Clicca per filtrare per tipo di ban"
              >
                {ban.type === "automatic" ? "Automatico" : "Manuale"}
              </span>
              {ban.httpCode && (
                <span
                  className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-300 cursor-pointer hover:bg-yellow-900/70 transition-colors"
                  onClick={() => onFilterClick(`${ban.httpCode}`)}
                  title="Clicca per filtrare per questo codice HTTP"
                >
                  HTTP {ban.httpCode}
                </span>
              )}
              <span
                className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300 cursor-pointer hover:bg-green-900/70 transition-colors"
                onClick={() => onFilterClick(ban.reason)}
                title="Clicca per filtrare per questo motivo"
              >
                Motivo: {ban.reason}
              </span>
            </div>
            {ban.type === "automatic" && (
              <div className="flex flex-wrap items-center gap-2">
                {ban.domain && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-orange-900/50 text-orange-300 cursor-pointer hover:bg-orange-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.domain)}
                    title="Clicca per filtrare per questo dominio"
                  >
                    Dominio: {ban.domain}
                  </span>
                )}
                {ban.urlPath && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-cyan-900/50 text-cyan-300 cursor-pointer hover:bg-cyan-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.urlPath)}
                    title="Clicca per filtrare per questo percorso URL"
                  >
                    URL Path: {ban.urlPath}
                  </span>
                )}
                {ban.userAgent && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-pink-900/50 text-pink-300 cursor-pointer hover:bg-pink-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.userAgent)}
                    title="Clicca per filtrare per questo User Agent"
                  >
                    User Agent: {ban.userAgent}
                  </span>
                )}
                {ban.network && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 cursor-pointer hover:bg-purple-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.network)}
                    title="Clicca per filtrare per questo network"
                  >
                    Network: {ban.network}
                  </span>
                )}
                {ban.asn && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-indigo-900/50 text-indigo-300 cursor-pointer hover:bg-indigo-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.asn)}
                    title="Clicca per filtrare per questo ASN"
                  >
                    ASN: {ban.asn}
                  </span>
                )}
                {ban.organization && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-teal-900/50 text-teal-300 cursor-pointer hover:bg-teal-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.organization)}
                    title="Clicca per filtrare per questa organizzazione"
                  >
                    Organizzazione: {ban.organization}
                  </span>
                )}
                {ban.country && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-lime-900/50 text-lime-300 cursor-pointer hover:bg-lime-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.country)}
                    title="Clicca per filtrare per questo paese"
                  >
                    Paese: {ban.country}
                  </span>
                )}
              </div>
            )}
            {ban.type === "manual" && (
              <div className="flex flex-wrap items-center gap-2">
                {ban.network && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 cursor-pointer hover:bg-purple-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.network)}
                    title="Clicca per filtrare per questo network"
                  >
                    Network: {ban.network}
                  </span>
                )}
                {ban.asn && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-indigo-900/50 text-indigo-300 cursor-pointer hover:bg-indigo-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.asn)}
                    title="Clicca per filtrare per questo ASN"
                  >
                    ASN: {ban.asn}
                  </span>
                )}
                {ban.organization && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-teal-900/50 text-teal-300 cursor-pointer hover:bg-teal-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.organization)}
                    title="Clicca per filtrare per questa organizzazione"
                  >
                    Organizzazione: {ban.organization}
                  </span>
                )}
                {ban.country && (
                  <span
                    className="text-xs px-2 py-1 rounded bg-lime-900/50 text-lime-300 cursor-pointer hover:bg-lime-900/70 transition-colors"
                    onClick={() => onFilterClick(ban.country)}
                    title="Clicca per filtrare per questo paese"
                  >
                    Paese: {ban.country}
                  </span>
                )}
              </div>
            )}
            <p className="text-slate-500 text-xs mt-2">
              Bannato: {new Date(ban.timestamp).toLocaleDateString("it-IT")}{" "}
              {new Date(ban.timestamp).toLocaleTimeString("it-IT")} (
              {getTimeAgo(ban.timestamp)})
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {ban.type === "automatic" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCIDRConfirmation(ban)}
              disabled={isLoading || isConfirming || !!confirmingCIDR}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200 ease-in-out"
            >
              <Shield className="h-4 w-4 mr-1" />
              Banna CIDR
            </Button>
          )}
          {isConfirming ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => performUnban(ban.ip, ban.type)}
                disabled={isLoading}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200 ease-in-out"
              >
                Conferma
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingUnban(null)}
                className="text-slate-400 hover:text-slate-300 transition-colors duration-200 ease-in-out"
              >
                Annulla
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnbanRequest(ban.ip, ban.type)}
              disabled={isLoading || !!confirmingCIDR}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20 transition-colors duration-200 ease-in-out"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Sblocca
            </Button>
          )}
        </div>
      </div>

      {}
      {confirmingCIDR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl max-w-md w-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-yellow-400" />
                Conferma Ban CIDR
              </CardTitle>
              <CardDescription className="text-slate-400">
                Sei sicuro di voler bannare l'intera rete CIDR?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Network className="h-5 w-5 mr-2 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-300 font-mono font-semibold text-lg">
                    {confirmingCIDR.cidr}
                  </span>
                </div>
                <div className="space-y-2">
                  {confirmingCIDR.asn && (
                    <div className="flex items-center text-slate-300 text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">ASN:</span>
                      <span className="ml-2">{confirmingCIDR.asn}</span>
                    </div>
                  )}
                  {confirmingCIDR.organization && (
                    <div className="flex items-center text-slate-300 text-sm">
                      <Building className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">Organizzazione:</span>
                      <span className="ml-2">
                        {confirmingCIDR.organization}
                      </span>
                    </div>
                  )}
                  {confirmingCIDR.country && (
                    <div className="flex items-center text-slate-300 text-sm">
                      <Globe className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">Paese:</span>
                      <span className="ml-2">{confirmingCIDR.country}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setConfirmingCIDR(null)}
                  variant="ghost"
                  disabled={isBanningCIDR}
                  className="text-slate-400 hover:text-slate-300 hover:bg-slate-700 transition-colors duration-200"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handlePerformCIDRBan}
                  disabled={isBanningCIDR}
                  className="bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                >
                  {isBanningCIDR ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bannando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Conferma Ban
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

export default BanEntryCard;
