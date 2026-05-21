import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getServiceForBooking = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ serviceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: service, error } = await supabaseAdmin
      .from("services")
      .select("id, name, name_ar, category, price, duration_minutes, center_id")
      .eq("id", data.serviceId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!service) return { service: null, center: null };

    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("id, name, name_ar, slug, logo_url, city, commission_rate")
      .eq("id", service.center_id)
      .maybeSingle();

    return { service, center };
  });

export const getBookedSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ serviceId: z.string().uuid(), date: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const start = new Date(`${data.date}T00:00:00Z`).toISOString();
    const end = new Date(`${data.date}T23:59:59Z`).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("scheduled_at")
      .eq("service_id", data.serviceId)
      .neq("status", "cancelled")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end);
    if (error) throw new Error(error.message);
    return { slots: (rows ?? []).map((r) => r.scheduled_at) };
  });
