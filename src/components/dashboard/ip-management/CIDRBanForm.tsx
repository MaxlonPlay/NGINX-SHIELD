import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network, RefreshCw, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  banCIDR,
  findIPsInCIDR,
  unbanIPsInCIDR,
  formatApiError,
  IPInCIDREntry,
} from "@/utils/banManager";

interface CIDRBanFormProps {
  isLoading: boolean;
  onBanSuccess: () => void;
  onReloadRequest: () => void;
}

interface CIDRBanStep {
  status: "input" | "banning" | "checking" | "results" | "complete";
  cidr?: string;
  reason?: string;
  ipsFound?: IPInCIDREntry[];
  selectedIPIds?: number[];
}

const CIDRBanForm: FC<CIDRBanFormProps> = ({
  isLoading,
  onBanSuccess,
  onReloadRequest,
}) => {
  const { t } = useTranslation();
  const [cidr, setCIDR] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<CIDRBanStep>({ status: "input" });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const validateCIDR = (cidr: string): boolean => {
    const cidrRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))$/;
    return cidrRegex.test(cidr);
  };

  const handleBanCIDR = async () => {
    if (isProcessing) return;

    const trimmedCIDR = cidr.trim();
    const trimmedReason = reason.trim();

    if (!trimmedCIDR) {
      toast({
        title: t("cidrBan.validationError"),
        description: t("cidrBan.cidrRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!validateCIDR(trimmedCIDR)) {
      toast({
        title: t("cidrBan.validationError"),
        description: t("cidrBan.invalidCIDR"),
        variant: "destructive",
      });
      return;
    }

    if (!trimmedReason || trimmedReason.length < 3) {
      toast({
        title: t("cidrBan.validationError"),
        description: t("cidrBan.reasonTooShort"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStep({ status: "banning", cidr: trimmedCIDR, reason: trimmedReason });

      const banResult = await banCIDR(trimmedCIDR, trimmedReason);
      if (!banResult.success) {
        toast({
          title: t("cidrBan.banError"),
          description: banResult.message,
          variant: "destructive",
        });
        setStep({ status: "input" });
        setIsProcessing(false);
        return;
      }

      toast({
        title: t("cidrBan.successTitle"),
        description: t("cidrBan.cidrBannedSuccessfully", { cidr: trimmedCIDR }),
        variant: "default",
      });

      setStep({ status: "checking", cidr: trimmedCIDR, reason: trimmedReason });

      const checkResult = await findIPsInCIDR(trimmedCIDR);
      if (!checkResult.success) {
        setStep({
          status: "complete",
          cidr: trimmedCIDR,
          reason: trimmedReason,
          ipsFound: [],
        });
        setIsProcessing(false);
        setCIDR("");
        setReason("");
        onBanSuccess();
        return;
      }

      if (checkResult.count > 0) {
        setStep({
          status: "results",
          cidr: trimmedCIDR,
          reason: trimmedReason,
          ipsFound: checkResult.ips_found,
          selectedIPIds: checkResult.ips_found.map((ip) => ip.id),
        });
      } else {
        setStep({
          status: "complete",
          cidr: trimmedCIDR,
          reason: trimmedReason,
          ipsFound: [],
        });
        setIsProcessing(false);
        setCIDR("");
        setReason("");
        onBanSuccess();
      }
    } catch (error) {
      const errorResult = formatApiError(error);

      let description = errorResult.message;

      if (errorResult.causes && errorResult.causes.length > 0) {
        const causesList = errorResult.causes.map((c) => `• ${c}`).join(" | ");
        description = `${errorResult.message}\n\n📋 Possibili cause: ${causesList}`;
      }

      toast({
        title: t("cidrBan.errorTitle"),
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbanIPs = async () => {
    if (!step.cidr || !step.selectedIPIds || step.selectedIPIds.length === 0)
      return;

    try {
      setIsProcessing(true);

      const unbanResult = await unbanIPsInCIDR(step.cidr, step.selectedIPIds);

      if (!unbanResult.success) {
        toast({
          title: t("cidrBan.errorTitle"),
          description: unbanResult.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("cidrBan.successTitle"),
        description: t("cidrBan.ipsUnbanned", {
          count: unbanResult.unbanned_ips.length,
        }),
        variant: "default",
      });

      setStep({
        status: "complete",
        cidr: step.cidr,
        reason: step.reason,
        ipsFound: step.ipsFound,
      });

      setCIDR("");
      setReason("");
      onBanSuccess();
    } catch (error) {
      const errorResult = formatApiError(error);

      let description = errorResult.message;

      if (errorResult.causes && errorResult.causes.length > 0) {
        const causesList = errorResult.causes.map((c) => `• ${c}`).join(" | ");
        description = `${errorResult.message}\n\n📋 Possibili cause: ${causesList}`;
      }

      toast({
        title: "Errore",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleIP = (id: number) => {
    if (!step.selectedIPIds) return;

    const newSelected = step.selectedIPIds.includes(id)
      ? step.selectedIPIds.filter((pid) => pid !== id)
      : [...step.selectedIPIds, id];

    setStep({ ...step, selectedIPIds: newSelected });
  };

  const handleSelectAll = () => {
    if (!step.ipsFound) return;

    const allIds = step.ipsFound.map((ip) => ip.id);
    setStep({ ...step, selectedIPIds: allIds });
  };

  const handleDeselectAll = () => {
    setStep({ ...step, selectedIPIds: [] });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          {t("cidrBan.title")}
        </CardTitle>
        <CardDescription>{t("cidrBan.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        {step.status === "input" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t("cidrBan.cidrLabel")}
              </label>
              <Input
                placeholder={t("cidrBan.cidrPlaceholder")}
                value={cidr}
                onChange={(e) => setCIDR(e.target.value)}
                disabled={isLoading || isProcessing}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("cidrBan.reasonLabel")}
              </label>
              <Input
                placeholder={t("cidrBan.reasonPlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading || isProcessing}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleBanCIDR}
              disabled={isLoading || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("cidrBan.banning")}
                </>
              ) : (
                <>
                  <Network className="w-4 h-4 mr-2" />
                  {t("cidrBan.banCIDRButton")}
                </>
              )}
            </Button>
          </div>
        )}

        {step.status === "banning" && (
          <div className="space-y-4 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm text-gray-600">
              {t("cidrBan.banningText", { cidr: step.cidr })}
            </p>
          </div>
        )}

        {step.status === "checking" && (
          <div className="space-y-4 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm text-gray-600">{t("cidrBan.checking")}</p>
          </div>
        )}

        {step.status === "results" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {t("cidrBan.ipsFound", { count: step.ipsFound?.length || 0 })}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {t("cidrBan.cidrAlreadyBanned")}
                </p>
              </div>
            </div>

            <div className="border rounded-md max-h-64 overflow-y-auto">
              <div className="sticky top-0 bg-gray-100 p-2 flex gap-2 border-b">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={isProcessing}
                >
                  {t("cidrBan.selectAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeselectAll}
                  disabled={isProcessing}
                >
                  {t("cidrBan.deselectAll")}
                </Button>
              </div>

              <div className="divide-y">
                {step.ipsFound?.map((ip) => (
                  <div
                    key={ip.id}
                    className="p-2 flex items-center gap-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={step.selectedIPIds?.includes(ip.id) || false}
                      onChange={() => handleToggleIP(ip.id)}
                      disabled={isProcessing}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-mono">{ip.ip}</span>
                    <span className="text-xs text-gray-500">({ip.type})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUnbanIPs}
                disabled={isProcessing || !step.selectedIPIds?.length}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t("cidrBan.unbanning")}
                  </>
                ) : (
                  <>
                    <Network className="w-4 h-4 mr-2" />
                    {t("cidrBan.unbanSelected", {
                      count: step.selectedIPIds?.length || 0,
                    })}
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  setStep({ status: "input" });
                  setCIDR("");
                  setReason("");
                }}
                variant="outline"
                disabled={isProcessing}
              >
                {t("cidrBan.done")}
              </Button>
            </div>
          </div>
        )}

        {step.status === "complete" && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {t("cidrBan.cidrBannedSuccessfully", { cidr: step.cidr })}
            </p>
            {step.ipsFound && step.ipsFound.length > 0 && (
              <p className="text-xs text-gray-500">
                {t("cidrBan.ipsUnbanned", {
                  count: step.selectedIPIds?.length || 0,
                })}
              </p>
            )}
            <Button
              onClick={() => {
                setStep({ status: "input" });
                setCIDR("");
                setReason("");
              }}
              className="w-full"
            >
              {t("cidrBan.banAnotherCIDR")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CIDRBanForm;
