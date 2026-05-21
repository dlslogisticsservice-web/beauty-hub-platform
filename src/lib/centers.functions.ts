import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CENTER_COLS =
  "id, name, name_ar, slug, description, description_ar, city, address, phone, logo_url, cover_url, subscription_plan, rating_avg, rating_count, is_verified";

export const listCenters = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        city: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(["featured", "rating", "price_low", "price_high"]).optional(),
        limit: z.number().min(1).max(60).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("centers")
      .select(CENTER_COLS)
      .eq("is_active", true);

    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.search) q = q.or(`name.ilike.%${data.search}%,name_ar.ilike.%${data.search}%`);

    // premium first, then rating
    q = q
      .order("subscription_plan", { ascending: false })
      .order("rating_avg", { ascending: false })
      .limit(data.limit ?? 24);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let centers = rows ?? [];

    // category filter via services
    if (data.category) {
      const { data: svcRows } = await supabaseAdmin
        .from("services")
        .select("center_id")
        .eq("category", data.category as never)
        .eq("is_active", true);
      const ids = new Set((svcRows ?? []).map((r) => r.center_id));
      centers = centers.filter((c) => ids.has(c.id));
    }

    return { centers };
  });

export const getCenterBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { data: center, error } = await supabaseAdmin
      .from("centers")
      .select(CENTER_COLS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!center) return { center: null, services: [], reviews: [] };

    const [{ data: services }, { data: reviews }] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, name, name_ar, category, description, price, duration_minutes")
        .eq("center_id", center.id)
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabaseAdmin
        .from("reviews")
        .select("id, rating, comment, created_at, customer_id")
        .eq("center_id", center.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return { center, services: services ?? [], reviews: reviews ?? [] };
  });

export const listCities = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("centers")
    .select("city")
    .eq("is_active", true)
    .not("city", "is", null);
  const cities = Array.from(new Set((data ?? []).map((r) => r.city).filter(Boolean))) as string[];
  return { cities };
});
