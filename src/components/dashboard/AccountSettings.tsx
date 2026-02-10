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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  CircleUser,
  Loader2,
  Save,
  Eye,
  EyeOff,
  User,
  Calendar,
  Languages,
  Check,
  Globe,
} from "lucide-react";
import { authService } from "../../utils/apiService";
import { TOTPConfiguration } from "./TOTPConfiguration";

const availableLanguages = [
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ch", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
];

export const AccountSettings = () => {
  const { t, i18n } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [accountLastModifiedDate, setAccountLastModifiedDate] = useState<
    string | null
  >(null);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const { toast } = useToast();

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setCurrentLang(langCode);
    localStorage.setItem("nginxshield_language", langCode);
    toast({
      title: t("common.success"),
      description: `${t("settings.languageChanged")} ${availableLanguages.find((l) => l.code === langCode)?.name}`,
    });
  };

  const getCurrentLanguage = () => {
    return (
      availableLanguages.find((lang) => lang.code === currentLang) ||
      availableLanguages[0]
    );
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const result = await authService.getUserInfo();

        if (result.success) {
          const userData = result.user || result.data?.user;

          if (userData) {
            setLoggedInUsername(userData.username);
            setAccountLastModifiedDate(
              new Date(userData.last_password_update).toLocaleDateString(
                "it-IT",
              ),
            );
          } else {
            toast({
              title: t("common.warning"),
              description: t("accountSettings.errors.noInfoAccount"),
              variant: "destructive",
            });
          }
        } else {
          console.error(t("accountSettings.errors.errorGetUserInfo"), result);
          toast({
            title: t("common.error"),
            description: t("accountSettings.errors.noInfoAccount"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(t("accountSettings.errors.errorGetUserInfo"), error);
        toast({
          title: t("common.error"),
          description: t("accountSettings.errors.connectionError"),
          variant: "destructive",
        });
      }
    };

    fetchUserInfo();
  }, [toast]);

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
          import("../../utils/password-effects").then((module) => {
            module.animatePasswordReveal(inputElement);
          });
        }
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: t("common.error"),
        description: t("accountSettings.errors.allFieldsRequired"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t("common.error"),
        description: t("accountSettings.errors.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: t("common.error"),
        description: t("accountSettings.errors.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }

    if (!loggedInUsername) {
      toast({
        title: t("common.error"),
        description: t("accountSettings.errors.usernameError"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.updateCredentials({
        current_password: currentPassword,
        new_username: loggedInUsername,
        new_password: newPassword,
      });

      if (result.success) {
        toast({
          title: t("common.success"),
          description: t("accountSettings.success.passwordUpdated"),
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");

        setTimeout(() => {
          authService.logout();
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        }, 3000);
      } else {
        toast({
          title: t("common.error"),
          description:
            result.message || t("accountSettings.errors.updateFailed"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(t("accountSettings.errors.errorUpdatingPassword"), error);
      toast({
        title: t("common.error"),
        description:
          error.message || t("accountSettings.errors.notPosibleChangePassword"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Globe className="h-5 w-5 mr-2 text-green-400" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t("settings.languageDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-3">
              <Languages className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">
                  {t("settings.currentLanguage")}
                </p>
                <p className="text-slate-400 text-sm flex items-center">
                  <span className="text-lg mr-2">
                    {getCurrentLanguage().flag}
                  </span>
                  {getCurrentLanguage().name}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  {t("settings.changeLanguage")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-slate-800 border-slate-700 min-w-[200px]"
              >
                {availableLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className="text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer flex items-center justify-between py-2"
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                    {currentLang === lang.code && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CircleUser className="h-5 w-5 mr-2 text-blue-400" />
            {t("accountSettings.title")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t("accountSettings.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {}
          <div className="mb-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <h3 className="text-md font-semibold text-white mb-3">
              {t("accountSettings.accountDetails")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center text-slate-300">
                <User className="h-4 w-4 mr-2 text-blue-400" />
                <span className="font-medium">
                  {t("accountSettings.username")}:
                </span>
                <span className="ml-2 text-white">
                  {loggedInUsername || "Caricamento..."}
                </span>
              </div>
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                <span className="font-medium">
                  {t("accountSettings.lastPasswordUpdate")}:
                </span>
                <span className="ml-2 text-white">
                  {accountLastModifiedDate || "Caricamento..."}
                </span>
              </div>
            </div>
          </div>

          {}
          {!showPasswordForm && (
            <Button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full mb-6"
            >
              <Save className="h-4 w-4 mr-2" />
              {t("accountSettings.changePasswordTitle")}
            </Button>
          )}

          {}
          {showPasswordForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700"
            >
              <h3 className="text-md font-semibold text-white mb-3">
                {t("accountSettings.changePasswordTitle")}
              </h3>

              {}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-300">
                  {t("accountSettings.currentPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="current-password-input"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t(
                      "accountSettings.currentPasswordPlaceholder",
                    )}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-white transition-all duration-300"
                    onClick={() =>
                      handleToggle(
                        setShowCurrentPassword,
                        showCurrentPassword,
                        "current-password-input",
                      )
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-300">
                  {t("accountSettings.newPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="new-password-input"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("accountSettings.newPasswordPlaceholder")}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-white transition-all duration-300"
                    onClick={() =>
                      handleToggle(
                        setShowNewPassword,
                        showNewPassword,
                        "new-password-input",
                      )
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {}
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-slate-300">
                  {t("accountSettings.confirmNewPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password-input"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t(
                      "accountSettings.confirmPasswordPlaceholder",
                    )}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-white transition-all duration-300"
                    onClick={() =>
                      handleToggle(
                        setShowConfirmNewPassword,
                        showConfirmNewPassword,
                        "confirm-password-input",
                      )
                    }
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("accountSettings.updating")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t("accountSettings.changePasswordTitle")}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full bg-white text-slate-900 border-white hover:bg-slate-400 font-medium transition-all duration-300 ease-in-out"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                disabled={isLoading}
              >
                {t("common.cancel")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {}
      <TOTPConfiguration />
    </div>
  );
};
