import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("super_admin")) throw new Error("Forbidden");
}
async function ensureAnyAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("super_admin")) throw new Error("Forbidden");
}

export const getSystemInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSuperAdmin(context.userId);
    const [{ count: usersCount }, { count: centersCount }, { count: bookingsCount }, commRes, flagsRes, adminsRes, auditRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("centers").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("bookings").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("bookings").select("commission_amount").eq("status", "completed"),
      supabaseAdmin.from("feature_flags").select("*").order("key"),
      supabaseAdmin.from("user_roles").select("user_id, role, created_at, profiles:user_id(email, full_name)").in("role", ["admin", "super_admin"]),
      supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const totalCommission = (commRes.data ?? []).reduce((s, r) => s + (Number(r.commission_amount) || 0), 0);
    return {
      stats: { users: usersCount ?? 0, centers: centersCount ?? 0, bookings: bookingsCount ?? 0, commission: totalCommission },
      flags: flagsRes.data ?? [],
      admins: adminsRes.data ?? [],
      auditLogs: auditRes.data ?? [],
    };
  });

export const toggleFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ key: z.string(), enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureSuperAdmin(context.userId);
    const { error } = await supabaseAdmin.from("feature_flags").update({ enabled: data.enabled }).eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(8), role: z.enum(["admin", "super_admin"]).default("admin") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureSuperAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (created.user) {
      // remove any auto-assigned 'customer' role and insert requested role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }
    return { ok: true };
  });

export const getCommissionsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAnyAdmin(context.userId);
    const [{ data: allBookings }, { data: centers }] = await Promise.all([
      supabaseAdmin.from("bookings").select("id, center_id, price_paid, commission_amount, commission_rate, status, created_at, scheduled_at, customer_id, service_id, currency"),
      supabaseAdmin.from("centers").select("id, name, country, subscription_plan, commission_rate"),
    ]);
    const bookings = allBookings ?? [];
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const totalCommission = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + (b.commission_amount || 0), 0);
    const thisMonth = bookings.filter((b) => b.status === "completed" && new Date(b.created_at) >= monthStart).reduce((s, b) => s + (b.commission_amount || 0), 0);
    const pending = bookings.filter((b) => b.status === "pending" || b.status === "confirmed").reduce((s, b) => s + (b.commission_amount || 0), 0);
    const avgRate = (centers ?? []).length ? (centers ?? []).reduce((s, c) => s + (c.commission_rate || 0), 0) / (centers ?? []).length : 0;

    const byCenter = new Map<string, { id: string; name: string; country: string; plan: string; rate: number; totalBookings: number; totalEarned: number; pendingAmount: number }>();
    for (const c of centers ?? []) {
      byCenter.set(c.id, { id: c.id, name: c.name, country: c.country, plan: c.subscription_plan, rate: c.commission_rate, totalBookings: 0, totalEarned: 0, pendingAmount: 0 });
    }
    for (const b of bookings) {
      const row = byCenter.get(b.center_id); if (!row) continue;
      row.totalBookings += 1;
      if (b.status === "completed") row.totalEarned += b.commission_amount || 0;
      if (b.status === "pending" || b.status === "confirmed") row.pendingAmount += b.commission_amount || 0;
    }
    return {
      stats: { totalCommission, thisMonth, pending, avgRate },
      centers: Array.from(byCenter.values()).sort((a, b) => b.totalEarned - a.totalEarned),
    };
  });

export const getCenterBookingsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ centerId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAnyAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("bookings")
      .select("id, scheduled_at, price_paid, commission_amount, status, currency, services(name), profiles:customer_id(full_name, email)")
      .eq("center_id", data.centerId)
      .order("scheduled_at", { ascending: false })
      .limit(100);
    return { bookings: rows ?? [] };
  });

export const updateCenterCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ centerId: z.string().uuid(), rate: z.number().min(0).max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAnyAdmin(context.userId);
    const { error } = await supabaseAdmin.from("centers").update({ commission_rate: data.rate }).eq("id", data.centerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
