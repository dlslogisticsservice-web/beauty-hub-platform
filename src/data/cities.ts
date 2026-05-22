export type CityEntry = { value: string; label_en: string; label_ar: string };
export type CityEntryWithCountry = CityEntry & { country: "EG" | "SA" };

export const EGYPT_CITIES: CityEntry[] = [
  { value: "cairo", label_en: "Cairo", label_ar: "القاهرة" },
  { value: "giza", label_en: "Giza", label_ar: "الجيزة" },
  { value: "alexandria", label_en: "Alexandria", label_ar: "الإسكندرية" },
  { value: "shubra", label_en: "Shubra El Kheima", label_ar: "شبرا الخيمة" },
  { value: "port_said", label_en: "Port Said", label_ar: "بورسعيد" },
  { value: "suez", label_en: "Suez", label_ar: "السويس" },
  { value: "luxor", label_en: "Luxor", label_ar: "الأقصر" },
  { value: "aswan", label_en: "Aswan", label_ar: "أسوان" },
  { value: "mansoura", label_en: "Mansoura", label_ar: "المنصورة" },
  { value: "tanta", label_en: "Tanta", label_ar: "طنطا" },
  { value: "ismailia", label_en: "Ismailia", label_ar: "الإسماعيلية" },
  { value: "fayyum", label_en: "Fayyum", label_ar: "الفيوم" },
  { value: "zagazig", label_en: "Zagazig", label_ar: "الزقازيق" },
  { value: "damietta", label_en: "Damietta", label_ar: "دمياط" },
  { value: "assiut", label_en: "Assiut", label_ar: "أسيوط" },
  { value: "sohag", label_en: "Sohag", label_ar: "سوهاج" },
  { value: "qena", label_en: "Qena", label_ar: "قنا" },
  { value: "beni_suef", label_en: "Beni Suef", label_ar: "بني سويف" },
  { value: "minya", label_en: "Minya", label_ar: "المنيا" },
  { value: "damanhur", label_en: "Damanhur", label_ar: "دمنهور" },
  { value: "kafr_el_sheikh", label_en: "Kafr El Sheikh", label_ar: "كفر الشيخ" },
  { value: "menofia", label_en: "Menofia", label_ar: "المنوفية" },
  { value: "gharbia", label_en: "Gharbia", label_ar: "الغربية" },
  { value: "sharqia", label_en: "Sharqia", label_ar: "الشرقية" },
  { value: "beheira", label_en: "Beheira", label_ar: "البحيرة" },
  { value: "qalyubia", label_en: "Qalyubia", label_ar: "القليوبية" },
  { value: "north_sinai", label_en: "North Sinai", label_ar: "شمال سيناء" },
  { value: "south_sinai", label_en: "South Sinai", label_ar: "جنوب سيناء" },
  { value: "red_sea", label_en: "Red Sea", label_ar: "البحر الأحمر" },
  { value: "new_valley", label_en: "New Valley", label_ar: "الوادي الجديد" },
  { value: "matruh", label_en: "Matrouh", label_ar: "مطروح" },
  { value: "new_cairo", label_en: "New Cairo", label_ar: "القاهرة الجديدة" },
  { value: "6th_october", label_en: "6th of October", label_ar: "السادس من أكتوبر" },
  { value: "obour", label_en: "Obour", label_ar: "العبور" },
  { value: "shorouk", label_en: "El Shorouk", label_ar: "الشروق" },
  { value: "badr", label_en: "Badr City", label_ar: "مدينة بدر" },
  { value: "hurghada", label_en: "Hurghada", label_ar: "الغردقة" },
  { value: "sharm", label_en: "Sharm El Sheikh", label_ar: "شرم الشيخ" },
];

export const SAUDI_CITIES: CityEntry[] = [
  { value: "riyadh", label_en: "Riyadh", label_ar: "الرياض" },
  { value: "jeddah", label_en: "Jeddah", label_ar: "جدة" },
  { value: "mecca", label_en: "Mecca", label_ar: "مكة المكرمة" },
  { value: "medina", label_en: "Medina", label_ar: "المدينة المنورة" },
  { value: "dammam", label_en: "Dammam", label_ar: "الدمام" },
  { value: "khobar", label_en: "Al Khobar", label_ar: "الخبر" },
  { value: "dhahran", label_en: "Dhahran", label_ar: "الظهران" },
  { value: "jubail", label_en: "Al Jubail", label_ar: "الجبيل" },
  { value: "tabuk", label_en: "Tabuk", label_ar: "تبوك" },
  { value: "abha", label_en: "Abha", label_ar: "أبها" },
  { value: "taif", label_en: "Taif", label_ar: "الطائف" },
  { value: "khamis", label_en: "Khamis Mushait", label_ar: "خميس مشيط" },
  { value: "hail", label_en: "Hail", label_ar: "حائل" },
  { value: "najran", label_en: "Najran", label_ar: "نجران" },
  { value: "jizan", label_en: "Jizan", label_ar: "جازان" },
  { value: "yanbu", label_en: "Yanbu", label_ar: "ينبع" },
  { value: "al_qassim", label_en: "Al Qassim", label_ar: "القصيم" },
  { value: "buraidah", label_en: "Buraidah", label_ar: "بريدة" },
  { value: "al_ahsa", label_en: "Al-Ahsa", label_ar: "الأحساء" },
  { value: "hafr_batin", label_en: "Hafar Al-Batin", label_ar: "حفر الباطن" },
  { value: "arar", label_en: "Arar", label_ar: "عرعر" },
  { value: "sakaka", label_en: "Sakaka", label_ar: "سكاكا" },
  { value: "qatif", label_en: "Qatif", label_ar: "القطيف" },
  { value: "kharj", label_en: "Al Kharj", label_ar: "الخرج" },
  { value: "majmaah", label_en: "Al Majmaah", label_ar: "المجمعة" },
  { value: "wajh", label_en: "Al Wajh", label_ar: "الوجه" },
  { value: "dawadmi", label_en: "Dawadmi", label_ar: "الدوادمي" },
  { value: "zulfi", label_en: "Zulfi", label_ar: "الزلفي" },
  { value: "baha", label_en: "Al Baha", label_ar: "الباحة" },
  { value: "leith", label_en: "Al Leith", label_ar: "الليث" },
];

export function getCitiesForCountry(country: "EG" | "SA"): CityEntry[] {
  return country === "EG" ? EGYPT_CITIES : SAUDI_CITIES;
}

export function getAllCities(): CityEntryWithCountry[] {
  return [
    ...EGYPT_CITIES.map((c) => ({ ...c, country: "EG" as const })),
    ...SAUDI_CITIES.map((c) => ({ ...c, country: "SA" as const })),
  ];
}

const CITY_MAP: Record<string, CityEntry> = Object.fromEntries(
  getAllCities().map((c) => [c.value, c]),
);

export function cityLabel(value: string | null | undefined, locale: "ar" | "en" = "en"): string {
  if (!value) return "";
  const entry = CITY_MAP[value];
  if (!entry) return value;
  return locale === "ar" ? entry.label_ar : entry.label_en;
}
