import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Plus,
  AlertTriangle,
  Globe,
  User,
  Filter,
  Search,
  Loader,
  Edit,
  Copy,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { AXIOS_CONFIG } from "@/config/api";
import { setupAxiosInterceptors } from "@/config/axiosInterceptors";

interface PatternEntry {
  id: string;
  pattern: string;
  description: string;
  type: "user_agent" | "url" | "dangerous_ua" | "dangerous_url";
  createdAt: string;
}

const apiClient = axios.create(AXIOS_CONFIG);
setupAxiosInterceptors(apiClient);

const PatternFormModal = ({
  title,
  isOpen,
  onClose,
  pattern,
  setPattern,
  onSubmit,
  placeholderPattern,
  placeholderDesc,
  isEditing = false,
}: any) => {
  const { t } = useTranslation();
  const patternInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && patternInputRef.current) {
      setTimeout(() => {
        patternInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            {isEditing ? (
              <Edit className="h-5 w-5 mr-2 text-yellow-400" />
            ) : (
              <Plus className="h-5 w-5 mr-2 text-blue-400" />
            )}
            {title}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {isEditing
              ? t("patternManager.modal.editDescription")
              : t("patternManager.modal.addDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              {t("patternManager.modal.patternLabel")}
            </label>
            <Input
              ref={patternInputRef}
              placeholder={placeholderPattern}
              value={pattern.pattern}
              onChange={(e) =>
                setPattern((prev: any) => ({
                  ...prev,
                  pattern: e.target.value,
                }))
              }
              className="bg-slate-900/50 border-slate-600 text-white font-mono"
            />
            <p className="text-slate-500 text-xs mt-1">
              {t("patternManager.modal.regexHint")}
            </p>
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              {t("patternManager.modal.descriptionLabel")}
            </label>
            <Textarea
              ref={descriptionRef}
              placeholder={placeholderDesc}
              value={pattern.description}
              onChange={(e) =>
                setPattern((prev: any) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  e.ctrlKey === false &&
                  e.metaKey === false &&
                  e.shiftKey === false
                ) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="bg-slate-900/50 border-slate-600 text-white"
              rows={3}
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={onSubmit}
              className={`${
                isEditing
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } flex-1`}
            >
              {isEditing ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  {t("patternManager.modal.editButton")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("patternManager.modal.addButton")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium flex-1"
            >
              {t("patternManager.modal.cancelButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PatternManager = () => {
  const { t } = useTranslation();
  const [patterns, setPatterns] = useState<PatternEntry[]>([]);
  const [openAddFormType, setOpenAddFormType] = useState<
    "user_agent" | "url" | "dangerous_ua" | "dangerous_url" | null
  >(null);
  const [newPatternUserAgent, setNewPatternUserAgent] = useState({
    pattern: "",
    description: "",
  });
  const [newPatternUrl, setNewPatternUrl] = useState({
    pattern: "",
    description: "",
  });
  const [newPatternDangerousUA, setNewPatternDangerousUA] = useState({
    pattern: "",
    description: "",
  });
  const [newPatternDangerousURL, setNewPatternDangerousURL] = useState({
    pattern: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPattern, setEditingPattern] = useState<PatternEntry | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState({
    pattern: "",
    description: "",
  });
  const [stats, setStats] = useState({
    user_agent: 0,
    url: 0,
    dangerous_ua: 0,
    dangerous_url: 0,
    total: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/patterns");
      const data = response.data;

      let allPatterns: PatternEntry[] = [];
      Object.entries(data.patterns || {}).forEach(
        ([type, typePatterns]: [string, any]) => {
          if (Array.isArray(typePatterns)) {
            allPatterns = [...allPatterns, ...typePatterns];
          }
        },
      );

      setPatterns(allPatterns);
      setStats(
        data.stats || {
          user_agent: 0,
          url: 0,
          dangerous_ua: 0,
          dangerous_url: 0,
          total: 0,
        },
      );
    } catch (error) {
      console.error("Errore caricamento pattern:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.errorLoading"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPattern = async (
    type: "user_agent" | "url" | "dangerous_ua" | "dangerous_url",
    newPattern: any,
    resetFunc: () => void,
  ) => {
    if (!newPattern.pattern.trim() || !newPattern.description.trim()) {
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.errorValidation"),
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post("/patterns", null, {
        params: {
          pattern_type: type,
          pattern: newPattern.pattern,
          description: newPattern.description,
        },
      });

      resetFunc();

      toast({
        title: t("common.success"),
        description: t("patternManager.messages.addSuccess", {
          pattern: newPattern.pattern,
        }),
      });

      await loadPatterns();
    } catch (error) {
      console.error("Errore aggiunta pattern:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.addError"),
        variant: "destructive",
      });
    }
  };

  const handleRemovePattern = async (id: string) => {
    try {
      const pattern = patterns.find((p) => p.id === id);
      if (!pattern) return;

      await apiClient.delete(`/patterns/${pattern.type}/${id}`);

      setDeleteConfirm(null);

      toast({
        title: t("common.success"),
        description: t("patternManager.messages.removeSuccess"),
      });

      await loadPatterns();
    } catch (error) {
      console.error("Errore rimozione pattern:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.removeError"),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (id: string, pattern: string) => {
    setDeleteConfirm(id);
  };

  const handleEditPattern = (pattern: PatternEntry) => {
    setEditingPattern(pattern);
    setEditFormData({
      pattern: pattern.pattern,
      description: pattern.description,
    });
  };

  const handleSaveEditPattern = async () => {
    if (!editingPattern) return;

    if (!editFormData.pattern.trim() || !editFormData.description.trim()) {
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.errorValidation"),
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.put(
        `/patterns/${editingPattern.type}/${editingPattern.id}`,
        null,
        {
          params: {
            pattern_type: editingPattern.type,
            pattern_id: editingPattern.id,
            pattern: editFormData.pattern,
            description: editFormData.description,
          },
        },
      );

      toast({
        title: t("common.success"),
        description: t("patternManager.messages.editSuccess", {
          pattern: editFormData.pattern,
        }),
      });

      setEditingPattern(null);
      setEditFormData({ pattern: "", description: "" });
      await loadPatterns();
    } catch (error) {
      console.error("Errore modifica pattern:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.editError"),
        variant: "destructive",
      });
    }
  };

  const handleCopyPatternToDangerous = async (
    pattern: PatternEntry,
    targetType: "dangerous_ua" | "dangerous_url",
  ) => {
    try {
      await apiClient.post("/patterns", null, {
        params: {
          pattern_type: targetType,
          pattern: pattern.pattern,
          description: pattern.description,
        },
      });

      toast({
        title: t("common.success"),
        description: t("patternManager.messages.copySuccess", {
          pattern: pattern.pattern,
        }),
      });

      await loadPatterns();
    } catch (error) {
      console.error("Errore copia pattern:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.copyError"),
        variant: "destructive",
      });
    }
  };

  const handleRemovePatternFromDangerous = async (
    pattern: PatternEntry,
    dangerousType: "dangerous_ua" | "dangerous_url",
  ) => {
    try {
      const dangerousPattern = patterns.find(
        (p) => p.type === dangerousType && p.pattern === pattern.pattern,
      );
      if (!dangerousPattern) return;

      await apiClient.delete(
        `/patterns/${dangerousType}/${dangerousPattern.id}`,
      );

      toast({
        title: t("common.success"),
        description: t("patternManager.messages.removeFromDangerousSuccess", {
          pattern: pattern.pattern,
        }),
      });

      await loadPatterns();
    } catch (error) {
      console.error("Errore rimozione pattern dai pericolosi:", error);
      toast({
        title: t("common.error"),
        description: t("patternManager.messages.removeFromDangerousError"),
        variant: "destructive",
      });
    }
  };

  const isPatternInDangerous = (
    pattern: PatternEntry,
    dangerousType: "dangerous_ua" | "dangerous_url",
  ): boolean => {
    return patterns.some(
      (p) => p.type === dangerousType && p.pattern === pattern.pattern,
    );
  };

  const getFilteredPatterns = () => {
    let filtered = patterns;

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  };

  const getPatternsByType = (type: string) => {
    return getFilteredPatterns().filter((p) => p.type === type);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "dangerous_ua":
      case "dangerous_url":
        return "bg-red-900/20 text-red-400 border-red-800/50";
      case "user_agent":
        return "bg-blue-900/20 text-blue-400 border-blue-800/50";
      case "url":
        return "bg-green-900/20 text-green-400 border-green-800/50";
      default:
        return "bg-slate-900/20 text-slate-400 border-slate-800/50";
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "user_agent":
        return "USER-AGENT";
      case "url":
        return "URL";
      case "dangerous_ua":
        return "DANGEROUS UA";
      case "dangerous_url":
        return "DANGEROUS URL";
      default:
        return type.toUpperCase();
    }
  };

  const EmptyState = ({
    title,
    description,
    icon: Icon,
  }: {
    title: string;
    description: string;
    icon: any;
  }) => (
    <div className="text-center py-12">
      <div className="bg-slate-800/50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-500" />
      </div>
      <h4 className="text-slate-300 font-medium mb-2">{title}</h4>
      <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Filter className="h-8 w-8 mr-3 text-blue-400" />
          {t("patternManager.title")}
        </h1>
        <p className="text-slate-400 mt-1">
          {t("patternManager.subtitle", { total: stats.total })}
        </p>
      </div>

      {}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-900/20 border-blue-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">
                    {t("patternManager.stats.userAgent")}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.user_agent}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">
                    {t("patternManager.stats.url")}
                  </p>
                  <p className="text-2xl font-bold text-white">{stats.url}</p>
                </div>
                <Globe className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium">
                    {t("patternManager.stats.dangerousUA")}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.dangerous_ua}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium">
                    {t("patternManager.stats.dangerousURL")}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.dangerous_url}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {}
      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t("patternManager.search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-600 text-white w-full"
          />
        </div>
      </div>

      {}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                {t("patternManager.delete.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                {t("patternManager.delete.message")}
              </p>
              <div className="bg-slate-900/50 p-3 rounded border">
                <code className="text-red-300 text-sm break-all">
                  {patterns.find((p) => p.id === deleteConfirm)?.pattern}
                </code>
              </div>
              <p className="text-slate-400 text-sm">
                {t("patternManager.delete.warning")}
              </p>
              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => handleRemovePattern(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("patternManager.delete.button")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="bg-white text-slate-900 border-white hover:bg-slate-100 font-medium"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-400" />
                  {t("patternManager.cards.userAgentTitle")}
                  <Badge
                    variant="outline"
                    className="ml-2 text-blue-400 border-blue-400"
                  >
                    {getPatternsByType("user_agent").length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("patternManager.cards.userAgentDesc")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setOpenAddFormType("user_agent")}
                className="bg-blue-600 hover:bg-blue-700 ml-2"
                title={t("patternManager.cards.userAgentTitle")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {getPatternsByType("user_agent").length > 0 ? (
                getPatternsByType("user_agent").map((pattern) => (
                  <div
                    key={pattern.id}
                    className="group p-4 bg-slate-900/30 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <User
                            className={`h-4 w-4 flex-shrink-0 ${
                              isPatternInDangerous(pattern, "dangerous_ua")
                                ? "text-red-500 animate-pulse"
                                : "text-blue-400"
                            }`}
                          />
                          <code className="text-blue-300 bg-slate-800/50 px-2 py-1 rounded text-sm font-mono break-all">
                            {pattern.pattern}
                          </code>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge
                          className={`${getTypeColor(pattern.type)} text-xs`}
                        >
                          {t("patternManager.badges.userAgent")}
                        </Badge>
                        {isPatternInDangerous(pattern, "dangerous_ua") ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemovePatternFromDangerous(
                                pattern,
                                "dangerous_ua",
                              )
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("patternManager.buttons.remove")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopyPatternToDangerous(
                                pattern,
                                "dangerous_ua",
                              )
                            }
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("patternManager.buttons.copy")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPattern(pattern)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirmDelete(pattern.id, pattern.pattern)
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("patternManager.empty.userAgentTitle")}
                  description={t("patternManager.empty.userAgentDesc")}
                  icon={User}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-white flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-green-400" />
                  {t("patternManager.cards.urlTitle")}
                  <Badge
                    variant="outline"
                    className="ml-2 text-green-400 border-green-400"
                  >
                    {getPatternsByType("url").length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("patternManager.cards.urlDesc")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setOpenAddFormType("url")}
                className="bg-green-600 hover:bg-green-700 ml-2"
                title={t("patternManager.cards.urlTitle")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {getPatternsByType("url").length > 0 ? (
                getPatternsByType("url").map((pattern) => (
                  <div
                    key={pattern.id}
                    className="group p-4 bg-slate-900/30 rounded-lg border border-slate-700/50 hover:border-green-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Globe
                            className={`h-4 w-4 flex-shrink-0 ${
                              isPatternInDangerous(pattern, "dangerous_url")
                                ? "text-red-500 animate-pulse"
                                : "text-green-400"
                            }`}
                          />
                          <code className="text-green-300 bg-slate-800/50 px-2 py-1 rounded text-sm font-mono break-all">
                            {pattern.pattern}
                          </code>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge
                          className={`${getTypeColor(pattern.type)} text-xs`}
                        >
                          {t("patternManager.badges.url")}
                        </Badge>
                        {isPatternInDangerous(pattern, "dangerous_url") ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemovePatternFromDangerous(
                                pattern,
                                "dangerous_url",
                              )
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("patternManager.buttons.removeURL")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopyPatternToDangerous(
                                pattern,
                                "dangerous_url",
                              )
                            }
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("patternManager.buttons.copyURL")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPattern(pattern)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirmDelete(pattern.id, pattern.pattern)
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("patternManager.empty.urlTitle")}
                  description={t("patternManager.empty.urlDesc")}
                  icon={Globe}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                  {t("patternManager.cards.dangerousUATitle")}
                  <Badge
                    variant="outline"
                    className="ml-2 text-red-400 border-red-400"
                  >
                    {getPatternsByType("dangerous_ua").length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("patternManager.cards.dangerousUADesc")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setOpenAddFormType("dangerous_ua")}
                className="bg-red-600 hover:bg-red-700 ml-2"
                title={t("patternManager.cards.dangerousUATitle")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {getPatternsByType("dangerous_ua").length > 0 ? (
                getPatternsByType("dangerous_ua").map((pattern) => (
                  <div
                    key={pattern.id}
                    className="group p-4 bg-red-900/5 rounded-lg border border-red-800/30 hover:border-red-600/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <code className="text-red-300 bg-red-900/20 px-2 py-1 rounded text-sm font-mono break-all">
                            {pattern.pattern}
                          </code>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge
                          className={`${getTypeColor(pattern.type)} text-xs`}
                        >
                          {t("patternManager.badges.dangerousUA")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPattern(pattern)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirmDelete(pattern.id, pattern.pattern)
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("patternManager.empty.dangerousUATitle")}
                  description={t("patternManager.empty.dangerousUADesc")}
                  icon={User}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                  {t("patternManager.cards.dangerousURLTitle")}
                  <Badge
                    variant="outline"
                    className="ml-2 text-red-400 border-red-400"
                  >
                    {getPatternsByType("dangerous_url").length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t("patternManager.cards.dangerousURLDesc")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setOpenAddFormType("dangerous_url")}
                className="bg-red-600 hover:bg-red-700 ml-2"
                title={t("patternManager.cards.dangerousURLTitle")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {getPatternsByType("dangerous_url").length > 0 ? (
                getPatternsByType("dangerous_url").map((pattern) => (
                  <div
                    key={pattern.id}
                    className="group p-4 bg-red-900/5 rounded-lg border border-red-800/30 hover:border-red-600/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Globe className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <code className="text-red-300 bg-red-900/20 px-2 py-1 rounded text-sm font-mono break-all">
                            {pattern.pattern}
                          </code>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge
                          className={`${getTypeColor(pattern.type)} text-xs`}
                        >
                          {t("patternManager.badges.dangerousURL")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPattern(pattern)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirmDelete(pattern.id, pattern.pattern)
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("patternManager.buttons.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("patternManager.empty.dangerousURLTitle")}
                  description={t("patternManager.empty.dangerousURLDesc")}
                  icon={Globe}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <PatternFormModal
        title={t("patternManager.modal.addTitle")}
        isOpen={openAddFormType === "user_agent"}
        onClose={() => {
          setOpenAddFormType(null);
          setNewPatternUserAgent({ pattern: "", description: "" });
        }}
        pattern={newPatternUserAgent}
        setPattern={setNewPatternUserAgent}
        onSubmit={() => {
          handleAddPattern("user_agent", newPatternUserAgent, () => {
            setNewPatternUserAgent({ pattern: "", description: "" });
            setOpenAddFormType(null);
          });
        }}
        placeholderPattern={t("patternManager.modal.patternPlaceholder")}
        placeholderDesc={t("patternManager.modal.descriptionPlaceholder")}
        type="user_agent"
      />

      <PatternFormModal
        title={t("patternManager.modal.addUrlTitle")}
        isOpen={openAddFormType === "url"}
        onClose={() => {
          setOpenAddFormType(null);
          setNewPatternUrl({ pattern: "", description: "" });
        }}
        pattern={newPatternUrl}
        setPattern={setNewPatternUrl}
        onSubmit={() => {
          handleAddPattern("url", newPatternUrl, () => {
            setNewPatternUrl({ pattern: "", description: "" });
            setOpenAddFormType(null);
          });
        }}
        placeholderPattern={t("patternManager.modal.urlPlaceholder")}
        placeholderDesc={t("patternManager.modal.descriptionPlaceholder")}
        type="url"
      />

      <PatternFormModal
        title={t("patternManager.modal.addDangerousUATitle")}
        isOpen={openAddFormType === "dangerous_ua"}
        onClose={() => {
          setOpenAddFormType(null);
          setNewPatternDangerousUA({ pattern: "", description: "" });
        }}
        pattern={newPatternDangerousUA}
        setPattern={setNewPatternDangerousUA}
        onSubmit={() => {
          handleAddPattern("dangerous_ua", newPatternDangerousUA, () => {
            setNewPatternDangerousUA({ pattern: "", description: "" });
            setOpenAddFormType(null);
          });
        }}
        placeholderPattern={t("patternManager.modal.dangerousUAPlaceholder")}
        placeholderDesc={t("patternManager.modal.descriptionPlaceholder")}
        type="dangerous_ua"
      />

      <PatternFormModal
        title={t("patternManager.modal.addDangerousURLTitle")}
        isOpen={openAddFormType === "dangerous_url"}
        onClose={() => {
          setOpenAddFormType(null);
          setNewPatternDangerousURL({ pattern: "", description: "" });
        }}
        pattern={newPatternDangerousURL}
        setPattern={setNewPatternDangerousURL}
        onSubmit={() => {
          handleAddPattern("dangerous_url", newPatternDangerousURL, () => {
            setNewPatternDangerousURL({ pattern: "", description: "" });
            setOpenAddFormType(null);
          });
        }}
        placeholderPattern={t("patternManager.modal.dangerousURLPlaceholder")}
        placeholderDesc={t("patternManager.modal.descriptionPlaceholder")}
        type="dangerous_url"
      />

      <PatternFormModal
        title={t("patternManager.modal.editTitle")}
        isOpen={editingPattern !== null}
        onClose={() => {
          setEditingPattern(null);
          setEditFormData({ pattern: "", description: "" });
        }}
        pattern={editFormData}
        setPattern={setEditFormData}
        onSubmit={handleSaveEditPattern}
        placeholderPattern={t("patternManager.modal.urlPlaceholder")}
        placeholderDesc={t("patternManager.modal.descriptionPlaceholder")}
        isEditing={true}
      />
    </div>
  );
};
