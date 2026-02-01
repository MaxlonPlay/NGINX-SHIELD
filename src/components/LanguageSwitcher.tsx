import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";
import { availableLanguages } from "@/i18n";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setCurrentLang(langCode);

    localStorage.setItem("nginxshield_language", langCode);
  };

  const getCurrentLanguage = () => {
    return (
      availableLanguages.find((lang) => lang.code === currentLang) ||
      availableLanguages[0]
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white hover:bg-slate-700/50"
        >
          <Languages className="h-4 w-4 mr-2" />
          <span className="text-lg mr-1">{getCurrentLanguage().flag}</span>
          {getCurrentLanguage().name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-slate-800 border-slate-700 min-w-[180px]"
      >
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-green-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
