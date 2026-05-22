import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForCountry } from "@/data/cities";

export const Route = createFileRoute("/center/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Beauty Hub" }] }),
  component: Page,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

const CATS = ["laser", "filler", "botox", "facial", "hair", "nails", "massage", "other"] as const;

function Page() {
  const { user, loading } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [s1, setS1] = useState({ name: "", name_ar: "", country: "EG", city: "", phone: "", description: "", description_ar: "" });
  // Step 2
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  // Step 3
  const emptySvc = () => ({ name: "", name_ar: "", category: "other", price: 0, duration_minutes: 60, is_active: true });
  const [svc, setSvc] = useState(emptySvc());

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth/login" }); return; }
    supabase.from("centers").select("id").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setCenterId(data.id); setStep(2); }
    });
  }, [user, loading, navigate]);

  const saveStep1 = async () => {
    if (!user) return;
    if (!s1.name) return toast.error("Name (EN) required");
    setSaving(true);
    const { data, error } = await supabase.from("centers").insert({
      owner_id: user.id, name: s1.name, name_ar: s1.name_ar || null, slug: slugify(s1.name),
      country: s1.country, city: s1.city || null, phone: s1.phone || null,
      description: s1.description || null, description_ar: s1.description_ar || null,
      is_active: false, is_verified: false,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setCenterId(data!.id);
    setStep(2);
  };

  const upload = async (file: File, kind: "logo_url" | "cover_url") => {
    if (!user || !centerId) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("center-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("center-assets").getPublicUrl(path);
    await supabase.from("centers").update({ [kind]: pub.publicUrl } as never).eq("id", centerId);
    if (kind === "logo_url") setLogo(pub.publicUrl); else setCover(pub.publicUrl);
    toast.success("Uploaded");
  };

  const saveService = async (then: "another" | "finish") => {
    if (!centerId) return;
    if (svc.name && svc.name_ar) {
      setSaving(true);
      const { error } = await supabase.from("services").insert({
        center_id: centerId, name: svc.name, name_ar: svc.name_ar,
        category: svc.category as never, price: Number(svc.price),
        duration_minutes: Number(svc.duration_minutes), is_active: svc.is_active,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Service added");
    }
    if (then === "another") setSvc(emptySvc());
    else finish();
  };

  const finish = () => {
    toast.success(t("center.submitted_title"));
    navigate({ to: "/center/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-4xl">{t("center.onboarding_title")}</h1>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={(step / 3) * 100} className="flex-1" />
          <span className="text-sm text-muted-foreground">Step {step} of 3</span>
        </div>

        {step === 1 && (
          <div className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-display text-2xl">{t("center.step_basic")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Name (EN)</Label><Input value={s1.name} onChange={(e) => setS1({ ...s1, name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input dir="rtl" value={s1.name_ar} onChange={(e) => setS1({ ...s1, name_ar: e.target.value })} /></div>
              <div>
                <Label>{t("auth.country")}</Label>
                <Select value={s1.country} onValueChange={(v) => setS1({ ...s1, country: v, city: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EG">🇪🇬 {t("common.country_eg")}</SelectItem>
                    <SelectItem value="SA">🇸🇦 {t("common.country_sa")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("browse.city")}</Label>
                <Select value={s1.city} onValueChange={(v) => setS1({ ...s1, city: v })}>
                  <SelectTrigger><SelectValue placeholder={t("centers.filter_city")} /></SelectTrigger>
                  <SelectContent>
                    {getCitiesForCountry(s1.country as "EG" | "SA").map((c) => (
                      <SelectItem key={c.value} value={c.value}>{locale === "ar" ? c.label_ar : c.label_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>{t("auth.phone")}</Label><Input value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description (EN)</Label><Textarea value={s1.description} onChange={(e) => setS1({ ...s1, description: e.target.value })} rows={3} /></div>
              <div className="sm:col-span-2"><Label>Description (AR)</Label><Textarea dir="rtl" value={s1.description_ar} onChange={(e) => setS1({ ...s1, description_ar: e.target.value })} rows={3} /></div>
            </div>
            <Button onClick={saveStep1} disabled={saving} className="rounded-full bg-gradient-primary">{saving ? t("common.loading") : t("center.next")} →</Button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-display text-2xl">{t("center.step_assets")}</h2>
            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border bg-secondary">
                  {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Upload className="h-5 w-5" /></div>}
                </div>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo_url")} />
              </div>
            </div>
            <div>
              <Label>Cover (16:9)</Label>
              <div className="mt-2 space-y-2">
                <div className="aspect-video w-full overflow-hidden rounded-xl border bg-secondary">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Upload className="h-5 w-5" /></div>}
                </div>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_url")} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-primary">{t("center.skip")} →</button>
              <Button onClick={() => setStep(3)} className="rounded-full bg-gradient-primary">{t("center.next")} →</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-display text-2xl">{t("center.step_service")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Name (EN)</Label><Input value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input dir="rtl" value={svc.name_ar} onChange={(e) => setSvc({ ...svc, name_ar: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={svc.category} onValueChange={(v) => setSvc({ ...svc, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price</Label><Input type="number" value={svc.price} onChange={(e) => setSvc({ ...svc, price: Number(e.target.value) })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={svc.duration_minutes} onChange={(e) => setSvc({ ...svc, duration_minutes: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Active</Label><Switch checked={svc.is_active} onCheckedChange={(v) => setSvc({ ...svc, is_active: v })} /></div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => saveService("another")} disabled={saving}>Save & add another</Button>
              <Button onClick={() => saveService("finish")} disabled={saving} className="rounded-full bg-gradient-primary"><Check className="h-4 w-4 mr-1" /> {t("center.finish")}</Button>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
