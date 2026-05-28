import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Calendar, DollarSign, Percent } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getCenterBookings } from "@/lib/center-owner.functions";
import { formatPrice } from "@/lib/currency";
import { StatCard } from "@/features/stat-card";

export const Route = createFileRoute("/center/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Beauty Hub" }] }),
  component: Page,
});

type BookingRow = {
  id: string;
  scheduled_at: string;
  status: string;
  price_paid: number;
  payout: number;
  service_name: string;
  customer_name: string;
};

const MONTH_LABELS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LABELS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function Page() {
  const { t, locale } = useI18n();
  const { user, isCenterOwner, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isCenterOwner && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isCenterOwner, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["center-bookings-all", user?.id],
    enabled: !!user,
    queryFn: () => getCenterBookings(),
  });

  const bookings: BookingRow[] = data?.bookings ?? [];
  const country = (data?.country ?? "EG") as "EG" | "SA";

  // ── 6-month revenue chart ────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthBookings = bookings.filter((b) => {
        const t = new Date(b.scheduled_at);
        return t >= d && t < next;
      });
      const revenue = monthBookings
        .filter((b) => b.status === "completed")
        .reduce((s, b) => s + Number(b.price_paid), 0);
      const count = monthBookings.length;
      const label = locale === "ar"
        ? MONTH_LABELS_AR[d.getMonth()]
        : MONTH_LABELS_EN[d.getMonth()];
      return { month: label, revenue: Math.round(revenue), bookings: count };
    });
  }, [bookings, locale]);

  // ── Top services ─────────────────────────────────────────────
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of bookings) {
      const existing = map.get(b.service_name) ?? { name: b.service_name, count: 0, revenue: 0 };
      existing.count += 1;
      if (b.status === "completed") existing.revenue += Number(b.price_paid);
      map.set(b.service_name, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bookings]);

  // ── Summary stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed");
    const totalRevenue = completed.reduce((s, b) => s + Number(b.price_paid), 0);
    const totalPayout = completed.reduce((s, b) => s + Number(b.payout), 0);
    const completionRate = bookings.length > 0
      ? Math.round((completed.length / bookings.length) * 100)
      : 0;
    const avgValue = completed.length > 0
      ? Math.round(totalRevenue / completed.length)
      : 0;
    return { totalRevenue, totalPayout, totalBookings: bookings.length, completionRate, avgValue };
  }, [bookings]);

  return (
    <DashboardLayout role="center">
      <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("analytics.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("analytics.subtitle")}</p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          {/* ── Summary stat cards ──────────────────────────── */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label={t("analytics.total_revenue")}
              value={formatPrice(stats.totalRevenue, country, locale)}
            />
            <StatCard
              icon={Calendar}
              label={t("analytics.total_bookings")}
              value={String(stats.totalBookings)}
            />
            <StatCard
              icon={TrendingUp}
              label={t("analytics.avg_booking_value")}
              value={formatPrice(stats.avgValue, country, locale)}
            />
            <StatCard
              icon={Percent}
              label={t("analytics.completion_rate")}
              value={`${stats.completionRate}%`}
            />
          </div>

          {/* ── Revenue trend chart ──────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-display text-2xl">{t("analytics.revenue_trend")}</h2>
            {monthlyData.every((m) => m.revenue === 0) ? (
              <p className="mt-6 text-muted-foreground text-sm">{t("analytics.no_data")}</p>
            ) : (
              <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#C4AB90", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#C4AB90", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1C1C1C",
                        border: "1px solid #333",
                        borderRadius: "12px",
                        color: "#F5F0E8",
                        fontSize: 13,
                      }}
                      cursor={{ fill: "rgba(212,175,55,0.08)" }}
                      formatter={(value: number) => [
                        formatPrice(value, country, locale),
                        t("analytics.revenue"),
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#D4AF37"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ── Top services ─────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-display text-2xl">{t("analytics.top_services")}</h2>
            {topServices.length === 0 ? (
              <p className="mt-6 text-muted-foreground text-sm">{t("analytics.no_data")}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {topServices.map((svc, idx) => {
                  const maxCount = topServices[0].count || 1;
                  const pct = Math.round((svc.count / maxCount) * 100);
                  return (
                    <div
                      key={svc.name}
                      className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
                    >
                      <span className="text-display text-xl text-primary/50 w-6 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate">{svc.name}</span>
                          <span className="text-sm text-muted-foreground shrink-0 ml-3">
                            {svc.count} {t("analytics.bookings")}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-primary font-medium shrink-0">
                        {formatPrice(svc.revenue, country, locale)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
