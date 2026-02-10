import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  HandCoins,
  Info,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/utils/apiService";
import { Link } from "react-router-dom";
import SecureAccessBlockedPage from "@/pages/SecureAccessBlockedPage";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface LoginPageProps {
  onLogin: (success: boolean, requiresPasswordChange?: boolean) => void;
  serverStatus: "unknown" | "online" | "offline";
}

export const LoginPage = ({ onLogin, serverStatus }: LoginPageProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>(Array(10).fill(""));
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [requiresTOTP, setRequiresToTP] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isSecureAccessBlocked, setIsSecureAccessBlocked] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    setTimeout(() => setLogoVisible(true), 100);
    setTimeout(() => setCardVisible(true), 300);

    const checkAuthStatus = async () => {
      try {
        const data = await authService.getAuthStatus();
        setIsFirstLogin(data.is_first_login);
      } catch (error) {
        console.error("Errore nel controllo dello stato auth:", error);
      }
    };

    const checkHealthStatus = async () => {
      try {
        const healthData = await authService.getHealthStatus();

        if (
          healthData.security?.secure_cookies_enabled === true &&
          window.location.protocol === "http:"
        ) {
          setIsSecureAccessBlocked(true);
        }
        setIsCheckingHealth(false);
      } catch (error) {
        console.error("Errore nel controllo dello stato health:", error);
        setIsCheckingHealth(false);
      }
    };

    checkAuthStatus();
    checkHealthStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({
        title: t("loginPage.errors.requiredFields"),
        description: t("loginPage.errors.enterCredentials"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const loginResult = await authService.login({
        username: username.trim(),
        password: password,
      });

      if (loginResult.success) {
        toast({
          title: t("loginPage.success.loginSuccess"),
          description: loginResult.message || t("loginPage.success.welcome"),
          variant: "default",
        });

        onLogin(true, loginResult.requiresPasswordChange);
      } else {
        toast({
          title: t("loginPage.errors.loginFailed"),
          description: t("loginPage.errors.loginFailedDesc"),
          variant: "destructive",
        });
        onLogin(false);
      }
    } catch (error: any) {
      let errorMessage = t("loginPage.errors.authenticationError");
      console.log("[LoginPage] Errore capito:", error);

      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;

        console.log(
          "[LoginPage] Status:",
          status,
          "Response data:",
          responseData,
        );

        if (status === 422) {
          try {
            let detail = responseData?.detail;
            console.log(
              "[LoginPage] 422 Response - detail type:",
              typeof detail,
              "detail:",
              detail,
            );

            if (typeof detail === "string") {
              detail = JSON.parse(detail);
              console.log("[LoginPage] Parsed detail:", detail);
            }

            if (detail?.requires_totp || detail?.message?.includes("TOTP")) {
              console.log("[LoginPage] TOTP richiesto rilevato!");
              setRequiresToTP(true);
              toast({
                title: t("loginPage.success.totpRequired"),
                description: t("loginPage.success.totpDescription"),
                variant: "default",
              });
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.error(
              "[LoginPage] Errore nel parsing della risposta 422:",
              parseError,
            );
            errorMessage = t("loginPage.errors.validationError");
          }
        } else if (status === 401) {
          errorMessage = t("loginPage.errors.invalidCredentials");
        } else if (status === 403) {
          errorMessage = t("loginPage.errors.accessDenied");
        } else if (responseData?.detail) {
          errorMessage =
            typeof responseData.detail === "string"
              ? responseData.detail
              : JSON.stringify(responseData.detail);
        }
      } else if (error.code === "ECONNABORTED") {
        errorMessage = t("loginPage.errors.timeout");
      } else if (error.message.includes("Network Error")) {
        errorMessage = t("loginPage.errors.networkError");
      }

      if (!requiresTOTP) {
        toast({
          title: t("loginPage.errors.connectionError"),
          description: errorMessage,
          variant: "destructive",
        });
        onLogin(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodesChange = (index: number, value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newCodes = [...backupCodes];
    newCodes[index] = sanitized.slice(0, 8);
    setBackupCodes(newCodes);

    if (sanitized.length === 8 && index < 9) {
      const nextInput = document.getElementById(
        `backup-code-recovery-${index + 1}`,
      );
      nextInput?.focus();
    }
  };

  const handleBackupCodesVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const allFilled = backupCodes.every((code) => code.length === 8);
    if (!allFilled) {
      toast({
        title: t("loginPage.errors.incompleteCodes"),
        description: t("loginPage.errors.enter10Codes"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login/verify-backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          backup_codes: backupCodes,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log(
          "[LoginPage] Backup codes verificati con successo:",
          responseData,
        );

        toast({
          title: t("loginPage.success.loginSuccess"),
          description: t("loginPage.success.loginComplete"),
          variant: "default",
        });
        setRequiresToTP(false);
        setBackupCodes(Array(10).fill(""));
        setIsRecoveryMode(false);
        setRecoveryUsername("");

        setTimeout(() => {
          console.log("[LoginPage] Chiamando onLogin dopo recovery riuscito");
          onLogin(true, false);
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error(
          "[LoginPage] Backup codes verification failed:",
          response.status,
          errorData,
        );
        toast({
          title: t("loginPage.errors.backupCodesError"),
          description:
            errorData.detail || t("loginPage.errors.invalidBackupCodes"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[LoginPage] Errore nella verifica backup codes:", error);
      toast({
        title: t("common.error"),
        description:
          error.message || t("loginPage.errors.verifyBackupCodesError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!totpCode.trim() || totpCode.length !== 6) {
      toast({
        title: t("loginPage.errors.invalidCode"),
        description: t("loginPage.errors.enter6Digits"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login/verify-totp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          totp_code: totpCode,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("[LoginPage] TOTP verificato con successo:", responseData);
        console.log("[LoginPage] Cookie disponibili:", document.cookie);

        toast({
          title: t("loginPage.success.loginSuccess"),
          description: t("loginPage.success.loginComplete"),
          variant: "default",
        });
        setRequiresToTP(false);
        setTotpCode("");

        setTimeout(() => {
          console.log("[LoginPage] Chiamando onLogin dopo TOTP riuscito");
          onLogin(true, false);
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error(
          "[LoginPage] TOTP verification failed:",
          response.status,
          errorData,
        );
        toast({
          title: t("loginPage.errors.totpError"),
          description: errorData.detail || t("loginPage.errors.invalidTotp"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[LoginPage] Errore nella verifica TOTP:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Errore durante la verifica TOTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCodesFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split("\n").filter((line) => line.trim());

        const extractedCodes: string[] = [];
        for (const line of lines) {
          const match = line.match(/\d+\.\s*([A-Z0-9]{8})/);
          if (match && match[1]) {
            extractedCodes.push(match[1]);
          }
        }

        if (extractedCodes.length === 10) {
          setBackupCodes(extractedCodes);
          toast({
            title: t("loginPage.success.codesLoaded"),
            description: t("loginPage.recovery.completedCount", { count: 10 }),
            variant: "default",
          });
        } else {
          toast({
            title: t("loginPage.errors.fileError"),
            description: t("loginPage.errors.codesFound", {
              count: extractedCodes.length,
            }),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Errore nel caricamento del file:", error);
        toast({
          title: t("common.error"),
          description: t("loginPage.errors.fileParseError"),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  };

  const handleRecoveryVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryUsername.trim()) {
      toast({
        title: t("common.error"),
        description: t("loginPage.errors.usernameRequired"),
        variant: "destructive",
      });
      return;
    }

    const allFilled = backupCodes.every((code) => code.length === 8);
    if (!allFilled) {
      toast({
        title: t("loginPage.errors.incompleteCodes"),
        description: t("loginPage.errors.enter10Codes"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login/verify-backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          backup_codes: backupCodes,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log(
          "[LoginPage] Backup codes verificati con successo:",
          responseData,
        );

        toast({
          title: t("loginPage.success.loginSuccess"),
          description: t("loginPage.recovery.newPasswordGenerated"),
          variant: "default",
        });

        if (responseData.new_password) {
          setNewPassword(responseData.new_password);
          setShowNewPasswordModal(true);
        }

        setRequiresToTP(false);
        setBackupCodes(Array(10).fill(""));
        setIsRecoveryMode(false);
        setRecoveryUsername("");
      } else {
        const errorData = await response.json();
        console.error(
          "[LoginPage] Recovery verification failed:",
          response.status,
          errorData,
        );
        toast({
          title: t("loginPage.errors.recoveryError"),
          description:
            errorData.detail || t("loginPage.errors.invalidRecoveryCode"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[LoginPage] Errore nella verifica recovery:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("loginPage.errors.recoveryError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isCheckingHealth && (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
            <p className="text-slate-400">{t("loginPage.checking")}</p>
          </div>
        </div>
      )}

      {!isCheckingHealth && isSecureAccessBlocked && (
        <SecureAccessBlockedPage />
      )}

      {!isCheckingHealth && !isSecureAccessBlocked && (
        <>
          <style>{`
        .login-card-enter {
          opacity: 0;
          transform: translateY(20px);
        }
        .login-card-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }

        .logo-icon-enter {
          opacity: 0;
          transform: scale(0.8);
        }
        .logo-icon-enter-active {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }

        .title-glow {
          animation: text-glow 1.5s ease-in-out infinite alternate;
        }

        @keyframes text-glow {
          from {
            text-shadow: 0 0 5px rgba(255, 69, 0, 0.4);
          }
          to {
            text-shadow: 0 0 15px rgba(255, 69, 0, 0.8), 0 0 25px rgba(255, 69, 0, 0.6);
          }
        }

        .animated-background {
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }

        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .social-link {
          transition: all 0.3s ease;
          transform-origin: center;
        }
        .social-link:hover {
          transform: scale(1.1) translateY(-2px);
          filter: brightness(1.2);
        }

        .header-icon-wrapper {
          display: inline-block;
          transition: transform 0.3s ease;
          will-change: transform;
        }
        .header-icon-wrapper:hover {
          transform: scale(1.2) rotate(-15deg);
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.5); }
        }
        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }
      `}</style>

          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 animated-background">
            {}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <LanguageSwitcher />
              <Link to="/info">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-slate-700/50"
                >
                  <Info className="h-4 w-4 mr-2" />
                  {t("loginPage.productInfo")}
                </Button>
              </Link>
            </div>

            <Card
              className={`w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-md login-card-enter ${cardVisible ? "login-card-enter-active" : ""}`}
            >
              <CardHeader className="text-center">
                <div
                  className={`flex justify-center mb-4 logo-icon-enter ${logoVisible ? "logo-icon-enter-active" : ""}`}
                >
                  <div className="p-4 bg-red-500/10 rounded-full header-icon-wrapper animate-glow">
                    <Shield className="h-10 w-10 text-red-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl text-white title-glow">
                  NGINX Shield
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("loginPage.greeting")}
                </CardDescription>
                {isFirstLogin && (
                  <div className="mt-2 p-2 bg-orange-500/10 rounded-md border border-orange-500/20">
                    <p className="text-sm text-orange-400">
                      {t("loginPage.firstLoginWarning")}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isRecoveryMode ? (
                  <form onSubmit={handleRecoveryVerify} className="space-y-4">
                    <div className="p-3 bg-violet-500/10 rounded-md border border-violet-500/20 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-violet-400 flex-shrink-0" />
                      <p className="text-sm text-violet-400">
                        {t("loginPage.recovery.title")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="recovery-username"
                        className="text-slate-300"
                      >
                        <User className="h-4 w-4 inline mr-2" />
                        {t("loginPage.recovery.username")}
                      </Label>
                      <Input
                        id="recovery-username"
                        type="text"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white"
                        placeholder={t(
                          "loginPage.recovery.usernamePlaceholder",
                        )}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-slate-300">
                          {t("loginPage.recovery.codesLabel")}
                        </Label>
                        <span className="text-xs text-slate-400">
                          {t("loginPage.recovery.codesCompleted")}{" "}
                          {
                            backupCodes.filter((code) => code.length === 8)
                              .length
                          }
                          /10
                        </span>
                      </div>

                      {}
                      <div className="grid grid-cols-5 gap-2">
                        {backupCodes.map((code, index) => (
                          <Input
                            key={index}
                            id={`backup-code-recovery-${index}`}
                            type="text"
                            value={code}
                            onChange={(e) =>
                              handleBackupCodesChange(index, e.target.value)
                            }
                            className={`bg-slate-900/50 border-slate-600 text-white text-center text-sm font-mono uppercase
                          ${code.length === 8 ? "border-violet-500 bg-violet-500/10" : ""}
                        `}
                            placeholder={`${index + 1}`}
                            maxLength={8}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                recoveryUsername.trim() &&
                                backupCodes.every((c) => c.length === 8)
                              ) {
                                e.preventDefault();
                                handleRecoveryVerify(e);
                              } else if (
                                e.key === "Backspace" &&
                                code === "" &&
                                index > 0
                              ) {
                                const prevInput = document.getElementById(
                                  `backup-code-recovery-${index - 1}`,
                                );
                                prevInput?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 text-center">
                        {t("loginPage.recovery.codesHint")}
                      </p>

                      <div className="pt-2">
                        <label className="flex items-center justify-center gap-2 p-2 bg-slate-900/50 border border-dashed border-violet-500/30 rounded-lg cursor-pointer hover:border-violet-500/60 transition-colors">
                          <input
                            type="file"
                            accept=".txt"
                            onChange={handleLoadCodesFromFile}
                            disabled={isLoading}
                            className="hidden"
                          />
                          <span className="text-xs text-violet-400 font-medium">
                            {t("loginPage.recovery.loadFromFile")}
                          </span>
                        </label>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                      disabled={
                        isLoading ||
                        !recoveryUsername.trim() ||
                        !backupCodes.every((code) => code.length === 8)
                      }
                    >
                      {isLoading
                        ? t("loginPage.recovery.button") + "..."
                        : t("loginPage.recovery.button")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoveryUsername("");
                        setBackupCodes(Array(10).fill(""));
                        setRequiresToTP(false);
                      }}
                      disabled={isLoading}
                    >
                      {t("loginPage.recovery.back")}
                    </Button>
                  </form>
                ) : !requiresTOTP ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-slate-300">
                        <User className="h-4 w-4 inline mr-2" />
                        {t("loginPage.credentials.username")}
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white"
                        placeholder={
                          isFirstLogin
                            ? t("loginPage.credentials.firstLoginUsername")
                            : t("loginPage.credentials.usernamePlaceholder")
                        }
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLogin(e);
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-300">
                        <Lock className="h-4 w-4 inline mr-2" />
                        {t("loginPage.credentials.password")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-slate-900/50 border-slate-600 text-white pr-10"
                          placeholder={
                            isFirstLogin
                              ? t("loginPage.credentials.firstLoginPassword")
                              : t("loginPage.credentials.passwordPlaceholder")
                          }
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleLogin(e);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t("loginPage.credentials.logging")
                        : t("loginPage.credentials.login")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-slate-300 border-slate-600 hover:bg-slate-700 text-sm"
                      onClick={() => {
                        setIsRecoveryMode(true);
                        setRecoveryUsername(username);
                        setBackupCodes(Array(10).fill(""));
                      }}
                      disabled={isLoading}
                    >
                      {t("loginPage.credentials.cantAccess")}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleTOTPVerify} className="space-y-4">
                    <div className="p-3 bg-blue-500/10 rounded-md border border-blue-500/20 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-400">
                        {t("loginPage.totp.title")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totp-code" className="text-slate-300">
                        <Lock className="h-4 w-4 inline mr-2" />
                        {t("loginPage.totp.codeLabel")}
                      </Label>
                      <Input
                        id="totp-code"
                        type="text"
                        value={totpCode}
                        onChange={(e) =>
                          setTotpCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        className="bg-slate-900/50 border-slate-600 text-white text-center text-2xl tracking-widest font-mono"
                        placeholder={t("loginPage.totp.codePlaceholder")}
                        maxLength={6}
                        disabled={isLoading}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && totpCode.length === 6) {
                            e.preventDefault();
                            handleTOTPVerify(e);
                          }
                        }}
                      />
                      <p className="text-xs text-slate-400">
                        {t("loginPage.totp.hint")}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      disabled={isLoading || totpCode.length !== 6}
                    >
                      {isLoading
                        ? t("loginPage.totp.verifying")
                        : t("loginPage.totp.verify")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-slate-300 border-slate-600 hover:bg-slate-700 text-sm"
                      onClick={() => {
                        setIsRecoveryMode(true);
                        setRecoveryUsername(username);
                        setBackupCodes(Array(10).fill(""));
                        setRequiresToTP(false);
                      }}
                      disabled={isLoading}
                    >
                      {t("loginPage.credentials.cantAccess")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
                      onClick={() => {
                        setRequiresToTP(false);
                        setTotpCode("");
                        setUsername("");
                        setPassword("");
                      }}
                      disabled={isLoading}
                    >
                      {t("loginPage.totp.back")}
                    </Button>
                  </form>
                )}

                <div className="space-y-2">
                  {isFirstLogin && (
                    <div className="text-center text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md">
                      <p className="font-medium text-slate-300">
                        {t("loginPage.credentials.defaultCredentials")}
                      </p>
                      <p className="text-slate-400">
                        {t("loginPage.credentials.defaultUsername")}{" "}
                        <span className="text-white font-mono">
                          {t("loginPage.credentials.defaultUsernameValue")}
                        </span>
                      </p>
                      <p className="text-slate-400">
                        {t("loginPage.credentials.defaultPassword")}{" "}
                        <span className="text-white font-mono">
                          {t("loginPage.credentials.defaultPasswordValue")}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {}
          <div className="container mx-auto px-4 py-8 border-t border-slate-700 flex items-center justify-center text-slate-400 absolute bottom-0 left-0 right-0">
            <p className="flex items-center space-x-2">
              © {new Date().getFullYear()} MaxlonPlay
              <a
                href="https://github.com/MaxlonPlay"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link p-1 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 ml-2"
                title="GitHub MaxlonPlay"
              >
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link p-1 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 ml-2"
                title="Donazione"
              >
                <HandCoins className="w-4 h-4 text-green-400" />
              </a>
              . Distribuito sotto la{" "}
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline"
              >
                GNU General Public License v3.0
              </a>
              .
            </p>
          </div>

          {}
          {showNewPasswordModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md bg-slate-800/95 border-violet-500 backdrop-blur-md">
                <CardHeader className="text-center border-b border-violet-500/20">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-violet-500/20 rounded-full">
                      <Lock className="h-6 w-6 text-violet-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-violet-400">
                    {t("loginPage.recovery.restored")}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {t("loginPage.recovery.newPasswordGenerated")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-sm text-amber-400 font-semibold mb-2">
                      {t("loginPage.recovery.tempPassword")}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900/50 p-3 rounded text-white font-mono text-center text-lg tracking-wider">
                        {newPassword}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          navigator.clipboard.writeText(newPassword);
                          setCopiedToClipboard(true);
                          setTimeout(() => setCopiedToClipboard(false), 2000);
                        }}
                      >
                        {copiedToClipboard
                          ? t("loginPage.recovery.copied")
                          : t("loginPage.recovery.copy")}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 text-slate-300 text-sm">
                    <div className="flex gap-2">
                      <span className="text-violet-400 font-semibold">✓</span>
                      <span>{t("loginPage.recovery.codesConsumed")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-violet-400 font-semibold">✓</span>
                      <span>{t("loginPage.recovery.totp2faDisabled")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-amber-400 font-semibold">!</span>
                      <span className="text-amber-300">
                        {t("loginPage.recovery.warning")}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                    <p className="text-xs text-slate-400">
                      {t("loginPage.recovery.attention")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => {
                        setShowNewPasswordModal(false);
                        setNewPassword("");
                        setCopiedToClipboard(false);
                        setTimeout(() => {
                          console.log(
                            "[LoginPage] Completamento login dopo recovery",
                          );
                          onLogin(true, true);
                        }, 500);
                      }}
                    >
                      {t("loginPage.recovery.proceed")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-violet-400 border-violet-500 hover:bg-violet-500/10"
                      onClick={() => {
                        setShowNewPasswordModal(false);
                        setNewPassword("");
                        setCopiedToClipboard(false);
                        setTimeout(() => {
                          console.log(
                            "[LoginPage] Completamento login mantenendo password autogenerata",
                          );
                          onLogin(true, false);
                        }, 500);
                      }}
                    >
                      {t("loginPage.recovery.keepAutoGenerated")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
};
