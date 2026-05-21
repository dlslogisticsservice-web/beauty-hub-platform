import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/center/services")({
  head: () => ({ meta: [{ title: "Services — Glowy" }] }),
  component: Page,
});

const CATS = ["laser", "filler", "botox", "facial", "hair", "nails", "massage", "other"] as const;

type Service = {
  id: string; name: string; name_ar: string | null; category: string;
  description: string | null; price: number; duration_minutes: number; is_active: boolean;
  center_id: string;
};

function emptyForm(centerId: string): Partial<Service> {
  return { center_id: centerId, name: "", name_ar: "", category: "other", description: "", price: 0, duration_minutes: 60, is_active: true };
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

  const { data: centerData } = useQuery({
    queryKey: ["my-center", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("centers").select("id, name").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["my-services", centerData?.id],
    enabled: !!centerData?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("center_id", centerData!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Service[];
    },
  });

  const [form, setForm] = useState<Partial<Service> | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  const open = (svc?: Service) => {
    if (!centerData) return;
    setForm(svc ? { ...svc } : emptyForm(centerData.id));
  };

  const save = async () => {
    if (!form || !form.name || !form.name_ar) return toast.error("Name (EN + AR) required");
    setSaving(true);
    const payload = {
      center_id: form.center_id!, name: form.name!, name_ar: form.name_ar!,
      category: form.category as never, description: form.description ?? null,
      price: Number(form.price ?? 0), duration_minutes: Number(form.duration_minutes ?? 60),
      is_active: form.is_active ?? true,
    };
    const { error } = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id)
      : await supabase.from("services").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Service updated" : "Service added");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["my-services"] });
  };

  const del = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("services").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Service deleted");
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["my-services"] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-5xl">Services</h1>
            <p className="mt-2 text-muted-foreground">Manage what your center offers.</p>
          </div>
          <Button onClick={() => open()} disabled={!centerData} className="rounded-full bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> Add service</Button>
        </div>

        {!centerData ? (
          <p className="mt-10 text-muted-foreground">Create your center profile first to add services.</p>
        ) : isLoading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : (services ?? []).length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-display text-2xl">No services yet</p>
            <p className="mt-2 text-muted-foreground">Add your first service to start receiving bookings.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(services ?? []).map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="capitalize">{s.category}</Badge>
                    <h3 className="text-display text-2xl mt-2 truncate">{s.name}</h3>
                    {s.name_ar && <p dir="rtl" className="text-primary text-sm truncate">{s.name_ar}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-display text-xl text-primary">${s.price}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{s.duration_minutes}m</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {s.is_active ? <Badge className="bg-green-500/15 text-green-700 border-0">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => open(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Edit service" : "Add service"}</SheetTitle>
          </SheetHeader>
          {form && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name (EN)</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label>Name (AR)</Label>
                <Input dir="rtl" value={form.name_ar ?? ""} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category as string} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price ($)</Label>
                  <Input type="number" min={0} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" min={1} value={form.duration_minutes ?? 60} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label className="cursor-pointer">Active</Label>
                <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving ? "Saving…" : "Save"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleting?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SiteFooter />
    </div>
  );
}
