import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getServiceForBooking, getBookedSlots } from "@/lib/booking.functions";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/book/$serviceId")({
  head: () => ({ meta: [{ title: "Book a service — Beauty Hub" }] }),
  component: BookingPage,
});

const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i);

function BookingPage() {
  const { t, locale } = useI18n();
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isCustomer, isCenterOwner, isAdmin, loading: authLoading } = useAuth();

  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: svc, isLoading } = useQuery({
    queryKey: ["booking-service", serviceId],
    queryFn: () => getServiceForBooking({ data: { serviceId } }),
  });

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const { data: slotsData } = useQuery({
    queryKey: ["booked-slots", serviceId, dateKey],
    queryFn: () => getBookedSlots({ data: { serviceId, date: dateKey! } }),
    enabled: !!dateKey,
  });
  const takenHours = useMemo(
    () => new Set((slotsData?.slots ?? []).map((iso) => new Date(iso).getHours())),
    [slotsData],
  );

  const country = svc?.center?.country ?? "EG";

  const onSubmit = async () => {
    if (!user) { navigate({ to: "/auth/login" }); return; }
    if (isCenterOwner && !isCustomer && !isAdmin) {
      toast.error(t("booking.owner_cannot_book"));
      return;
    }
    if (!date || time === null || !svc?.service || !svc.center) {
      toast.error(t("booking.pick_required"));
      return;
    }
    const [hh] = time.split(":").map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(hh, 0, 0, 0);

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      service_id: svc.service.id,
      center_id: svc.center.id,
      scheduled_at: scheduled.toISOString(),
      status: "pending",
      price_paid: svc.service.price,
      commission_rate: svc.center.commission_rate,
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("booking.success"));
    navigate({ to: "/dashboard" });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 flex-1">{t("common.loading")}</div>
        <SiteFooter />
      </div>
    );
  }

  if (!svc?.service || !svc.center) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center flex-1">
          <h1 className="text-display text-4xl">{t("booking.unavailable")}</h1>
          <Link to="/centers" className="mt-6 inline-block text-primary hover:underline">← {t("nav.centers")}</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-[1fr_1.2fr] flex-1">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft h-fit">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("booking.summary")}</p>
          <h2 className="text-display text-3xl mt-2">{svc.service.name}</h2>
          {svc.service.name_ar && <p dir="rtl" className="text-primary text-display text-xl">{svc.service.name_ar}</p>}
          <div className="mt-5 space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {svc.center.name} {svc.center.city && `· ${svc.center.city}`}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> {svc.service.duration_minutes} {t("common.minutes_full")}
            </p>
          </div>
          <div className="mt-6 pt-5 border-t flex items-center justify-between">
            <span className="text-muted-foreground">{t("booking.total")}</span>
            <span className="text-display text-3xl text-primary">{formatPrice(svc.service.price, country, locale)}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-display text-2xl">{t("booking.pick_slot")}</h3>

          <div className="mt-5">
            <label className="text-sm font-medium">{t("booking.select_date")}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start mt-2 font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : t("booking.choose_date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setTime(null); }} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">{t("booking.select_time")}</label>
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {HOURS.map((h) => {
                const label = `${String(h).padStart(2, "0")}:00`;
                const taken = takenHours.has(h);
                const selected = time === label;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!date || taken}
                    onClick={() => setTime(label)}
                    className={cn(
                      "rounded-xl border text-sm py-2 transition",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary",
                      (taken || !date) && "opacity-40 cursor-not-allowed line-through",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">{t("booking.notes")}</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("booking.notes_placeholder")} className="mt-2" rows={3} maxLength={500} />
          </div>

          <Button onClick={onSubmit} disabled={submitting || !date || !time} className="w-full mt-6 rounded-full bg-gradient-primary shadow-soft" size="lg">
            {submitting ? t("booking.confirming") : `${t("booking.confirm")} · ${formatPrice(svc.service.price, country, locale)}`}
          </Button>
          {!user && <p className="text-xs text-muted-foreground mt-3 text-center">{t("booking.sign_in_hint")}</p>}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
