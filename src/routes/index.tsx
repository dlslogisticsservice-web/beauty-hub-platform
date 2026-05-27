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
        style={{ minHeight: "clamp(540px, 82vh, 860px)" }}
      >
        {/* ── Background slides (CSS crossfade) ─────────────────── */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.url}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.url})`,
              backgroundPosition: "center 30%",
              opacity: i === activeSlide ? 1 : 0,
              transition: "opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "opacity",
            }}
            aria-hidden="true"
          />
        ))}

        {/* ── Gradient overlays — cinema-style, image stays visible ─ */}
        {/* Layer 1: Strong bottom-up — anchors content, fades at top */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.75) 22%, rgba(13,13,13,0.35) 48%, rgba(13,13,13,0.08) 72%, transparent 100%)",
          }}
          aria-hidden="true"
        />
        {/* Layer 2: Soft left scrim — text legibility without killing the image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(95deg, rgba(13,13,13,0.78) 0%, rgba(13,13,13,0.50) 28%, rgba(13,13,13,0.15) 55%, transparent 75%)",
          }}
          aria-hidden="true"
        />
        {/* Layer 3: Subtle top edge — keeps header area grounded */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,13,13,0.40) 0%, transparent 18%)",
          }}
          aria-hidden="true"
        />

        {/* ── Hero content — bottom-anchored for cinematic feel ──── */}
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 flex flex-col justify-end h-full pb-20 sm:pb-24"
          style={{ minHeight: "inherit" }}>

          {/* Brand signature mark */}
          <div className="flex items-center gap-3 mb-5 text-shadow">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <Crown className="h-4.5 w-4.5 text-black" />
            </span>
            <span className="h-px w-6 bg-gradient-to-r from-primary/80 to-transparent" />
            <span className="text-[11px] uppercase tracking-[0.30em] text-primary font-semibold text-glow-gold">
              Beauty Hub
            </span>
            <span className="h-px w-6 bg-gradient-to-l from-primary/80 to-transparent" />
            <span dir="rtl" className="text-[11px] text-primary/70 text-display hidden sm:inline">
              بيوتي هب
            </span>
          </div>

          {/* Badge */}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-black/50 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md text-shadow">
            <Sparkles className="h-3.5 w-3.5" />
            {t("home.badge")}
          </span>

          {/* Main headline */}
          <h1
            className="mt-4 text-display leading-[1.0] text-white max-w-xl text-shadow-lg"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            {t("home.hero_title")}
          </h1>

          {/* Subtitle */}
          <p className="mt-4 max-w-md text-[0.95rem] sm:text-lg text-white/85 leading-[1.65] text-shadow font-light">
            {t("home.hero_subtitle")}
          </p>

          {/* CTA row */}
          <div className="mt-7 flex items-center gap-3">
            <Button
              onClick={() => document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-gradient-primary px-7 py-3 text-sm font-semibold shadow-soft"
            >
              <Search className="h-4 w-4 mr-2" />
              {t("home.search_button")}
            </Button>
            <Link
              to="/centers"
              className="rounded-full border border-white/25 bg-white/8 backdrop-blur-sm px-5 py-3 text-sm text-white/90 hover:border-primary hover:text-primary transition-all duration-200 font-medium text-shadow"
            >
              {t("home.browse_all")}
            </Link>
          </div>
        </div>

        {/* ── Slide dot indicators ─────────────────────────────── */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all duration-400"
              style={{
                width: i === activeSlide ? "32px" : "7px",
                height: "7px",
                background: i === activeSlide
                  ? "var(--gold)"
                  : "rgba(255,255,255,0.30)",
                boxShadow: i === activeSlide
                  ? "0 0 12px rgba(212,175,55,0.50)"
                  : "none",
              }}
            />
          ))}
        </div>

        {/* ── Slide label — bottom right ───────────────────────── */}
        <div className="absolute bottom-6 right-6 sm:right-10 hidden sm:flex items-center gap-2.5 text-shadow">
          <span style={{ display: "block", width: "20px", height: "1px", background: "var(--gold)", opacity: 0.55 }} />
          <p className="text-[10px] text-white/40 uppercase tracking-[0.22em]">
            {locale === "ar"
              ? HERO_SLIDES[activeSlide].label_ar
              : HERO_SLIDES[activeSlide].label_en}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEARCH — Clean separate section below the hero
          ═══════════════════════════════════════════════════════════ */}
      <section id="search-section" className="bg-card/60 border-b border-border/50 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">

          {/* Section label */}
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary/70 font-semibold mb-4">
            {locale === "ar" ? "البحث والاكتشاف" : "Discover & Book"}
          </p>

          <div className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* City input */}
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("home.search_placeholder")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-11 border border-border bg-secondary/50 focus-visible:ring-1 text-base sm:text-sm"
                />
              </div>

              {/* Category select */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 sm:w-44 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("home.search_all")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>

              {/* Search button */}
              <Button
                onClick={handleSearch}
                className="h-11 rounded-xl bg-gradient-primary px-7 shadow-soft font-semibold shrink-0 text-sm"
              >
                <Search className="h-4 w-4 mr-2" />
                {t("home.search_button")}
              </Button>
            </div>

            {/* Category pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  to="/centers"
                  search={{ category: c } as never}
                  className="rounded-full border border-border/80 bg-secondary/30 px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-secondary/60 transition-all duration-200"
                >
                  {t(`categories.${c}`)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRUST STATS
          ═══════════════════════════════════════════════════════════ */}
      <section className="border-b border-border/50 bg-card/20">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: "500+", label: t("home.stats.centers") },
              { value: "50K+", label: t("home.stats.bookings") },
              { value: "15+",  label: t("home.stats.cities") },
              { value: "4.9★", label: t("home.stats.rating") },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center gap-1">
                <span className="text-display font-semibold text-gold-gradient"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 2.4rem)" }}>
                  {stat.value}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground leading-snug">
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
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6">
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-3">
          {[
            { icon: ShieldCheck,   title: t("home.features.verified"), desc: t("home.features.verified_desc") },
            { icon: CalendarHeart, title: t("home.features.instant"),  desc: t("home.features.instant_desc") },
            { icon: Sparkles,      title: t("home.features.reviews"),  desc: t("home.features.reviews_desc") },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-card hover:border-primary/30 transition-colors duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-display text-xl sm:text-2xl">{f.title}</h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-[1.7]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PROMO CAROUSEL + AI CONSULTANT
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PromoCarousel />
          </div>
          <Link
            to="/ai-consultant"
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 hover:border-primary/60 hover:shadow-soft transition-all duration-300 group min-h-[180px] shadow-card"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:bg-primary/15 transition-colors">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-display text-xl sm:text-2xl group-hover:text-primary transition-colors">
                {t("ai_consultant.title")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-[1.7]">
                {t("ai_consultant.subtitle")}
              </p>
            </div>
            <span className="mt-6 text-xs font-semibold text-primary tracking-wide">
              {t("ai_consultant.start")} →
            </span>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURED CENTERS
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:pb-16 sm:px-6">
        <div className="flex items-end justify-between mb-7 sm:mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary/70 font-semibold mb-2">
              {locale === "ar" ? "مراكز مختارة" : "Curated for you"}
            </p>
            <h2 className="text-display text-3xl sm:text-4xl">
              {t("home.featured_centers")}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">{t("home.featured_sub")}</p>
          </div>
          <Link
            to="/centers"
            className="text-sm font-semibold text-primary hover:underline shrink-0 flex items-center gap-1.5"
          >
            {t("home.browse_all")}
          </Link>
        </div>

        {(data?.centers?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 sm:p-16 text-center shadow-card">
            <p className="text-display text-2xl sm:text-3xl text-muted-foreground">
              {t("home.no_centers")}
            </p>
            <Button asChild className="mt-6 rounded-full bg-gradient-primary shadow-soft">
              <Link to="/auth/signup">{t("home.list_yours")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data?.centers?.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS
          ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:pb-24 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-card px-6 py-12 sm:px-12 sm:py-14 shadow-card"
          style={{ background: "linear-gradient(135deg, rgba(28,28,28,0.95) 0%, rgba(22,22,22,0.98) 100%)" }}>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary/70 font-semibold mb-3">
              {locale === "ar" ? "قصص حقيقية" : "Real stories"}
            </p>
            <h2 className="text-display text-3xl sm:text-4xl">
              {t("home.testimonials_title")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("home.testimonials_sub")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-background/50 p-5 sm:p-6 flex flex-col shadow-card"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-muted-foreground leading-[1.75] flex-1 italic">
                  &ldquo;{locale === "ar" ? item.text_ar : item.text_en}&rdquo;
                </p>
                {/* Author */}
                <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-black shrink-0 shadow-soft">
                    {(locale === "ar" ? item.name_ar : item.name_en).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">
                      {locale === "ar" ? item.name_ar : item.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
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
