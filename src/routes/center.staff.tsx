import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, CalendarOff, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getStaffList, upsertStaff, deleteStaff, blockStaffDate } from "@/lib/center-owner.functions";

export const Route = createFileRoute("/center/staff")({
  head: () => ({ meta: [{ title: "Staff — Beauty Hub" }] }),
  component: Page,
});

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

type Schedule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
};

type StaffMember = {
  id: string;
  name: string;
  name_ar: string | null;
  title: string | null;
  title_ar: string | null;
  bio: string | null;
  bio_ar: string | null;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  service_ids: string[];
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string }>;
  blocked_dates: Array<{ id: string; blocked_date: string; reason: string | null }>;
};

type ServiceRow = { id: string; name: string; name_ar: string | null };

function defaultSchedules(): Schedule[] {
  return DAYS.map((d) => ({
    day_of_week: d,
    start_time: "09:00",
    end_time: "18:00",
    enabled: d >= 0 && d <= 4, // Mon–Fri by default
  }));
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
      const { data } = await supabase
        .from("centers")
        .select("id, name")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["my-services-simple", centerData?.id],
    enabled: !!centerData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, name_ar")
        .eq("center_id", centerData!.id)
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as ServiceRow[];
    },
  });

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["staff-list", centerData?.id],
    enabled: !!centerData?.id,
    queryFn: () => getStaffList(centerData!.id),
  });

  // ── Form state ─────────────────────────────────────────────────────────────
  type FormState = {
    id?: string;
    name: string; name_ar: string;
    title: string; title_ar: string;
    bio: string; bio_ar: string;
    is_active: boolean;
    sort_order: number;
    service_ids: string[];
    schedules: Schedule[];
  };

  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Block-date panel ───────────────────────────────────────────────────────
  const [blockTarget, setBlockTarget] = useState<StaffMember | null>(null);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openForm = (member?: StaffMember) => {
    if (member) {
      const schedules = defaultSchedules().map((def) => {
        const existing = member.schedules.find((s) => s.day_of_week === def.day_of_week);
        return existing
          ? { ...def, start_time: existing.start_time, end_time: existing.end_time, enabled: true }
          : def;
      });
      setForm({
        id: member.id,
        name: member.name,
        name_ar: member.name_ar ?? "",
        title: member.title ?? "",
        title_ar: member.title_ar ?? "",
        bio: member.bio ?? "",
        bio_ar: member.bio_ar ?? "",
        is_active: member.is_active,
        sort_order: member.sort_order,
        service_ids: member.service_ids ?? [],
        schedules,
      });
    } else {
      setForm({
        name: "", name_ar: "", title: "", title_ar: "",
        bio: "", bio_ar: "", is_active: true, sort_order: 0,
        service_ids: [],
        schedules: defaultSchedules(),
      });
    }
  };

  const save = async () => {
    if (!form || !form.name) return toast.error("Name (EN) is required");
    if (!centerData) return;
    setSaving(true);
    try {
      await upsertStaff({
        data: {
          ...(form.id ? { id: form.id } : {}),
          center_id: centerData.id,
          name: form.name,
          name_ar: form.name_ar || null,
          title: form.title || null,
          title_ar: form.title_ar || null,
          bio: form.bio || null,
          bio_ar: form.bio_ar || null,
          is_active: form.is_active,
          sort_order: form.sort_order,
          service_ids: form.service_ids,
          schedules: form.schedules
            .filter((s) => s.enabled)
            .map((s) => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time })),
        },
      });
      toast.success(t("staff.saved"));
      setForm(null);
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving staff");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!deleting) return;
    try {
      await deleteStaff({ data: { id: deleting.id } });
      toast.success(t("staff.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error deleting staff");
    }
  };

  const saveBlock = async () => {
    if (!blockTarget || !blockDate) return;
    setBlockSaving(true);
    try {
      await blockStaffDate({ data: { staffId: blockTarget.id, date: blockDate, reason: blockReason || undefined } });
      toast.success(t("staff.date_blocked"));
      setBlockDate(""); setBlockReason("");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBlockSaving(false);
    }
  };

  const removeBlock = async (staffId: string, date: string) => {
    try {
      await blockStaffDate({ data: { staffId, date, remove: true } });
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch { /* ignore */ }
  };

  const toggleService = (id: string) => {
    if (!form) return;
    const ids = form.service_ids.includes(id)
      ? form.service_ids.filter((s) => s !== id)
      : [...form.service_ids, id];
    setForm({ ...form, service_ids: ids });
  };

  const updateSchedule = (day: number, patch: Partial<Schedule>) => {
    if (!form) return;
    setForm({
      ...form,
      schedules: form.schedules.map((s) =>
        s.day_of_week === day ? { ...s, ...patch } : s
      ),
    });
  };

  const staff: StaffMember[] = (staffList as StaffMember[] | undefined) ?? [];

  return (
    <DashboardLayout role="center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("staff.title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("staff.subtitle")}</p>
        </div>
        <Button onClick={() => openForm()} disabled={!centerData} className="rounded-full bg-gradient-primary">
          <Plus className="h-4 w-4 mr-1" /> {t("staff.add")}
        </Button>
      </div>

      {!centerData ? (
        <p className="mt-10 text-muted-foreground">{t("center.create_profile_first")}</p>
      ) : isLoading ? (
        <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
      ) : staff.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <p className="text-display text-2xl">{t("staff.no_staff")}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-display text-lg truncate">{m.name}</h3>
                  {m.name_ar && <p dir="rtl" className="text-primary text-xs truncate">{m.name_ar}</p>}
                  {m.title && <p className="text-muted-foreground text-xs truncate">{m.title}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{m.schedules.length} {t("staff.schedule")}</span>
                <span className="mx-1">·</span>
                <span>{m.service_ids?.length ?? 0} services</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {m.is_active
                  ? <Badge className="bg-green-500/15 text-green-700 border-0">{t("common.active")}</Badge>
                  : <Badge variant="outline">{t("common.inactive")}</Badge>}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Days off" onClick={() => setBlockTarget(m)}>
                    <CalendarOff className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openForm(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(m)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Sheet ── */}
      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? t("staff.edit") : t("staff.add")}</SheetTitle>
          </SheetHeader>
          {form && (
            <div className="space-y-5 mt-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("staff.name_en")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>{t("staff.name_ar")}</Label>
                  <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("staff.title_field")}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Laser Specialist" />
                </div>
                <div>
                  <Label>{t("staff.title_ar")}</Label>
                  <Input dir="rtl" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{t("staff.bio")}</Label>
                <Textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} />
              </div>
              <div>
                <Label>{t("staff.bio_ar")}</Label>
                <Textarea dir="rtl" rows={2} value={form.bio_ar} onChange={(e) => setForm({ ...form, bio_ar: e.target.value })} maxLength={300} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("staff.sort_order")}</Label>
                  <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center justify-between w-full rounded-xl border border-border px-3 py-2">
                    <Label className="cursor-pointer">{t("staff.is_active")}</Label>
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  </div>
                </div>
              </div>

              {/* Services */}
              {(services ?? []).length > 0 && (
                <div>
                  <Label className="mb-2 block">{t("staff.services")}</Label>
                  <div className="rounded-xl border border-border divide-y divide-border max-h-40 overflow-y-auto">
                    {(services ?? []).map((svc) => (
                      <label key={svc.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/50">
                        <Checkbox
                          checked={form.service_ids.includes(svc.id)}
                          onCheckedChange={() => toggleService(svc.id)}
                        />
                        <span className="text-sm flex-1">{locale === "ar" && svc.name_ar ? svc.name_ar : svc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div>
                <Label className="mb-2 block">{t("staff.schedule")}</Label>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {form.schedules.map((s) => (
                    <div key={s.day_of_week} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={s.enabled}
                        onCheckedChange={(v) => updateSchedule(s.day_of_week, { enabled: !!v })}
                      />
                      <span className="w-20 text-sm shrink-0">{t(`hours.day_${s.day_of_week}` as never)}</span>
                      <Input
                        type="time" value={s.start_time} disabled={!s.enabled}
                        className="h-7 text-xs w-24"
                        onChange={(e) => updateSchedule(s.day_of_week, { start_time: e.target.value })}
                      />
                      <span className="text-muted-foreground text-xs">–</span>
                      <Input
                        type="time" value={s.end_time} disabled={!s.enabled}
                        className="h-7 text-xs w-24"
                        onChange={(e) => updateSchedule(s.day_of_week, { end_time: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setForm(null)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Block Date Sheet ── */}
      <Sheet open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("staff.blocked_dates")} — {blockTarget?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Existing blocked dates */}
            {(blockTarget?.blocked_dates ?? []).length > 0 && (
              <div className="rounded-xl border border-border divide-y divide-border">
                {(blockTarget?.blocked_dates ?? []).map((bd) => (
                  <div key={bd.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{bd.blocked_date}</p>
                      {bd.reason && <p className="text-xs text-muted-foreground">{bd.reason}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeBlock(blockTarget!.id, bd.blocked_date)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {(blockTarget?.blocked_dates ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">{t("hours.no_blocked")}</p>
            )}
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-sm font-medium">{t("staff.block_date")}</p>
              <div>
                <Label className="text-xs">{t("common.date")}</Label>
                <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t("staff.block_reason")}</Label>
                <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Vacation, training…" />
              </div>
              <Button onClick={saveBlock} disabled={blockSaving || !blockDate} className="w-full bg-gradient-primary" size="sm">
                {blockSaving ? t("common.saving") : t("staff.block_date")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm_delete")}</AlertDialogTitle>
            <AlertDialogDescription>Remove {deleting?.name}? This cannot be undone.</AlertDialogDescription>
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
