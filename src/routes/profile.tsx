import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForCountry } from "@/data/cities";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — Beauty Hub" }] }),
  component: ProfilePage,
});

type ProfileForm = {
  full_name: string;
  phone: string;
  city: string;
  country: "EG" | "SA";
  whatsapp_opt_in: boolean;
  avatar_url: string | null;
};

const emptyForm: ProfileForm = {
  full_name: "", phone: "", city: "", country: "EG",
  whatsapp_opt_in: true, avatar_url: null,
};

function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [loading, user, navigate]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, city, country, whatsapp_opt_in, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        city: profile.city ?? "",
        country: (profile.country === "SA" ? "SA" : "EG"),
        whatsapp_opt_in: profile.whatsapp_opt_in ?? true,
        avatar_url: profile.avatar_url ?? null,
      });
    }
  }, [profile]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage
      .from("center-assets")
      .upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploadingAvatar(false); return; }
    const { data: pub } = supabase.storage.from("center-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
    setUploadingAvatar(false);
    toast.success(t("profile.saved"));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        city: form.city || null,
        country: form.country,
        whatsapp_opt_in: form.whatsapp_opt_in,
        avatar_url: form.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.saved"));
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("profile.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("profile.subtitle")}</p>

      <div className="mt-8 max-w-xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft">

        {/* ── Avatar ──────────────────────────────── */}
        <div className="flex items-center gap-5">
          <label className="relative cursor-pointer group">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center shrink-0">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                : <span className="text-display text-2xl text-primary/40">{form.full_name?.[0] || user?.email?.[0]}</span>
              }
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
          <div>
            <p className="font-medium">{form.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            {uploadingAvatar && <p className="text-xs text-primary mt-1">{t("common.saving")}</p>}
          </div>
        </div>

        <hr className="border-border" />

        {/* ── Name & Phone ─────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("profile.full_name")}</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              maxLength={100}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("profile.phone")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={30}
              type="tel"
              className="mt-1"
            />
          </div>
        </div>

        {/* ── Country & City ───────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("auth.country")}</Label>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value as "EG" | "SA", city: "" })}
              className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
            >
              <option value="EG">🇪🇬 {t("common.country_eg")}</option>
              <option value="SA">🇸🇦 {t("common.country_sa")}</option>
            </select>
          </div>
          <div>
            <Label>{t("browse.city")}</Label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
            >
              <option value="">{t("centers.filter_city")}</option>
              {getCitiesForCountry(form.country).map((c) => (
                <option key={c.value} value={c.value}>
                  {locale === "ar" ? c.label_ar : c.label_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-border" />

        {/* ── WhatsApp opt-in ──────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {form.whatsapp_opt_in
              ? <Bell className="h-5 w-5 text-primary shrink-0" />
              : <BellOff className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            }
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{t("profile.whatsapp_opt_in")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">WhatsApp</p>
            </div>
          </div>
          <Switch
            checked={form.whatsapp_opt_in}
            onCheckedChange={(v) => setForm({ ...form, whatsapp_opt_in: v })}
          />
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full rounded-full bg-gradient-primary"
          size="lg"
        >
          {saving ? t("common.saving") : t("common.save_changes")}
        </Button>
      </div>
    </DashboardLayout>
  );
}
