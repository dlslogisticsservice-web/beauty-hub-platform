import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CenterCard } from "@/components/center-card";
import { listCenters } from "@/lib/centers.functions";
import { useI18n } from "@/hooks/use-i18n";

const searchSchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
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
        queryFn: () => listCenters({ data: { city: deps.city, category: deps.category, search: deps.q } }),
      }),
    ),
  component: BrowsePage,
});

const CATEGORIES = ["laser", "filler", "botox", "facial", "hair", "nails", "massage", "other"] as const;

function BrowsePage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const opts = queryOptions({
    queryKey: ["centers", search],
    queryFn: () => listCenters({ data: { city: search.city, category: search.category, search: search.q } }),
  });
  const { data } = useSuspenseQuery(opts);
  const [q, setQ] = useState(search.q ?? "");

  const update = (patch: Partial<typeof search>) =>
    navigate({ to: "/centers", search: { ...search, ...patch } as never });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-display text-5xl">{t("centers.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("browse.subtitle")}</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("browse.search_name")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && update({ q: q || undefined })}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <Input
            placeholder={t("centers.filter_city")}
            value={search.city ?? ""}
            onChange={(e) => update({ city: e.target.value || undefined })}
            className="md:w-48"
          />
          <select
            value={search.category ?? ""}
            onChange={(e) => update({ category: e.target.value || undefined })}
            className="md:w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("browse.all_services")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
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
