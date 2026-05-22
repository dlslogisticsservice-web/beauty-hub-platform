ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paymob_order_id bigint;

-- WhatsApp opt-in on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT true;

-- Notifications log
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  booking_id uuid,
  channel text NOT NULL,
  template text NOT NULL,
  recipient text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notifications" ON public.notifications_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Users read own notifications" ON public.notifications_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Ensure feature flag rows exist for payment_gateway and whatsapp
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('payment_gateway', false, 'Paymob online payments (card + wallet)'),
  ('whatsapp_notifications', false, 'WhatsApp Cloud API booking notifications')
ON CONFLICT (key) DO NOTHING;