import React from "react";
import {
  AlertCircle,
  Lock,
  FileText,
  ShieldAlert,
  Info,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SecureAccessBlockedPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-full mb-4 border border-red-500/30">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">
            Security Intercepted / Access Denied
          </h1>
          <p className="text-md text-slate-400 font-medium">
            Protocol Enforcement: HTTPS-only is ACTIVE
          </p>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {}
          <div className="p-5 rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <strong className="text-red-400 text-xs uppercase font-black tracking-widest">
                [EN] Critical Protocol Violation
              </strong>
            </div>
            <p className="text-[13px] text-slate-300 leading-snug">
              The core security engine intercepted an illicit unencrypted
              request. Since <strong>SECURE_COOKIES</strong> is enforced, your
              connection is a massive liability. Access is strictly terminated:
              establish a secure SSL/TLS tunnel immediately.
            </p>
          </div>

          {}
          <div className="p-5 rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <strong className="text-red-400 text-xs uppercase font-black tracking-widest">
                [IT] Violazione Protocollo Critica
              </strong>
            </div>
            <p className="text-[13px] text-slate-300 leading-snug">
              Il motore di sicurezza ha intercettato una richiesta non cifrata
              illecita. Con <strong>SECURE_COOKIES</strong> attivo, la tua
              sessione è una vulnerabilità inaccettabile. L'accesso è terminato:
              stabilisci immediatamente un tunnel SSL/TLS.
            </p>
          </div>

          {/* [ES] */}
          <div className="p-5 rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <strong className="text-red-400 text-xs uppercase font-black tracking-widest">
                [ES] Violación de Protocolo Crítica
              </strong>
            </div>
            <p className="text-[13px] text-slate-300 leading-snug">
              El motor de seguridad ha interceptado una solicitud no cifrada
              ilícita. Bajo <strong>SECURE_COOKIES</strong>, su conexión es un
              riesgo de seguridad masivo. El acceso ha sido revocado: establezca
              un túnel SSL/TLS de inmediato.
            </p>
          </div>

          {/* [DE] */}
          <div className="p-5 rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <strong className="text-red-400 text-xs uppercase font-black tracking-widest">
                [DE] Kritische Protokollverletzung
              </strong>
            </div>
            <p className="text-[13px] text-slate-300 leading-snug">
              Die Security-Engine hat eine illegale, unverschlüsselte Anfrage
              abgefangen. Da <strong>SECURE_COOKIES</strong> erzwungen wird, ist
              Ihre Verbindung ein Sicherheitsrisiko. Der Zugriff wurde beendet:
              Erstellen Sie sofort einen SSL/TLS-Tunnel.
            </p>
          </div>
        </div>

        {/* Solutions - Fully translated to English */}
        <div className="space-y-6">
          {/* Option 1 */}
          <div className="bg-slate-700/20 rounded-lg border border-blue-500/30 p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                1
              </span>
              Corrective Action: Use HTTPS/Proxy
            </h3>
            <p className="text-sm text-slate-300 mb-3">
              If you have configured NGINX as a proxy with SSL/TLS, access the
              service via your secure domain. Cookies will only be transmitted
              over verified HTTPS connections:
            </p>
            <div className="bg-slate-900/50 border border-blue-500/20 rounded p-3 text-sm font-mono text-blue-300 flex items-center justify-between">
              <span>https://your-domain.com</span>
              <ExternalLink className="w-4 h-4 opacity-50" />
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-mono">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Protocol Check: TLS_1.3 Required</span>
            </div>
          </div>

          {/* Option 2 */}
          <div className="bg-slate-700/20 rounded-lg border border-orange-500/30 p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                2
              </span>
              Override: Disable Secure Mode (Dangerous)
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              If you run the service locally and require direct HTTP access, you
              must manually reduce security (not recommended if you want to
              expose the service):
            </p>

            <div className="bg-slate-900/50 border border-orange-500/20 rounded p-4 mb-4">
              <p className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Step 1: Locate the configuration file
              </p>
              <div className="bg-slate-800 rounded border border-slate-600 p-3 text-sm font-mono text-slate-300 mb-4 overflow-x-auto">
                data/conf/secure.conf
              </div>

              <p className="text-sm font-semibold text-orange-400 mb-2">
                Step 2: Modify the secure parameters:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" /> Before:
                  </p>
                  <div className="bg-slate-800 border border-red-500/20 rounded p-2 text-sm font-mono text-red-400">
                    {'"SECURE_COOKIES": true'}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> After:
                  </p>
                  <div className="bg-slate-800 border border-green-500/20 rounded p-2 text-sm font-mono text-green-400">
                    {'"SECURE_COOKIES": false'}
                  </div>
                </div>
              </div>

              <p className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Step 3: Restart the application
              </p>
              <div className="bg-slate-800 rounded border border-slate-600 p-3 text-sm font-mono text-slate-300">
                docker restart nginx-shield
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="container mx-auto px-4 py-8 border-t border-slate-700 mt-8">
          <div className="flex items-center justify-center text-slate-400 text-sm">
            <p className="flex items-center space-x-2">
              © {new Date().getFullYear()} MaxlonPlay
              <a
                href="https://github.com/MaxlonPlay"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link p-1 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 ml-2 transition-colors"
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
              <span className="ml-1">. Distributed under the </span>
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline font-medium"
              >
                GNU General Public License v3.0
              </a>
              <span>.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureAccessBlockedPage;
