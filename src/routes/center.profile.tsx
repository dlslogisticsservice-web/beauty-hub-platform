import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForCountry } from "@/data/cities";

export const Route = createFileRoute("/center/profile")({
  head: () => ({ meta: [{ title: "Center profile — Beauty Hub" }] }),
  component: Page,
});

type CenterForm = {
  id?: string; name: string; name_ar: string; slug: string;
  description: string; description_ar: string; city: string; address: string; phone: string;
  country: "EG" | "SA";
  logo_url: string | null; cover_url: string | null;
};

const empty: CenterForm = { name: "", name_ar: "", slug: "", description: "", description_ar: "", city: "", address: "", phone: "", country: "EG", logo_url: null, cover_url: null };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Page() {
  const { t } = useI18n();
  const { user, isCenterOwner, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<CenterForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isCenterOwner && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isCenterOwner, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-center-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("centers").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id, name: data.name ?? "", name_ar: data.name_ar ?? "", slug: data.slug ?? "",
        description: data.description ?? "", description_ar: data.description_ar ?? "",
        city: data.city ?? "", address: data.address ?? "", phone: data.phone ?? "",
        country: (data.country === "SA" ? "SA" : "EG"),
        logo_url: data.logo_url, cover_url: data.cover_url,
      });
    }
  }, [data]);

  const upload = async (file: File, field: "logo_url" | "cover_url") => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("center-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("center-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, [field]: pub.publicUrl }));
    toast.success(t("common.save"));
  };

  const save = async () => {
    if (!user) return;
    if (!form.name || !form.slug) return toast.error(t("center.name_en"));
    setSaving(true);
    const payload = {
      owner_id: user.id, name: form.name, name_ar: form.name_ar || null, slug: slugify(form.slug),
      description: form.description || null, description_ar: form.description_ar || null,
      city: form.city || null, address: form.address || null, phone: form.phone || null,
      country: form.country,
      logo_url: form.logo_url, cover_url: form.cover_url,
    };
    const { error } = form.id
      ? await supabase.from("centers").update(payload).eq("id", form.id)
      : await supabase.from("centers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("center.profile_saved"));
    qc.invalidateQueries({ queryKey: ["my-center-full"] });
    qc.invalidateQueries({ queryKey: ["my-center"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-16 flex-1">{t("common.loading")}</div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">{form.id ? t("center.edit_profile") : t("center.create_center")}</h1>

        <div className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("center.name_en")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} maxLength={120} />
            </div>
            <div>
              <Label>{t("center.name_ar")}</Label>
              <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={120} />
            </div>
          </div>
          <div>
            <Label>{t("center.url_slug")}</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} maxLength={80} />
          </div>
          <div>
            <Label>{t("center.description_en")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} />
          </div>
          <div>
            <Label>{t("center.description_ar")}</Label>
            <Textarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} maxLength={1000} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>{t("browse.city")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </div>
            <div>
              <Label>{t("auth.country")}</Label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value as "EG" | "SA" })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="EG">🇪🇬 {t("common.country_eg")}</option>
                <option value="SA">🇸🇦 {t("common.country_sa")}</option>
              </select>
            </div>
          </div>
          <div>
            <Label>{t("center.address")}</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <UploadBox label={t("center.logo")} url={form.logo_url} onPick={(f) => upload(f, "logo_url")} />
            <UploadBox label={t("center.cover_photo")} url={form.cover_url} onPick={(f) => upload(f, "cover_url")} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full rounded-full bg-gradient-primary" size="lg">
            {saving ? t("common.saving") : form.id ? t("common.save_changes") : t("center.create_center")}
          </Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function UploadBox({ label, url, onPick }: { label: string; url: string | null; onPick: (f: File) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background hover:border-primary transition">
        {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <span className="text-sm text-muted-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> {label}</span>}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      </label>
    </div>
  );
}
