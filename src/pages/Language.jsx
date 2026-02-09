import React from "react";
import { useTranslation } from "@/components/common/useTranslation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Language() {
  const { language, changeLanguage, t, availableLanguages } = useTranslation();

  const languageInfo = {
    fr: {
      name: "Français",
      flag: "🇫🇷",
      nativeName: "Français",
      speakers: "300M+ locuteurs"
    },
    en: {
      name: "English",
      flag: "🇬🇧",
      nativeName: "English",
      speakers: "1.5B+ speakers"
    },
    ar: {
      name: "العربية",
      flag: "🇸🇦",
      nativeName: "العربية",
      speakers: "400M+ متحدثون"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={createPageUrl("Settings")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-orange-600" />
            {t("language")}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {availableLanguages.map((lang, index) => {
          const info = languageInfo[lang];
          const isSelected = language === lang;

          return (
            <motion.div
              key={lang}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-orange-500 border-2 bg-orange-50"
                    : "hover:shadow-md"
                }`}
                onClick={() => changeLanguage(lang)}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{info.flag}</div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {info.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {info.nativeName} • {info.speakers}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-orange-600">
                      {t("selected") || "Sélectionné"}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Info */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("language_info") || "À propos des langues"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              {t("language_description") ||
                "AfriWonder supporte plusieurs langues pour servir notre communauté mondiale. Votre sélection de langue sera sauvegardée et appliquée à tous vos appareils."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}