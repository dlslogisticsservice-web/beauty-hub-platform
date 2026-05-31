import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Star } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminReviews, moderateReview } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }] }),
  validateSearch: z.object({
    visible: z.string().optional(),
    centerId: z.string().optional(),
  }),
  component: Page,
});

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  moderation_note: string | null;
  created_at: string;
  center_id: string;
  center_name: string | null;
  customer_name: string | null;
  customer_id: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function Page() {
  const { t } = useI18n();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { visible, centerId } = Route.useSearch();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", visible, centerId],
    enabled: !!user && !!isAdmin,
    queryFn: () => getAdminReviews({ data: { visible, centerId } }),
  });

  // ── Moderation state ───────────────────────────────────────────────────────
  const [moderating, setModerating] = useState<Review | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [modSaving, setModSaving] = useState(false);

  const openModerate = (r: Review, hide: boolean) => {
    setModerating({ ...r, is_visible: !hide });
    setNoteInput(r.moderation_note ?? "");
  };

  const applyModerate = async () => {
    if (!moderating) return;
    setModSaving(true);
    try {
      await moderateReview({
        data: { id: moderating.id, is_visible: moderating.is_visible, moderation_note: noteInput || undefined },
      });
      toast.success(moderating.is_visible ? t("reviews.visible") : t("reviews.hidden"));
      setModerating(null);
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setModSaving(false);
    }
  };

  const reviewList: Review[] = (reviews as Review[] | undefined) ?? [];

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-display text-3xl sm:text-4xl lg:text-5xl">{t("reviews.title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("reviews.subtitle")}</p>
        </div>
        {/* Filters */}
        <div className="flex gap-2">
          <Select
            value={visible ?? "all"}
            onValueChange={(v) => navigate({ search: (s) => ({ ...s, visible: v === "all" ? undefined : v }) })}
          >
            <SelectTrigger className="w-36 bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="true">{t("reviews.visible")}</SelectItem>
              <SelectItem value="false">{t("reviews.hidden")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
      ) : reviewList.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <p className="text-display text-2xl">{t("reviews.no_reviews")}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {reviewList.map((r) => (
            <div key={r.id} className={`rounded-2xl border bg-card p-5 ${!r.is_visible ? "opacity-60 border-dashed" : "border-border"}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-muted-foreground">{r.center_name}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{r.customer_name ?? "Customer"}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  {r.moderation_note && (
                    <p className="mt-1 text-xs text-yellow-600 bg-yellow-500/10 rounded px-2 py-0.5 inline-block">
                      Note: {r.moderation_note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_visible
                    ? <Badge className="bg-green-500/15 text-green-700 border-0 text-xs">{t("reviews.visible")}</Badge>
                    : <Badge variant="outline" className="text-xs">{t("reviews.hidden")}</Badge>}
                  {r.is_visible ? (
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => openModerate(r, true)}>
                      <EyeOff className="h-3.5 w-3.5" /> {t("reviews.hide")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => openModerate(r, false)}>
                      <Eye className="h-3.5 w-3.5" /> {t("reviews.show")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Moderation Dialog ── */}
      <AlertDialog open={!!moderating} onOpenChange={(o) => !o && setModerating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moderating?.is_visible ? t("reviews.show_confirm") : t("reviews.hide_confirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {moderating?.comment && <span className="block text-sm mb-3 italic">"{moderating.comment}"</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2">
            <Label className="text-xs">{t("reviews.moderation_note")}</Label>
            <Input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Optional note…"
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={applyModerate} disabled={modSaving}>
              {modSaving ? t("common.saving") : t("common.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
