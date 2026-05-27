import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  Search,
  Sparkles,
  ShieldCheck,
  CalendarHeart,
  MapPin,
  Star,
  Crown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CenterCard } from "@/components/center-card";
import { PromoCarousel } from "@/components/promo-carousel";
import { listCenters } from "@/lib/centers.functions";
import { useI18n } from "@/hooks/use-i18n";

// ── Hero carousel slides ───────────────────────────────────────────────────
// 6 luxury beauty/spa slides — cinematic crossfade, 5 s interval

const HERO_SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1400&q=80",
    label_en: "Premium Salon & Spa",
    label_ar: "صالون وسبا فاخر",
  },
  {
    url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1400&q=80",
    label_en: "Advanced Facial Treatments",
    label_ar: "علاجات الوجه المتقدمة",
  },
  {
    url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1400&q=80",
    label_en: "Laser & Aesthetic Medicine",
    label_ar: "الليزر والطب التجميلي",
  },
  {
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1400&q=80",
    label_en: "Professional Skin Care",
    label_ar: "العناية الاحترافية بالبشرة",
  },
  {
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&q=80",
    label_en: "Luxury Hair Treatments",
    label_ar: "علاجات الشعر الفاخرة",
  },
  {
    url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1400&q=80",
    label_en: "Nail Art & Manicure",
    label_ar: "الأظافر والمانيكير",
  },
] as const;

const HERO_INTERVAL = 5000; // ms per slide

// ── Route + data ───────────────────────────────────────────────────────────

const featuredOpts = queryOptions({
  queryKey: ["centers", "featured"],
  queryFn: () => listCenters({ data: { limit: 8 } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beauty Hub — Book Beauty, Laser & Aesthetic Clinics" },
      {
        name: "description",
        content:
          "Discover and instantly book the best beauty, laser, filler and botox clinics in your city with Beauty Hub.",
      },
      { property: "og:title", content: "Beauty Hub — Beauty Booking Marketplace" },
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

const CATEGORIES = ["laser", "filler", "botox", "facial", "hair", "nails"] as const;

// Static bilingual testimonials
const TESTIMONIALS = [
  {
    name_en: "Sarah K.",
    name_ar: "سارة ك.",
    text_en:
      "Found the perfect laser clinic in Cairo within minutes. Booking was seamless and the results were incredible.",
    text_ar:
      "وجدت عيادة الليزر المثالية في القاهرة خلال دقائق. كان الحجز سلساً والنتائج رائعة.",
    rating: 5,
    city_en: "Cairo",
    city_ar: "القاهرة",
  },
  {
    name_en: "Nora A.",
    name_ar: "نورة أ.",
    text_en:
      "The AI skin consultant recommended the exact treatment I needed. I've never felt more confident in my skin.",
    text_ar:
      "أوصى مستشار البشرة بالذكاء الاصطناعي بالعلاج الذي أحتاجه تماماً. لم أشعر بهذه الثقة من قبل.",
    rating: 5,
    city_en: "Riyadh",
    city_ar: "الرياض",
  },
  {
    name_en: "Layla R.",
    name_ar: "ليلى ر.",
    text_en:
      "Instant confirmation and professional service every time. The best beauty platform in the region.",
    text_ar:
      "تأكيد فوري وخدمة احترافية في كل مرة. أفضل منصة جمال في المنطقة.",
    rating: 5,
    city_en: "Jeddah",
    city_ar: "جدة",
  },
] as const;

// ── Page component ─────────────────────────────────────────────────────────

function HomePage() {
  const { t, locale } = useI18n();
  const { data } = useQuery({ ...featuredOpts, retry: false });
  const navigate = useNavigate();

  // Search state
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<string>("");

  // Hero carousel state
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, HERO_INTERVAL);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goToSlide = useCallback(
    (i: number) => {
      setActiveSlide(i);
      startTimer();
    },
    [startTimer],
  );

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

      {/* ═══════════════════════════════════════════════════════════
          HERO — Full-bleed cinematic carousel
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "clamp(600px, 88vh, 820px)" }}
      >
        {/* ── Background slides (CSS crossfade) ─────────────────── */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.url}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.url})`,
              opacity: i === activeSlide ? 1 : 0,
              transition: "opacity 1400ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "opacity",
            }}
            aria-hidden="true"
          />
        ))}

        {/* ── Cinematic dual-gradient overlay ───────────────────── */}
        {/* Left-to-right: dark on left for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.72) 40%, rgba(10,10,10,0.35) 70%, rgba(10,10,10,0.20) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Bottom fade for depth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,10,10,0.70) 0%, transparent 45%)",
          }}
          aria-hidden="true"
        />
        {/* Subtle top vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.25) 0%, transparent 25%)",
          }}
          aria-hidden="true"
        />

        {/* ── Hero content ───────────────────────────────────────── */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 flex flex-col justify-center h-full pb-16 pt-16 sm:pt-20">

          {/* Brand signature mark */}
          <div className="flex items-center gap-2.5 mb-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <Crown className="h-4 w-4 text-black" />
            </span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/70 to-transparent" />
            <span className="text-[11px] uppercase tracking-[0.28em] text-primary/85 font-semibold">
              Beauty Hub
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-primary/70 to-transparent" />
            <span
              dir="rtl"
              className="text-[11px] text-primary/60 text-display hidden sm:inline"
            >
              بيوتي هب
            </span>
          </div>

          {/* Badge */}
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-black/60 border border-primary/20 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur-sm shadow-soft">
            <Sparkles className="h-3.5 w-3.5" />
            {t("home.badge")}
          </span>

          {/* Main headline */}
          <h1 className="mt-5 text-display leading-[1.02] text-white max-w-2xl"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)" }}>
            {t("home.hero_title")}
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-lg text-base sm:text-lg text-white/75 leading-relaxed">
            {t("home.hero_subtitle")}
          </p>

          {/* ── Search box ───────────────────────────────────────── */}
          <div className="mt-7 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-3 shadow-soft max-w-2xl">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("home.search_placeholder")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-white/40"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="sm:w-44 rounded-lg border-0 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-0"
              >
                <option className="bg-background text-foreground" value="">
                  {t("home.search_all")}
                </option>
                {CATEGORIES.map((c) => (
                  <option
                    key={c}
                    value={c}
                    className="bg-background text-foreground"
                  >
                    {t(`categories.${c}`)}
                  </option>
                ))}
              </select>

              <Button
                onClick={handleSearch}
                className="rounded-xl bg-gradient-primary px-6 shadow-soft font-semibold"
              >
                <Search className="h-4 w-4 mr-2" />
                {t("home.search_button")}
              </Button>
            </div>
          </div>

          {/* ── Category quick-links ─────────────────────────────── */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/centers"
                search={{ category: c } as never}
                className="rounded-full border border-white/15 bg-white/8 backdrop-blur-sm px-3.5 py-1.5 text-xs text-white/85 hover:border-primary hover:bg-card hover:text-primary transition-all duration-200"
              >
                {t(`categories.${c}`)}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Slide dot indicators ────────────────────────────────── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeSlide ? "28px" : "6px",
                height: "6px",
                background:
                  i === activeSlide
                    ? "var(--gold)"
                    : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>

        {/* ── Current slide label — bottom right ─────────────────── */}
        <div className="absolute bottom-5 right-5 sm:right-8 hidden sm:flex items-center gap-2">
          <span
            className="block transition-all duration-700"
            style={{
              width: "16px",
              height: "1px",
              background: "var(--gold)",
              opacity: 0.6,
            }}
          />
          <p className="text-[11px] text-white/45 uppercase tracking-[0.2em]">
            {locale === "ar"
              ? HERO_SLIDES[activeSlide].label_ar
              : HERO_SLIDES[activeSlide].label_en}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRUST STATS
          ═══════════════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: "500+", label: t("home.stats.centers") },
              { value: "50K+", label: t("home.stats.bookings") },
              { value: "15+", label: t("home.stats.cities") },
              { value: "4.9★", label: t("home.stats.rating") },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center py-1 text-center"
              >
                <span className="text-display text-3xl font-semibold text-gold-gradient">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground mt-1 leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURES
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-3">
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
              <h3 className="mt-4 text-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PROMO CAROUSEL + AI CONSULTANT
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PromoCarousel />
          </div>
          <Link
            to="/ai-consultant"
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 hover:border-primary transition group min-h-[160px]"
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
            <span className="mt-5 text-xs font-semibold text-primary">
              {t("ai_consultant.start")} →
            </span>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURED CENTERS
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-display text-4xl">
              {t("home.featured_centers")}
            </h2>
            <p className="text-muted-foreground mt-1">{t("home.featured_sub")}</p>
          </div>
          <Link
            to="/centers"
            className="text-sm text-primary hover:underline shrink-0"
          >
            {t("home.browse_all")}
          </Link>
        </div>

        {(data?.centers?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <p className="text-display text-3xl text-muted-foreground">
              {t("home.no_centers")}
            </p>
            <Button asChild className="mt-6 rounded-full bg-gradient-primary">
              <Link to="/auth/signup">{t("home.list_yours")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data?.centers?.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-border bg-card/40 px-6 py-12 sm:px-12">
          <div className="text-center">
            <h2 className="text-display text-4xl">
              {t("home.testimonials_title")}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t("home.testimonials_sub")}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  &ldquo;
                  {locale === "ar" ? item.text_ar : item.text_en}
                  &rdquo;
                </p>
                {/* Author */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-black shrink-0">
                    {(locale === "ar"
                      ? item.name_ar
                      : item.name_en
                    ).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {locale === "ar" ? item.name_ar : item.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {locale === "ar" ? item.city_ar : item.city_en}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
