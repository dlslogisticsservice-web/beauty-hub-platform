import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CenterCard } from "@/components/center-card";
import { listCenters } from "@/lib/centers.functions";
import { useI18n } from "@/hooks/use-i18n";
import { EGYPT_CITIES, SAUDI_CITIES, getAllCities } from "@/data/cities";

const searchSchema = z.object({
  city: z.string().optional(),
  country: z.enum(["EG", "SA"]).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["rating", "newest"]).optional(),
});

export const Route = createFileRoute("/centers")({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [
      { title: "Browse Centers — Beauty Hub" },
      { name: "description", content: "Browse and filter beauty, laser and aesthetic centers by city, service and rating." },
    ],
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["centers", deps],
        queryFn: () =>
          listCenters({
            data: {
              city: deps.city,
              country: deps.country,
              category: deps.category,
              search: deps.q,
              sort: deps.sort,
            },
          }),
      }),
    ),
  component: BrowsePage,
});

const CATEGORIES = ["laser", "filler", "botox", "facial", "hair", "nails", "massage", "other"] as const;

function BrowsePage() {
  const { t, locale } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const opts = queryOptions({
    queryKey: ["centers", search],
    queryFn: () =>
      listCenters({
        data: { city: search.city, country: search.country, category: search.category, search: search.q, sort: search.sort },
      }),
  });
  const { data } = useSuspenseQuery(opts);
  const [q, setQ] = useState(search.q ?? "");

  const update = (patch: Partial<typeof search>) =>
    navigate({ to: "/centers", search: { ...search, ...patch } as never });

  const cityOptions = useMemo(() => {
    if (search.country === "EG") return EGYPT_CITIES.map((c) => ({ ...c, country: "EG" as const }));
    if (search.country === "SA") return SAUDI_CITIES.map((c) => ({ ...c, country: "SA" as const }));
    return getAllCities();
  }, [search.country]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-display text-5xl">{t("centers.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("browse.subtitle")}</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("browse.search_name")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && update({ q: q || undefined })}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0"
            />
          </div>

          <select
            value={search.country ?? ""}
            onChange={(e) => update({ country: (e.target.value || undefined) as "EG" | "SA" | undefined, city: undefined })}
            className="md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("auth.country")}</option>
            <option value="EG">🇪🇬 {t("common.country_eg")}</option>
            <option value="SA">🇸🇦 {t("common.country_sa")}</option>
          </select>

          <select
            value={search.city ?? ""}
            onChange={(e) => update({ city: e.target.value || undefined })}
            className="md:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("centers.filter_city")}</option>
            {cityOptions.map((c) => (
              <option key={`${c.country}-${c.value}`} value={c.value}>
                {locale === "ar" ? c.label_ar : c.label_en}
                {!search.country ? ` — ${c.country}` : ""}
              </option>
            ))}
          </select>

          <select
            value={search.category ?? ""}
            onChange={(e) => update({ category: e.target.value || undefined })}
            className="md:w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("browse.all_services")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>

          <select
            value={search.sort ?? "rating"}
            onChange={(e) => update({ sort: e.target.value as "rating" | "newest" })}
            className="md:w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="rating">{t("centers.sort_rating")}</option>
            <option value="newest">{t("centers.sort_newest")}</option>
          </select>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{data.centers.length} {t("browse.found")}</p>

        {data.centers.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <p className="text-display text-2xl text-muted-foreground">{t("centers.empty")}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.centers.map((c) => <CenterCard key={c.id} center={c} />)}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
