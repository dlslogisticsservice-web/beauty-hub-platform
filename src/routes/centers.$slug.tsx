import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Star, MapPin, Phone, BadgeCheck, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { getCenterBySlug } from "@/lib/centers.functions";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/hooks/use-i18n";
import { cityLabel } from "@/data/cities";

const centerOpts = (slug: string) =>
  queryOptions({
    queryKey: ["center", slug],
    queryFn: () => getCenterBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/centers/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(centerOpts(params.slug));
    if (!data.center) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.center
      ? [
          { title: `${loaderData.center.name} — Beauty Hub` },
          { name: "description", content: loaderData.center.description ?? `Book services at ${loaderData.center.name} on Beauty Hub.` },
          { property: "og:title", content: `${loaderData.center.name} — Beauty Hub` },
          { property: "og:description", content: loaderData.center.description ?? "" },
          ...(loaderData.center.cover_url ? [{ property: "og:image", content: loaderData.center.cover_url }] : []),
        ]
      : [{ title: "Center — Beauty Hub" }],
  }),
  component: CenterPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-display text-5xl">Center not found</h1>
        <Link to="/centers" className="mt-6 inline-block text-primary hover:underline">← Browse centers</Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function CenterPage() {
  const { t, locale } = useI18n();
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(centerOpts(slug));
  const center = data.center!;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Cover */}
      <div className="relative h-64 sm:h-80 bg-gradient-hero overflow-hidden">
        {center.cover_url ? (
          <img src={center.cover_url} alt={center.name} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="mx-auto -mt-20 w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary">
                {center.logo_url ? (
                  <img src={center.logo_url} alt={center.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-display text-4xl text-primary/40">
                    {center.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-display text-4xl">{center.name}</h1>
                  {center.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">
                      <BadgeCheck className="h-3 w-3" /> {t("centers.verified")}
                    </span>
                  )}
                  {center.subscription_plan === "premium" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/90 px-2 py-0.5 text-xs">
                      <Crown className="h-3 w-3" /> {t("centers.featured")}
                    </span>
                  )}
                </div>
                {center.name_ar && (
                  <p dir="rtl" className="text-xl text-primary text-display mt-1">{center.name_ar}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {center.city && (
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {cityLabel(center.city, locale)}</span>
                  )}
                  {center.phone && (
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {center.phone}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    {center.rating_avg ? center.rating_avg.toFixed(1) : t("centers.no_reviews")}{" "}
                    {center.rating_count > 0 && <span>({center.rating_count})</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {center.description && (
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-3xl">{center.description}</p>
          )}
          {center.description_ar && (
            <p dir="rtl" className="mt-2 text-muted-foreground leading-relaxed max-w-3xl">{center.description_ar}</p>
          )}
        </div>

        <section className="mt-12">
          <h2 className="text-display text-3xl">{t("centers.services")}</h2>
          {data.services.length === 0 ? (
            <p className="mt-4 text-muted-foreground">{t("center.no_services_title")}</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.services.map((s) => (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{t(`categories.${s.category}`)}</span>
                      <h3 className="text-display text-2xl mt-1.5">{s.name}</h3>
                      {s.name_ar && <p dir="rtl" className="text-muted-foreground text-sm">{s.name_ar}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-display text-2xl text-primary">{formatPrice(s.price, center.country, locale)}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {s.duration_minutes} {t("common.minutes")}
                      </p>
                    </div>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-3 flex-1">{s.description}</p>}
                  <Button asChild className="mt-4 rounded-full bg-gradient-primary">
                    <Link to="/book/$serviceId" params={{ serviceId: s.id }}>{t("common.book_now")}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 mb-16">
          <h2 className="text-display text-3xl">{t("centers.reviews")}</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-4 text-muted-foreground">{t("centers.no_reviews")}</p>
          ) : (
            <div className="mt-6 space-y-4">
              {data.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-foreground/90">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
