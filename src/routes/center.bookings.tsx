import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCenterBookings } from "@/lib/center-owner.functions";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/center/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Beauty Hub" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function Page() {
  const { t, locale } = useI18n();
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
    toast.success(t(`status.${st}`));
    qc.invalidateQueries({ queryKey: ["center-bookings"] });
  };

  const summary = useMemo(() => {
    const list = data?.bookings ?? [];
    return {
      count: list.length,
      revenue: list.reduce((s, b) => s + Number(b.price_paid), 0),
      payout: list.reduce((s, b) => s + Number(b.payout), 0),
    };
  }, [data]);

  const country = data?.country ?? "EG";

  return (
    <DashboardLayout role="center">
        <h1 className="text-display text-5xl">{t("center.all_bookings")}</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.all_statuses")}</SelectItem>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
              <SelectItem value="completed">{t("status.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("center.search_customer")} />
        </div>

        <div className="mt-6 flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <span><strong>{summary.count}</strong> {t("nav.bookings")}</span>
          <span>{t("admin.revenue")}: <strong className="text-primary">{formatPrice(summary.revenue, country, locale)}</strong></span>
          <span>{t("center.net_payout")}: <strong>{formatPrice(summary.payout, country, locale)}</strong></span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">{t("common.customer")}</th>
                <th className="px-4 py-3 font-medium">{t("common.service")}</th>
                <th className="px-4 py-3 font-medium">{t("common.scheduled_at")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 font-medium">{t("common.price")}</th>
                <th className="px-4 py-3 font-medium">{t("center.net_payout")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t("common.loading")}</td></tr>
              ) : (data?.bookings ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t("common.no_results")}</td></tr>
              ) : (data?.bookings ?? []).map((b, i) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{b.service_name}</td>
                  <td className="px-4 py-3">{format(new Date(b.scheduled_at), "PP · p")}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={cn("border", statusColors[b.status])}>{t(`status.${b.status}`)}</Badge></td>
                  <td className="px-4 py-3">{formatPrice(b.price_paid, country, locale)}</td>
                  <td className="px-4 py-3">{formatPrice(b.payout, country, locale)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                    {b.status === "pending" && <Button size="sm" variant="outline" onClick={() => update(b.id, "confirmed")}>{t("common.confirm")}</Button>}
                    {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => update(b.id, "completed")}>{t("common.complete")}</Button>}
                    {(b.status === "pending" || b.status === "confirmed") && <Button size="sm" variant="ghost" onClick={() => update(b.id, "cancelled")}>{t("common.cancel")}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </DashboardLayout>
  );
}
