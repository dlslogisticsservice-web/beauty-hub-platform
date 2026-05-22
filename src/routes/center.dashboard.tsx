import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, DollarSign, Percent, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCenterDashboard, getMyCenter } from "@/lib/center-owner.functions";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/center/dashboard")({
  head: () => ({ meta: [{ title: "Center dashboard — Beauty Hub" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Calendar; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary", accent)}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-display text-2xl mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { t, locale } = useI18n();
  const { user, isCenterOwner, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isCenterOwner && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isCenterOwner, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["center-dashboard", user?.id],
    enabled: !!user,
    queryFn: () => getCenterDashboard(),
  });

  const { data: myCenter } = useQuery({
    queryKey: ["my-center-verify", user?.id],
    enabled: !!user,
    queryFn: () => getMyCenter(),
  });

  useEffect(() => {
    if (!isLoading && data && !data.center && isCenterOwner) {
      navigate({ to: "/center/onboarding" });
    }
  }, [isLoading, data, isCenterOwner, navigate]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status: status as never }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t(`status.${status}`));
    qc.invalidateQueries({ queryKey: ["center-dashboard"] });
  };

  const country = data?.center?.country ?? "EG";

  if (isLoading) return <Shell t={t}><p className="text-muted-foreground">{t("common.loading")}</p></Shell>;

  if (!data?.center) {
    return (
      <Shell t={t}>
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <h2 className="text-display text-3xl">{t("center.onboarding_title")}</h2>
          <Button asChild className="mt-6 rounded-full bg-gradient-primary"><Link to="/center/profile">{t("center.edit_profile")}</Link></Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell t={t}>
      {myCenter?.center && !myCenter.center.is_verified && (
        <div className="mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-800">
          {t("center.pending_verification")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Calendar} label={t("center.bookings_this_month")} value={String(data.stats?.totalBookings ?? 0)} />
        <Stat icon={DollarSign} label={t("center.monthly_revenue")} value={formatPrice(data.stats?.revenue ?? 0, country, locale)} />
        <Stat icon={Percent} label={t("center.net_payout")} value={formatPrice(data.stats?.payout ?? 0, country, locale)} />
        <Stat icon={Clock} label={t("center.pending_bookings")} value={String(data.stats?.pending ?? 0)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/center/services">{t("center.manage_services")}</Link></Button>
        <Button asChild variant="outline"><Link to="/center/bookings">{t("center.all_bookings")}</Link></Button>
        <Button asChild variant="outline"><Link to="/center/profile">{t("center.edit_profile")}</Link></Button>
      </div>

      <section className="mt-10">
        <h2 className="text-display text-3xl">{t("center.todays_bookings")}</h2>
        {data.todaysBookings.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{t("center.no_bookings_today")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("common.customer")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.service")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.time")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.amount")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.todaysBookings.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-3">{b.customer_name}</td>
                    <td className="px-4 py-3">{b.service_name}</td>
                    <td className="px-4 py-3">{format(new Date(b.scheduled_at), "p")}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{t(`status.${b.status}`)}</Badge></td>
                    <td className="px-4 py-3">{formatPrice(b.price_paid, country, locale)}</td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {b.status === "pending" && <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "confirmed")}>{t("common.confirm")}</Button>}
                      {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "completed")}>{t("common.complete")}</Button>}
                      {(b.status === "pending" || b.status === "confirmed") && <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "cancelled")}>{t("common.cancel")}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children, t }: { children: React.ReactNode; t: (k: string) => string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">{t("center.dashboard")}</h1>
        <div className="mt-8">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
