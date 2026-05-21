export type Country = "EG" | "SA";

export const CURRENCY_BY_COUNTRY: Record<Country, { code: "EGP" | "SAR"; symbol: string; symbolAr: string; locale: string }> = {
  EG: { code: "EGP", symbol: "EGP", symbolAr: "ج.م", locale: "ar-EG" },
  SA: { code: "SAR", symbol: "SAR", symbolAr: "ر.س", locale: "ar-SA" },
};

export function formatPrice(price: number, country: Country | string | null | undefined, locale: "ar" | "en" = "en") {
  const c = (country === "SA" ? "SA" : "EG") as Country;
  const info = CURRENCY_BY_COUNTRY[c];
  const n = Number(price ?? 0).toLocaleString(locale === "ar" ? info.locale : "en-US", { maximumFractionDigits: 0 });
  const sym = locale === "ar" ? info.symbolAr : info.code;
  return `${n} ${sym}`;
}

export function currencyFor(country: Country | string | null | undefined): "EGP" | "SAR" {
  return country === "SA" ? "SAR" : "EGP";
}
