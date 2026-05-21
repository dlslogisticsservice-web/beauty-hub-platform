import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, User, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Join Beauty Hub — Create your account" },
      { name: "description", content: "Sign up as a customer or list your beauty center on Beauty Hub." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "center_owner">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<"EG" | "SA">("EG");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signed, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone, role, country },
      },
    });
    if (!error && signed.user) {
      await supabase.from("profiles").update({ country }).eq("id", signed.user.id);
    }
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.create_account"));
    navigate({ to: "/auth/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-2xl text-display">{t("brand.name")}</span>
        </Link>
        <h1 className="text-display text-3xl">{t("auth.signup_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("auth.signup_sub")}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-2xl border p-4 text-left transition ${role === "customer" ? "border-primary bg-secondary" : "border-border bg-card"}`}
          >
            <User className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-sm">{t("auth.i_am_customer")}</p>
            <p className="text-xs text-muted-foreground">{t("auth.customer_desc")}</p>
          </button>
          <button
            type="button"
            onClick={() => setRole("center_owner")}
            className={`rounded-2xl border p-4 text-left transition ${role === "center_owner" ? "border-primary bg-secondary" : "border-border bg-card"}`}
          >
            <Store className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-sm">{t("auth.i_am_owner")}</p>
            <p className="text-xs text-muted-foreground">{t("auth.owner_desc")}</p>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="fullName">{t("auth.full_name")}</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">{t("auth.phone")}</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="country">{t("auth.country")}</Label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value as "EG" | "SA")} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="EG">🇪🇬 {t("common.country_eg")}</option>
              <option value="SA">🇸🇦 {t("common.country_sa")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-primary">
            {loading ? t("auth.creating") : t("auth.create_account")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          {t("auth.have_account")} <Link to="/auth/login" className="text-primary hover:underline">{t("auth.sign_in")}</Link>
        </p>
      </div>
    </div>
  );
}
