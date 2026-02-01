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
import { t } from "i18next";

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
        title: t("common.error"),
        description: t("error.invalidValue"),
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
        const cleanedValue = value.trim().toLowerCase();

        const domainRegex = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

        if (!domainRegex.test(cleanedValue)) {
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
        description: description.trim() || t("whitelist.noDescription"),
      });

      if (result.success) {
        toast({
          title: t("common.success"),
          description: t("whitelist.success.added"),
        });

        onAdd({
          type: type,
          value: value.trim(),
          description: description.trim() || t("whitelist.noDescription"),
        });

        setValue("");
        setDescription("");
        setType("ip");
      } else {
        toast({
          title: t("common.error"),
          description: result.message || t("whitelist.errors.addError"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(t("whitelist.errors.addError"), error);

      toast({
        title: t("common.error"),
        description: error.message || t("whitelist.errors.cannotAdd"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        return t("common.domain");
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
              {t("whitelist.addEntry")}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("whitelist.addDescription")}
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
              {t("common.type")}
            </Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="ip">{t("whitelist.types.ip")}</SelectItem>
                <SelectItem value="cidr">
                  {t("whitelist.types.cidr1")}
                </SelectItem>{" "}
                {}
                <SelectItem value="domain">
                  {t("whitelist.types.domain")}
                </SelectItem>
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
              {t("whitelist.description")}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whitelist.descriptionPlaceholder")}
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
                  {t("whitelist.adding")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("whitelist.addEntry")}
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
