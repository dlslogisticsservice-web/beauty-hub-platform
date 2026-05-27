/**
 * Country → City linked filter.
 *
 * Hook + UI component built on top of the existing src/data/cities.ts
 * module (EGYPT_CITIES, SAUDI_CITIES, getCitiesForCountry).
 * No new data files; no duplication of city lists.
 *
 * Exports
 * ───────
 *  useCountryCityFilter   state hook (country → auto-reset city)
 *  CountryCitySelector    linked <select> pair, locale-aware labels
 *  CountryCode            "EG" | "SA"
 */

import { useState, useCallback } from "react";
import { getCitiesForCountry, type CityEntry } from "@/data/cities";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

// ── types ─────────────────────────────────────────────────────────────────

export type CountryCode = "EG" | "SA";

export interface UseCountryCityFilterReturn {
  country: CountryCode;
  city: string;
  cities: CityEntry[];
  setCountry: (c: CountryCode) => void;
  setCity: (c: string) => void;
  reset: () => void;
}

// ── hook ──────────────────────────────────────────────────────────────────

const DEFAULT_COUNTRY: CountryCode = "EG";

function firstCity(c: CountryCode) {
  return getCitiesForCountry(c)[0]?.value ?? "";
}

/**
 * Manages country + city selection state.
 *
 * When `setCountry` is called the city automatically resets to the
 * first city of the new country — the linked-dropdown pattern from the
 * reference AdminPanel, adapted to the current `src/data/cities.ts` shape.
 */
export function useCountryCityFilter(
  initialCountry: CountryCode = DEFAULT_COUNTRY,
): UseCountryCityFilterReturn {
  const [country, setCountryState] = useState<CountryCode>(initialCountry);
  const [city, setCity]            = useState<string>(() => firstCity(initialCountry));

  const setCountry = useCallback((c: CountryCode) => {
    setCountryState(c);
    setCity(firstCity(c));
  }, []);

  const reset = useCallback(() => {
    setCountryState(DEFAULT_COUNTRY);
    setCity(firstCity(DEFAULT_COUNTRY));
  }, []);

  return {
    country,
    city,
    cities: getCitiesForCountry(country),
    setCountry,
    setCity,
    reset,
  };
}

// ── UI component ──────────────────────────────────────────────────────────

/** Static country options — labels localised via existing i18n keys. */
const COUNTRY_OPTIONS: Array<{
  value: CountryCode;
  /** Key into the `countries` i18n namespace, e.g. "countries.eg" */
  i18nKey: string;
}> = [
  { value: "EG", i18nKey: "countries.eg" },
  { value: "SA", i18nKey: "countries.sa" },
];

interface CountryCitySelectorProps {
  country: CountryCode;
  city: string;
  cities: CityEntry[];
  onCountryChange: (c: CountryCode) => void;
  onCityChange: (c: string) => void;
  /** "row" renders the selects side-by-side; "col" stacks them. */
  layout?: "row" | "col";
  className?: string;
}

/**
 * Linked country + city <select> pair.
 *
 * Designed to be used together with `useCountryCityFilter`:
 *
 *   const filter = useCountryCityFilter();
 *   <CountryCitySelector
 *     {...filter}
 *     onCountryChange={filter.setCountry}
 *     onCityChange={filter.setCity}
 *   />
 */
export function CountryCitySelector({
  country,
  city,
  cities,
  onCountryChange,
  onCityChange,
  layout = "row",
  className,
}: CountryCitySelectorProps) {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  const selectCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 " +
    "text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition";

  return (
    <div
      className={cn(
        layout === "row" ? "flex gap-3" : "flex flex-col gap-3",
        className,
      )}
    >
      {/* Country */}
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("common.country_eg").replace("Egypt", "").replace("مصر", "") || "Country"}
        </label>
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          className={selectCls}
        >
          {COUNTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.i18nKey)}
            </option>
          ))}
        </select>
      </div>

      {/* City — list rebuilds automatically when country changes */}
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("browse.city")}
        </label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className={selectCls}
        >
          {cities.map((c) => (
            <option key={c.value} value={c.value}>
              {isAr ? c.label_ar : c.label_en}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
