import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = "";
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/centers", priority: "0.9", changefreq: "daily" },
          { path: "/auth/login", priority: "0.3" },
          { path: "/auth/signup", priority: "0.5" },
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${base}${e.path}</loc>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}<priority>${e.priority}</priority></url>`).join("\n")}
</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
