import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getCouponList, upsertCoupon, deleteCoupon } from "@/lib/center-owner.functions";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/center/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Beauty Hub" }] }),
  component: Page,
});

type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_booking_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  center_id: string | null;
};

type FormState = {
  id?: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_booking_amount: string;
  max_uses: string;
  valid_until: string;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    code: "",
    discount_type: "percent",
    discount_value: 10,
    min_booking_amount: "",
    max_uses: "",
    valid_until: "",
    is_active: true,
  };
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

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["coupon-list"],
    enabled: !!user,
    queryFn: () => getCouponList(),
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const openForm = (coupon?: Coupon) => {
    if (coupon) {
      setForm({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_booking_amount: coupon.min_booking_amount != null ? String(coupon.min_booking_amount) : "",
        max_uses: coupon.max_uses != null ? String(coupon.max_uses) : "",
        valid_until: coupon.valid_until ?? "",
        is_active: coupon.is_active,
      });
    } else {
      setForm(emptyForm());
    }
  };

  const save = async () => {
    if (!form || !form.code) return toast.error(`${t("coupons.code")} is required`);
    if (form.discount_value <= 0) return toast.error(`${t("coupons.discount_value")} must be > 0`);
    if (form.discount_type === "percent" && form.discount_value > 100)
      return toast.error("Percentage cannot exceed 100");
    setSaving(true);
    try {
      await upsertCoupon({
        data: {
          ...(form.id ? { id: form.id } : {}),
          code: form.code,
          discount_type: form.discount_type,
          discount_value: form.discount_value,
          min_booking_amount: form.min_booking_amount ? Number(form.min_booking_amount) : null,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          valid_until: form.valid_until || null,
          is_active: form.is_active,
        },
      });
      toast.success(t("coupons.saved"));
      setForm(null);
      qc.invalidateQueries({ queryKey: ["coupon-list"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving coupon");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!deleting) return;
    try {
      await deleteCoupon({ data: { id: deleting.id } });
      toast.success(t("coupons.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["coupon-list"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const couponList: Coupon[] = (coupons as Coupon[] | undefined) ?? [];
  // country/locale for price formatting — use EG as default
  const country = "EG";

  const isExpired = (c: Coupon) =>
    c.valid_until ? new Date(c.valid_until) < new Date() : false;

  return (
    <DashboardLayout role="center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("coupons.title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("coupons.subtitle")}</p>
        </div>
        <Button onClick={() => openForm()} className="rounded-full bg-gradient-primary">
          <Plus className="h-4 w-4 mr-1" /> {t("coupons.add")}
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
      ) : couponList.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-display text-2xl">{t("coupons.no_coupons")}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {couponList.map((c) => {
            const expired = isExpired(c);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="font-mono text-primary bg-primary/10 border-0 uppercase">{c.code}</Badge>
                      {expired && <Badge variant="outline" className="text-red-500 border-red-500/30 text-xs">Expired</Badge>}
                      {!c.is_active && <Badge variant="outline" className="text-xs">{t("common.inactive")}</Badge>}
                    </div>
                    <p className="mt-2 text-display text-2xl">
                      {c.discount_type === "percent"
                        ? `${c.discount_value}% off`
                        : `${formatPrice(c.discount_value, country, locale)} off`}
                    </p>
                    {c.min_booking_amount && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Min: {formatPrice(c.min_booking_amount, country, locale)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.uses_count} {t("coupons.uses")}</span>
                  {c.max_uses && <><span>·</span><span>max {c.max_uses}</span></>}
                  {c.valid_until && <><span>·</span><span>until {c.valid_until}</span></>}
                </div>
                <div className="mt-3 flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openForm(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sheet ── */}
      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? t("coupons.code") : t("coupons.add")}</SheetTitle>
          </SheetHeader>
          {form && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>{t("coupons.code")}</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  placeholder="SUMMER25"
                  className="font-mono uppercase"
                  maxLength={30}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("coupons.discount_type")}</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "fixed" })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">{t("coupons.type_percent")}</SelectItem>
                      <SelectItem value="fixed">{t("coupons.type_fixed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("coupons.discount_value")}{form.discount_type === "percent" ? " (%)" : ""}</Label>
                  <Input
                    type="number" min={1} max={form.discount_type === "percent" ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("coupons.min_booking")}</Label>
                  <Input
                    type="number" min={0} placeholder="0"
                    value={form.min_booking_amount}
                    onChange={(e) => setForm({ ...form, min_booking_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("coupons.max_uses")}</Label>
                  <Input
                    type="number" min={1} placeholder="∞"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t("coupons.valid_until")}</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label className="cursor-pointer">{t("coupons.is_active")}</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
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

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("coupons.deleted")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirm_delete")} {deleting?.code}?</AlertDialogDescription>
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
