import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Star, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My bookings — Glowy" }] }),
  component: CustomerDashboard,
});

type Booking = {
  id: string; scheduled_at: string; status: string; price_paid: number;
  service_id: string; center_id: string;
  services: { name: string } | null;
  centers: { name: string; logo_url: string | null; slug: string } | null;
  reviews: { id: string }[];
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

function CustomerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, price_paid, service_id, center_id, services(name), centers(name, logo_url, slug), reviews(id)")
        .eq("customer_id", user!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Booking[];
    },
  });

  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cancel = async (b: Booking) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const submitReview = async () => {
    if (!reviewFor || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      customer_id: user.id, booking_id: reviewFor.id, center_id: reviewFor.center_id, rating, comment: comment || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your review!");
    setReviewFor(null); setComment(""); setRating(5);
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const now = Date.now();
  const all = data ?? [];
  const upcoming = all.filter((b) => b.status !== "cancelled" && b.status !== "completed" && new Date(b.scheduled_at).getTime() >= now - 3600_000);
  const past = all.filter((b) => b.status === "completed" || (b.status !== "cancelled" && new Date(b.scheduled_at).getTime() < now - 3600_000));
  const cancelled = all.filter((b) => b.status === "cancelled");

  const renderList = (list: Booking[], emptyHint?: string) => {
    if (list.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary/50" />
          <p className="mt-4 text-display text-2xl">{emptyHint ?? "Nothing here yet"}</p>
          <Link to="/centers" className="mt-4 inline-block text-primary hover:underline">Discover centers →</Link>
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((b) => {
          const canCancel = b.status === "pending" || b.status === "confirmed";
          const canReview = b.status === "completed" && (b.reviews?.length ?? 0) === 0;
          return (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {b.centers?.logo_url ? <img src={b.centers.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-primary/40 text-display text-xl">{b.centers?.name?.[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/centers/$slug" params={{ slug: b.centers?.slug ?? "" }} className="font-medium hover:text-primary truncate block">{b.centers?.name}</Link>
                  <p className="text-sm text-muted-foreground truncate">{b.services?.name}</p>
                </div>
                <Badge variant="outline" className={cn("border", statusColors[b.status])}>{b.status}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {format(new Date(b.scheduled_at), "PP · p")}</span>
                <span className="text-display text-lg text-primary">${b.price_paid}</span>
              </div>
              {(canCancel || canReview) && (
                <div className="mt-4 flex gap-2">
                  {canCancel && <Button variant="outline" size="sm" onClick={() => cancel(b)}>Cancel</Button>}
                  {canReview && <Button size="sm" className="rounded-full bg-gradient-primary" onClick={() => { setReviewFor(b); setRating(5); setComment(""); }}>Leave review</Button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 flex-1">
        <h1 className="text-display text-5xl">My bookings</h1>
        <p className="mt-2 text-muted-foreground">Track upcoming, past and cancelled appointments.</p>

        {isLoading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="upcoming" className="mt-8">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">{renderList(upcoming, "No upcoming bookings")}</TabsContent>
            <TabsContent value="past" className="mt-6">{renderList(past, "No past bookings")}</TabsContent>
            <TabsContent value="cancelled" className="mt-6">{renderList(cancelled, "No cancelled bookings")}</TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!reviewFor} onOpenChange={(o) => !o && setReviewFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {reviewFor?.centers?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-1 justify-center py-4">
            {[1,2,3,4,5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={cn("h-9 w-9 transition", n <= rating ? "fill-primary text-primary" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" rows={4} maxLength={500} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewFor(null)}>Cancel</Button>
            <Button onClick={submitReview} disabled={submitting} className="bg-gradient-primary">{submitting ? "Sending…" : "Submit review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </div>
  );
}
