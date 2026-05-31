import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCenterHours, saveCenterHours } from "@/lib/center-owner.functions";

export const Route = createFileRoute("/center/hours")({
  head: () => ({ meta: [{ title: "Working Hours — Beauty Hub" }] }),
  component: Page,
});

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

type DayHours = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

type BlockedDate = {
  id: string;
  blocked_date: string;
  reason: string | null;
};

function defaultHours(): DayHours[] {
  return DAYS.map((d) => ({
    day_of_week: d,
    is_open: d >= 0 && d <= 4,
    open_time: "09:00",
    close_time: "21:00",
  }));
}

function Page() {
  const { t } = useI18n();
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

  const { data: hoursData, isLoading } = useQuery({
    queryKey: ["center-hours", centerData?.id],
    enabled: !!centerData?.id,
    queryFn: () => getCenterHours(centerData!.id),
  });

  const [hours, setHours] = useState<DayHours[]>(defaultHours());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate when API data loads
  useEffect(() => {
    if (!hoursData) return;
    const apiHours: DayHours[] = (hoursData as { hours?: DayHours[] }).hours ?? [];
    if (apiHours.length > 0) {
      setHours(defaultHours().map((def) => {
        const found = apiHours.find((h) => h.day_of_week === def.day_of_week);
        return found ? { ...def, is_open: found.is_open, open_time: found.open_time, close_time: found.close_time } : def;
      }));
    }
    setBlockedDates((hoursData as { blocked_dates?: BlockedDate[] }).blocked_dates ?? []);
  }, [hoursData]);

  const updateDay = (day: number, patch: Partial<DayHours>) => {
    setHours((prev) => prev.map((h) => h.day_of_week === day ? { ...h, ...patch } : h));
  };

  const saveHours = async () => {
    if (!centerData) return;
    setSaving(true);
    try {
      await saveCenterHours({ data: { centerId: centerData.id, hours } });
      toast.success(t("hours.saved"));
      qc.invalidateQueries({ queryKey: ["center-hours"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving hours");
    } finally {
      setSaving(false);
    }
  };

  // ── Blocked dates ──────────────────────────────────────────────────────────
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  const addBlockedDate = async () => {
    if (!centerData || !newBlockDate) return;
    setBlockSaving(true);
    try {
      const { data, error } = await supabase
        .from("center_blocked_dates")
        .insert({ center_id: centerData.id, blocked_date: newBlockDate, reason: newBlockReason || null })
        .select()
        .single();
      if (error) throw error;
      setBlockedDates((prev) => [...prev, data as BlockedDate]);
      setNewBlockDate(""); setNewBlockReason("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBlockSaving(false);
    }
  };

  const removeBlockedDate = async (id: string) => {
    const { error } = await supabase.from("center_blocked_dates").delete().eq("id", id);
    if (!error) setBlockedDates((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <DashboardLayout role="center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("hours.title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("hours.subtitle")}</p>
        </div>
        <Button onClick={saveHours} disabled={saving || !centerData} className="rounded-full bg-gradient-primary">
          <Save className="h-4 w-4 mr-1" /> {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      {!centerData ? (
        <p className="mt-10 text-muted-foreground">{t("center.create_profile_first")}</p>
      ) : isLoading ? (
        <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Weekly hours */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {hours.map((h) => (
                <div key={h.day_of_week} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Day label */}
                  <div className="w-28 shrink-0">
                    <span className="text-sm font-medium">{t(`hours.day_${h.day_of_week}` as never)}</span>
                  </div>
                  {/* Open toggle */}
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <Switch
                      checked={h.is_open}
                      onCheckedChange={(v) => updateDay(h.day_of_week, { is_open: v })}
                    />
                    <span className={`text-xs ${h.is_open ? "text-green-600" : "text-muted-foreground"}`}>
                      {h.is_open ? t("hours.open") : t("hours.closed")}
                    </span>
                  </div>
                  {/* Times */}
                  {h.is_open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground shrink-0">{t("hours.open_time")}</Label>
                        <Input
                          type="time" value={h.open_time}
                          className="h-8 w-28 text-sm"
                          onChange={(e) => updateDay(h.day_of_week, { open_time: e.target.value })}
                        />
                      </div>
                      <span className="text-muted-foreground">–</span>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground shrink-0">{t("hours.close_time")}</Label>
                        <Input
                          type="time" value={h.close_time}
                          className="h-8 w-28 text-sm"
                          onChange={(e) => updateDay(h.day_of_week, { close_time: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic flex-1">{t("hours.closed")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blocked dates */}
          <div>
            <h2 className="text-display text-xl mb-4">{t("hours.blocked_dates")}</h2>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              {/* List existing */}
              {blockedDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("hours.no_blocked")}</p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {blockedDates.map((bd) => (
                    <div key={bd.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{bd.blocked_date}</p>
                        {bd.reason && <p className="text-xs text-muted-foreground">{bd.reason}</p>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeBlockedDate(bd.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add new */}
              <div className="flex items-end gap-3 pt-2">
                <div className="flex-1">
                  <Label className="text-xs">{t("hours.add_blocked")}</Label>
                  <Input type="date" value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)} className="mt-1" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">{t("hours.block_reason")}</Label>
                  <Input value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} placeholder="Holiday…" className="mt-1" />
                </div>
                <Button onClick={addBlockedDate} disabled={blockSaving || !newBlockDate} className="bg-gradient-primary shrink-0">
                  {t("hours.add_blocked")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
