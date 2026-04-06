import React from "react";
import { useTranslation } from "./useTranslation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
  const { language, changeLanguage, availableLanguages } = useTranslation();

  const languageNames = {
    fr: "Français",
    en: "English",
    ar: "العربية"
  };

  const flags = {
    fr: "🇫🇷",
    en: "🇬🇧",
    ar: "🇸🇦"
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Changer la langue">
          <Globe className="w-5 h-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => changeLanguage(lang)}
            className={language === lang ? "bg-orange-50" : ""}
          >
            <span className="mr-2">{flags[lang]}</span>
            {languageNames[lang]}
            {language === lang && <span className="ml-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}