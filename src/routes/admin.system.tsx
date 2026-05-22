import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users, Building2, Calendar, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { getSystemInfo, toggleFeatureFlag, createAdminUser } from "@/lib/system.functions";

export const Route = createFileRoute("/admin/system")({
  head: () => ({ meta: [{ title: "System — Beauty Hub" }] }),
  component: Page,
});

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-display text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { user, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isSuperAdmin) navigate({ to: "/admin/dashboard" });
  }, [loading, user, isSuperAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["system-info"], enabled: !loading && !!user && isSuperAdmin,
    queryFn: () => getSystemInfo(),
    retry: false,
  });

  const toggle = async (key: string, enabled: boolean) => {
    try { await toggleFeatureFlag({ data: { key, enabled } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["system-info"] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const createAdmin = async () => {
    setCreating(true);
    try { await createAdminUser({ data: { email, password, role } }); toast.success("Admin created"); setOpenCreate(false); setEmail(""); setPassword(""); qc.invalidateQueries({ queryKey: ["system-info"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 flex-1 space-y-10">
        <div>
          <h1 className="text-display text-5xl">System</h1>
          <p className="mt-2 text-muted-foreground">Super admin controls.</p>
        </div>

        {!data ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Users} label="Total users" value={String(data.stats.users)} />
              <Stat icon={Building2} label="Total centers" value={String(data.stats.centers)} />
              <Stat icon={Calendar} label="Total bookings" value={String(data.stats.bookings)} />
              <Stat icon={DollarSign} label="Total commission" value={data.stats.commission.toFixed(2)} />
            </div>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-display text-2xl">App info</h2>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Version: <span className="text-foreground">1.0.0 — Phase 3</span></li>
                <li>Regions: 🇪🇬 Egypt ✓ &nbsp; 🇸🇦 Saudi Arabia ✓</li>
                <li>Languages: العربية ✓ &nbsp; English ✓</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-display text-2xl">Feature flags</h2>
              <div className="mt-4 divide-y divide-border">
                {data.flags.map((f: any) => (
                  <div key={f.key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{f.key}</p>
                      {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                    </div>
                    <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f.key, v)} />
                  </div>
                ))}
                {data.flags.length === 0 && <p className="text-sm text-muted-foreground py-3">No flags defined.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-display text-2xl">Admin accounts</h2>
                <Button onClick={() => setOpenCreate(true)} className="rounded-full bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> Create admin</Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr><th className="py-2">Email</th><th>Role</th><th>Created</th></tr></thead>
                  <tbody>
                    {data.admins.map((a: any) => (
                      <tr key={`${a.user_id}-${a.role}`} className="border-t border-border">
                        <td className="py-2">{a.profiles?.email ?? a.user_id}</td>
                        <td><Badge variant="outline" className="capitalize">{a.role}</Badge></td>
                        <td className="text-muted-foreground">{format(new Date(a.created_at), "PP")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-display text-2xl">Audit log</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Old → New</th></tr>
                  </thead>
                  <tbody>
                    {data.auditLogs.map((l: any) => (
                      <tr key={l.id} className="border-t border-border align-top">
                        <td className="py-2 text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), "PPp")}</td>
                        <td>{l.actor_email ?? "—"}</td>
                        <td><Badge variant="outline">{l.action}</Badge></td>
                        <td className="text-muted-foreground">{l.target_type}</td>
                        <td className="font-mono text-xs">{JSON.stringify(l.old_value)} → {JSON.stringify(l.new_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={createAdmin} disabled={creating || !email || !password} className="bg-gradient-primary">{creating ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
