import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, CheckCircle } from "lucide-react";
import { authService } from "@/utils/apiService";

export const RebootingScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [message, setMessage] = useState("Backend in riavvio...");

  useEffect(() => {
    const startTime = Date.now();
    const maxDuration = 30000;
    let healthCheckInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const checkBackendHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setIsBackendOnline(true);
          setProgress(100);
          setMessage("Backend online!");
          return true;
        }
      } catch (err) {}
      return false;
    };

    healthCheckInterval = setInterval(async () => {
      const isOnline = await checkBackendHealth();
      if (isOnline) {
        clearInterval(healthCheckInterval);
        clearInterval(progressInterval);

        setTimeout(() => {
          navigate("/");

          authService.logout().catch((err) => {
            console.warn("Logout fallito:", err);
          });
        }, 1000);
      }
    }, 500);

    progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progressPercent = Math.min(90, (elapsedTime / maxDuration) * 90);

      if (!isBackendOnline) {
        setProgress(progressPercent);
      }
    }, 100);

    const fallbackTimer = setTimeout(() => {
      clearInterval(healthCheckInterval);
      clearInterval(progressInterval);
      setProgress(100);
      setMessage("Timeout - Reindirizzamento...");

      setTimeout(() => {
        navigate("/");
        authService.logout().catch((err) => {
          console.warn("Logout fallito:", err);
        });
      }, 1000);
    }, maxDuration);

    return () => {
      clearInterval(healthCheckInterval);
      clearInterval(progressInterval);
      clearTimeout(fallbackTimer);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-8">
        {}
        <div className="flex justify-center">
          {isBackendOnline ? (
            <div className="h-24 w-24 flex items-center justify-center">
              <CheckCircle className="h-24 w-24 text-green-400 animate-pulse" />
            </div>
          ) : (
            <div className="relative w-24 h-24">
              {}
              <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>

              {}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>

              {}
              <div className="absolute inset-0 flex items-center justify-center">
                <RotateCcw className="h-10 w-10 text-blue-400" />
              </div>
            </div>
          )}
        </div>

        {}
        <div className="space-y-2">
          <h1
            className={`text-3xl font-bold ${isBackendOnline ? "text-green-400" : "text-white"}`}
          >
            {isBackendOnline ? "Riavvio completato!" : "Riavvio in corso..."}
          </h1>
          <p className="text-slate-400 text-lg">{message}</p>
          <p className="text-slate-500 text-sm">
            {isBackendOnline
              ? "Reindirizzamento..."
              : "Attendere il ripristino del backend"}
          </p>
        </div>

        {}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100"
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>

        {}
        <div className="text-6xl font-bold text-blue-400">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};
