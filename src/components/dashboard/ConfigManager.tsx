import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RebootingScreen } from "@/pages/RebootingScreen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Mail,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService, SystemConfig, EmailConfig } from "@/utils/apiService";
import { useHttpStatusCodes } from "@/hooks/useHttpStatusCodes";
import { NotifyTelegram } from "./NotifyTelegram";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ConfigManager = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [secureConfig, setSecureConfig] = useState<{ SECURE_COOKIES: boolean }>(
    { SECURE_COOKIES: true },
  );
  const [previousSecureConfig, setPreviousSecureConfig] = useState<{
    SECURE_COOKIES: boolean;
  }>({ SECURE_COOKIES: true });
  const [pendingSecureConfig, setPendingSecureConfig] = useState<{
    SECURE_COOKIES: boolean;
  }>({ SECURE_COOKIES: true });
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    enabled: false,
    smtp_server: "smtp.gmail.com",
    smtp_port: 587,
    use_tls: true,
    username: "",
    password: "",
    from: "",
    to: [],
    subject: "IP bannato",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSecureConfigLoading, setIsSecureConfigLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showConfirmIgnoreWhitelist, setShowConfirmIgnoreWhitelist] =
    useState(false);
  const [showSecureCookiesWarning, setShowSecureCookiesWarning] =
    useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [emailSectionExpanded, setEmailSectionExpanded] = useState(false);
  const [newEmailRecipient, setNewEmailRecipient] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const { lowCriticalityCodes, mediumCriticalityCodes, highCriticalityCodes } =
    useHttpStatusCodes();

  useEffect(() => {
    loadConfig();
    loadSecureConfig();
    loadEmailConfig();
  }, []);

  const loadConfig = async (showToast = false) => {
    setIsLoading(true);
    try {
      const loadedConfig = await authService.getSystemConfig();
      setConfig(loadedConfig);
      if (showToast) {
        toast({
          title: "Configurazione caricata",
          description:
            "La configurazione è stata caricata con successo dal backend.",
        });
      }
    } catch (error: any) {
      console.error("Errore caricamento configurazione:", error);
      if (showToast) {
        toast({
          title: "Errore",
          description: `Impossibile caricare la configurazione: ${error.message}`,
          variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  };

  const loadSecureConfig = async (showToast = false) => {
    setIsSecureConfigLoading(true);
    try {
      const response = await authService.getSecureConfig();
      if (response.success && response.config) {
        const config = {
          SECURE_COOKIES: response.config.SECURE_COOKIES,
        };
        setSecureConfig(config);
        setPreviousSecureConfig(config);
        setPendingSecureConfig(config);
        if (showToast) {
          toast({
            title: "Configurazione sicurezza caricata",
            description:
              "La configurazione di sicurezza è stata caricata con successo.",
          });
        }
      }
    } catch (error: any) {
      console.error("Errore caricamento configurazione sicurezza:", error);
      if (showToast) {
        toast({
          title: "Errore",
          description: `Impossibile caricare la configurazione di sicurezza: ${error.message}`,
          variant: "destructive",
        });
      }
    }
    setIsSecureConfigLoading(false);
  };

  const loadEmailConfig = async (showToast = false) => {
    setIsEmailLoading(true);
    try {
      const response = await authService.getMailConfig();
      if (response.success) {
        setEmailConfig(response.config);
        if (showToast) {
          toast({
            title: "Configurazione email caricata",
            description:
              "La configurazione email è stata caricata con successo.",
          });
        }
      }
    } catch (error: any) {
      console.error("Errore caricamento configurazione email:", error);
      if (showToast) {
        toast({
          title: "Errore",
          description: `Impossibile caricare la configurazione email: ${error.message}`,
          variant: "destructive",
        });
      }
    }
    setIsEmailLoading(false);
  };

  const loadAllConfigurations = async () => {
    try {
      await Promise.all([
        loadConfig(false),
        loadSecureConfig(false),
        loadEmailConfig(false),
      ]);
      toast({
        title: "Configurazioni caricate",
        description:
          "Tutte le configurazioni sono state caricate con successo.",
      });
    } catch (error: any) {
      console.error("Errore caricamento configurazioni:", error);
      toast({
        title: "Errore",
        description: `Impossibile caricare le configurazioni: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    const maxRequestsValue = config.MAX_REQUESTS;
    const numMaxRequests = parseInt(maxRequestsValue.toString());
    if (isNaN(numMaxRequests) || numMaxRequests <= 0) {
      toast({
        title: "Errore di validazione",
        description:
          "Il campo 'Max Richieste' deve essere un numero positivo (maggiore di 0).",
        variant: "destructive",
      });
      return;
    }
    if (maxRequestsValue.toString().length > 3) {
      toast({
        title: "Errore di validazione",
        description: "Il campo 'Max Richieste' non può superare 3 cifre.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await authService.updateSystemConfig(config);
      toast({
        title: "Configurazione salvata",
        description:
          "Le modifiche sono state salvate e sincronizzate con il sistema.",
      });
    } catch (error: any) {
      console.error("Errore salvataggio configurazione:", error);
      toast({
        title: "Errore",
        description: `Errore durante il salvataggio della configurazione: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const saveEmailConfig = async () => {
    if (emailConfig.enabled) {
      if (!emailConfig.smtp_server.trim()) {
        toast({
          title: "Errore di validazione",
          description:
            "Il server SMTP è obbligatorio quando le notifiche email sono abilitate.",
          variant: "destructive",
        });
        return;
      }
      if (!emailConfig.username.trim()) {
        toast({
          title: "Errore di validazione",
          description:
            "Il nome utente è obbligatorio quando le notifiche email sono abilitate.",
          variant: "destructive",
        });
        return;
      }
      if (!emailConfig.password.trim()) {
        toast({
          title: "Errore di validazione",
          description:
            "La password è obbligatoria quando le notifiche email sono abilitate.",
          variant: "destructive",
        });
        return;
      }
      if (!emailConfig.from.trim()) {
        toast({
          title: "Errore di validazione",
          description:
            "L'indirizzo mittente è obbligatorio quando le notifiche email sono abilitate.",
          variant: "destructive",
        });
        return;
      }
      if (emailConfig.to.length === 0) {
        toast({
          title: "Errore di validazione",
          description:
            "Almeno un destinatario è obbligatorio quando le notifiche email sono abilitate.",
          variant: "destructive",
        });
        return;
      }
    }
    setIsEmailLoading(true);
    try {
      const response = await authService.updateMailConfig(emailConfig);
      if (response.success) {
        toast({
          title: "Configurazione email salvata",
          description: response.message,
        });
      }
    } catch (error: any) {
      console.error("Errore salvataggio configurazione email:", error);
      toast({
        title: "Errore",
        description: `Errore durante il salvataggio della configurazione email: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsEmailLoading(false);
  };

  const handleRestartBackendNow = async () => {
    setShowRestartDialog(false);

    setSecureConfig(pendingSecureConfig);
    setPreviousSecureConfig(pendingSecureConfig);

    setIsSecureConfigLoading(true);
    try {
      await authService.updateSecureConfig(pendingSecureConfig);

      toast({
        title: "Riavvio richiesto",
        description: "Il backend verrà riavviato tra pochi secondi...",
        variant: "default",
      });

      setIsRebooting(true);
    } catch (err: any) {
      setSecureConfig(previousSecureConfig);
      const message =
        err?.response?.data?.detail ||
        "Errore durante il salvataggio della configurazione";
      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });
    }
    setIsSecureConfigLoading(false);
  };

  const handleRestartBackendLater = async () => {
    setShowRestartDialog(false);

    setSecureConfig(pendingSecureConfig);
    setPreviousSecureConfig(pendingSecureConfig);

    setIsSecureConfigLoading(true);
    try {
      await authService.updateSecureConfig(pendingSecureConfig);
      toast({
        title: "Modifiche salvate",
        description:
          "Le modifiche alle impostazioni di sicurezza sono state salvate. Avranno effetto al prossimo riavvio del backend.",
        variant: "default",
      });
    } catch (err: any) {
      setSecureConfig(previousSecureConfig);
      const message =
        err?.response?.data?.detail ||
        "Errore durante il salvataggio della configurazione";
      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });
    }
    setIsSecureConfigLoading(false);
  };

  const handleSecureConfigDialogClose = () => {
    setShowRestartDialog(false);
    setSecureConfig(previousSecureConfig);
    setShowSecureCookiesWarning(false);
  };

  const saveSecureConfig = async () => {
    setIsSecureConfigLoading(true);
    try {
      const response = await authService.updateSecureConfig(secureConfig);
      if (response.success) {
        toast({
          title: "Configurazione sicurezza salvata",
          description: response.message,
        });
      }
    } catch (error: any) {
      console.error("Errore salvataggio configurazione sicurezza:", error);
      toast({
        title: "Errore",
        description: `Errore durante il salvataggio: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsSecureConfigLoading(false);
  };

  const handleSecureCookiesChange = (checked: boolean) => {
    if (!checked) {
      setShowSecureCookiesWarning(true);
      setPendingSecureConfig({ SECURE_COOKIES: checked });
    } else {
      setPendingSecureConfig({ SECURE_COOKIES: checked });
      setShowRestartDialog(true);
    }
  };

  const confirmDisableSecureCookies = () => {
    toast({
      title: "Attenzione",
      description: "Procedi alla conferma per disabilitare i cookie sicuri.",
      variant: "default",
    });
    setShowSecureCookiesWarning(false);
    setShowRestartDialog(true);
  };

  const saveSecureConfigAutomatically = async (config: {
    SECURE_COOKIES: boolean;
  }) => {
    setIsSecureConfigLoading(true);
    try {
      const response = await authService.updateSecureConfig(config);
      if (response.success) {
        toast({
          title: "Configurazione sicurezza salvata",
          description: response.message,
        });
      }
    } catch (error: any) {
      console.error("Errore salvataggio configurazione sicurezza:", error);
      toast({
        title: "Errore",
        description: `Errore durante il salvataggio: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsSecureConfigLoading(false);
  };

  const updateConfig = (
    path: string,
    value: any,
    saveImmediately: boolean = false,
  ) => {
    if (!config) return;
    const newConfig = { ...config };
    const keys = path.split(".");
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
    if (saveImmediately) {
      setTimeout(() => {
        authService
          .updateSystemConfig(newConfig)
          .then(() => {
            toast({
              title: "Configurazione salvata automaticamente",
              description: "La modifica è stata salvata.",
            });
          })
          .catch((error: any) => {
            console.error(
              "Errore salvataggio automatico configurazione:",
              error,
            );
            toast({
              title: "Errore",
              description: `Errore durante il salvataggio automatico della configurazione: ${error.message}`,
              variant: "destructive",
            });
          });
      }, 0);
    }
  };

  const updateEmailConfig = (field: keyof EmailConfig, value: any) => {
    setEmailConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmailEnabledChange = async (enabled: boolean) => {
    updateEmailConfig("enabled", enabled);
    setIsEmailLoading(true);
    try {
      const response = await authService.updateMailConfig({
        ...emailConfig,
        enabled,
      });
      if (response.success) {
        toast({
          title: "Configurazione email aggiornata",
          description:
            "Lo stato delle notifiche email è stato salvato con successo.",
        });
      }
    } catch (error: any) {
      console.error("Errore durante l'aggiornamento automatico:", error);
      toast({
        title: "Attenzione",
        description: `Compila tutti i campi`,
        variant: "destructive",
      });
    }
    setIsEmailLoading(false);
  };

  const addEmailRecipient = () => {
    if (
      newEmailRecipient.trim() &&
      !emailConfig.to.includes(newEmailRecipient.trim())
    ) {
      updateEmailConfig("to", [...emailConfig.to, newEmailRecipient.trim()]);
      setNewEmailRecipient("");
    }
  };

  const removeEmailRecipient = (email: string) => {
    updateEmailConfig(
      "to",
      emailConfig.to.filter((e) => e !== email),
    );
  };

  const handleIgnoreWhitelistChange = (checked: boolean) => {
    if (checked) {
      setShowConfirmIgnoreWhitelist(true);
    } else {
      updateConfig("IGNORE_WHITELIST", checked, true);
    }
  };

  const confirmIgnoreWhitelist = () => {
    const newConfig = { ...config!, IGNORE_WHITELIST: true };
    setConfig(newConfig);
    setShowConfirmIgnoreWhitelist(false);
    setTimeout(() => {
      authService
        .updateSystemConfig(newConfig)
        .then(() => {
          toast({
            title: "Attenzione",
            description:
              "L'opzione 'Ignora whitelist' è stata abilitata e salvata. Tutti gli IP saranno soggetti a monitoraggio.",
            variant: "destructive",
          });
        })
        .catch((error: any) => {
          console.error("Errore salvataggio automatico configurazione:", error);
          toast({
            title: "Errore",
            description: `Errore durante il salvataggio automatico della configurazione: ${error.message}`,
            variant: "destructive",
          });
        });
    }, 0);
  };

  const cancelIgnoreWhitelist = () => {
    setShowConfirmIgnoreWhitelist(false);
  };

  const toggleHttpCode = (code: number) => {
    if (!config) return;
    const currentCodes = config.CODES_TO_ALLOW;
    let newCodes: number[];
    if (currentCodes.includes(code)) {
      newCodes = currentCodes.filter((c) => c !== code);
    } else {
      newCodes = [...currentCodes, code].sort((a, b) => a - b);
    }
    updateConfig("CODES_TO_ALLOW", newCodes, true);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">
          {isLoading
            ? "Caricamento configurazione..."
            : "Configurazione non disponibile"}
        </div>
      </div>
    );
  }

  return (
    <>
      {}
      {isRebooting && <RebootingScreen />}

      {!isRebooting && (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-blue-400" />
                    Configurazione Sistema
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Gestisci i parametri del sistema NGINX Shield
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={loadConfig}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="border-slate-600 text-slate-900"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Ricarica
                  </Button>
                  <Button
                    onClick={saveConfig}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">
                  Configurazione Base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="log_dir" className="text-slate-300">
                      Directory Log
                    </Label>
                    <Input
                      id="log_dir"
                      value={config.LOG_DIR}
                      readOnly
                      className="bg-slate-900/30 border-slate-700 text-slate-500 cursor-not-allowed"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jail_name" className="text-slate-300">
                      Nome Jail Fail2Ban
                    </Label>
                    <Input
                      id="jail_name"
                      value={config.JAIL_NAME}
                      onChange={(e) =>
                        updateConfig("JAIL_NAME", e.target.value)
                      }
                      className="bg-slate-900/50 border-slate-600 text-white"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_requests" className="text-slate-300">
                      Max Richieste
                    </Label>
                    <Input
                      id="max_requests"
                      type="number"
                      value={config.MAX_REQUESTS}
                      onChange={(e) =>
                        updateConfig("MAX_REQUESTS", e.target.value)
                      }
                      className="bg-slate-900/50 border-slate-600 text-white"
                      disabled={isLoading}
                      max="999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_frame" className="text-slate-300">
                      Finestra Temporale (secondi)
                    </Label>
                    <Input
                      id="time_frame"
                      type="number"
                      value={config.TIME_FRAME}
                      onChange={(e) =>
                        updateConfig("TIME_FRAME", parseInt(e.target.value))
                      }
                      className="bg-slate-900/50 border-slate-600 text-white"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <TooltipProvider delayDuration={200}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                        Codici HTTP a Bassa Criticità
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Questi codici indicano solitamente interazioni riuscite
                        o informative. Selezionali per consentirli.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {lowCriticalityCodes.map((item) => (
                          <Tooltip key={item.code}>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => toggleHttpCode(item.code)}
                                disabled={isLoading}
                                className={
                                  `flex items-center justify-center h-7 w-11 ` +
                                  (config.CODES_TO_ALLOW.includes(item.code)
                                    ? "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                    : "bg-red-900/20 hover:bg-red-800/30 text-red-300 border-red-700")
                                }
                              >
                                <span className="font-bold text-lg">
                                  {item.code}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded-md shadow-lg">
                              <p>{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
                        Codici HTTP a Media Criticità
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Gestisci questi codici HTTP con cautela, specialmente se
                        sospetti abusi. Attenzione ai possibili falsi positivi.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {mediumCriticalityCodes.map((item) => (
                          <Tooltip key={item.code}>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => toggleHttpCode(item.code)}
                                disabled={isLoading}
                                className={
                                  `flex items-center justify-center h-7 w-11 ` +
                                  (config.CODES_TO_ALLOW.includes(item.code)
                                    ? "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                    : "bg-red-900/20 hover:bg-red-800/30 text-red-300 border-red-700")
                                }
                              >
                                <span className="font-bold text-lg">
                                  {item.code}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded-md shadow-lg">
                              <p>{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                        Codici HTTP ad Alta Criticità
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Questi codici indicano problemi o potenziali attacchi.
                        Deselezionali se vuoi che scatenino il ban, o
                        selezionali se li consideri normali per la tua
                        applicazione (es. 404 per risorse mancanti).
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {highCriticalityCodes.map((item) => (
                          <Tooltip key={item.code}>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => toggleHttpCode(item.code)}
                                disabled={isLoading}
                                className={
                                  `flex items-center justify-center h-7 w-11 ` +
                                  (config.CODES_TO_ALLOW.includes(item.code)
                                    ? "bg-green-600 hover:bg-green-700 text-white border-green-700"
                                    : "bg-red-900/20 hover:bg-red-800/30 text-red-300 border-red-700")
                                }
                              >
                                <span className="font-bold text-lg">
                                  {item.code}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded-md shadow-lg">
                              <p>{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
              </div>
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-white">
                  Opzioni Sistema
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-slate-300 text-sm font-medium">
                        Log Whitelist
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Registra le attività degli IP in whitelist
                      </p>
                    </div>
                    <Switch
                      checked={config.ENABLE_WHITELIST_LOG}
                      onCheckedChange={(checked) =>
                        updateConfig("ENABLE_WHITELIST_LOG", checked, true)
                      }
                      disabled={isLoading}
                      className="ml-3"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-red-300 text-sm font-medium">
                        Ignora Whitelist
                      </Label>
                      <p className="text-xs text-red-400 mt-1">
                        Se abilitato, il sistema monitorerà e bannerà anche gli
                        IP presenti nella whitelist.
                        <span className="font-bold text-red-200">
                          {" "}
                          **Usare con cautela!**
                        </span>
                      </p>
                    </div>
                    <Switch
                      checked={config.IGNORE_WHITELIST}
                      onCheckedChange={handleIgnoreWhitelistChange}
                      disabled={isLoading}
                      className="ml-3"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-white">
                  Configurazione Sicurezza
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700">
                    <div className="flex-1">
                      <Label className="text-slate-300 text-sm font-medium">
                        Cookie Sicuri (HTTPS/Proxy)
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Quando abilitato: i cookie funzionano solo dietro proxy
                        HTTPS. Quando disabilitato: i cookie funzionano anche su
                        HTTP diretto.
                      </p>
                    </div>
                    <Switch
                      checked={secureConfig.SECURE_COOKIES}
                      onCheckedChange={handleSecureCookiesChange}
                      disabled={isSecureConfigLoading}
                      className="ml-3"
                    />
                  </div>
                  {!secureConfig.SECURE_COOKIES && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-300">
                        <span className="font-bold">HTTP Enabled:</span> Cookies
                        are not secure. The system accepts direct HTTP
                        connections via IP. Change this setting for enhanced
                        security.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-white">
                  Notifiche Email
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-blue-400" />
                        <Label className="text-slate-300 text-sm font-medium">
                          Abilita Notifiche Email
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Ricevi notifiche email quando vengono bannati nuovi IP
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={emailConfig.enabled}
                        onCheckedChange={handleEmailEnabledChange}
                        disabled={isEmailLoading}
                      />
                      {emailConfig.enabled && (
                        <Button
                          onClick={() =>
                            setEmailSectionExpanded(!emailSectionExpanded)
                          }
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          {emailSectionExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {emailConfig.enabled && emailSectionExpanded && (
                    <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-600 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-white">
                          Configurazione Server SMTP
                        </h4>
                        <div className="flex space-x-2">
                          <Button
                            onClick={loadAllConfigurations}
                            variant="outline"
                            size="sm"
                            disabled={isEmailLoading}
                            className="border-slate-600 text-slate-900"
                          >
                            <RefreshCw
                              className={`h-4 w-4 mr-2 ${isEmailLoading ? "animate-spin" : ""}`}
                            />
                            Ricarica
                          </Button>
                          <Button
                            onClick={saveEmailConfig}
                            size="sm"
                            disabled={isEmailLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salva Email Config
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="smtp_server"
                            className="text-slate-300"
                          >
                            Server SMTP *
                          </Label>
                          <Input
                            id="smtp_server"
                            value={emailConfig.smtp_server}
                            onChange={(e) =>
                              updateEmailConfig("smtp_server", e.target.value)
                            }
                            className="bg-slate-900/50 border-slate-600 text-white"
                            placeholder="smtp.gmail.com"
                            disabled={isEmailLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp_port" className="text-slate-300">
                            Porta SMTP
                          </Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            value={emailConfig.smtp_port}
                            onChange={(e) =>
                              updateEmailConfig(
                                "smtp_port",
                                parseInt(e.target.value) || 587,
                              )
                            }
                            className="bg-slate-900/50 border-slate-600 text-white"
                            disabled={isEmailLoading}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={emailConfig.use_tls}
                          onCheckedChange={(checked) =>
                            updateEmailConfig("use_tls", checked)
                          }
                          disabled={isEmailLoading}
                        />
                        <Label className="text-slate-300 text-sm">
                          Usa TLS/STARTTLS
                        </Label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="email_username"
                            className="text-slate-300"
                          >
                            Nome utente *
                          </Label>
                          <Input
                            id="email_username"
                            value={emailConfig.username}
                            onChange={(e) =>
                              updateEmailConfig("username", e.target.value)
                            }
                            className="bg-slate-900/50 border-slate-600 text-white"
                            placeholder="esempio@gmail.com"
                            disabled={isEmailLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="email_password"
                            className="text-slate-300"
                          >
                            Password *
                          </Label>
                          <Input
                            id="email_password"
                            type="password"
                            value={emailConfig.password}
                            onChange={(e) =>
                              updateEmailConfig("password", e.target.value)
                            }
                            className="bg-slate-900/50 border-slate-600 text-white"
                            placeholder="••••••••••••"
                            disabled={isEmailLoading}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email_from" className="text-slate-300">
                          Indirizzo mittente *
                        </Label>
                        <Input
                          id="email_from"
                          value={emailConfig.from}
                          onChange={(e) =>
                            updateEmailConfig("from", e.target.value)
                          }
                          className="bg-slate-900/50 border-slate-600 text-white"
                          placeholder="esempio@gmail.com"
                          disabled={isEmailLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Destinatari *</Label>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              value={newEmailRecipient}
                              onChange={(e) =>
                                setNewEmailRecipient(e.target.value)
                              }
                              className="bg-slate-900/50 border-slate-600 text-white flex-1"
                              placeholder="Aggiungi indirizzo email destinatario"
                              onKeyPress={(e) =>
                                e.key === "Enter" && addEmailRecipient()
                              }
                              disabled={isEmailLoading}
                            />
                            <Button
                              onClick={addEmailRecipient}
                              size="sm"
                              disabled={isEmailLoading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {emailConfig.to.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {emailConfig.to.map((email, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-1 bg-blue-600/20 border border-blue-600/30 rounded-lg px-2 py-1"
                                >
                                  <span className="text-blue-200 text-sm">
                                    {email}
                                  </span>
                                  <Button
                                    onClick={() => removeEmailRecipient(email)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 text-blue-300 hover:text-red-400"
                                    disabled={isEmailLoading}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="email_subject"
                          className="text-slate-300"
                        >
                          Oggetto email
                        </Label>
                        <Input
                          id="email_subject"
                          value={emailConfig.subject}
                          onChange={(e) =>
                            updateEmailConfig("subject", e.target.value)
                          }
                          className="bg-slate-900/50 border-slate-600 text-white"
                          placeholder="IP bannato"
                          disabled={isEmailLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {}
              <NotifyTelegram onReloadAll={loadAllConfigurations} />
            </CardContent>
          </Card>
          <AlertDialog
            open={showConfirmIgnoreWhitelist}
            onOpenChange={setShowConfirmIgnoreWhitelist}
          >
            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-400">
                  Attenzione
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  Sei sicuro di voler abilitare l'opzione **Ignora Whitelist**?
                  Questo farà sì che il sistema monitori e possa bannare anche
                  gli IP che hai esplicitamente aggiunto alla whitelist.
                  <br />
                  <br />
                  Questa azione può portare a blocchi indesiderati di servizi o
                  utenti legittimi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={cancelIgnoreWhitelist}
                  className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                >
                  Annulla
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmIgnoreWhitelist}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Conferma e Abilita
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog
            open={showSecureCookiesWarning}
            onOpenChange={setShowSecureCookiesWarning}
          >
            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-yellow-400">
                  Attenzione sicurezza
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  Stai per disabilitare i cookie sicuri. Questo significa:
                  <br />
                  <br />
                  ✓ I cookie funzioneranno su HTTP diretto (accesso via IP)
                  <br />
                  ✗ Il sistema NON sarà protetto dietro un proxy HTTPS
                  <br />
                  ✗ Non idoneo se si vuole esporre il servizio pubblicamente
                  <br />
                  <br />
                  <span className="font-bold text-red-300">
                    Usa questa opzione solo se sai cosa stai facendo!
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={handleSecureConfigDialogClose}
                  className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                >
                  Mantieni Sicuro
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDisableSecureCookies}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Disabilita
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog
            open={showRestartDialog}
            onOpenChange={setShowRestartDialog}
          >
            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-blue-400">
                  Applicare le modifiche
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  Le modifiche alle impostazioni di sicurezza (Cookie Sicuri)
                  avranno effetto immediato, si consiglia comunque un riavvio
                  del backend ma non è obbligatorio.
                  <br />
                  <br />
                  Vuoi riavviare il backend{" "}
                  <span className="font-semibold">ora</span> o{" "}
                  <span className="font-semibold">dopo</span>?
                  <br />
                  <br />
                  <span className="text-yellow-300">
                    Se scegli "Ora", verrai disconnesso e dovrai eseguire
                    nuovamente il login.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={handleSecureConfigDialogClose}
                  className="bg-slate-600 text-white border-slate-700 hover:bg-slate-700 font-medium"
                >
                  Annulla
                </AlertDialogCancel>
                <Button
                  onClick={handleRestartBackendLater}
                  className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600 font-medium"
                >
                  Riavvia Dopo
                </Button>
                <AlertDialogAction
                  onClick={handleRestartBackendNow}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Riavvia Ora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
};
