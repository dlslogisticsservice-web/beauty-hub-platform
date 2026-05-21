import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Beauty Hub" },
      { name: "description", content: "Sign in to your Beauty Hub account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.welcome_back"));
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-2xl text-display">{t("brand.name")}</span>
        </Link>
        <h1 className="text-display text-3xl">{t("auth.welcome_back")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("auth.signin_sub")}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-primary">
            {loading ? t("auth.signing_in") : t("auth.sign_in")}
          </Button>
        </form>

        <DevCredentials />

        <p className="mt-6 text-sm text-center text-muted-foreground">
          {t("auth.no_account")} <Link to="/auth/signup" className="text-primary hover:underline">{t("auth.sign_up")}</Link>
        </p>
      </div>
    </div>
  );
}

function DevCredentials() {
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("bh_dev_dismissed") === "1");
  if (hidden) return null;
  const dismiss = () => { sessionStorage.setItem("bh_dev_dismissed", "1"); setHidden(true); };
  const rows = [
    ["Super Admin", "superadmin@beautyhub.app", "SuperAdmin@2025"],
    ["Admin", "admin@beautyhub.app", "Admin@2025"],
    ["Center (EG)", "owner.eg@beautyhub.app", "Owner@2025"],
    ["Center (SA)", "owner.sa@beautyhub.app", "Owner@2025"],
    ["Customer", "customer1@beautyhub.app", "Customer@2025"],
  ];
  return (
    <div className="mt-6 rounded-xl p-3 text-xs font-mono relative" style={{ background: "var(--black-mid)", border: "1px solid var(--gold)" }}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute top-1.5 right-2 text-muted-foreground hover:text-primary">×</button>
      <p className="text-[color:var(--gold)] mb-2">🔧 Development Accounts — Remove before production</p>
      {rows.map(([label, em, pw]) => (
        <div key={em} className="grid grid-cols-[110px_1fr_1fr] gap-2 text-muted-foreground">
          <span>{label}</span><span>{em}</span><span>{pw}</span>
        </div>
      ))}
    </div>
  );
}
