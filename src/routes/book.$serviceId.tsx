import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Tag, X, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { cn } from "@/lib/utils";
import {
  BookingStepIndicator,
  TimeSlotPicker,
  PaymentMethodOption,
  CardIcon,
  WalletIcon,
  CashIcon,
} from "@/features/booking-step-indicator";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getServiceForBooking } from "@/lib/booking.functions";
import { getBookingSlotsV2, getBookingStaff, validateCoupon } from "@/lib/center-owner.functions";
import { formatPrice } from "@/lib/currency";
import { cityLabel } from "@/data/cities";
import { initiatePaymobPaymentFn, isPaymobConfiguredFn } from "@/lib/paymob.functions";
import { sendBookingNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/book/$serviceId")({
  head: () => ({ meta: [{ title: "Book a service — Beauty Hub" }] }),
  component: BookingPage,
});

type PayMethod = "card" | "wallet" | "cash";

function BookingPage() {
  const { t, locale } = useI18n();
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isCustomer, isCenterOwner, isAdmin, loading: authLoading } = useAuth();

  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  // Staff selection
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    id: string; code: string; discount: number; discount_type: string; discount_value: number;
  } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const { data: svc, isLoading } = useQuery({
    queryKey: ["booking-service", serviceId],
    queryFn: () => getServiceForBooking({ data: { serviceId } }),
  });

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;

  // C3: Use v2 slots endpoint — respects center hours, blocked dates, staff schedules.
  // v2 returns AVAILABLE slots as "HH:00" strings + openHour/closeHour range.
  const { data: slotsData } = useQuery({
    queryKey: ["slots-v2", serviceId, dateKey, selectedStaffId],
    queryFn: () =>
      getBookingSlotsV2({
        data: { serviceId, date: dateKey!, staffId: selectedStaffId ?? undefined },
      }) as Promise<{ slots: string[]; blocked: boolean; reason?: string; openHour?: number; closeHour?: number }>,
    enabled: !!dateKey,
  });

  // Build the displayable hours range and taken-set from v2 response.
  // v2 returns AVAILABLE slots; everything in [openHour, closeHour) NOT in slots is taken/unavailable.
  const { hours: bookingHours, takenHours } = useMemo(() => {
    if (!slotsData || slotsData.blocked) {
      return { hours: [] as number[], takenHours: new Set<number>() };
    }
    const open  = slotsData.openHour  ?? 9;
    const close = slotsData.closeHour ?? 21;
    const range: number[] = [];
    for (let h = open; h < close; h++) range.push(h);
    const availableSet = new Set(
      (slotsData.slots ?? []).map((s) => parseInt(s.split(":")[0], 10))
    );
    const taken = new Set(range.filter((h) => !availableSet.has(h)));
    return { hours: range, takenHours: taken };
  }, [slotsData]);

  // Staff for this service — re-fetch when date changes to honour blocked dates
  const { data: staffData } = useQuery({
    queryKey: ["booking-staff", serviceId, dateKey],
    queryFn: () => getBookingStaff({ data: { serviceId, date: dateKey ?? undefined } }),
    enabled: !!svc,
  });
  const availableStaff: Array<{ id: string; name: string; title: string | null }> =
    (staffData as Array<{ id: string; name: string; title: string | null }> | undefined) ?? [];

  const { data: paymentFlag } = useQuery({
    queryKey: ["flag", "payment_gateway"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", "payment_gateway")
        .maybeSingle();
      return Boolean(data?.enabled);
    },
  });

  const { data: paymobConfigured } = useQuery({
    queryKey: ["paymob", "configured"],
    queryFn: () => isPaymobConfiguredFn(),
  });

  const initiatePayment = initiatePaymobPaymentFn;

  const country = (svc?.center?.country ?? "EG") as "EG" | "SA";
  const currency: "EGP" | "SAR" = country === "SA" ? "SAR" : "EGP";

  const basePrice = svc?.service?.price ?? 0;
  const finalPrice = couponApplied ? Math.max(0, basePrice - couponApplied.discount) : basePrice;

  const applyCoupon = async () => {
    if (!couponCode.trim() || !svc) return;
    setCouponChecking(true);
    try {
      const result = await validateCoupon({
        data: {
          code: couponCode.trim(),
          centerId: svc.center?.id,
          bookingAmount: basePrice,
        },
      }) as { valid: boolean; error?: string; coupon?: { id: string; code: string; discount: number; discount_type: string; discount_value: number } };
      if (!result.valid || !result.coupon) {
        toast.error(result.error ?? t("coupons.invalid"));
        return;
      }
      setCouponApplied(result.coupon);
      toast.success(t("coupons.applied"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("coupons.invalid"));
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
  };

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
    // H7: Store as nominal UTC so slot checks (which use UTC hours) are consistent.
    // "9 AM" selected in the UI → stored as T09:00:00Z everywhere, regardless of browser timezone.
    const dateStr = format(date, "yyyy-MM-dd");
    const scheduled = new Date(`${dateStr}T${String(hh).padStart(2, "0")}:00:00.000Z`);

    const isOnline = payMethod === "card" || payMethod === "wallet";
    const flagOn = Boolean(paymentFlag && paymobConfigured?.configured);
    const finalMethod: PayMethod = isOnline && !flagOn ? "cash" : payMethod;
    if (isOnline && !flagOn) toast.message(t("payment.coming_soon"));

    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        service_id: svc.service.id,
        center_id: svc.center.id,
        scheduled_at: scheduled.toISOString(),
        status: "pending",
        price_paid: finalPrice,
        original_price: couponApplied ? basePrice : null,
        coupon_id: couponApplied?.id ?? null,
        staff_id: selectedStaffId ?? null,
        // commission_rate intentionally omitted — enforced server-side via DB trigger.
        notes: notes || null,
        payment_method: finalMethod,
        payment_status: finalMethod === "cash" ? "cash" : "unpaid",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      setSubmitting(false);
      toast.error(error?.message ?? "Failed");
      return;
    }

    // Fire-and-forget WhatsApp notification (never block navigation on it)
    sendBookingNotification({ data: { bookingId: inserted.id, template: "booking_created" } }).catch(() => {});

    if (finalMethod === "cash") {
      setSubmitting(false);
      toast.success(t("booking.success"));
      navigate({ to: "/booking-confirmed", search: { id: inserted.id } });
      return;
    }

    // Online payment: initiate Paymob via server function (keys never leave the server).
    try {
      const result = await initiatePayment({
        data: {
          bookingId: inserted.id,
          paymentMethod: finalMethod as "card" | "wallet",
        },
      });
      if (!result.ok) {
        toast.error(t("payment.coming_soon"));
        navigate({ to: "/dashboard" });
        return;
      }
      setConfirmedId(inserted.id);
      setIframeUrl(result.iframeUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
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

  const showWallet = country === "EG";
  const currentStep = !date ? 0 : time === null ? 1 : 2;

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
              <MapPin className="h-4 w-4" /> {svc.center.name} {svc.center.city && `· ${cityLabel(svc.center.city, locale)}`}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> {svc.service.duration_minutes} {t("common.minutes_full")}
            </p>
          </div>
          <div className="mt-6 pt-5 border-t">
            {couponApplied && (
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-muted-foreground line-through">{formatPrice(basePrice, country, locale)}</span>
                <span className="text-green-600 text-xs">-{formatPrice(couponApplied.discount, country, locale)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("booking.total")}</span>
              <span className="text-display text-3xl text-primary">{formatPrice(finalPrice, country, locale)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-display text-2xl">{t("booking.pick_slot")}</h3>
          <BookingStepIndicator
            className="mt-4"
            steps={[
              { label: t("booking_steps.choose_date") },
              { label: t("booking_steps.choose_time") },
              { label: t("booking_steps.payment") },
            ]}
            currentStep={currentStep}
          />

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
            {/* C3: Show closed/blocked banner when center is unavailable on selected date */}
            {date && slotsData?.blocked && (
              <div className="mt-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700">
                {slotsData.reason === "center_holiday"   && "This center is closed on the selected date."}
                {slotsData.reason === "center_closed"    && "This center does not operate on this day."}
                {slotsData.reason === "staff_unavailable" && "The selected staff member is unavailable on this date."}
                {!slotsData.reason && "No availability on this date. Please choose another day."}
              </div>
            )}
            <TimeSlotPicker
              className="mt-2"
              hours={bookingHours}
              takenHours={takenHours}
              selected={time}
              disabled={!date || !!slotsData?.blocked}
              onSelect={setTime}
            />
          </div>

          {/* Staff picker — only shown when staff exist for this service */}
          {availableStaff.length > 0 && (
            <div className="mt-5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User2 className="h-4 w-4 text-muted-foreground" />
                Preferred staff <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </label>
              <Select
                value={selectedStaffId ?? "any"}
                onValueChange={(v) => setSelectedStaffId(v === "any" ? null : v)}
              >
                <SelectTrigger className="mt-2 bg-input">
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">No preference</SelectItem>
                  {availableStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.title ? ` · ${s.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-5">
            <label className="text-sm font-medium">{t("booking.notes")}</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("booking.notes_placeholder")} className="mt-2" rows={3} maxLength={500} />
          </div>

          {/* Coupon code */}
          <div className="mt-5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {t("coupons.apply")}
            </label>
            {couponApplied ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2">
                <Tag className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-700 font-mono flex-1">
                  {couponApplied.code} — {couponApplied.discount_type === "percent"
                    ? `${couponApplied.discount_value}% off`
                    : formatPrice(couponApplied.discount, country, locale)} saved
                </span>
                <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t("coupons.placeholder")}
                  className="font-mono uppercase flex-1"
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                />
                <Button
                  variant="outline" size="sm"
                  onClick={applyCoupon}
                  disabled={couponChecking || !couponCode.trim()}
                  className="shrink-0"
                >
                  {couponChecking ? "…" : t("coupons.apply")}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium">{t("payment.title")}</label>
            <div className="mt-2 grid gap-2">
              <PaymentMethodOption
                active={payMethod === "card"}
                onClick={() => setPayMethod("card")}
                icon={<CardIcon className="h-5 w-5" />}
                title={t("payment.card")}
              />
              {showWallet && (
                <PaymentMethodOption
                  active={payMethod === "wallet"}
                  onClick={() => setPayMethod("wallet")}
                  icon={<WalletIcon className="h-5 w-5" />}
                  title={t("payment.wallet")}
                  subtitle={t("payment.wallet_sub")}
                />
              )}
              <PaymentMethodOption
                active={payMethod === "cash"}
                onClick={() => setPayMethod("cash")}
                icon={<CashIcon className="h-5 w-5" />}
                title={t("payment.cash")}
                subtitle={t("payment.cash_sub")}
              />
            </div>
          </div>

          <Button onClick={onSubmit} disabled={submitting || !date || !time} className="w-full mt-6 rounded-full bg-gradient-primary shadow-soft" size="lg">
            {submitting ? t("booking.confirming") : `${t("booking.confirm")} · ${formatPrice(finalPrice, country, locale)}`}
          </Button>
          {!user && <p className="text-xs text-muted-foreground mt-3 text-center">{t("booking.sign_in_hint")}</p>}
        </div>
      </div>

      {/* ── Sticky mobile booking CTA (above bottom nav bar) ──────── */}
      <div className="fixed bottom-16 inset-x-0 md:hidden z-30 px-4 pb-3 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <Button
          onClick={onSubmit}
          disabled={submitting || !date || !time}
          className="w-full rounded-full bg-gradient-primary shadow-soft pointer-events-auto"
          size="lg"
        >
          {submitting
            ? t("booking.confirming")
            : date && time
              ? `${t("booking.confirm")} · ${formatPrice(finalPrice, country, locale)}`
              : t("booking.pick_slot")}
        </Button>
      </div>

      <Dialog open={!!iframeUrl} onOpenChange={(o) => { if (!o) { setIframeUrl(null); navigate({ to: "/booking-confirmed", search: { id: confirmedId ?? undefined } }); } }}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{t("payment.iframe_title")}</DialogTitle>
          </DialogHeader>
          {iframeUrl && (
            <iframe src={iframeUrl} title={t("payment.iframe_title")} className="w-full h-full border-0" />
          )}
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
