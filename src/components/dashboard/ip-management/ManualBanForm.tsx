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
import { Ban, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { banIP, formatApiError } from "@/utils/banManager";

interface ManualBanFormProps {
  isLoading: boolean;
  onBanSuccess: () => void;
  onReloadRequest: () => void;
}

const ManualBanForm: FC<ManualBanFormProps> = ({
  isLoading,
  onBanSuccess,
  onReloadRequest,
}) => {
  const { t } = useTranslation();
  const [newIP, setNewIP] = useState("");
  const [banReason, setBanReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const validateIP = (ip: string): boolean => {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;

    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const handleBanIP = async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedIP = newIP.trim();
    if (!trimmedIP) {
      toast({
        title: t("manualBan.validationError"),
        description: t("manualBan.errors.ipRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!validateIP(trimmedIP)) {
      toast({
        title: t("manualBan.validationError"),
        description: t("manualBan.errors.invalidIP"),
        variant: "destructive",
      });
      return;
    }

    const reason = banReason.trim();
    if (reason && reason.length < 3) {
      toast({
        title: t("manualBan.validationError"),
        description: t("manualBan.errors.reasonTooShort"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const finalReason = reason || t("manualBan.defaultReason");

      console.log(
        `Tentativo ban IP: ${trimmedIP} con motivo: "${finalReason}"`,
      );

      await banIP(trimmedIP, finalReason);

      setNewIP("");
      setBanReason("");

      toast({
        title: t("manualBan.success.title"),
        description: t("manualBan.success.description", { ip: trimmedIP }),
        variant: "default",
      });

      onBanSuccess();
    } catch (error) {
      console.error("Errore durante il ban dell'IP:", error);

      const errorResult = formatApiError(error);

      let description = errorResult.message;

      if (errorResult.causes && errorResult.causes.length > 0) {
        const causesList = errorResult.causes.map((c) => `• ${c}`).join(" | ");
        description = `${errorResult.message}\n\n📋 Possibili cause: ${causesList}`;
      }

      toast({
        title: t("manualBan.error.title"),
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    const trimmedIP = newIP.trim();
    const trimmedReason = banReason.trim();

    return (
      trimmedIP &&
      validateIP(trimmedIP) &&
      (!trimmedReason || trimmedReason.length >= 3)
    );
  };

  const isDisabled = isLoading || isSubmitting || !isFormValid();

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Ban className="h-5 w-5 mr-2 text-red-400" />
          {t("manualBan.title")}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {t("manualBan.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <Input
              placeholder={t("manualBan.ipPlaceholder")}
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
              disabled={isLoading || isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isFormValid() && !isDisabled) {
                  handleBanIP();
                }
              }}
            />
            {newIP.trim() && !validateIP(newIP.trim()) && (
              <p className="text-xs text-red-400 mt-1">
                {t("manualBan.invalidIPFormat")}
              </p>
            )}
          </div>

          <div className="md:col-span-1">
            <Input
              placeholder={t("manualBan.reasonPlaceholder")}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
              disabled={isLoading || isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isFormValid() && !isDisabled) {
                  handleBanIP();
                }
              }}
            />
            {banReason.trim() && banReason.trim().length < 3 && (
              <p className="text-xs text-red-400 mt-1">
                {t("manualBan.minCharacters")}
              </p>
            )}
          </div>

          <Button
            onClick={handleBanIP}
            disabled={isDisabled}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white transition-colors duration-200 ease-in-out"
          >
            <Ban className="h-4 w-4 mr-2" />
            {isSubmitting
              ? t("manualBan.banning")
              : isLoading
                ? t("manualBan.loading")
                : t("manualBan.banButton")}
          </Button>

          <Button
            onClick={onReloadRequest}
            variant="outline"
            disabled={isLoading || isSubmitting}
            className="border-slate-600 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/50 text-white transition-colors duration-200 ease-in-out"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading || isSubmitting ? "animate-spin" : ""}`}
            />
            {t("manualBan.reloadData")}
          </Button>
        </div>

        {}
        {isSubmitting && (
          <div className="mt-3 flex items-center text-sm text-slate-400">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            {t("manualBan.sendingRequest")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualBanForm;
