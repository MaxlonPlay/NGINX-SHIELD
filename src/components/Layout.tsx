import { useState } from "react";
import {
  Shield,
  ListCheck,
  Settings,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Ban,
  Monitor,
  UserRoundCog,
  Filter,
} from "lucide-react";
import { Dashboard } from "./dashboard/Dashboard";
import { WhitelistManager } from "./dashboard/WhitelistManager";
import { ConfigManager } from "./dashboard/ConfigManager";
import { LogViewer } from "./dashboard/LogViewer";
import { IPManagement } from "./dashboard/IPManagement";
import { SystemStatusPage } from "./dashboard/SystemStatusPage";
import { AccountSettings } from "./dashboard/AccountSettings";
import { PatternManager } from "./dashboard/PatternManager";

interface LayoutProps {
  onLogout: () => void;
}

export const Layout = ({ onLogout }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("/");

  const navigationItems = [
    {
      name: "Panoramica",
      path: "/",
      icon: Shield,
    },
    {
      name: "Gestione IP",
      path: "/ip-management",
      icon: Ban,
    },
    {
      name: "Whitelist",
      path: "/whitelist",
      icon: ListCheck,
    },
    {
      name: "Configurazione",
      path: "/config",
      icon: Settings,
    },
    {
      name: "Pattern Manager",
      path: "/patterns",
      icon: Filter,
    },
    {
      name: "Log Sistema",
      path: "/logs",
      icon: FileText,
    },
    {
      name: "Stato Sistema",
      path: "/system-status",
      icon: Monitor,
    },
    {
      name: "Account",
      path: "/account",
      icon: UserRoundCog,
    },
  ];

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "/":
        return <Dashboard />;
      case "/whitelist":
        return <WhitelistManager />;
      case "/patterns":
        return <PatternManager />;
      case "/config":
        return <ConfigManager />;
      case "/logs":
        return <LogViewer />;
      case "/ip-management":
        return <IPManagement />;
      case "/system-status":
        return <SystemStatusPage />;
      case "/account":
        return <AccountSettings />;
      default:
        return <div>Pagina non trovata</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {}
      <div
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-slate-800 transition-all duration-300 flex flex-col`}
      >
        {}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">NGINX Shield</h1>
                <p className="text-slate-400 text-xs">Security System</p>
              </div>
            )}
          </div>
        </div>

        {}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => setCurrentPage(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    currentPage === item.path
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {sidebarOpen && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>

        {}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {}
      <div className="flex-1 flex flex-col overflow-hidden">
        {}
        <div className="bg-slate-800/50 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {navigationItems.find((item) => item.path === currentPage)
                  ?.name || "Dashboard"}
              </h2>
              <p className="text-slate-400 text-sm">
                Sistema di protezione automatica per server web
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-slate-400">Sistema attivo</span>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-auto p-6">{renderCurrentPage()}</div>
      </div>
    </div>
  );
};
