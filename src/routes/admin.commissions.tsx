import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { DollarSign, TrendingUp, Clock, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { getCommissionsOverview, getCenterBookingsForAdmin, updateCenterCommissionRate } from "@/lib/system.functions";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Admin — Beauty Hub" }] }),
  component: Page,
});

function Stat({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
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
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openCenter, setOpenCenter] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["admin-commissions"], enabled: !!user && isAdmin,
    queryFn: () => getCommissionsOverview(),
  });

  const { data: details } = useQuery({
    queryKey: ["admin-center-bookings", openCenter?.id], enabled: !!openCenter,
    queryFn: () => getCenterBookingsForAdmin({ data: { centerId: openCenter!.id } }),
  });

  const saveRate = async (centerId: string) => {
    const rate = Number(draft); if (Number.isNaN(rate)) return;
    try {
      await updateCenterCommissionRate({ data: { centerId, rate } });
      toast.success("Updated"); setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">{t("admin.commissions")}</h1>

        {!data ? <p className="mt-8 text-muted-foreground">{t("common.loading")}</p> : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={DollarSign} label={t("admin.total_commission")} value={data.stats.totalCommission.toFixed(2)} />
              <Stat icon={TrendingUp} label={t("admin.this_month")} value={data.stats.thisMonth.toFixed(2)} />
              <Stat icon={Clock} label={t("admin.pending")} value={data.stats.pending.toFixed(2)} />
              <Stat icon={Percent} label={t("admin.avg_rate")} value={`${data.stats.avgRate.toFixed(1)}%`} />
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Center</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Rate %</th>
                    <th className="px-4 py-3 font-medium">Bookings</th>
                    <th className="px-4 py-3 font-medium">Earned</th>
                    <th className="px-4 py-3 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.centers?.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setOpenCenter({ id: c.id, name: c.name })}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">{c.country === "SA" ? "🇸🇦" : "🇪🇬"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{c.plan}</Badge></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {editing === c.id ? (
                          <div className="flex gap-1">
                            <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="w-20 h-8" />
                            <Button size="sm" onClick={() => saveRate(c.id)}>Save</Button>
                          </div>
                        ) : (
                          <button className="hover:text-primary" onClick={() => { setEditing(c.id); setDraft(String(c.rate)); }}>{c.rate}%</button>
                        )}
                      </td>
                      <td className="px-4 py-3">{c.totalBookings}</td>
                      <td className="px-4 py-3 text-primary">{formatPrice(c.totalEarned, c.country, locale)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatPrice(c.pendingAmount, c.country, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Sheet open={!!openCenter} onOpenChange={(o) => !o && setOpenCenter(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{openCenter?.name} — Bookings</SheetTitle></SheetHeader>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Date</th><th>Service</th><th>Customer</th><th>Price</th><th>Commission</th><th>Status</th></tr>
              </thead>
              <tbody>
                {(details?.bookings ?? []).map((b: any) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-2">{format(new Date(b.scheduled_at), "PP")}</td>
                    <td>{b.services?.name}</td>
                    <td>{b.profiles?.full_name ?? b.profiles?.email}</td>
                    <td>{b.price_paid} {b.currency}</td>
                    <td>{Number(b.commission_amount).toFixed(2)}</td>
                    <td><Badge variant="outline" className="capitalize">{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>
      <SiteFooter />
    </div>
  );
}
