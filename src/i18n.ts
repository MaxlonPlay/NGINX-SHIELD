import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import itTranslation from "./lang/it.json";
import enTranslation from "./lang/en.json";
import frTranslation from "./lang/fr.json";
import esTranslation from "./lang/es.json";
import deTranslation from "./lang/de.json";
import arTranslation from "./lang/ar.json";
import chTranslation from "./lang/ch.json";
import jaTranslation from "./lang/ja.json";
import ruTranslation from "./lang/ru.json";
import ptTranslation from "./lang/pt.json";

const resources = {
  it: {
    translation: itTranslation,
  },
  en: {
    translation: enTranslation,
  },
  es: {
    translation: esTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  de: {
    translation: deTranslation,
  },
  ar: {
    translation: arTranslation,
  },
  ch: {
    translation: chTranslation,
  },
  ja: {
    translation: jaTranslation,
  },
  ru: {
    translation: ruTranslation,
  },
  pt: {
    translation: ptTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "it",
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],

      lookupLocalStorage: "nginxshield_language",

      caches: ["localStorage"],
    },

    defaultNS: "translation",

    pluralSeparator: "_",

    keySeparator: ".",

    contextSeparator: "_",
  });

export default i18n;

export const availableLanguages = [
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ch", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
];
