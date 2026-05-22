-- Hide internal financial fields from authenticated/anon clients.
-- Server functions that use the service-role admin client (supabaseAdmin) bypass these grants
-- so admin dashboards, commission calculations, webhooks and payment logic remain unchanged.

REVOKE SELECT (commission_rate, commission_amount, payment_ref, paymob_order_id)
  ON public.bookings FROM anon, authenticated;

-- Re-grant the safe, non-financial columns so direct client reads still work where used.
GRANT SELECT (id, created_at, notes, service_id, customer_id, center_id, scheduled_at,
              status, price_paid, payment_method, payment_status, currency)
  ON public.bookings TO anon, authenticated;
