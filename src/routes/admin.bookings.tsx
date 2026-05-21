import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminBookings } from "@/lib/admin.functions";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "All bookings — Admin — Beauty Hub" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function Page() {
  const { user, isAdmin, loading } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [centerId, setCenterId] = useState("all");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["admin-bookings", status, centerId],
    enabled: !!user && isAdmin,
    queryFn: () => getAdminBookings({ data: { status, centerId } }),
  });

  const summary = useMemo(() => {
    const list = data?.bookings ?? [];
    return {
      count: list.length,
      gross: list.reduce((s, b) => s + Number(b.price_paid), 0),
      commission: list.reduce((s, b) => s + Number(b.commission_amount), 0),
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">All bookings</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["pending","confirmed","completed","cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={centerId} onValueChange={setCenterId}>
            <SelectTrigger><SelectValue placeholder="All centers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All centers</SelectItem>
              {(data?.allCenters ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <span><strong>{summary.count}</strong> bookings</span>
          <span>Gross: <strong className="text-primary">${summary.gross.toFixed(2)}</strong></span>
          <span>Commission: <strong>${summary.commission.toFixed(2)}</strong></span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Center</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {(data?.bookings ?? []).length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No bookings.</td></tr>
              ) : (data?.bookings ?? []).map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3">{b.center_slug ? <Link to="/centers/$slug" params={{ slug: b.center_slug }} className="hover:text-primary">{b.center_name}</Link> : b.center_name}</td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{b.service_name}</td>
                  <td className="px-4 py-3">{format(new Date(b.scheduled_at), "PP · p")}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{b.status}</Badge></td>
                  <td className="px-4 py-3">${b.price_paid}</td>
                  <td className="px-4 py-3">${b.commission_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
