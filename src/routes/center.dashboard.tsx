import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/center/dashboard")({
  head: () => ({ meta: [{ title: "Center dashboard — Glowy" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-6 py-16 flex-1">
        <h1 className="text-display text-5xl">Center dashboard</h1>
        <p className="mt-4 text-muted-foreground">Manage your services, bookings and profile from here. Coming in the next update.</p>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">← Home</Link>
      </div>
      <SiteFooter />
    </div>
  );
}
