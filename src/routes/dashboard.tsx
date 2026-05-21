import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My bookings — Glowy" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-6 py-16 flex-1">
        <h1 className="text-display text-5xl">My bookings</h1>
        <p className="mt-4 text-muted-foreground">Your appointments will appear here. The dashboard is being built — check back soon.</p>
        <Link to="/centers" className="mt-6 inline-block text-primary hover:underline">Browse centers →</Link>
      </div>
      <SiteFooter />
    </div>
  );
}
