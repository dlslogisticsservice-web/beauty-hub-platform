import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  Search,
  Sparkles,
  ShieldCheck,
  CalendarHeart,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CenterCard } from "@/components/center-card";
import { PromoCarousel } from "@/components/promo-carousel";

import { listCenters } from "@/lib/centers.functions";
import { useI18n } from "@/hooks/use-i18n";

const HERO_IMG =
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80";

const HERO_IMG_FALLBACK =
  "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80";

const featuredOpts = queryOptions({
  queryKey: ["centers", "featured"],
  queryFn: () =>
    listCenters({
      data: {
        limit: 8,
      },
    }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Beauty Hub — Book Beauty, Laser & Aesthetic Clinics",
      },
      {
        name: "description",
        content:
          "Discover and instantly book the best beauty, laser, filler and botox clinics in your city with Beauty Hub.",
      },
      {
        property: "og:title",
        content: "Beauty Hub — Beauty Booking Marketplace",
      },
      {
        property: "og:description",
        content:
          "Discover and instantly book top beauty and aesthetic clinics in your city.",
      },
    ],
  }),

  loader: async () => null,

  component: HomePage,
});

const CATEGORIES = [
  "laser",
  "filler",
  "botox",
  "facial",
  "hair",
  "nails",
] as const;

function HomePage() {
  const { t } = useI18n();

  const { data } = useQuery({
    ...featuredOpts,
    retry: false,
  });

  const navigate = useNavigate();

  const [city, setCity] = useState("");
  const [category, setCategory] = useState<string>("");

  const handleSearch = () => {
    navigate({
      to: "/centers",
      search: {
        city: city || undefined,
        category: category || undefined,
      } as never,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
          }}
          aria-hidden
        />

        <div className="absolute inset-0 bg-black/35" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.badge")}
            </span>

            <h1 className="mt-6 text-display text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              {t("home.hero_title")}
            </h1>

            <p className="mt-6 max-w-lg text-lg text-white/85">
              {t("home.hero_subtitle")}
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-card p-3 shadow-soft">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    placeholder={t("home.search_placeholder")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="pl-9 border-0 bg-transparent focus-visible:ring-0"
                  />
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-md border-0 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-0"
                >
                  <option value="">
                    {t("home.search_all")}
                  </option>

                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>

                <Button
                  onClick={handleSearch}
                  className="rounded-xl bg-gradient-primary px-6 shadow-soft"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {t("home.search_button")}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  to="/centers"
                  search={{ category: c } as never}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition"
                >
                  {t(`categories.${c}`)}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-[3rem] bg-gradient-primary opacity-20 blur-3xl" />

            <img
              src={HERO_IMG}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  HERO_IMG_FALLBACK;
              }}
              alt="Woman with glowing skin receiving a facial treatment"
              className="relative w-full rounded-[2rem] object-cover shadow-glow"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: t("home.features.verified"),
              desc: t("home.features.verified_desc"),
            },
            {
              icon: CalendarHeart,
              title: t("home.features.instant"),
              desc: t("home.features.instant_desc"),
            },
            {
              icon: Sparkles,
              title: t("home.features.reviews"),
              desc: t("home.features.reviews_desc"),
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-display text-2xl">
                {f.title}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Promo carousel + AI consultant teaser */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PromoCarousel />
          </div>

          <Link
            to="/ai-consultant"
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 hover:border-primary transition group"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-display text-2xl group-hover:text-primary transition">
                {t("ai_consultant.title")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("ai_consultant.subtitle")}
              </p>
            </div>
            <span className="mt-6 text-xs font-semibold text-primary">
              {t("ai_consultant.start")} →
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-display text-4xl">
              {t("home.featured_centers")}
            </h2>

            <p className="text-muted-foreground mt-1">
              {t("home.featured_sub")}
            </p>
          </div>

          <Link
            to="/centers"
            className="text-sm text-primary hover:underline"
          >
            {t("home.browse_all")}
          </Link>
        </div>

        {(data?.centers?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <p className="text-display text-3xl text-muted-foreground">
              {t("home.no_centers")}
            </p>

            <Button
              asChild
              className="mt-6 rounded-full bg-gradient-primary"
            >
              <Link to="/auth/signup">
                {t("home.list_yours")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data?.centers?.map((c) => (
              <CenterCard
                key={c.id}
                center={c}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}