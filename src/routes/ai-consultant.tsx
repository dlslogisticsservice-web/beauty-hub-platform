import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { AIBeautyConsultant } from "@/components/ai-beauty-consultant";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/ai-consultant")({
  head: () => ({
    meta: [
      { title: "AI Skin Consultant — Beauty Hub" },
      { name: "description", content: "Get a personalized skin analysis and laser safety assessment powered by AI." },
    ],
  }),
  loader: async () => null,
  component: AIConsultantPage,
});

function AIConsultantPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 flex-1">
        {/* page header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("ai_consultant.badge")}
          </span>
          <h1 className="mt-4 text-display text-4xl text-foreground">{t("ai_consultant.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("ai_consultant.subtitle")}</p>
        </div>

        <AIBeautyConsultant />
      </div>

      <SiteFooter />
    </div>
  );
}
