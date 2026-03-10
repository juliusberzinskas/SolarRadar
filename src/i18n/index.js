import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import lt from "./lt.json";
import en from "./en.json";

// išsaugom pasirinkimą localStorage
const savedLang = localStorage.getItem("lang");
const browserLang = navigator.language?.toLowerCase().startsWith("lt") ? "lt" : "en";
const defaultLang = savedLang || browserLang;

i18n.use(initReactI18next).init({
  resources: {
    lt: { translation: lt },
    en: { translation: en },
  },
  lng: defaultLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;