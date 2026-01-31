import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Globe,
  MapPin,
  AlertTriangle,
  ShieldOff,
  Flame,
  ShieldHalf,
  ShieldCheck,
  CheckCircle,
  Shield,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

interface ThreatLocation {
  country: string;
  lat: number;
  lng: number;
  attacks: number;

  recentAttacks: Array<{
    timestamp: string;
    ip: string;
    type: string;
  }>;
}

type SeverityLevel =
  | "CRITICO"
  | "ESTREMAMENTE ALTO"
  | "MOLTO ALTO"
  | "ALTO"
  | "MEDIO"
  | "BASSO"
  | "MOLTO BASSO";

export const InteractiveThreatMap = () => {
  const allThreats = useMemo(
    () => [
      {
        country: "Russia",
        lat: 61.524,
        lng: 105.3188,
        attacks: 1247,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:32:15",
            ip: "185.220.101.42",
            type: "SQL Injection",
          },
          {
            timestamp: "2024-01-15 14:31:58",
            ip: "185.220.102.15",
            type: "Brute Force",
          },
          {
            timestamp: "2024-01-15 14:30:42",
            ip: "185.220.103.88",
            type: "XSS Attempt",
          },
          {
            timestamp: "2024-01-15 14:29:10",
            ip: "185.220.104.77",
            type: "DDoS Attack",
          },
          {
            timestamp: "2024-01-15 14:28:30",
            ip: "185.220.105.66",
            type: "Malware Distribution",
          },
        ],
      },
      {
        country: "China",
        lat: 35.8617,
        lng: 104.1954,
        attacks: 891,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:29:33",
            ip: "103.45.67.123",
            type: "Port Scan",
          },
          {
            timestamp: "2024-01-15 14:28:15",
            ip: "103.45.68.234",
            type: "Directory Traversal",
          },
          {
            timestamp: "2024-01-15 14:27:00",
            ip: "103.45.69.567",
            type: "Phishing Campaign",
          },
        ],
      },
      {
        country: "Iran",
        lat: 32.4279,
        lng: 53.688,
        attacks: 750,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:25:22",
            ip: "94.182.34.56",
            type: "Ransomware",
          },
          {
            timestamp: "2024-01-15 14:24:11",
            ip: "94.182.35.78",
            type: "Brute Force",
          },
        ],
      },
      {
        country: "North Korea",
        lat: 40.3399,
        lng: 127.5101,
        attacks: 680,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:23:55",
            ip: "175.45.176.1",
            type: "Zero-day Exploit",
          },
          {
            timestamp: "2024-01-15 14:22:40",
            ip: "175.45.176.2",
            type: "State-sponsored Attack",
          },
        ],
      },
      {
        country: "India",
        lat: 20.5937,
        lng: 78.9629,
        attacks: 520,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:18:00",
            ip: "157.38.12.34",
            type: "DDoS Attack",
          },
          {
            timestamp: "2024-01-15 14:17:30",
            ip: "157.38.13.45",
            type: "Malware",
          },
        ],
      },
      {
        country: "USA",
        lat: 37.0902,
        lng: -95.7129,
        attacks: 456,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:27:45",
            ip: "172.58.34.192",
            type: "Bot Activity",
          },
          {
            timestamp: "2024-01-15 14:26:05",
            ip: "172.58.35.101",
            type: "Credential Stuffing",
          },
        ],
      },
      {
        country: "UK",
        lat: 55.3781,
        lng: -3.436,
        attacks: 310,
        recentAttacks: [
          {
            timestamp: "2024-01-15 14:20:10",
            ip: "82.12.34.56",
            type: "Phishing Attempt",
          },
        ],
      },
      {
        country: "Germany",
        lat: 51.1657,
        lng: 10.4515,
        attacks: 234,
        recentAttacks: [],
      },
      {
        country: "Brazil",
        lat: -14.235,
        lng: -51.9253,
        attacks: 189,
        recentAttacks: [],
      },
      {
        country: "Mexico",
        lat: 23.6345,
        lng: -102.5528,
        attacks: 150,
        recentAttacks: [],
      },
      {
        country: "Australia",
        lat: -25.2744,
        lng: 133.7751,
        attacks: 110,
        recentAttacks: [],
      },
      {
        country: "France",
        lat: 46.603354,
        lng: 1.888334,
        attacks: 88,
        recentAttacks: [],
      },
      {
        country: "Japan",
        lat: 36.204824,
        lng: 138.252924,
        attacks: 45,
        recentAttacks: [],
      },
      {
        country: "Argentina",
        lat: -34.90328,
        lng: -58.17551,
        attacks: 12,
        recentAttacks: [],
      },
    ],
    [],
  );

  const getDynamicSeverity = (attacks: number): SeverityLevel => {
    if (attacks > 1000) return "CRITICO";
    if (attacks > 750) return "ESTREMAMENTE ALTO";
    if (attacks > 500) return "MOLTO ALTO";
    if (attacks > 300) return "ALTO";
    if (attacks > 150) return "MEDIO";
    if (attacks > 50) return "BASSO";
    return "MOLTO BASSO";
  };

  const [visibleThreats, setVisibleThreats] = useState(6);
  const [selectedThreat, setSelectedThreat] = useState<ThreatLocation | null>(
    null,
  );

  const sortedThreats = useMemo(() => {
    return [...allThreats].sort((a, b) => b.attacks - a.attacks);
  }, [allThreats]);

  const displayedThreats = sortedThreats.slice(0, visibleThreats);

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case "CRITICO":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "ESTREMAMENTE ALTO":
        return <ShieldOff className="h-4 w-4 text-orange-400" />;
      case "MOLTO ALTO":
        return <Flame className="h-4 w-4 text-yellow-500" />;
      case "ALTO":
        return <ShieldHalf className="h-4 w-4 text-yellow-300" />;
      case "MEDIO":
        return <ShieldCheck className="h-4 w-4 text-lime-500" />;
      case "BASSO":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "MOLTO BASSO":
        return <Shield className="h-4 w-4 text-teal-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColorClass = (severity: SeverityLevel) => {
    switch (severity) {
      case "CRITICO":
        return "text-red-400";
      case "ESTREMAMENTE ALTO":
        return "text-orange-400";
      case "MOLTO ALTO":
        return "text-yellow-500";
      case "ALTO":
        return "text-yellow-300";
      case "MEDIO":
        return "text-lime-500";
      case "BASSO":
        return "text-green-500";
      case "MOLTO BASSO":
        return "text-teal-600";
      default:
        return "text-gray-400";
    }
  };

  const handleShowMore = () => {
    setVisibleThreats(allThreats.length);
  };

  const handleShowLess = () => {
    setVisibleThreats(6);
    if (
      selectedThreat &&
      !displayedThreats.some((t) => t.country === selectedThreat.country)
    ) {
      setSelectedThreat(null);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-400" />
          Distribuzione delle Minacce (IN SVILIPPO)
        </CardTitle>
        <CardDescription className="text-slate-400">
          Distribuzione geografica degli attacchi in tempo reale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {}
          <div className="space-y-3">
            <h3 className="text-white font-medium mb-4">
              Paesi con Attività Sospetta
            </h3>
            {displayedThreats.map((threat, index) => {
              const severity = getDynamicSeverity(threat.attacks);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedThreat?.country === threat.country
                      ? "bg-slate-700/70 border border-blue-500"
                      : "bg-slate-900/50 hover:bg-slate-900/70"
                  }`}
                  onClick={() => setSelectedThreat(threat)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-300 font-medium flex items-center space-x-2">
                        {getSeverityIcon(severity)}
                        <span>{threat.country}</span>
                      </span>
                      <span
                        className={`text-sm font-medium ${getSeverityColorClass(severity)}`}
                      >
                        {severity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 text-sm">
                        {threat.attacks.toLocaleString()}
                      </span>
                      <MapPin className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
            {allThreats.length > 6 && (
              <div className="flex justify-center mt-4">
                {visibleThreats < allThreats.length ? (
                  <button
                    onClick={handleShowMore}
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    <span>Mostra tutti i {allThreats.length} Paesi</span>
                  </button>
                ) : (
                  <button
                    onClick={handleShowLess}
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span>Mostra di meno</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {}
          <div className="space-y-4">
            {selectedThreat && selectedThreat.recentAttacks.length > 0 ? (
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">
                  Attacchi Recenti per {selectedThreat.country}
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedThreat.recentAttacks.map((attack, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-2 bg-slate-800/50 rounded"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-mono">
                          {attack.ip}
                        </span>
                        <span className="text-red-400">{attack.type}</span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        {attack.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedThreat && selectedThreat.recentAttacks.length === 0 ? (
              <div className="bg-slate-900/50 p-8 rounded-lg text-center">
                <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  Nessun attacco recente registrato per {selectedThreat.country}
                  .
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/50 p-8 rounded-lg text-center">
                <Globe className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  Seleziona un paese dalla lista per vedere i dettagli delle
                  minacce.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
