# Glowy (جلوي) — Beauty & Laser Booking Marketplace

A bilingual (AR/EN, RTL-aware) marketplace SaaS where beauty/laser/filler/botox centers list services and customers book appointments. Platform earns via commissions + subscriptions.

## Tech Stack

- TanStack Start (React 19 + TypeScript + Vite) — already scaffolded
- Tailwind v4 + shadcn/ui — already scaffolded
- Lovable Cloud (Supabase) — to be enabled (database, auth, storage, RLS)

## Phase 1 — Foundation (this turn)

1. **Enable Lovable Cloud** (Supabase: DB + Auth + Storage)
2. **Design system** — rose/pink primary palette in `src/styles.css`, elegant feminine aesthetic, serif display + clean sans body, soft radii, subtle shadows
3. **Database schema** (migration):
   - Enums: `app_role`, `service_category`, `booking_status`, `subscription_plan`
   - Tables: `profiles`, `user_roles` (separate, per security rules), `centers`, `services`, `bookings`, `reviews`
   - `has_role()` SECURITY DEFINER function
   - Trigger: auto-create profile on signup
   - Trigger: auto-calc `commission_amount` on booking insert
   - Trigger: update center `rating_avg`/`rating_count` on review insert
   - RLS policies for all tables (per-role access)
   - Storage buckets: `center-logos`, `center-covers`, `avatars`
4. **Auth** — email/password signup with role selection (customer / center_owner), login, session listener, route guards via `_authenticated` layout + role-based guards
5. **Core public pages**:
   - `/` Homepage — hero, search (city + category), featured centers grid (sorted: premium → rating)
   - `/centers` — browse with filters (city, category, rating, price) + sorts
   - `/centers/$slug` — center profile with services list + reviews + Book Now CTA
   - `/auth/login`, `/auth/signup`
6. **Sitemap + robots.txt**

## Phase 2 — Customer flows (next turn)

- `/book/$serviceId` — booking form (date/time picker, notes)
- `/dashboard` — my bookings (upcoming/past, status badges, "Leave Review" on completed)
- `/my-reviews`

## Phase 3 — Center Owner

- `/center/dashboard` — today's bookings, monthly revenue, pending
- `/center/bookings` — bookings list (filter by status/date)
- `/center/services` — CRUD services (AR+EN)
- `/center/profile` — edit center (with logo/cover upload)
- `/center/subscription` — current plan + upgrade
- On first signup as `center_owner`, prompt center creation

## Phase 4 — Admin

- `/admin/dashboard` — platform stats
- `/admin/centers` — verify/activate/edit commission
- `/admin/bookings` — all bookings + commissions
- `/admin/subscriptions` — plan management

## Technical notes

- Reads in public pages use `createServerFn` + `supabaseAdmin` scoped via WHERE (`is_active`, `is_verified`) with safe column projection — public route loaders cannot use `requireSupabaseAuth`
- Authenticated reads/writes use `requireSupabaseAuth` middleware (RLS as user)
- Role enum stored in `user_roles` table only — never on profiles
- RLS: customers see own bookings/reviews; center_owners see own center + its bookings; admins see all (via `has_role(uid, 'admin')`)
- Search sort SQL: `ORDER BY subscription_plan='premium' DESC, rating_avg DESC`
- RTL: bilingual labels render both AR+EN inline; AR text wrapped in `<span dir="rtl">`
- Routes split per `tanstack-route-architecture` rules with per-route `head()` metadata

## Out of scope (MVP)

- Real payment processing (price_paid recorded only; Stripe later)
- SMS/email notifications
- Real-time chat between customer and center
- Map integration (lat/lng stored, map view later)

Given the scope, this turn delivers **Phase 1** (foundation + public browse + auth). Subsequent turns deliver Phases 2–4. Confirm to proceed.