import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, Sparkles, ShieldCheck, CalendarHeart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CenterCard } from "@/components/center-card";
import { listCenters } from "@/lib/centers.functions";
import heroImg from "@/assets/hero.jpg";

const featuredOpts = queryOptions({
  queryKey: ["centers", "featured"],
  queryFn: () => listCenters({ data: { limit: 8 } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glowy — Book Beauty, Laser & Aesthetic Clinics" },
      { name: "description", content: "Discover and instantly book the best beauty, laser, filler and botox clinics in your city with Glowy." },
      { property: "og:title", content: "Glowy — Beauty Booking Marketplace" },
      { property: "og:description", content: "Discover and instantly book top beauty and aesthetic clinics in your city." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredOpts),
  component: HomePage,
});

const CATEGORIES = [
  { id: "laser", label: "Laser", ar: "ليزر" },
  { id: "filler", label: "Filler", ar: "فيلر" },
  { id: "botox", label: "Botox", ar: "بوتوكس" },
  { id: "facial", label: "Facial", ar: "فيشل" },
  { id: "hair", label: "Hair", ar: "شعر" },
  { id: "nails", label: "Nails", ar: "أظافر" },
];

function HomePage() {
  const { data } = useSuspenseQuery(featuredOpts);
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> Beauty bookings, reimagined
            </span>
            <h1 className="mt-6 text-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Glow on your <span className="text-primary italic">own</span> terms.
            </h1>
            <p dir="rtl" className="mt-3 text-2xl text-primary text-display">احجزي جلستك بكل سهولة</p>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Discover and book the most-loved laser, filler, botox and beauty clinics in your city — all in one elegant place.
            </p>

            {/* Search */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-3 shadow-soft">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="City (e.g. Riyadh, Dubai)"
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
                  <option value="">All services</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <Button onClick={handleSearch} className="rounded-xl bg-gradient-primary px-6 shadow-soft">
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  to="/centers"
                  search={{ category: c.id } as never}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition"
                >
                  {c.label} <span dir="rtl" className="text-muted-foreground">· {c.ar}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[3rem] bg-gradient-primary opacity-20 blur-3xl" />
            <img src={heroImg} alt="Elegant beauty arrangement" className="relative w-full rounded-[2rem] object-cover shadow-glow" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified Centers", desc: "Every clinic is reviewed and verified before going live." },
            { icon: CalendarHeart, title: "Instant Booking", desc: "Pick a time, confirm in seconds. No phone calls." },
            { icon: Sparkles, title: "Real Reviews", desc: "Only customers who completed a session can leave a review." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-display text-4xl">Featured centers</h2>
            <p className="text-muted-foreground mt-1">Top-rated clinics, curated for you.</p>
          </div>
          <Link to="/centers" className="text-sm text-primary hover:underline">Browse all →</Link>
        </div>

        {data.centers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <p className="text-display text-3xl text-muted-foreground">No centers yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to list your clinic on Glowy.</p>
            <Button asChild className="mt-6 rounded-full bg-gradient-primary">
              <Link to="/auth/signup">List your center</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.centers.map((c) => <CenterCard key={c.id} center={c} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
