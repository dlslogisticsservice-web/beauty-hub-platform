import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Check, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/center/subscription")({
  head: () => ({ meta: [{ title: "Subscription — Beauty Hub" }] }),
  component: Page,
});

function Page() {
  const { user, isCenterOwner, isAdmin, loading } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isCenterOwner && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isCenterOwner, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["subscription-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: center }, { data: plans }] = await Promise.all([
        supabase.from("centers").select("id, subscription_plan, country").eq("owner_id", user!.id).maybeSingle(),
        supabase.from("subscription_plans").select("*").order("priority_rank", { ascending: false }),
      ]);
      return { center, plans: plans ?? [] };
    },
  });

  const country = data?.center?.country ?? "EG";
  const currentPlan = data?.center?.subscription_plan ?? "free";

  return (
    <DashboardLayout role="center">
        <h1 className="text-display text-5xl">{t("center.subscription")}</h1>
        <p className="mt-2 text-muted-foreground">Choose the plan that fits your center.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {(data?.plans ?? []).map((p) => {
            const isCurrent = p.id === currentPlan;
            const price = country === "SA" ? p.price_sar : p.price_egp;
            const sym = country === "SA" ? (locale === "ar" ? "ر.س" : "SAR") : (locale === "ar" ? "ج.م" : "EGP");
            return (
              <div key={p.id} className={cn(
                "rounded-3xl border bg-card p-6 flex flex-col",
                isCurrent ? "border-[color:var(--gold)] shadow-glow" : "border-border",
              )}>
                {isCurrent && (
                  <Badge className="self-start bg-[color:var(--gold)]/90 text-foreground border-0 mb-2"><Crown className="h-3 w-3 mr-1" /> {t("common.current_plan")}</Badge>
                )}
                <h3 className="text-display text-2xl">{locale === "ar" ? p.name_ar : p.name_en}</h3>
                <div className="mt-3">
                  <span className="text-display text-4xl text-primary">{price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{sym}{t("plans.month")}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  <Feature ok>{p.max_services === -1 ? t("plans.unlimited") : `${p.max_services} ${t("plans.max_services")}`}</Feature>
                  <Feature ok>{p.max_photos === -1 ? t("plans.unlimited") : `${p.max_photos} ${t("plans.max_photos")}`}</Feature>
                  <Feature ok={p.appears_in_search}>{t("plans.appears_in_search")}</Feature>
                  <Feature ok={p.featured_badge}>{t("plans.featured_badge")}</Feature>
                  <Feature ok={p.analytics_access}>{t("plans.analytics")}</Feature>
                  <Feature ok={p.whatsapp_notifications}>{t("plans.whatsapp")}</Feature>
                </ul>
                <Button
                  disabled={isCurrent}
                  onClick={() => toast.info(t("common.contact_upgrade"))}
                  className={cn("mt-6 rounded-full", isCurrent ? "" : "bg-gradient-primary")}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {isCurrent ? t("common.current_plan") : t("common.upgrade")}
                </Button>
              </div>
            );
          })}
        </div>
    </DashboardLayout>
  );
}

function Feature({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <Check className="h-4 w-4 text-primary shrink-0" /> : <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
      <span className={ok ? "" : "text-muted-foreground/60 line-through"}>{children}</span>
    </li>
  );
}
