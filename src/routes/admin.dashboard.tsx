import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { Calendar, DollarSign, TrendingUp, Store } from "lucide-react";

const AdminRevenueChart = lazy(() =>
  import("@/components/admin-revenue-chart").then((m) => ({
    default: m.AdminRevenueChart,
  }))
);
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminDashboard } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { StatCard } from "@/features/stat-card";
import { STATUS_COLORS } from "@/features/dashboard-widgets";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin dashboard — Beauty Hub" }] }),
  component: Page,
});

function Page() {
  const { user, isAdmin, loading } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: !!user && isAdmin,
    queryFn: () => getAdminDashboard(),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">{t("admin.dashboard")}</h1>

        {isLoading || !data ? (
          <p className="mt-8 text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Calendar} label={t("admin.total_bookings")} value={String(data.stats.totalBookings)} />
              <StatCard icon={DollarSign} label={t("admin.platform_revenue")} value={formatPrice(data.stats.revenue, "EG", locale)} />
              <StatCard icon={TrendingUp} label={t("admin.gross_value")} value={formatPrice(data.stats.gross, "EG", locale)} />
              <StatCard icon={Store} label={t("admin.active_centers")} value={String(data.stats.activeCenters)} />
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-display text-2xl">{t("admin.monthly_commission")}</h2>
              <div className="mt-6 h-64">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  }
                >
                  <AdminRevenueChart data={data.months} />
                </Suspense>
              </div>
            </div>

            <section className="mt-10">
              <h2 className="text-display text-2xl">{t("admin.recent_bookings")}</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("common.center")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.customer")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.service")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.amount")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.commissions")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                      <th className="px-4 py-3 font-medium">{t("common.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.map((b) => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-4 py-3">{b.center_slug ? <Link to="/centers/$slug" params={{ slug: b.center_slug }} className="hover:text-primary">{b.center_name}</Link> : b.center_name}</td>
                        <td className="px-4 py-3">{b.customer_name}</td>
                        <td className="px-4 py-3">{b.service_name}</td>
                        <td className="px-4 py-3">{formatPrice(Number(b.price_paid), b.country, locale)}</td>
                        <td className="px-4 py-3">{formatPrice(Number(b.commission_amount), b.country, locale)}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className={cn("border", STATUS_COLORS[b.status])}>{t(`status.${b.status}`)}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(b.created_at), "PP")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
