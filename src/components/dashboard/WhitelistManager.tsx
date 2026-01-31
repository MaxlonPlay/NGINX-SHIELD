import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SquarePen,
  Plus,
  Trash2,
  Shield,
  RefreshCw,
  Edit,
  Globe2,
  Globe,
  Monitor,
  Network,
  Search,
  Filter,
  X,
} from "lucide-react";
import { AddWhitelistEntryForm } from "./AddWhitelistEntryForm";
import { EditWhitelistEntryForm } from "./EditWhitelistEntryForm";
import { useToast } from "@/hooks/use-toast";
import { authService } from "../../utils/apiService";
import { WhitelistEntry as APIWhitelistEntry } from "../../utils/apiEndpoints";

interface WhitelistEntry {
  id: string;
  type: APIWhitelistEntry["type"];
  value: APIWhitelistEntry["value"];
  description: APIWhitelistEntry["description"];
  createdAt: string;
}

type FilterType = "all" | "ip" | "domain" | "network" | "cidr";

export const WhitelistManager = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const { toast } = useToast();
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>(
    [],
  );

  useEffect(() => {
    loadWhitelist();
  }, []);

  const filteredEntries = useMemo(() => {
    let filtered = whitelistEntries;

    if (selectedFilter !== "all") {
      filtered = filtered.filter((entry) => {
        if (selectedFilter === "network") {
          return entry.type === "network" || entry.type === "cidr";
        }
        return entry.type === selectedFilter;
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.value.toLowerCase().includes(searchLower) ||
          entry.description.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [whitelistEntries, selectedFilter, searchTerm]);

  const loadWhitelist = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getWhitelistEntries();
      const transformedEntries: WhitelistEntry[] = data.entries.map(
        (entry: APIWhitelistEntry) => ({
          ...entry,
          id: `${entry.type}-${entry.value}`,
          createdAt: entry.created,
        }),
      );
      setWhitelistEntries(transformedEntries);
    } catch (error) {
      console.error("Errore caricamento whitelist:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la whitelist",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const getTypeIcon = (type: string) => {
    const baseClass = "w-5 h-5";
    switch (type) {
      case "network":
      case "cidr":
        return <Network className={`${baseClass} text-blue-400`} />;
      case "domain":
        return <Globe2 className={`${baseClass} text-purple-400`} />;
      case "ip":
        return <Monitor className={`${baseClass} text-green-400`} />;
      default:
        return <Globe className={`${baseClass} text-slate-400`} />;
    }
  };

  const getFilterButtonClass = (filterType: FilterType) => {
    const baseClass =
      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors";
    if (selectedFilter === filterType) {
      switch (filterType) {
        case "ip":
          return `${baseClass} bg-green-600 text-white`;
        case "domain":
          return `${baseClass} bg-purple-600 text-white`;
        case "network":
          return `${baseClass} bg-blue-600 text-white`;
        case "all":
        default:
          return `${baseClass} bg-slate-600 text-white`;
      }
    }
    return `${baseClass} bg-slate-700/50 text-slate-300 hover:bg-slate-600`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFilter("all");
  };

  const handleAddEntry = async () => {
    await loadWhitelist();
    setShowAddForm(false);
  };

  const handleUpdateEntry = async () => {
    await loadWhitelist();
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: WhitelistEntry) => {
    setEditingEntry(entry);
    setShowAddForm(false);
  };

  const handleRemoveEntry = async (id: string) => {
    setIsLoading(true);
    try {
      const entryToRemove = whitelistEntries.find((e) => e.id === id);
      if (!entryToRemove) {
        toast({
          title: "Errore",
          description: "Entry da rimuovere non trovata",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      await authService.removeWhitelistEntry({
        type: entryToRemove.type,
        value: entryToRemove.value,
      });

      await loadWhitelist();
      toast({
        title: "Entry rimossa",
        description: `${entryToRemove.value} è stato rimosso dalla whitelist`,
      });
    } catch (error: any) {
      console.error("Errore rimozione entry:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Errore durante la rimozione dell'entry dalla whitelist",
        variant: "destructive",
      });
    }
    setIsLoading(false);
    setConfirmingDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {showAddForm && (
        <AddWhitelistEntryForm
          onAdd={handleAddEntry}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingEntry && (
        <EditWhitelistEntryForm
          entry={editingEntry}
          onUpdate={handleUpdateEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <SquarePen className="h-5 w-5 mr-2 text-green-400" />
                Gestione Whitelist
              </CardTitle>
              <CardDescription className="text-slate-400">
                Gestisci IP, domini e reti autorizzate
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={loadWhitelist}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                {isLoading ? "Caricamento..." : "Ricarica"}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingEntry(null);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Entry
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {}
          <div className="mb-6 space-y-4">
            {}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Cerca per IP, dominio o descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {}
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-slate-300 text-sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtra per:
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={getFilterButtonClass("all")}
                >
                  Tutti ({whitelistEntries.length})
                </button>
                <button
                  onClick={() => setSelectedFilter("ip")}
                  className={getFilterButtonClass("ip")}
                >
                  <Monitor className="h-3 w-3 mr-1 inline" />
                  IP ({whitelistEntries.filter((e) => e.type === "ip").length})
                </button>
                <button
                  onClick={() => setSelectedFilter("domain")}
                  className={getFilterButtonClass("domain")}
                >
                  <Globe2 className="h-3 w-3 mr-1 inline" />
                  Domini (
                  {whitelistEntries.filter((e) => e.type === "domain").length})
                </button>
                <button
                  onClick={() => setSelectedFilter("network")}
                  className={getFilterButtonClass("network")}
                >
                  <Network className="h-3 w-3 mr-1 inline" />
                  Reti (
                  {
                    whitelistEntries.filter(
                      (e) => e.type === "network" || e.type === "cidr",
                    ).length
                  }
                  )
                </button>
              </div>

              {(searchTerm || selectedFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-slate-400 hover:text-white ml-4"
                >
                  <X className="h-4 w-4 mr-1" />
                  Pulisci filtri
                </Button>
              )}
            </div>

            {}
            {(searchTerm || selectedFilter !== "all") && (
              <div className="text-sm text-slate-400">
                Mostrati {filteredEntries.length} di {whitelistEntries.length}{" "}
                elementi
                {searchTerm && <span> per "{searchTerm}"</span>}
              </div>
            )}
          </div>

          {}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                {isLoading
                  ? "Caricamento whitelist..."
                  : searchTerm || selectedFilter !== "all"
                    ? "Nessun risultato trovato per i filtri selezionati"
                    : "Nessuna entry nella whitelist"}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                    <div>
                      <div className="text-white font-mono text-sm bg-slate-700 px-2 py-1 rounded inline-block">
                        {entry.value}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {entry.description}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Aggiunto:{" "}
                        {new Date(entry.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.type === "network" || entry.type === "cidr"
                          ? "bg-blue-900/20 text-blue-400"
                          : entry.type === "domain"
                            ? "bg-purple-900/20 text-purple-400"
                            : "bg-green-900/20 text-green-400"
                      }`}
                    >
                      {entry.type.toUpperCase()}
                    </div>
                    {confirmingDeleteId === entry.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEntry(entry.id)}
                          disabled={isLoading}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          Conferma
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-slate-400 hover:text-slate-300"
                        >
                          Annulla
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          disabled={isLoading}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(entry.id)}
                          disabled={isLoading}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-400" />
            Statistiche Whitelist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {whitelistEntries.length}
              </div>
              <div className="text-slate-400 text-sm">Entry Totali</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {whitelistEntries.filter((e) => e.type === "ip").length}
              </div>
              <div className="text-slate-400 text-sm">IP Singoli</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {whitelistEntries.filter((e) => e.type === "domain").length}
              </div>
              <div className="text-slate-400 text-sm">Domini</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {
                  whitelistEntries.filter(
                    (e) => e.type === "network" || e.type === "cidr",
                  ).length
                }
              </div>
              <div className="text-slate-400 text-sm">Reti</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
