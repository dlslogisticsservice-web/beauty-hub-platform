import { Link } from "@tanstack/react-router";
import { MapPin, Star, BadgeCheck, Crown } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export interface CenterCardData {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  city: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  subscription_plan: string;
}

export function CenterCard({ center }: { center: CenterCardData }) {
  return (
    <Link
      to="/centers/$slug"
      params={{ slug: center.slug }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-soft hover:-translate-y-1"
    >
      <div className="relative aspect-[5/3] overflow-hidden bg-gradient-hero">
        {center.cover_url ? (
          <img src={center.cover_url} alt={center.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-display text-4xl text-primary/30">
            {center.name.charAt(0)}
          </div>
        )}
        {center.subscription_plan === "premium" && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
            <Crown className="h-3 w-3" /> Premium
          </span>
        )}
        {center.is_verified && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-primary backdrop-blur">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-display text-xl truncate">{center.name}</h3>
            {center.name_ar && (
              <p dir="rtl" className="text-sm text-muted-foreground truncate">{center.name_ar}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {center.rating_avg ? center.rating_avg.toFixed(1) : "—"}
            <span className="text-muted-foreground">({center.rating_count})</span>
          </div>
        </div>
        {center.city && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {center.city}
          </p>
        )}
      </div>
    </Link>
  );
}
