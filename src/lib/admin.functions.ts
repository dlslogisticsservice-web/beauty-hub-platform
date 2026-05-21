import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [{ count: totalBookings }, { data: completed }, { count: activeCenters }] = await Promise.all([
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bookings").select("price_paid, commission_amount, created_at").eq("status", "completed"),
      supabaseAdmin.from("centers").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_verified", true),
    ]);

    const revenue = (completed ?? []).reduce((s, b) => s + Number(b.commission_amount), 0);
    const gross = (completed ?? []).reduce((s, b) => s + Number(b.price_paid), 0);

    // Last 6 months chart
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const sum = (completed ?? [])
        .filter((b) => {
          const t = new Date(b.created_at);
          return t >= d && t < next;
        })
        .reduce((s, b) => s + Number(b.commission_amount), 0);
      months.push({ month: label, revenue: Math.round(sum * 100) / 100 });
    }

    const { data: recent } = await supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const cIds = Array.from(new Set((recent ?? []).map((r) => r.center_id)));
    const uIds = Array.from(new Set((recent ?? []).map((r) => r.customer_id)));
    const sIds = Array.from(new Set((recent ?? []).map((r) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }] = await Promise.all([
      cIds.length ? supabaseAdmin.from("centers").select("id, name, slug, country").in("id", cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from("services").select("id, name").in("id", sIds) : Promise.resolve({ data: [] }),
    ]);
    const cMap = new Map((centers ?? []).map((c) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s) => [s.id, s]));

    const recentBookings = (recent ?? []).map((b) => ({
      ...b,
      center_name: cMap.get(b.center_id)?.name || "—",
      center_slug: cMap.get(b.center_id)?.slug,
      country: (cMap.get(b.center_id) as { country?: string } | undefined)?.country ?? "EG",
      customer_name: pMap.get(b.customer_id)?.full_name || pMap.get(b.customer_id)?.email || "Customer",
      service_name: sMap.get(b.service_id)?.name || "—",
    }));

    return {
      stats: {
        totalBookings: totalBookings ?? 0,
        revenue,
        gross,
        activeCenters: activeCenters ?? 0,
      },
      months,
      recentBookings,
    };
  });

export const getAdminCenters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: centers } = await supabaseAdmin
      .from("centers")
      .select("*")
      .order("created_at", { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c) => c.owner_id)));
    const { data: profiles } = ownerIds.length
      ? await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ownerIds)
      : { data: [] };
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      centers: (centers ?? []).map((c) => ({ ...c, owner_email: pMap.get(c.owner_id)?.email || "—" })),
    };
  });

export const updateCenterAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      is_verified: z.boolean().optional(),
      is_active: z.boolean().optional(),
      commission_rate: z.number().min(0).max(100).optional(),
      subscription_plan: z.enum(["free", "basic", "pro", "premium"]).optional(),
      subscription_expires_at: z.string().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("centers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      centerId: z.string().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at")
      .order("scheduled_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as never);
    if (data.centerId && data.centerId !== "all") q = q.eq("center_id", data.centerId);
    const { data: rows } = await q;

    const cIds = Array.from(new Set((rows ?? []).map((r) => r.center_id)));
    const uIds = Array.from(new Set((rows ?? []).map((r) => r.customer_id)));
    const sIds = Array.from(new Set((rows ?? []).map((r) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }, { data: allCenters }] = await Promise.all([
      cIds.length ? supabaseAdmin.from("centers").select("id, name, slug, country").in("id", cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from("services").select("id, name").in("id", sIds) : Promise.resolve({ data: [] }),
      supabaseAdmin.from("centers").select("id, name").order("name"),
    ]);
    const cMap = new Map((centers ?? []).map((c) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s) => [s.id, s]));

    const bookings = (rows ?? []).map((b) => ({
      ...b,
      center_name: cMap.get(b.center_id)?.name || "—",
      center_slug: cMap.get(b.center_id)?.slug,
      country: (cMap.get(b.center_id) as { country?: string } | undefined)?.country ?? "EG",
      customer_name: pMap.get(b.customer_id)?.full_name || pMap.get(b.customer_id)?.email || "Customer",
      service_name: sMap.get(b.service_id)?.name || "—",
    }));
    return { bookings, allCenters: allCenters ?? [] };
  });

export const getAdminSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: centers } = await supabaseAdmin
      .from("centers")
      .select("id, name, owner_id, subscription_plan, subscription_expires_at, created_at")
      .order("created_at", { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c) => c.owner_id)));
    const { data: profiles } = ownerIds.length
      ? await supabaseAdmin.from("profiles").select("id, email").in("id", ownerIds)
      : { data: [] };
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const enriched = (centers ?? []).map((c) => ({
      ...c,
      owner_email: pMap.get(c.owner_id)?.email || "—",
    }));
    const counts = { free: 0, basic: 0, pro: 0, premium: 0 } as Record<string, number>;
    enriched.forEach((c) => { counts[c.subscription_plan] = (counts[c.subscription_plan] ?? 0) + 1; });
    return { centers: enriched, counts };
  });
