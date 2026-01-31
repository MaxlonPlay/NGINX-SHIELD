import { StatsCards } from "./StatsCards";
import { RecentBans } from "./RecentBans";
import { SystemStatus } from "./SystemStatus";
import { ThreatMap } from "./ThreatMap";

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Panoramica Sistema</h1>
          <p className="text-slate-400 mt-1">
            Monitoraggio attività e stato del sistema Nginx Shield
          </p>
        </div>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentBans />
        <SystemStatus />
      </div>

      {}
      <ThreatMap />
    </div>
  );
};
