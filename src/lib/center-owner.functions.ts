import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertOwner(userId: string) {
  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("id, owner_id, country")
    .eq("owner_id", userId)
    .maybeSingle();
  return center;
}

export const getMyCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("centers")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { center: data };
  });

export const getCenterDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const center = await assertOwner(context.userId);
    if (!center) return { center: null, stats: null, todaysBookings: [] };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data: monthBookings } = await supabaseAdmin
      .from("bookings")
      .select("price_paid, commission_amount, status")
      .eq("center_id", center.id)
      .gte("created_at", monthStart);

    const totalBookings = monthBookings?.length ?? 0;
    const completed = (monthBookings ?? []).filter((b) => b.status === "completed");
    const revenue = completed.reduce((s, b) => s + Number(b.price_paid), 0);
    // Net payout = revenue minus internal commission. Commission itself is NOT returned to the client.
    const payout = completed.reduce((s, b) => s + (Number(b.price_paid) - Number(b.commission_amount)), 0);
    const pending = (monthBookings ?? []).filter((b) => b.status === "pending").length;

    const { data: todays } = await supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, status, price_paid, customer_id, service_id")
      .eq("center_id", center.id)
      .gte("scheduled_at", todayStart)
      .lt("scheduled_at", tomorrowStart)
      .order("scheduled_at", { ascending: true });

    const customerIds = Array.from(new Set((todays ?? []).map((b) => b.customer_id)));
    const serviceIds = Array.from(new Set((todays ?? []).map((b) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", customerIds)
        : Promise.resolve({ data: [] }),
      serviceIds.length
        ? supabaseAdmin.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s) => [s.id, s]));

    const todaysBookings = (todays ?? []).map((b) => ({
      ...b,
      customer_name: pMap.get(b.customer_id)?.full_name || pMap.get(b.customer_id)?.email || "Customer",
      service_name: sMap.get(b.service_id)?.name || "Service",
    }));

    return {
      center: { id: center.id, country: center.country },
      stats: { totalBookings, revenue, payout, pending },
      todaysBookings,
    };
  });

export const getCenterBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      search: z.string().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const center = await assertOwner(context.userId);
    if (!center) return { bookings: [], country: "EG" as const };

    let q = supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, status, price_paid, commission_amount, customer_id, service_id, created_at")
      .eq("center_id", center.id)
      .order("scheduled_at", { ascending: false });

    if (data.status && data.status !== "all") q = q.eq("status", data.status as never);
    if (data.from) q = q.gte("scheduled_at", new Date(data.from).toISOString());
    if (data.to) q = q.lte("scheduled_at", new Date(data.to).toISOString());

    const { data: rows } = await q;
    const customerIds = Array.from(new Set((rows ?? []).map((b) => b.customer_id)));
    const serviceIds = Array.from(new Set((rows ?? []).map((b) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", customerIds)
        : Promise.resolve({ data: [] }),
      serviceIds.length
        ? supabaseAdmin.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s) => [s.id, s]));

    // Sanitize: do not return commission_rate / commission_amount to center owners.
    // Expose only payout (price_paid - commission_amount).
    let bookings = (rows ?? []).map((b) => ({
      id: b.id,
      scheduled_at: b.scheduled_at,
      status: b.status,
      price_paid: b.price_paid,
      payout: Number(b.price_paid) - Number(b.commission_amount),
      customer_id: b.customer_id,
      service_id: b.service_id,
      created_at: b.created_at,
      customer_name: pMap.get(b.customer_id)?.full_name || pMap.get(b.customer_id)?.email || "Customer",
      service_name: sMap.get(b.service_id)?.name || "Service",
    }));
    if (data.search) {
      const s = data.search.toLowerCase();
      bookings = bookings.filter((b) => b.customer_name.toLowerCase().includes(s));
    }
    return { bookings, country: center.country ?? "EG" };
  });
