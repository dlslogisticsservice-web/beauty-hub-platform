import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCenterBookings } from "@/lib/center-owner.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/center/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Glowy" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function Page() {
  const { user, isCenterOwner, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isCenterOwner && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isCenterOwner, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["center-bookings", status, from, to, search],
    enabled: !!user,
    queryFn: () => getCenterBookings({ data: { status, from, to, search } }),
  });

  const update = async (id: string, st: string) => {
    const { error } = await supabase.from("bookings").update({ status: st as never }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${st}`);
    qc.invalidateQueries({ queryKey: ["center-bookings"] });
  };

  const summary = useMemo(() => {
    const list = data?.bookings ?? [];
    return {
      count: list.length,
      revenue: list.reduce((s, b) => s + Number(b.price_paid), 0),
      commission: list.reduce((s, b) => s + Number(b.commission_amount), 0),
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">Bookings</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer name…" />
        </div>

        <div className="mt-6 flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <span><strong>{summary.count}</strong> bookings</span>
          <span>Revenue: <strong className="text-primary">${summary.revenue.toFixed(2)}</strong></span>
          <span>Commission: <strong>${summary.commission.toFixed(2)}</strong></span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : (data?.bookings ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No bookings.</td></tr>
              ) : (data?.bookings ?? []).map((b, i) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{b.service_name}</td>
                  <td className="px-4 py-3">{format(new Date(b.scheduled_at), "PP · p")}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{b.status}</Badge></td>
                  <td className="px-4 py-3">${b.price_paid}</td>
                  <td className="px-4 py-3">${b.commission_amount}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                    {b.status === "pending" && <Button size="sm" variant="outline" onClick={() => update(b.id, "confirmed")}>Confirm</Button>}
                    {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => update(b.id, "completed")}>Complete</Button>}
                    {(b.status === "pending" || b.status === "confirmed") && <Button size="sm" variant="ghost" onClick={() => update(b.id, "cancelled")}>Cancel</Button>}
                  </td>
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
