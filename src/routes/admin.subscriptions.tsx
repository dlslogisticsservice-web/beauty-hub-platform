import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { getAdminSubscriptions, updateCenterAdmin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Admin — Glowy" }] }),
  component: Page,
});

const PLANS = [
  { id: "free", name: "Free", price: 0, features: ["Up to 5 services", "Standard listing", "Email support"] },
  { id: "basic", name: "Basic", price: 29, features: ["Up to 20 services", "Priority listing", "Analytics"] },
  { id: "pro", name: "Pro", price: 79, features: ["Unlimited services", "Featured placement", "Reduced commission"] },
  { id: "premium", name: "Premium", price: 199, features: ["Everything in Pro", "Top of search results", "Dedicated manager"] },
] as const;

function Page() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["admin-subs"],
    enabled: !!user && isAdmin,
    queryFn: () => getAdminSubscriptions(),
  });

  const setPlan = async (id: string, plan: "free"|"basic"|"pro"|"premium") => {
    try {
      const expires = new Date(); expires.setMonth(expires.getMonth() + 1);
      await updateCenterAdmin({ data: { id, subscription_plan: plan, subscription_expires_at: plan === "free" ? null : expires.toISOString() } });
      toast.success("Plan updated");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const filtered = useMemo(() => {
    const list = data?.centers ?? [];
    return filter === "all" ? list : list.filter((c) => c.subscription_plan === filter);
  }, [data, filter]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">Subscriptions</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={cn("rounded-2xl border bg-card p-5 shadow-soft", p.id === "premium" && "border-primary")}>
              <h3 className="text-display text-2xl">{p.name}</h3>
              <p className="text-3xl text-display text-primary mt-1">${p.price}<span className="text-sm text-muted-foreground">/mo</span></p>
              <p className="mt-2 text-xs text-muted-foreground">{data?.counts?.[p.id] ?? 0} centers</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{f}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-xs">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Center</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Change plan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No centers.</td></tr>
              ) : filtered.map((c) => {
                const expired = c.subscription_expires_at && new Date(c.subscription_expires_at) < new Date();
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.owner_email}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{c.subscription_plan}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(c.created_at), "PP")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.subscription_expires_at ? format(new Date(c.subscription_expires_at), "PP") : "—"}</td>
                    <td className="px-4 py-3">{c.subscription_plan === "free" ? <Badge variant="outline">Free</Badge> : expired ? <Badge className="bg-red-500/15 text-red-700 border-0">Expired</Badge> : <Badge className="bg-green-500/15 text-green-700 border-0">Active</Badge>}</td>
                    <td className="px-4 py-3">
                      <Select value={c.subscription_plan} onValueChange={(v) => setPlan(c.id, v as "free"|"basic"|"pro"|"premium")}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>{PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
