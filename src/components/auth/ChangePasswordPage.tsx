import { useState, useEffect } from "react";
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
  Lock,
  User,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  HandCoins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/utils/apiService";

interface ChangePasswordPageProps {
  onPasswordChanged: () => void;
}

export const ChangePasswordPage = ({
  onPasswordChanged,
}: ChangePasswordPageProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [cardVisible, setCardVisible] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setTimeout(() => setLogoVisible(true), 100);
    setTimeout(() => setCardVisible(true), 300);
  }, []);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (!currentPassword || !newUsername || !newPassword || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Tutti i campi sono obbligatori.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le nuove password non corrispondono.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      toast({
        title: "Errore password",
        description:
          "La password deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.updateCredentials({
        current_password: currentPassword,
        new_username: newUsername,
        new_password: newPassword,
      });

      toast({
        title: "Credenziali Aggiornate",
        description: "Le tue credenziali sono state aggiornate con successo!",
        variant: "default",
      });

      onPasswordChanged();
    } catch (error: any) {
      let errorMessage =
        "Errore durante l'aggiornamento delle credenziali. Riprova.";
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = "Password corrente errata o sessione scaduta.";
        } else if (
          status === 400 &&
          error.response.data?.detail?.includes(
            "old_username cannot be default",
          )
        ) {
          errorMessage =
            "Non puoi cambiare il tuo username da 'admin_shield' a 'admin_david'. Effettua il primo login con 'admin_shield', poi cambia lo username a 'admin_david' e la password. Quindi effettua il login con le nuove credenziali.";
        } else if (status === 409) {
          errorMessage = "Username già in uso. Scegli un altro username.";
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message.includes("Network Error")) {
        errorMessage =
          "Impossibile connettersi al server. Verifica la tua connessione o contatta l'amministratore.";
      }

      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Animazione di ingresso per la card */
        .login-card-enter {
          opacity: 0;
          transform: translateY(20px);
        }
        .login-card-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }

        /* Animazione per il logo */
        .logo-icon-enter {
          opacity: 0;
          transform: scale(0.8);
        }
        .logo-icon-enter-active {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }

        /* Animazione per il titolo */
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

        /* Sfondo animato */
        .animated-background {
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }

        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Stili per i link social */
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
              Cambia Credenziali
            </CardTitle>
            <CardDescription className="text-slate-400">
              Per motivi di sicurezza, devi cambiare le credenziali di default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleChangePassword}>
              <div className="grid gap-4">
                {}
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-slate-300">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password Corrente
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="La tua password attuale"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      disabled={isLoading}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {}
                <div className="space-y-2">
                  <Label htmlFor="new-username" className="text-slate-300">
                    <User className="h-4 w-4 inline mr-2" />
                    Nuovo Username
                  </Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="Scegli un nuovo username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                    required
                    disabled={isLoading}
                  />
                </div>

                {}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Nuova Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 caratteri, maiuscola, minuscola, numero, speciale"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
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

                {}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Conferma Nuova Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Conferma la nuova password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
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
                  {isLoading ? "Aggiornamento..." : "Cambia Credenziali"}
                </Button>
              </div>
            </form>
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
    </>
  );
};
