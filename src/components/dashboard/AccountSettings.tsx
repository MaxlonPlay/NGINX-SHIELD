import { useState, useEffect } from "react";
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
  CircleUser,
  Loader2,
  Save,
  Eye,
  EyeOff,
  User,
  Calendar,
} from "lucide-react";
import { authService } from "../../utils/apiService";
import { TOTPConfiguration } from "./TOTPConfiguration";

export const AccountSettings = () => {
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

  const { toast } = useToast();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const result = await authService.getUserInfo();
        console.log("Risultato getUserInfo:", result);

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
            console.error("Struttura dati utente non riconosciuta:", result);
            toast({
              title: "Attenzione",
              description:
                "Impossibile recuperare alcune informazioni dell'account.",
              variant: "destructive",
            });
          }
        } else {
          console.error("Errore nella risposta getUserInfo:", result);
          toast({
            title: "Errore",
            description: "Impossibile recuperare le informazioni dell'account.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          "Errore durante il recupero delle informazioni utente:",
          error,
        );
        toast({
          title: "Errore",
          description:
            "Errore di connessione durante il recupero delle informazioni.",
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
        title: "Errore",
        description: "Tutti i campi sono obbligatori.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Errore",
        description: "La nuova password deve contenere almeno 8 caratteri.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Errore",
        description: "Le nuove password non corrispondono.",
        variant: "destructive",
      });
      return;
    }

    if (!loggedInUsername) {
      toast({
        title: "Errore",
        description:
          "Impossibile recuperare il nome utente per l'aggiornamento.",
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
          title: "Successo",
          description:
            "Password aggiornata. Per sicurezza, verrai disconnesso a breve. Effettua di nuovo il login.",
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
          title: "Errore",
          description:
            result.message || "Errore durante l'aggiornamento della password.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Errore durante il cambio password:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Impossibile aggiornare la password. Verifica la password attuale o riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      {}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CircleUser className="h-5 w-5 mr-2 text-blue-400" />
            Impostazioni Account
          </CardTitle>
          <CardDescription className="text-slate-400">
            Gestisci le impostazioni del tuo account, inclusa la modifica della
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {}
          <div className="mb-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <h3 className="text-md font-semibold text-white mb-3">
              Dettagli Account
            </h3>
            <div className="space-y-2">
              <div className="flex items-center text-slate-300">
                <User className="h-4 w-4 mr-2 text-blue-400" />
                <span className="font-medium">Nome Utente:</span>
                <span className="ml-2 text-white">
                  {loggedInUsername || "Caricamento..."}
                </span>
              </div>
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                <span className="font-medium">Ultima Modifica Password:</span>
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
              Cambia Password
            </Button>
          )}

          {}
          {showPasswordForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700"
            >
              <h3 className="text-md font-semibold text-white mb-3">
                Cambio Password
              </h3>

              {}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-300">
                  Password Attuale
                </Label>
                <div className="relative">
                  <Input
                    id="current-password-input"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Inserisci la password attuale"
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
                  Nuova Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password-input"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Inserisci la nuova password (min. 8 caratteri)"
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
                  Conferma Nuova Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password-input"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Conferma la nuova password"
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
                    Aggiornando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Cambia Password
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
                Annulla
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
