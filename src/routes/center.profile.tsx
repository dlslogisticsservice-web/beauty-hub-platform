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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/center/profile")({
  head: () => ({ meta: [{ title: "Center profile — Glowy" }] }),
  component: Page,
});

type CenterForm = {
  id?: string; name: string; name_ar: string; slug: string;
  description: string; description_ar: string; city: string; address: string; phone: string;
  logo_url: string | null; cover_url: string | null;
};

const empty: CenterForm = { name: "", name_ar: "", slug: "", description: "", description_ar: "", city: "", address: "", phone: "", logo_url: null, cover_url: null };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Page() {
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
    toast.success("Uploaded");
  };

  const save = async () => {
    if (!user) return;
    if (!form.name || !form.slug) return toast.error("Name and URL slug are required");
    setSaving(true);
    const payload = {
      owner_id: user.id, name: form.name, name_ar: form.name_ar || null, slug: slugify(form.slug),
      description: form.description || null, description_ar: form.description_ar || null,
      city: form.city || null, address: form.address || null, phone: form.phone || null,
      logo_url: form.logo_url, cover_url: form.cover_url,
    };
    const { error } = form.id
      ? await supabase.from("centers").update(payload).eq("id", form.id)
      : await supabase.from("centers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["my-center-full"] });
    qc.invalidateQueries({ queryKey: ["my-center"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-16 flex-1">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">{form.id ? "Center profile" : "Create your center"}</h1>
        <p className="mt-2 text-muted-foreground">This is what customers see on your public page.</p>

        <div className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Name (EN)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} maxLength={120} />
            </div>
            <div>
              <Label>Name (AR)</Label>
              <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} maxLength={120} />
            </div>
          </div>
          <div>
            <Label>URL slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} maxLength={80} />
            <p className="text-xs text-muted-foreground mt-1">glowy.com/centers/<strong>{form.slug || "your-slug"}</strong></p>
          </div>
          <div>
            <Label>Description (EN)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} />
          </div>
          <div>
            <Label>Description (AR)</Label>
            <Textarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} maxLength={1000} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <UploadBox label="Logo" url={form.logo_url} onPick={(f) => upload(f, "logo_url")} />
            <UploadBox label="Cover photo" url={form.cover_url} onPick={(f) => upload(f, "cover_url")} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full rounded-full bg-gradient-primary" size="lg">
            {saving ? "Saving…" : form.id ? "Save changes" : "Create center"}
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
        {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <span className="text-sm text-muted-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Choose image</span>}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      </label>
    </div>
  );
}
