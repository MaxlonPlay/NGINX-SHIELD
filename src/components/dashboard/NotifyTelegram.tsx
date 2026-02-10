import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TelegramConfig {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
  realtime_notifications: boolean;
  daily_report: boolean;
  weekly_report: boolean;
  commands_enabled: boolean;
}

interface NotifyTelegramProps {
  onReloadAll?: () => void;
}

export const NotifyTelegram: React.FC<NotifyTelegramProps> = ({
  onReloadAll,
}) => {
  const { t } = useTranslation();
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    enabled: false,
    bot_token: "",
    chat_id: "",
    realtime_notifications: true,
    daily_report: false,
    weekly_report: false,
    commands_enabled: false,
  });

  const [telegramSectionExpanded, setTelegramSectionExpanded] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [showChatId, setShowChatId] = useState(false);
  const { toast } = useToast();

  const updateTelegramConfig = (field: keyof TelegramConfig, value: any) => {
    setTelegramConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTelegramEnabledChange = async (enabled: boolean) => {
    updateTelegramConfig("enabled", enabled);
    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
      toast({
        title: t("telegram.messages.enabledSuccess"),
        description: t("telegram.messages.enabledSuccessDesc"),
      });
    }, 500);
  };

  const loadTelegramConfig = async () => {
    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
    }, 500);
  };

  const saveTelegramConfig = async () => {
    if (!telegramConfig.bot_token || !telegramConfig.chat_id) {
      toast({
        title: t("telegram.messages.validationError"),
        description: t("telegram.messages.requiredFieldsError"),
        variant: "destructive",
      });
      return;
    }

    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
      toast({
        title: t("telegram.messages.configSavedSuccess"),
        description: t("telegram.messages.configSavedSuccessDesc"),
      });
    }, 500);
  };

  const testTelegramConnection = async () => {
    if (!telegramConfig.bot_token || !telegramConfig.chat_id) {
      toast({
        title: t("telegram.messages.validationError"),
        description: t("telegram.messages.requiredFieldsError"),
        variant: "destructive",
      });
      return;
    }

    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
      toast({
        title: t("telegram.messages.testSuccess"),
        description: t("telegram.messages.testSuccessDesc"),
      });
    }, 500);
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-medium text-white">
        {t("telegram.workInProgress")}
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700">
          <div className="flex-1">
            <div className="flex items-center">
              <Send className="h-4 w-4 mr-2 text-blue-400" />
              <Label className="text-slate-300 text-sm font-medium">
                {t("telegram.enableNotifications")}
              </Label>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t("telegram.enableNotificationsDesc")}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Switch
              checked={telegramConfig.enabled}
              onCheckedChange={handleTelegramEnabledChange}
              disabled={isTelegramLoading}
            />
            {telegramConfig.enabled && (
              <Button
                onClick={() =>
                  setTelegramSectionExpanded(!telegramSectionExpanded)
                }
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                {telegramSectionExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {telegramConfig.enabled && telegramSectionExpanded && (
          <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-600 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-white">
                {t("telegram.configurationTitle")}
              </h4>
              <div className="flex space-x-2">
                <Button
                  onClick={onReloadAll || loadTelegramConfig}
                  variant="outline"
                  size="sm"
                  disabled={isTelegramLoading}
                  className="border-slate-600 text-slate-900"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isTelegramLoading ? "animate-spin" : ""}`}
                  />
                  {t("telegram.reload")}
                </Button>
                <Button
                  onClick={testTelegramConnection}
                  variant="outline"
                  size="sm"
                  disabled={isTelegramLoading}
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t("telegram.test")}
                </Button>
                <Button
                  onClick={saveTelegramConfig}
                  size="sm"
                  disabled={isTelegramLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("telegram.saveConfig")}
                </Button>
              </div>
            </div>

            {}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-slate-300">
                {t("telegram.credentials.title")}
              </h5>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bot_token" className="text-slate-300">
                    {t("telegram.credentials.botToken")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="bot_token"
                      type={showBotToken ? "text" : "password"}
                      value={telegramConfig.bot_token}
                      onChange={(e) =>
                        updateTelegramConfig("bot_token", e.target.value)
                      }
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      placeholder={t(
                        "telegram.credentials.botTokenPlaceholder",
                      )}
                      disabled={isTelegramLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      disabled={isTelegramLoading}
                    >
                      {showBotToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("telegram.credentials.botTokenHelp")}{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {t("telegram.credentials.botTokenHelpLink")}
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chat_id" className="text-slate-300">
                    {t("telegram.credentials.chatId")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="chat_id"
                      type={showChatId ? "text" : "password"}
                      value={telegramConfig.chat_id}
                      onChange={(e) =>
                        updateTelegramConfig("chat_id", e.target.value)
                      }
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      placeholder={t("telegram.credentials.chatIdPlaceholder")}
                      disabled={isTelegramLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowChatId(!showChatId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      disabled={isTelegramLoading}
                    >
                      {showChatId ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("telegram.credentials.chatIdHelp")}
                  </p>
                </div>
              </div>
            </div>

            {}
            <div className="space-y-4 pt-4 border-t border-slate-600">
              <h5 className="text-sm font-medium text-slate-300">
                {t("telegram.notifications.title")}
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      {t("telegram.notifications.realtimeTitle")}
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("telegram.notifications.realtimeDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={telegramConfig.realtime_notifications}
                    onCheckedChange={(checked) =>
                      updateTelegramConfig("realtime_notifications", checked)
                    }
                    disabled={isTelegramLoading}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      {t("telegram.notifications.dailyReportTitle")}
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("telegram.notifications.dailyReportDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={telegramConfig.daily_report}
                    onCheckedChange={(checked) =>
                      updateTelegramConfig("daily_report", checked)
                    }
                    disabled={isTelegramLoading}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      {t("telegram.notifications.weeklyReportTitle")}
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("telegram.notifications.weeklyReportDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={telegramConfig.weekly_report}
                    onCheckedChange={(checked) =>
                      updateTelegramConfig("weekly_report", checked)
                    }
                    disabled={isTelegramLoading}
                  />
                </div>
              </div>
            </div>

            {}
            <div className="space-y-4 pt-4 border-t border-slate-600">
              <h5 className="text-sm font-medium text-slate-300">
                {t("telegram.remoteControl.title")}
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      {t("telegram.remoteControl.enableCommands")}
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("telegram.remoteControl.enableCommandsDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={telegramConfig.commands_enabled}
                    onCheckedChange={(checked) =>
                      updateTelegramConfig("commands_enabled", checked)
                    }
                    disabled={isTelegramLoading}
                  />
                </div>
                {telegramConfig.commands_enabled && (
                  <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <p className="text-xs text-blue-300 mb-2 font-medium">
                      {t("telegram.remoteControl.availableCommands")}
                    </p>
                    <ul className="text-xs text-blue-300 space-y-1 ml-4">
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          {
                            t("telegram.remoteControl.banCommand").split(
                              " - ",
                            )[0]
                          }
                        </code>{" "}
                        -{" "}
                        {t("telegram.remoteControl.banCommand").split(" - ")[1]}
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          {
                            t("telegram.remoteControl.unbanCommand").split(
                              " - ",
                            )[0]
                          }
                        </code>{" "}
                        -{" "}
                        {
                          t("telegram.remoteControl.unbanCommand").split(
                            " - ",
                          )[1]
                        }
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          {
                            t("telegram.remoteControl.listCommand").split(
                              " - ",
                            )[0]
                          }
                        </code>{" "}
                        -{" "}
                        {
                          t("telegram.remoteControl.listCommand").split(
                            " - ",
                          )[1]
                        }
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          {
                            t("telegram.remoteControl.statsCommand").split(
                              " - ",
                            )[0]
                          }
                        </code>{" "}
                        -{" "}
                        {
                          t("telegram.remoteControl.statsCommand").split(
                            " - ",
                          )[1]
                        }
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
