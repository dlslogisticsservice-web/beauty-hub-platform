import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle2, Calendar, Clock, MapPin, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { cityLabel } from "@/data/cities";

export const Route = createFileRoute("/booking-confirmed")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({ meta: [{ title: "Booking Confirmed — Beauty Hub" }] }),
  component: BookingConfirmedPage,
});

type BookingDetail = {
  id: string;
  scheduled_at: string;
  status: string;
  price_paid: number;
  currency: string;
  payment_method: string | null;
  notes: string | null;
  services: { name: string; name_ar: string | null; duration_minutes: number } | null;
  centers: { name: string; name_ar: string | null; city: string | null; logo_url: string | null; slug: string; country: string | null } | null;
};

function BookingConfirmedPage() {
  const { t, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { id } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !id) navigate({ to: "/dashboard" });
  }, [id, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["booking-detail", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, price_paid, currency, payment_method, notes, services(name, name_ar, duration_minutes), centers(name, name_ar, city, logo_url, slug, country)")
        .eq("id", id!)
        .eq("customer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BookingDetail;
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-muted-foreground">{t("booking.unavailable")}</p>
            <Button asChild className="mt-4 rounded-full" variant="outline">
              <Link to="/dashboard">{t("booking.view_bookings")}</Link>
            </Button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const country = (data.centers?.country ?? "EG") as "EG" | "SA";
  const svcName = locale === "ar"
    ? (data.services?.name_ar || data.services?.name)
    : data.services?.name;
  const centerName = locale === "ar"
    ? (data.centers?.name_ar || data.centers?.name)
    : data.centers?.name;
  const payMethod = data.payment_method ?? "cash";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* ── Success heading ─────────────────────────────── */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mb-5">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-display text-3xl sm:text-4xl">{t("booking.confirmed_title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("booking.confirmed_subtitle")}</p>
          </div>

          {/* ── Booking details card ─────────────────────────── */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-5">

            {/* Center & service header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                {data.centers?.logo_url
                  ? <img src={data.centers.logo_url} alt="" className="h-full w-full object-cover" />
                  : <span className="text-primary/40 text-display text-xl">{centerName?.[0]}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="font-medium leading-tight truncate">{centerName}</p>
                <p className="text-sm text-muted-foreground truncate">{svcName}</p>
              </div>
            </div>

            {/* Details rows */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>{format(new Date(data.scheduled_at), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {format(new Date(data.scheduled_at), "h:mm a")}
                  {data.services?.duration_minutes && ` · ${data.services.duration_minutes} ${t("common.minutes_full")}`}
                </span>
              </div>
              {data.centers?.city && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{cityLabel(data.centers.city, locale)}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Receipt className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {formatPrice(data.price_paid, country, locale)}
                  {" · "}
                  {t(`payment.${payMethod}`)}
                </span>
              </div>
            </div>

            {/* Reference number */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("booking.reference")}</span>
              <span className="font-mono text-sm text-foreground/60 tracking-wide">
                #{data.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* ── Actions ──────────────────────────────────────── */}
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="rounded-full bg-gradient-primary shadow-soft" size="lg">
              <Link to="/dashboard">{t("booking.view_bookings")}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/centers">
                <Sparkles className="h-4 w-4 mr-2" />
                {t("dashboard.discover")}
              </Link>
            </Button>
          </div>

        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
