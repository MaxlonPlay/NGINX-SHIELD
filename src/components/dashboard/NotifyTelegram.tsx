import { useState } from "react";
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
        title: "Configurazione Telegram aggiornata",
        description:
          "Lo stato delle notifiche Telegram è stato salvato con successo.",
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
        title: "Errore di validazione",
        description: "Bot Token e Chat ID sono obbligatori.",
        variant: "destructive",
      });
      return;
    }

    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
      toast({
        title: "Configurazione Telegram salvata",
        description: "La configurazione Telegram è stata salvata con successo.",
      });
    }, 500);
  };

  const testTelegramConnection = async () => {
    if (!telegramConfig.bot_token || !telegramConfig.chat_id) {
      toast({
        title: "Errore di validazione",
        description: "Bot Token e Chat ID sono obbligatori per il test.",
        variant: "destructive",
      });
      return;
    }

    setIsTelegramLoading(true);

    setTimeout(() => {
      setIsTelegramLoading(false);
      toast({
        title: "Test riuscito",
        description: "Il messaggio di test è stato inviato con successo!",
      });
    }, 500);
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-medium text-white">
        Notifiche Telegram (WORK IN PROGRESS)
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700">
          <div className="flex-1">
            <div className="flex items-center">
              <Send className="h-4 w-4 mr-2 text-blue-400" />
              <Label className="text-slate-300 text-sm font-medium">
                Abilita Notifiche Telegram
              </Label>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ricevi notifiche tramite bot Telegram quando vengono bannati nuovi
              IP
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
                Configurazione Bot Telegram
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
                  Ricarica
                </Button>
                <Button
                  onClick={testTelegramConnection}
                  variant="outline"
                  size="sm"
                  disabled={isTelegramLoading}
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Testa
                </Button>
                <Button
                  onClick={saveTelegramConfig}
                  size="sm"
                  disabled={isTelegramLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva Telegram Config
                </Button>
              </div>
            </div>

            {}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-slate-300">
                Credenziali Bot
              </h5>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bot_token" className="text-slate-300">
                    Bot Token *
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
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
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
                    Ottieni il token dal{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      @BotFather
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chat_id" className="text-slate-300">
                    Chat ID *
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
                      placeholder="-1001234567890"
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
                    ID della chat o gruppo dove ricevere le notifiche
                  </p>
                </div>
              </div>
            </div>

            {}
            <div className="space-y-4 pt-4 border-t border-slate-600">
              <h5 className="text-sm font-medium text-slate-300">
                Tipologia Notifiche
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      Notifiche in Tempo Reale
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Ricevi una notifica immediata ad ogni ban di un IP
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
                      Report Giornaliero
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Ricevi un riepilogo giornaliero dei ban effettuati
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
                      Report Settimanale
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Ricevi un riepilogo settimanale dei ban effettuati
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
                Controllo Remoto
              </h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm font-medium">
                      Abilita Comandi Bot
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Permetti di bannare e sbannare IP direttamente dalla chat
                      Telegram
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
                      Comandi disponibili:
                    </p>
                    <ul className="text-xs text-blue-300 space-y-1 ml-4">
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          /ban [IP]
                        </code>{" "}
                        - Banna un indirizzo IP
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          /unban [IP]
                        </code>{" "}
                        - Sbanna un indirizzo IP
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          /list
                        </code>{" "}
                        - Mostra gli IP attualmente bannati
                      </li>
                      <li>
                        •{" "}
                        <code className="bg-slate-900/50 px-1 rounded">
                          /stats
                        </code>{" "}
                        - Mostra statistiche sistema
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
