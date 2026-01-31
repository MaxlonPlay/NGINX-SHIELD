import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  MapPin,
  Clock,
  Settings,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RealTimeChart } from "@/components/dashboard/RealTimeChart";
import { ThreatMap } from "@/components/dashboard/ThreatMap";
import { RecentBans } from "@/components/dashboard/RecentBans";
import { LogViewer } from "@/components/dashboard/LogViewer";
import { WhitelistManager } from "@/components/dashboard/WhitelistManager";
import { ThreatAnalysis } from "@/components/dashboard/ThreatAnalysis";
import { IPManagement } from "@/components/dashboard/IPManagement";
import { PatternManager } from "@/components/dashboard/PatternManager";
import { ConfigManager } from "@/components/dashboard/ConfigManager";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Banhammer Dashboard
                </h1>
                <p className="text-slate-400 text-sm">
                  Sistema di Sicurezza con Gestione File Dinamica
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  isConnected
                    ? "bg-green-900/50 text-green-400"
                    : "bg-red-900/50 text-red-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                <span className="text-sm">
                  {isConnected ? "Connesso" : "Disconnesso"}
                </span>
              </div>

              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Clock className="h-4 w-4 mr-2" />
                Live
              </Button>
            </div>
          </div>
        </div>
      </header>

      {}
      <nav className="border-b border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: "overview", label: "Panoramica", icon: Activity },
              { id: "threats", label: "Minacce", icon: AlertTriangle },
              { id: "whitelist", label: "Whitelist", icon: Users },
              { id: "ipmanage", label: "Ban/Unban", icon: Shield },
              { id: "patterns", label: "Pattern", icon: Settings },
              { id: "config", label: "Configurazione", icon: Settings },
              { id: "logs", label: "Log", icon: MapPin },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-400 text-purple-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {}
      <main className="container mx-auto px-6 py-8">
        {!isConnected && (
          <Alert className="mb-6 border-orange-800 bg-orange-900/20 text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connessione al sistema Banhammer in corso... Verifica che tutti i
              servizi siano attivi.
            </AlertDescription>
          </Alert>
        )}

        {}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RealTimeChart />
              <ThreatMap />
            </div>
            <RecentBans />
          </div>
        )}

        {activeTab === "threats" && (
          <div className="space-y-8 animate-fade-in">
            <ThreatAnalysis />
          </div>
        )}

        {activeTab === "whitelist" && (
          <div className="animate-fade-in">
            <WhitelistManager />
          </div>
        )}

        {activeTab === "ipmanage" && (
          <div className="animate-fade-in">
            <IPManagement />
          </div>
        )}

        {activeTab === "patterns" && (
          <div className="animate-fade-in">
            <PatternManager />
          </div>
        )}

        {activeTab === "config" && (
          <div className="animate-fade-in">
            <ConfigManager />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="animate-fade-in">
            <LogViewer />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
