import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Loader2 } from "lucide-react";
import { authService } from "../../utils/apiService";

interface AddWhitelistEntryFormProps {
  onAdd: (entry: { type: string; value: string; description: string }) => void;
  onClose: () => void;
}

export const AddWhitelistEntryForm = ({
  onAdd,
  onClose,
}: AddWhitelistEntryFormProps) => {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("ip");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateInput = () => {
    if (!value.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un valore valido",
        variant: "destructive",
      });
      return false;
    }

    switch (type) {
      case "ip":
        const ipRegex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(value.trim())) {
          toast({
            title: "Errore",
            description: "Formato IP non valido (es: 192.168.1.100)",
            variant: "destructive",
          });
          return false;
        }
        break;

      case "cidr":
        const cidrRegex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
        if (!cidrRegex.test(value.trim())) {
          toast({
            title: "Errore",
            description: "Formato CIDR non valido (es: 192.168.1.0/24)",
            variant: "destructive",
          });
          return false;
        }
        break;

      case "domain":
        const domainRegex =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(value.trim()) || value.trim().length < 3) {
          toast({
            title: "Errore",
            description: "Formato dominio non valido (es: example.com)",
            variant: "destructive",
          });
          return false;
        }
        break;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInput()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.addWhitelistEntry({
        type: type,
        value: value.trim(),
        description: description.trim() || "Nessuna descrizione",
      });

      if (result.success) {
        toast({
          title: "Successo",
          description: "Entry aggiunta alla whitelist con successo",
        });

        onAdd({
          type: type,
          value: value.trim(),
          description: description.trim() || "Nessuna descrizione",
        });

        setValue("");
        setDescription("");
        setType("ip");
      } else {
        toast({
          title: "Errore",
          description: result.message || "Errore durante l'aggiunta dell'entry",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Errore durante l'aggiunta dell'entry:", error);

      toast({
        title: "Errore",
        description:
          error.message || "Impossibile aggiungere l'entry alla whitelist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "domain":
        return "es: example.com";
      case "cidr":
        return "es: 192.168.1.0/24";
      default:
        return "es: 192.168.1.100";
    }
  };

  const getLabel = () => {
    switch (type) {
      case "domain":
        return "Dominio";
      case "cidr":
        return "Rete (CIDR)";
      default:
        return "Indirizzo IP";
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <Plus className="h-5 w-5 mr-2 text-green-400" />
              Aggiungi Entry Whitelist
            </CardTitle>
            <CardDescription className="text-slate-400">
              Aggiungi un nuovo IP, dominio o rete alla whitelist
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-300">
              Tipo
            </Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="ip">IP Address</SelectItem>
                <SelectItem value="cidr">Network/CIDR</SelectItem> {}
                <SelectItem value="domain">Domain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value" className="text-slate-300">
              {getLabel()}
            </Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={getPlaceholder()}
              className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              Descrizione
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione opzionale"
              className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aggiungendo...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
              disabled={isLoading}
            >
              Annulla
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
