import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Calendar, DollarSign, TrendingUp, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminDashboard } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin dashboard — Beauty Hub" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function Stat({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-display text-2xl mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { user, isAdmin, loading } = useAuth();
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
        <h1 className="text-display text-5xl">Admin dashboard</h1>

        {isLoading || !data ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Calendar} label="Total bookings" value={String(data.stats.totalBookings)} />
              <Stat icon={DollarSign} label="Platform revenue" value={`$${data.stats.revenue.toFixed(2)}`} />
              <Stat icon={TrendingUp} label="Gross booking value" value={`$${data.stats.gross.toFixed(2)}`} />
              <Stat icon={Store} label="Active centers" value={String(data.stats.activeCenters)} />
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-display text-2xl">Monthly commission revenue</h2>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <section className="mt-10">
              <h2 className="text-display text-2xl">Recent bookings</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Center</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Commission</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.map((b) => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-4 py-3">{b.center_slug ? <Link to="/centers/$slug" params={{ slug: b.center_slug }} className="hover:text-primary">{b.center_name}</Link> : b.center_name}</td>
                        <td className="px-4 py-3">{b.customer_name}</td>
                        <td className="px-4 py-3">{b.service_name}</td>
                        <td className="px-4 py-3">${b.price_paid}</td>
                        <td className="px-4 py-3">${b.commission_amount}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{b.status}</Badge></td>
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
