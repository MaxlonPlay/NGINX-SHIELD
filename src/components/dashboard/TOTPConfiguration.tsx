import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  QrCode,
  Key,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Download,
} from "lucide-react";
import * as totpService from "../../lib/totpService";

import { animatePasswordReveal } from "../../utils/password-effects";

interface TOTPConfigurationProps {
  className?: string;
}

interface TOTPStatus {
  totp_enabled: boolean;
  totp_configured: boolean;
  activated_at: string | null;
  has_backup_codes: boolean;
}

export const TOTPConfiguration: React.FC<TOTPConfigurationProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const [totpStatus, setTotpStatus] = useState<TOTPStatus>({
    totp_enabled: false,
    totp_configured: false,
    activated_at: null,
    has_backup_codes: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regenerateCode, setRegenerateCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [showRegeneratePassword, setShowRegeneratePassword] = useState(false);

  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadTotpStatus();
  }, []);

  const loadTotpStatus = async () => {
    setIsLoading(true);
    try {
      const status = await totpService.getTotpStatus();
      setTotpStatus(status);
    } catch (error) {
      console.error("Errore nel caricamento dello stato TOTP:", error);
      toast({
        title: t("common.error"),
        description: t("totp.errors.loadingStatus"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    currentValue: boolean,
    inputId: string,
  ) => {
    const newState = !currentValue;
    setter(newState);

    if (newState) {
      setTimeout(() => {
        const inputElement = document.getElementById(
          inputId,
        ) as HTMLInputElement;
        if (inputElement) {
          animatePasswordReveal(inputElement);
        }
      }, 0);
    }
  };

  const handleEnableTotp = async () => {
    if (!currentPassword) {
      toast({
        title: t("common.error"),
        description: t("totp.setup.passwordPlaceholder"),
        variant: "destructive",
      });
      return;
    }

    setIsEnabling(true);
    try {
      const result = await totpService.generateTotpSecret(currentPassword);
      setQrCodeUrl(result.qrCodeUrl);
      setSecretKey(result.secretKey);
      setShowSetupModal(true);

      toast({
        title: t("common.success"),
        description: t("totp.errors.qrGenerated"),
      });
    } catch (error) {
      console.error("Errore durante la generazione del TOTP:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.invalidVerification"),
        variant: "destructive",
      });
      return;
    }

    if (!verificationCode) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.verificationRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await totpService.verifyTotpSetup(verificationCode);

      setBackupCodes(result.backupCodes);
      setShowSetupModal(false);
      setShowBackupCodes(true);
      setVerificationCode("");
      setCurrentPassword("");

      await loadTotpStatus();

      toast({
        title: t("common.success"),
        description: t("totp.success.enabled"),
      });
    } catch (error) {
      console.error("Errore durante la verifica del TOTP:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("totp.errors.invalidTotp");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!disablePassword || !disableCode) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.disableError"),
        variant: "destructive",
      });
      return;
    }

    if (disableCode.length !== 6) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.invalidTotpLength"),
        variant: "destructive",
      });
      return;
    }

    setIsDisabling(true);
    try {
      await totpService.disableTotp(disablePassword, disableCode);

      setQrCodeUrl("");
      setSecretKey("");
      setBackupCodes([]);
      setShowBackupCodes(false);
      setShowDisableModal(false);
      setDisablePassword("");
      setDisableCode("");

      await loadTotpStatus();

      toast({
        title: t("common.success"),
        description: t("totp.success.disabled"),
      });
    } catch (error) {
      console.error("Errore durante la disabilitazione del TOTP:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("totp.errors.disableError");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setShowRegenerateModal(true);
  };

  const handleConfirmRegenerateBackupCodes = async () => {
    if (!regeneratePassword || !regenerateCode) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.regenerateError"),
        variant: "destructive",
      });
      return;
    }

    if (regenerateCode.length !== 6) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.invalidTotp"),
        variant: "destructive",
      });
      return;
    }

    setIsRegeneratingCodes(true);
    try {
      const result = await totpService.regenerateBackupCodes(
        regeneratePassword,
        regenerateCode,
      );
      setBackupCodes(result.backupCodes);
      setShowBackupCodes(true);
      setShowRegenerateModal(false);
      setRegeneratePassword("");
      setRegenerateCode("");

      toast({
        title: t("common.success"),
        description: t("totp.success.backupCodesRegenerated"),
      });
    } catch (error) {
      console.error(
        "Errore durante la rigenerazione dei codici di backup:",
        error,
      );
      const errorMessage =
        error instanceof Error ? error.message : t("totp.errors.disableError");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t("common.success"),
        description: t("totp.success.copied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("totp.errors.clipboardError"),
        variant: "destructive",
      });
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes
      .map((code, index) => `${index + 1}. ${code}`)
      .join("\n");
    copyToClipboard(codesText);
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes
      .map((code, index) => `${index + 1}. ${code}`)
      .join("\n");
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(codesText),
    );
    element.setAttribute("download", "backup-codes.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: t("common.success"),
      description: t("totp.success.downloaded"),
    });
  };

  const resetSetupModal = () => {
    setShowSetupModal(false);
    setQrCodeUrl("");
    setSecretKey("");
    setVerificationCode("");
    setCurrentPassword("");
  };

  const resetDisableModal = () => {
    setShowDisableModal(false);
    setDisablePassword("");
    setDisableCode("");
  };

  const resetRegenerateModal = () => {
    setShowRegenerateModal(false);
    setRegeneratePassword("");
    setRegenerateCode("");
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-2 text-slate-300">{t("totp.loading")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            {totpStatus.totp_enabled ? (
              <ShieldCheck className="h-5 w-5 mr-2 text-green-400" />
            ) : (
              <Shield className="h-5 w-5 mr-2 text-yellow-400" />
            )}
            {t("totp.title")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {totpStatus.totp_enabled
              ? t("totp.activeDescription")
              : t("totp.inactiveDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {}
          <div className="mb-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {totpStatus.totp_enabled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <div>
                      <span className="text-green-400 font-medium">
                        {t("totp.status.active")}
                      </span>
                      {totpStatus.activated_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          {t("totp.activatedAt", {
                            date: new Date(
                              totpStatus.activated_at,
                            ).toLocaleDateString(),
                          })}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-red-400 font-medium">
                      {t("totp.status.inactive")}
                    </span>
                  </>
                )}
              </div>

              <div className="flex space-x-2">
                {totpStatus.totp_enabled ? (
                  <>
                    {totpStatus.has_backup_codes && (
                      <Button
                        onClick={handleRegenerateBackupCodes}
                        variant="outline"
                        size="sm"
                        disabled={isRegeneratingCodes}
                        className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                      >
                        {isRegeneratingCodes ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("totp.regenerating")}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t("totp.regenerateBackupCodes")}
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowDisableModal(true)}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <ShieldX className="h-4 w-4 mr-2" />
                      {t("totp.disable.button")}
                    </Button>
                  </>
                ) : (
                  !showSetupModal && (
                    <Button
                      onClick={() => setShowSetupModal(true)}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      {t("totp.enable")}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          {}
          {showSetupModal && (
            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <QrCode className="h-5 w-5 mr-2 text-blue-400" />
                {t("totp.setup.title")}
              </h3>

              <div className="space-y-4">
                {}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t("totp.setup.currentPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="setup-password-input"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t("totp.setup.passwordPlaceholder")}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-all duration-300"
                      onClick={() =>
                        handleToggle(
                          setShowPassword,
                          showPassword,
                          "setup-password-input",
                        )
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-white" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-white" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleEnableTotp}
                  disabled={isEnabling || !currentPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isEnabling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("totp.setup.generatingQR")}
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      {t("totp.setup.generateQR")}
                    </>
                  )}
                </Button>

                {}
                {qrCodeUrl && (
                  <>
                    <div className="text-slate-300 text-sm">
                      <p className="mb-2">{t("totp.setup.instruction1")}</p>
                      <p className="mb-4">{t("totp.setup.instruction2")}</p>
                    </div>

                    {}
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code TOTP"
                        className="w-48 h-48"
                      />
                    </div>

                    {}
                    <div className="space-y-2">
                      <Label className="text-slate-300">
                        {t("totp.setup.secretKeyLabel")}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={secretKey}
                          readOnly
                          className="bg-slate-900/50 border-slate-600 text-white font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(secretKey)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {}
                    <div className="space-y-2">
                      <Label className="text-slate-300">
                        {t("totp.setup.verificationCodeLabel")}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={verificationCode}
                          onChange={(e) =>
                            setVerificationCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder={t("totp.setup.codePlaceholder")}
                          className="bg-slate-900/50 border-slate-600 text-white font-mono text-center"
                          maxLength={6}
                        />
                        <Button
                          onClick={handleVerifyTotp}
                          disabled={
                            isVerifying ||
                            verificationCode.length !== 6 ||
                            !currentPassword
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("totp.setup.verifying")}
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4 mr-2" />
                              {t("totp.setup.activate")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={resetSetupModal}
                  variant="outline"
                  className="w-full bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                >
                  {t("totp.setup.cancel")}
                </Button>
              </div>
            </div>
          )}

          {}
          {showDisableModal && (
            <div className="mb-6 p-4 bg-red-900/20 rounded-lg border border-red-600">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                <ShieldX className="h-5 w-5 mr-2" />
                {t("totp.disable.title")}
              </h3>

              <div className="space-y-4">
                <div className="text-red-200 text-sm mb-4">
                  <p className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.disable.warning")}
                  </p>
                  <p>{t("totp.disable.confirmation")}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t("totp.disable.passwordLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="disable-password-input"
                      type={showDisablePassword ? "text" : "password"}
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder={t("totp.setup.passwordPlaceholder")}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-all duration-300"
                      onClick={() =>
                        handleToggle(
                          setShowDisablePassword,
                          showDisablePassword,
                          "disable-password-input",
                        )
                      }
                    >
                      {showDisablePassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-white" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-white" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t("totp.disable.codeLabel")}
                  </Label>
                  <Input
                    value={disableCode}
                    onChange={(e) =>
                      setDisableCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder={t("totp.setup.codePlaceholder")}
                    className="bg-slate-900/50 border-slate-600 text-white font-mono text-center"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleDisableTotp}
                    disabled={
                      isDisabling ||
                      !disablePassword ||
                      disableCode.length !== 6
                    }
                    variant="destructive"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isDisabling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("totp.disable.disabling")}
                      </>
                    ) : (
                      <>
                        <ShieldX className="h-4 w-4 mr-2" />
                        {t("totp.disable.button")}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetDisableModal}
                    variant="outline"
                    className="flex-1 bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                  >
                    {t("totp.setup.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {}
          {showRegenerateModal && (
            <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-600">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                {t("totp.regenerate.title")}
              </h3>

              <div className="space-y-4">
                <div className="text-blue-200 text-sm mb-4">
                  <p>{t("totp.regenerate.description")}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t("totp.regenerate.passwordLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="regenerate-password-input"
                      type={showRegeneratePassword ? "text" : "password"}
                      value={regeneratePassword}
                      onChange={(e) => setRegeneratePassword(e.target.value)}
                      placeholder={t("totp.setup.passwordPlaceholder")}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-all duration-300"
                      onClick={() =>
                        handleToggle(
                          setShowRegeneratePassword,
                          showRegeneratePassword,
                          "regenerate-password-input",
                        )
                      }
                    >
                      {showRegeneratePassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-white" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-white" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {t("totp.regenerate.codeLabel")}
                  </Label>
                  <Input
                    value={regenerateCode}
                    onChange={(e) =>
                      setRegenerateCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder={t("totp.setup.codePlaceholder")}
                    className="bg-slate-900/50 border-slate-600 text-white font-mono text-center"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleConfirmRegenerateBackupCodes}
                    disabled={
                      isRegeneratingCodes ||
                      !regeneratePassword ||
                      regenerateCode.length !== 6
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isRegeneratingCodes ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("totp.regenerate.regenerating")}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t("totp.regenerate.button")}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetRegenerateModal}
                    variant="outline"
                    className="flex-1 bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                  >
                    {t("totp.setup.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {}
          {showBackupCodes && backupCodes.length > 0 && (
            <div className="mb-6 p-4 bg-amber-900/20 rounded-lg border border-amber-600">
              <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {t("totp.backupCodes.title")}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-amber-900/30 rounded border border-amber-700">
                  <p className="text-amber-200 text-sm font-medium mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t("totp.backupCodes.warning")}
                  </p>
                  <ul className="text-amber-200 text-sm space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2" />{" "}
                      {t("totp.backupCodes.info1")}
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2" />{" "}
                      {t("totp.backupCodes.info2")}
                    </li>
                    <li className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-2" />{" "}
                      {t("totp.backupCodes.info3")}
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2" />{" "}
                      {t("totp.backupCodes.info4")}
                    </li>
                  </ul>
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-900/50 rounded border border-slate-600">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-white font-mono text-sm py-2 px-3 bg-slate-800/50 rounded"
                    >
                      <span className="text-slate-400 font-medium">
                        {index + 1}.
                      </span>
                      <span className="text-white tracking-wider">{code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    onClick={copyBackupCodes}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t("totp.backupCodes.copyAll")}
                  </Button>
                  <Button
                    onClick={downloadBackupCodes}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("totp.backupCodes.downloadTxt")}
                  </Button>
                  <Button
                    onClick={() => setShowBackupCodes(false)}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("totp.backupCodes.saved")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {}
          <div className="space-y-4">
            {totpStatus.totp_enabled ? (
              <div className="p-4 bg-green-900/20 rounded-lg border border-green-700">
                <h4 className="text-green-400 font-medium flex items-center mb-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("totp.protectionInfo.title")}
                </h4>
                <div className="text-green-200 text-sm space-y-1">
                  <p className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.protectionInfo.line1")}
                  </p>
                  <p className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.protectionInfo.line2")}
                  </p>
                  {totpStatus.has_backup_codes && (
                    <p className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />{" "}
                      {t("totp.protectionInfo.line3")}
                    </p>
                  )}
                  <p className="text-green-300 mt-2 flex items-center">
                    <Lock className="h-3 w-3 inline mr-1" />
                    {t("totp.protectionInfo.reminder")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
                <h4 className="text-yellow-400 font-medium flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t("totp.securityTip.title")}
                </h4>
                <div className="text-yellow-200 text-sm space-y-1">
                  <p className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.securityTip.line1")}
                  </p>
                  <p className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.securityTip.line2")}
                  </p>
                  <p className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />{" "}
                    {t("totp.securityTip.line3")}
                  </p>
                </div>
              </div>
            )}

            {}
            <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
              <h4 className="text-slate-300 font-medium mb-2">
                {t("totp.recommendedApps")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="text-slate-400 p-2 bg-slate-800/50 rounded">
                  <span className="font-medium text-slate-300">
                    {t("totp.appGoogle")}
                  </span>
                  <br />
                  {t("totp.appPlatforms")}
                </div>
                <div className="text-slate-400 p-2 bg-slate-800/50 rounded">
                  <span className="font-medium text-slate-300">
                    {t("totp.appMicrosoft")}
                  </span>
                  <br />
                  {t("totp.appPlatforms")}
                </div>
                <div className="text-slate-400 p-2 bg-slate-800/50 rounded">
                  <span className="font-medium text-slate-300">
                    {t("totp.appAuthy")}
                  </span>
                  <br />
                  {t("totp.appMultiDevice")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
