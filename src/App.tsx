import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { LandingPage } from "@/components/LandingPage";
import { LoginPage } from "@/components/auth/LoginPage";
import { ChangePasswordPage } from "@/components/auth/ChangePasswordPage";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

const apiClient = axios.create(AXIOS_CONFIG);
setupAxiosInterceptors(apiClient);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const serverResponse = await apiClient.get("/auth-status");

        if (serverResponse.status === 200) {
          setServerStatus("online");

          const storedAuth = localStorage.getItem("nginxshield_auth");
          const sessionAuth = sessionStorage.getItem("nginxshield_session");

          if (sessionAuth === "authenticated" && storedAuth) {
            try {
              const authData = JSON.parse(storedAuth);
              const now = Date.now();
              const authTime = authData.timestamp || 0;
              const isExpired = now - authTime > 24 * 60 * 60 * 1000;

              if (!isExpired && authData.authenticated) {
                setIsAuthenticated(true);
                setRequiresPasswordChange(false);
              } else {
                localStorage.removeItem("nginxshield_auth");
                sessionStorage.removeItem("nginxshield_session");
              }
            } catch (error) {
              console.error(
                "Errore nel parsing dei dati di autenticazione:",
                error,
              );
              localStorage.removeItem("nginxshield_auth");
              sessionStorage.removeItem("nginxshield_session");
            }
          }
        } else {
          setServerStatus("offline");
        }
      } catch (error) {
        setServerStatus("offline");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (success: boolean, requiresPasswordChange?: boolean) => {
    if (success) {
      if (requiresPasswordChange) {
        setRequiresPasswordChange(true);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setRequiresPasswordChange(false);
        sessionStorage.setItem("nginxshield_session", "authenticated");
        localStorage.setItem(
          "nginxshield_auth",
          JSON.stringify({
            timestamp: Date.now(),
            authenticated: true,
          }),
        );
      }
    } else {
      setIsAuthenticated(false);
      setRequiresPasswordChange(false);
    }
  };

  const handlePasswordChanged = () => {
    setRequiresPasswordChange(false);
    setIsAuthenticated(true);
    sessionStorage.setItem("nginxshield_session", "authenticated");
    localStorage.setItem(
      "nginxshield_auth",
      JSON.stringify({
        timestamp: Date.now(),
        authenticated: true,
      }),
    );
  };

  const handleLogout = async () => {
    localStorage.removeItem("nginxshield_auth");
    sessionStorage.removeItem("nginxshield_session");
    setIsAuthenticated(false);
    setRequiresPasswordChange(false);
    toast({
      title: "Logout eseguito",
      description: "Sei stato disconnesso con successo",
      variant: "default",
    });
  };

  const handleGetStarted = () => {
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : requiresPasswordChange ? (
              <Navigate to="/change-password" />
            ) : (
              <LoginPage onLogin={handleLogin} serverStatus={serverStatus} />
            )
          }
        />
        <Route
          path="/info"
          element={<LandingPage onGetStarted={handleGetStarted} />}
        />
        <Route
          path="/change-password"
          element={
            requiresPasswordChange ? (
              <ChangePasswordPage onPasswordChanged={handlePasswordChanged} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
