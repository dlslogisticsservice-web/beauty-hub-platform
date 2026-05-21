import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";

export type Locale = "ar" | "en";
type Dict = Record<string, unknown>;

const DICTS: Record<Locale, Dict> = { ar, en };
const STORAGE_KEY = "bh_locale";

type Ctx = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<Ctx | null>(null);

function getNested(obj: Dict, path: string): string {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Dict)) return (acc as Dict)[k];
    return undefined;
  }, obj) as string ?? path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    const initial: Locale = saved === "en" || saved === "ar" ? saved : "ar";
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string) => {
    const v = getNested(DICTS[locale], key);
    if (typeof v === "string") return v;
    const fb = getNested(DICTS.en, key);
    return typeof fb === "string" ? fb : key;
  };

  return (
    <I18nContext.Provider value={{ locale, dir: locale === "ar" ? "rtl" : "ltr", t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe SSR fallback
    return {
      locale: "ar" as Locale,
      dir: "rtl" as const,
      t: (k: string) => k,
      setLocale: () => {},
    };
  }
  return ctx;
}
