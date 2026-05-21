import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminCenters, updateCenterAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/centers")({
  head: () => ({ meta: [{ title: "Centers — Admin — Beauty Hub" }] }),
  component: Page,
});

function Page() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [verified, setVerified] = useState("all");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["admin-centers"],
    enabled: !!user && isAdmin,
    queryFn: () => getAdminCenters(),
  });

  type Patch = {
    id: string;
    is_verified?: boolean;
    is_active?: boolean;
    commission_rate?: number;
    subscription_plan?: "free" | "basic" | "pro" | "premium";
    subscription_expires_at?: string | null;
  };
  const update = async (patch: Patch) => {
    try {
      await updateCenterAdmin({ data: patch });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-centers"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = useMemo(() => {
    let list = data?.centers ?? [];
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    if (plan !== "all") list = list.filter((c) => c.subscription_plan === plan);
    if (verified !== "all") list = list.filter((c) => (verified === "verified" ? c.is_verified : !c.is_verified));
    return list;
  }, [data, search, plan, verified]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">Centers</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {["free","basic","pro","premium"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={verified} onValueChange={setVerified}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All centers</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Center</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Commission %</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No centers.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.owner_email}</td>
                  <td className="px-4 py-3">{c.city ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{c.subscription_plan}</Badge></td>
                  <td className="px-4 py-3">
                    {editingCommission === c.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 w-20"
                          type="number"
                          value={commissionDraft}
                          autoFocus
                          onChange={(e) => setCommissionDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const n = Number(commissionDraft);
                              if (!isNaN(n)) { update({ id: c.id, commission_rate: n }); setEditingCommission(null); }
                            }
                            if (e.key === "Escape") setEditingCommission(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => { const n = Number(commissionDraft); if (!isNaN(n)) { update({ id: c.id, commission_rate: n }); setEditingCommission(null); } }}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingCommission(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <button className="hover:text-primary underline-offset-2 hover:underline" onClick={() => { setEditingCommission(c.id); setCommissionDraft(String(c.commission_rate)); }}>{c.commission_rate}%</button>
                    )}
                  </td>
                  <td className="px-4 py-3"><Switch checked={c.is_verified} onCheckedChange={(v) => update({ id: c.id, is_verified: v })} /></td>
                  <td className="px-4 py-3"><Switch checked={c.is_active} onCheckedChange={(v) => update({ id: c.id, is_active: v })} /></td>
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
