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
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { PLAN_CATALOG, isWithinLimit } from "@/features/subscription";
import type { PlanId } from "@/features/subscription";

export const Route = createFileRoute("/center/services")({
  head: () => ({ meta: [{ title: "Services — Beauty Hub" }] }),
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
  const { t, locale } = useI18n();
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
      const { data } = await supabase.from("centers").select("id, name, country, subscription_plan").eq("owner_id", user!.id).maybeSingle();
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

  const planId = (centerData?.subscription_plan ?? "free") as PlanId;
  const limit = PLAN_CATALOG[planId]?.maxServices ?? 5;

  const open = (svc?: Service) => {
    if (!centerData) return;
    if (!svc && !isWithinLimit(limit, services?.length ?? 0)) {
      toast.error(t("center.plan_limit_reached"));
      return;
    }
    setForm(svc ? { ...svc } : emptyForm(centerData.id));
  };

  const save = async () => {
    if (!form || !form.name || !form.name_ar) return toast.error(`${t("center.service_name_en")} + ${t("center.service_name_ar")}`);
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
    toast.success(t("common.save"));
    setForm(null);
    qc.invalidateQueries({ queryKey: ["my-services"] });
  };

  const del = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("services").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success(t("common.delete"));
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["my-services"] });
  };

  const country = centerData?.country ?? "EG";

  return (
    <DashboardLayout role="center">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-5xl">{t("center.my_services")}</h1>
          </div>
          <Button onClick={() => open()} disabled={!centerData} className="rounded-full bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> {t("center.add_service")}</Button>
        </div>

        {!centerData ? (
          <p className="mt-10 text-muted-foreground">{t("center.create_profile_first")}</p>
        ) : isLoading ? (
          <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
        ) : (services ?? []).length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-display text-2xl">{t("center.no_services_title")}</p>
            <p className="mt-2 text-muted-foreground">{t("center.no_services_desc")}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(services ?? []).map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="capitalize">{t(`categories.${s.category}`)}</Badge>
                    <h3 className="text-display text-2xl mt-2 truncate">{s.name}</h3>
                    {s.name_ar && <p dir="rtl" className="text-primary text-sm truncate">{s.name_ar}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-display text-xl text-primary">{formatPrice(s.price, country, locale)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{s.duration_minutes}{t("common.minutes")}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {s.is_active ? <Badge className="bg-green-500/15 text-green-700 border-0">{t("common.active")}</Badge> : <Badge variant="outline">{t("common.inactive")}</Badge>}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => open(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? t("center.edit_service") : t("center.add_service")}</SheetTitle>
          </SheetHeader>
          {form && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>{t("center.service_name_en")}</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label>{t("center.service_name_ar")}</Label>
                <Input dir="rtl" value={form.name_ar ?? ""} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label>{t("common.category")}</Label>
                <Select value={form.category as string} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("center.description_en")}</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("common.price")}</Label>
                  <Input type="number" min={0} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>{t("center.duration")}</Label>
                  <Input type="number" min={1} value={form.duration_minutes ?? 60} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label className="cursor-pointer">{t("common.active")}</Label>
                <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setForm(null)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving ? t("common.saving") : t("common.save")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("center.delete_service_q")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirm_delete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={del}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
}
