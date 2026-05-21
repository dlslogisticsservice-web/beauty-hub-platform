import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/book/$serviceId")({
  head: () => ({ meta: [{ title: "Book a service — Glowy" }] }),
  component: ComingSoon,
});

function ComingSoon() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center flex-1">
        <h1 className="text-display text-5xl">Booking flow coming soon</h1>
        <p className="mt-4 text-muted-foreground">We're putting the finishing touches on the booking experience.</p>
        <Link to="/centers" className="mt-6 inline-block text-primary hover:underline">← Back to centers</Link>
      </div>
      <SiteFooter />
    </div>
  );
}
