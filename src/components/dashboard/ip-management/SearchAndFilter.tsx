import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  activeFilters?: string[];
  onAddFilter?: (filter: string) => void;
  onRemoveFilter?: (filter: string) => void;
  onClearAll?: () => void;
}

const SearchAndFilter: FC<SearchAndFilterProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isLoading,
  activeFilters = [],
  onAddFilter,
  onRemoveFilter,
  onClearAll,
}) => {
  const { t } = useTranslation();
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddFilter = () => {
    if (searchQuery.trim() && onAddFilter) {
      onAddFilter(searchQuery.trim());
      setSearchQuery("");
    }
  };

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Search className="h-5 w-5 mr-2 text-yellow-400" />
            {t("searchAndFilter.title")}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t("searchAndFilter.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t("searchAndFilter.placeholder")}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddFilter();
              }
            }}
            className="bg-slate-900/50 border-slate-600 text-white"
            disabled={isLoading}
          />

          {}
          {searchQuery.trim() && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400">
                {t("searchAndFilter.preview")}
              </span>
              <button
                onClick={handleAddFilter}
                className="inline-flex items-center rounded-full bg-blue-900/30 hover:bg-blue-900/60 px-3 py-1 text-xs font-medium text-blue-300 transition-colors cursor-pointer border border-blue-700/50"
              >
                {searchQuery}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {activeFilters.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-wrap items-center gap-2 py-4">
            <span className="text-slate-400 text-sm mr-2">
              {t("searchAndFilter.activeFilters")}
            </span>
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center rounded-full bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-300"
              >
                {filter}
                <button
                  onClick={() => onRemoveFilter?.(filter)}
                  className="ml-1 hover:text-blue-100 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Button
              size="sm"
              onClick={onClearAll}
              className="bg-blue-900/30 text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 transition-colors duration-200 ease-in-out ml-2"
            >
              {t("searchAndFilter.clearAll")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SearchAndFilter;
