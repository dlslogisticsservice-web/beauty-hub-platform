
-- Add city column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- Attach rating refresh trigger to reviews (function exists, trigger missing)
DROP TRIGGER IF EXISTS trg_refresh_center_rating ON public.reviews;
CREATE TRIGGER trg_refresh_center_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_center_rating();

-- Attach commission + currency triggers on bookings (functions exist, triggers missing)
DROP TRIGGER IF EXISTS trg_calc_booking_commission ON public.bookings;
CREATE TRIGGER trg_calc_booking_commission
BEFORE INSERT OR UPDATE OF price_paid, commission_rate ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.calc_booking_commission();

DROP TRIGGER IF EXISTS trg_set_booking_currency ON public.bookings;
CREATE TRIGGER trg_set_booking_currency
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_currency();
