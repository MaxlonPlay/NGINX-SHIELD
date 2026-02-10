import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Edit, X, Loader2 } from "lucide-react";
import { authService } from "../../utils/apiService";

interface EditWhitelistEntryFormProps {
  entry: {
    id: string;
    type: string;
    value: string;
    description: string;
  };
  onUpdate: () => void;
  onClose: () => void;
}

export const EditWhitelistEntryForm = ({
  entry,
  onUpdate,
  onClose,
}: EditWhitelistEntryFormProps) => {
  const { t } = useTranslation();
  const [type, setType] = useState(entry.type);
  const [value, setValue] = useState(entry.value);
  const [description, setDescription] = useState(entry.description);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateInput = () => {
    if (!value.trim()) {
      toast({
        title: t("common.error"),
        description: t("whitelist.errors.invalidValue"),
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
            title: t("common.error"),
            description: t("whitelist.errors.invalidIP"),
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
            title: t("common.error"),
            description: t("whitelist.errors.invalidCIDR"),
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
            title: t("common.error"),
            description: t("whitelist.errors.invalidDomain"),
            variant: "destructive",
          });
          return false;
        }
        break;
    }

    return true;
  };

  const getPlaceholder = () => {
    switch (type) {
      case "domain":
        return t("whitelist.placeholders.domain");
      case "cidr":
        return t("whitelist.placeholders.cidr");
      default:
        return t("whitelist.placeholders.ip");
    }
  };

  const getLabel = () => {
    switch (type) {
      case "domain":
        return t("whitelist.types.domain");
      case "cidr":
        return t("whitelist.types.cidr1");
      default:
        return t("whitelist.types.ip");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInput()) {
      return;
    }

    if (!description.trim()) {
      toast({
        title: t("common.error"),
        description: t("whitelist.errors.invalidDescription"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.removeWhitelistEntry({
        type: entry.type,
        value: entry.value,
      });

      const addResult = await authService.addWhitelistEntry({
        type: type,
        value: value.trim(),
        description: description.trim(),
      });

      if (addResult.success) {
        toast({
          title: t("common.success"),
          description: t("whitelist.success.updated"),
        });

        onUpdate();
      } else {
        toast({
          title: t("common.error"),
          description: addResult.message || t("whitelist.errors.updateError"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Errore durante l'aggiornamento dell'entry:", error);

      let errorMessage = t("whitelist.errors.cannotUpdate");
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <Edit className="h-5 w-5 mr-2 text-blue-400" />
              {t("whitelist.editEntry")}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("whitelist.editDescription")}
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
          {}
          <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-600">
            <div className="text-slate-400 text-sm mb-1">
              {t("whitelist.originalEntry")}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-white font-mono text-sm bg-slate-700 px-2 py-1 rounded">
                {entry.value}
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  entry.type === "cidr"
                    ? "bg-blue-900/20 text-blue-400"
                    : entry.type === "domain"
                      ? "bg-purple-900/20 text-purple-400"
                      : "bg-green-900/20 text-green-400"
                }`}
              >
                {entry.type.toUpperCase()}
              </div>
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-300">
              {t("whitelist.type")}
            </Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="ip">{t("whitelist.types.ip")}</SelectItem>
                <SelectItem value="cidr">
                  {t("whitelist.types.cidr1")}
                </SelectItem>
                <SelectItem value="domain">
                  {t("whitelist.types.domain")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
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

          {}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              {t("whitelist.description")}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whitelist.insertDescription")}
              className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("whitelist.updating")}
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  {t("common.update")}
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
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
