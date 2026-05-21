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
import { supabase } from "@/integrations/supabase/client";
import { getCenterDashboard } from "@/lib/center-owner.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/center/dashboard")({
  head: () => ({ meta: [{ title: "Center dashboard — Glowy" }] }),
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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status: status as never }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries({ queryKey: ["center-dashboard"] });
  };

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;

  if (!data?.center) {
    return (
      <Shell>
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <h2 className="text-display text-3xl">Create your center profile</h2>
          <p className="mt-2 text-muted-foreground">Set up your business to start receiving bookings.</p>
          <Button asChild className="mt-6 rounded-full bg-gradient-primary"><Link to="/center/profile">Set up profile</Link></Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Calendar} label="Bookings this month" value={String(data.stats?.totalBookings ?? 0)} />
        <Stat icon={DollarSign} label="Revenue this month" value={`$${(data.stats?.revenue ?? 0).toFixed(2)}`} />
        <Stat icon={Percent} label="Commission owed" value={`$${(data.stats?.commission ?? 0).toFixed(2)}`} />
        <Stat icon={Clock} label="Pending bookings" value={String(data.stats?.pending ?? 0)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/center/services">Manage services</Link></Button>
        <Button asChild variant="outline"><Link to="/center/bookings">All bookings</Link></Button>
        <Button asChild variant="outline"><Link to="/center/profile">Edit profile</Link></Button>
      </div>

      <section className="mt-10">
        <h2 className="text-display text-3xl">Today's bookings</h2>
        {data.todaysBookings.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No bookings scheduled for today.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.todaysBookings.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-3">{b.customer_name}</td>
                    <td className="px-4 py-3">{b.service_name}</td>
                    <td className="px-4 py-3">{format(new Date(b.scheduled_at), "p")}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{b.status}</Badge></td>
                    <td className="px-4 py-3">${b.price_paid}</td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {b.status === "pending" && <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "confirmed")}>Confirm</Button>}
                      {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "completed")}>Complete</Button>}
                      {(b.status === "pending" || b.status === "confirmed") && <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "cancelled")}>Cancel</Button>}
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">Center dashboard</h1>
        <p className="mt-2 text-muted-foreground">Overview of today's activity and monthly performance.</p>
        <div className="mt-8">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
